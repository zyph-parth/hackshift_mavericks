import type { ArtifactEvidence, ReviewFlag } from '@launchloop/shared';
import { gh, ghRaw, GH_NAME, GH_REPO } from './github';
import { safeGet } from './net';

/**
 * Opens what a candidate submitted and records what is actually there. Nothing is executed:
 * this is static inspection of source and served files, and it says so in the review.
 */

export interface Inspected {
  evidence: ArtifactEvidence;
  flags: ReviewFlag[];
}

interface Ctx {
  rubric: string[];
  /** When the task was posted (ms). Used to spot work that predates it. */
  taskPostedAt: number;
  /** The submitter's *proven* GitHub login, if they verified one. */
  verifiedLogin?: string;
}

const empty = (over: Partial<ArtifactEvidence>): ArtifactEvidence => ({
  kind: 'none', url: '', status: 'none', facts: {}, filesRead: [], tree: [], sources: [], ...over,
});

/** Same project submitted twice should compare equal. */
export function canonicalLink(link: string): string {
  return link.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\.git$/, '').replace(/\/+$/, '');
}

export async function inspectSubmission(rawLink: string, ctx: Ctx): Promise<Inspected> {
  const link = rawLink.trim();
  if (!link) return { evidence: empty({ kind: 'text', status: 'none', note: 'No link submitted' }), flags: [{ level: 'info', text: 'No project link was submitted, only a write-up. A write-up is not evidence of work, so it was not scored.' }] };
  const withScheme = /^[a-z]+:\/\//i.test(link) ? link : `https://${link}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { evidence: empty({ kind: 'none', url: link, status: 'unsupported', note: 'Not a valid URL' }), flags: [] };
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  try {
    if (host === 'github.com') return await inspectRepo(u, ctx);
    if (host === 'figma.com' || host.endsWith('.figma.com')) {
      return { evidence: empty({ kind: 'figma', url: u.href, status: 'unsupported', note: 'Figma files need an authorised connection, so they are not opened automatically' }), flags: [{ level: 'info', text: 'Figma link: not inspected. Open it and compare against the brief by eye.' }] };
    }
    if (host === 'gist.github.com' || host === 'gitlab.com' || host === 'bitbucket.org') {
      return { evidence: empty({ kind: 'repo', url: u.href, status: 'unsupported', note: `${host} links are not supported yet. Submit a github.com repository or a live URL.` }), flags: [] };
    }
    return await inspectSite(u);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { evidence: empty({ kind: 'site', url: u.href, status: /private|not allowed|standard web ports|credentials/i.test(msg) ? 'blocked' : 'unreachable', note: msg }), flags: [] };
  }
}

/* ---------------------------------- repo ---------------------------------- */

const SRC_EXT = /\.(jsx?|tsx?|mjs|cjs|vue|svelte|html?|css|scss|py|go|rb|java|kt|rs|php|cs)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|out|vendor|\.next|coverage|\.git|public\/assets)\/|\.min\.|\.map$|package-lock|pnpm-lock|yarn\.lock|\.d\.ts$/i;
const ENTRY = /(^|\/)(index|main|app|server|routes?|api|handler|middleware|home|page)\.[a-z]+$/i;
const STOP = new Set(['should', 'must', 'with', 'that', 'this', 'from', 'have', 'works', 'down', 'when', 'into', 'each', 'does', 'every', 'using', 'which']);

function pickFiles(tree: { path: string; size: number }[], rubric: string[], base: string): string[] {
  const topics = [...new Set(rubric.join(' ').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)))];
  return tree
    .filter((f) => f.path.startsWith(base) && SRC_EXT.test(f.path) && !SKIP.test(f.path) && f.size > 0 && f.size <= 60_000)
    .map((f) => {
      const rel = f.path.slice(base.length);
      const depth = rel.split('/').length;
      const p = f.path.toLowerCase();
      const score = (ENTRY.test(f.path) ? 6 : 0) + topics.filter((w) => p.includes(w)).length * 3 + (/\.(tsx?|jsx?|css|html?|vue|svelte)$/.test(p) ? 2 : 0) + (/(^|\/)(src|app|lib|components?|pages?|routes?)\//.test(p) ? 1.5 : 0) - depth * 0.6 + (/\.(test|spec)\./.test(p) ? -1 : 0);
      return { path: f.path, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 22)
    .map((f) => f.path);
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]);
    }
  }));
  return out;
}

async function inspectRepo(u: URL, ctx: Ctx): Promise<Inspected> {
  const [owner, repoRaw, kind, branch, ...rest] = u.pathname.split('/').filter(Boolean);
  const url = u.href;
  if (!owner || !repoRaw) return { evidence: empty({ kind: 'repo', url, status: 'unsupported', note: 'This link points to a GitHub profile, not a repository. Submit the repository URL.' }), flags: [] };
  const repo = repoRaw.replace(/\.git$/, '');
  if (!GH_NAME.test(owner) || !GH_REPO.test(repo)) return { evidence: empty({ kind: 'repo', url, status: 'unsupported', note: 'Not a valid repository URL' }), flags: [] };
  const subdir = kind === 'tree' && rest.length ? rest.join('/') + '/' : '';
  const ev = (over: Partial<ArtifactEvidence>) => empty({ kind: 'repo', url, ...over });

  const meta = await gh<{ default_branch: string; fork: boolean; parent?: { full_name: string }; stargazers_count: number; forks_count: number; created_at: string; pushed_at: string; size: number; language: string | null; homepage: string | null; license: { spdx_id: string } | null; archived: boolean }>(`/repos/${owner}/${repo}`);
  if (meta.limited) return { evidence: ev({ status: 'rate_limited', note: 'GitHub rate limit reached. Re-run the inspection in a few minutes.' }), flags: [] };
  if (meta.status === 404) return { evidence: ev({ status: 'private_or_missing', note: 'Repository not found or private. Make it public so it can be inspected.' }), flags: [] };
  if (!meta.data) return { evidence: ev({ status: 'unreachable', note: `GitHub returned HTTP ${meta.status}` }), flags: [] };
  const m = meta.data;
  const ref = kind === 'tree' && branch ? branch : m.default_branch;

  const [treeR, langR, commitsR, readmeR] = await Promise.all([
    gh<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`),
    gh<Record<string, number>>(`/repos/${owner}/${repo}/languages`),
    gh<{ author: { login: string } | null; commit: { author: { date: string }; committer: { date: string } } }[]>(`/repos/${owner}/${repo}/commits?per_page=100&sha=${encodeURIComponent(ref)}`),
    gh(`/repos/${owner}/${repo}/readme`, { raw: true }),
  ]);
  if ([treeR, langR, commitsR, readmeR].some((r) => r.limited)) return { evidence: ev({ status: 'rate_limited', note: 'GitHub rate limit reached while reading the repository. Re-run the inspection in a few minutes.' }), flags: [] };
  if (!treeR.data) return { evidence: ev({ status: treeR.status === 409 ? 'ok' : 'unreachable', note: treeR.status === 409 ? 'The repository is empty' : `Could not read the file tree (HTTP ${treeR.status})` }), flags: [] };

  const blobs = treeR.data.tree.filter((t) => t.type === 'blob').map((t) => ({ path: t.path, size: t.size ?? 0 }));
  const treePaths = blobs.map((b) => b.path);
  const chosen = pickFiles(blobs, ctx.rubric, subdir);
  const hasPkg = treePaths.includes(`${subdir}package.json`);
  const [fetched, pkgText] = await Promise.all([
    pool(chosen, 6, async (p) => ({ path: p, text: await ghRaw(owner, repo, ref, p) })),
    hasPkg ? ghRaw(owner, repo, ref, `${subdir}package.json`) : Promise.resolve(null),
  ]);
  const sources = fetched.filter((f): f is { path: string; text: string } => !!f.text);
  let pkg: ArtifactEvidence['pkg'];
  try {
    const j = pkgText ? JSON.parse(pkgText) : null;
    if (j) pkg = { dependencies: Object.keys({ ...(j.dependencies ?? {}), ...(j.devDependencies ?? {}) }), scripts: j.scripts ?? {} };
  } catch { /* malformed package.json is itself a finding, but not a crash */ }

  const commits = commitsR.data ?? [];
  const days = new Set(commits.map((c) => (c.commit.committer?.date ?? c.commit.author.date).slice(0, 10)));
  const authors = new Set(commits.map((c) => c.author?.login?.toLowerCase()).filter(Boolean) as string[]);
  const lastCommit = commits.length ? Math.max(...commits.map((c) => Date.parse(c.commit.committer?.date ?? c.commit.author.date))) : 0;
  const langs = Object.entries(langR.data ?? {}).sort((a, b) => b[1] - a[1]);
  const langTotal = langs.reduce((a, [, n]) => a + n, 0) || 1;

  const facts: ArtifactEvidence['facts'] = {
    repo: `${owner}/${repo}`, branch: ref, stars: m.stargazers_count, forks: m.forks_count, fork: m.fork,
    created: m.created_at.slice(0, 10), pushed: m.pushed_at.slice(0, 10), sizeKb: m.size, files: treePaths.length,
    commits: commits.length, commitDays: days.size, authors: authors.size,
    languages: langs.slice(0, 3).map(([k, n]) => `${k} ${Math.round((n / langTotal) * 100)}%`).join(', ') || 'unknown',
    treeTruncated: treeR.data.truncated, license: m.license?.spdx_id ?? 'none',
    ...(m.homepage ? { homepage: m.homepage } : {}),
    ...(subdir ? { subdirectory: subdir } : {}),
  };
  if (commits.length === 100) facts.commitsCapped = true;

  const flags: ReviewFlag[] = [];
  if (m.fork) flags.push({ level: 'warn', text: `This repository is a fork${m.parent ? ` of ${m.parent.full_name}` : ''}. Check the candidate's own contribution.` });
  const created = Date.parse(m.created_at);
  const dayMs = 86_400_000;
  if (lastCommit && lastCommit < ctx.taskPostedAt) flags.push({ level: 'warn', text: `All ${commits.length} commits predate this task being posted (latest ${new Date(lastCommit).toISOString().slice(0, 10)}). It may be existing work.` });
  else if (created < ctx.taskPostedAt - dayMs) flags.push({ level: 'info', text: `The repository was created ${Math.round((ctx.taskPostedAt - created) / dayMs)} days before the task was posted, but has commits since.` });
  if (ctx.verifiedLogin) {
    const me = ctx.verifiedLogin.toLowerCase();
    if (owner.toLowerCase() === me || authors.has(me)) flags.push({ level: 'info', identifying: true, text: `Authorship consistent: the submitter's verified GitHub account (${ctx.verifiedLogin}) ${owner.toLowerCase() === me ? 'owns' : 'has commits in'} this repository.` });
    else flags.push({ level: 'warn', identifying: true, text: `The submitter's verified GitHub account (${ctx.verifiedLogin}) is neither the owner (${owner}) nor a committer. Confirm the candidate did this work.` });
  } else flags.push({ level: 'info', text: 'Authorship not confirmed: the submitter has not proven ownership of a GitHub account.' });
  if (m.archived) flags.push({ level: 'info', text: 'The repository is archived.' });

  return {
    evidence: {
      kind: 'repo', url, status: 'ok', facts, filesRead: sources.map((s) => s.path), tree: treePaths, sources, pkg,
      readme: readmeR.text?.slice(0, 40_000),
    },
    flags,
  };
}

/* ----------------------------------- site ---------------------------------- */

const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

async function inspectSite(u: URL): Promise<Inspected> {
  const page = await safeGet(u.href, { maxBytes: 600_000, timeoutMs: 9000 });
  const base = { kind: 'site' as const, url: u.href };
  if (page.status === 404 || page.status === 401 || page.status === 403) return { evidence: empty({ ...base, status: 'private_or_missing', note: `The URL returned HTTP ${page.status}`, facts: { http: page.status } }), flags: [] };
  if (page.status >= 400) return { evidence: empty({ ...base, status: 'unreachable', note: `The URL returned HTTP ${page.status}`, facts: { http: page.status } }), flags: [] };
  if (!page.body) return { evidence: empty({ ...base, status: 'unsupported', note: `The URL did not return a web page (${page.contentType || 'unknown type'})`, facts: { http: page.status } }), flags: [] };

  const html = page.body;
  const final = new URL(page.finalUrl);
  const text = strip(html);
  const links = (re: RegExp) => [...html.matchAll(re)].map((m) => m[1]).filter(Boolean);
  const same = (href: string) => { try { return new URL(href, final).hostname === final.hostname ? new URL(href, final).href : null; } catch { return null; } };
  const cssHrefs = links(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi).concat(links(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi)).map(same).filter(Boolean) as string[];
  const jsSrcs = links(/<script[^>]+src=["']([^"']+)["']/gi).map(same).filter(Boolean) as string[];
  const get = async (href: string, max: number) => safeGet(href, { maxBytes: max, timeoutMs: 8000 }).then((r) => (r.status < 400 ? r.body : '')).catch(() => '');
  const [css, js] = await Promise.all([
    pool([...new Set(cssHrefs)].slice(0, 3), 3, async (h) => ({ path: `css:${new URL(h).pathname}`, text: await get(h, 300_000) })),
    pool([...new Set(jsSrcs)].slice(0, 3), 3, async (h) => ({ path: `js:${new URL(h).pathname}`, text: await get(h, 900_000) })),
  ]);
  const sources = [{ path: 'index.html', text: html }, ...css.filter((c) => c.text), ...js.filter((j) => j.text)];
  const shell = text.length < 200 && /<div[^>]+id=["'](root|app|__next|__nuxt)["']/i.test(html);
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
  const facts: ArtifactEvidence['facts'] = {
    http: page.status, host: final.hostname, title: (html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? '').trim().slice(0, 80) || 'none',
    htmlKb: Math.round(html.length / 1024), textChars: text.length, shell, lang: /<html[^>]+lang=/i.test(html),
    viewportMeta: /<meta[^>]+name=["']viewport["']/i.test(html), headings: (html.match(/<h[1-3]\b/gi) ?? []).length,
    images: imgs.length, imagesWithAlt: imgs.filter((m) => /\balt=/i.test(m[0])).length, stylesheets: css.filter((c) => c.text).length, scripts: js.filter((j) => j.text).length,
  };
  const flags: ReviewFlag[] = [{ level: 'info', text: 'Live sites are inspected statically (served HTML, CSS and scripts). Nothing is run or clicked.' }];
  if (shell && !js.some((j) => j.text)) flags.push({ level: 'info', text: 'The page is a script-only app shell and its scripts could not be read, so most checks cannot be assessed.' });
  return { evidence: { kind: 'site', url: u.href, status: 'ok', facts, filesRead: sources.map((s) => s.path), tree: [], sources, html }, flags };
}
