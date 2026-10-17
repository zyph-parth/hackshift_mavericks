import type { ArtifactSummary, CriterionResult, Recommendation, ReviewFlag, ReviewStatus, SubmissionReview, Verdict } from './types';

/**
 * Proof-task review engine. Everything here is pure: it works on an `ArtifactEvidence`
 * (what the API actually fetched from the submitted repo or site) and never on how long
 * or how keyword-rich a write-up is.
 *
 * Each rubric criterion is either checked against real evidence, or reported as
 * `cannot_assess` so a human looks at it. It is never guessed.
 */

export interface ArtifactEvidence extends ArtifactSummary {
  /** Every path in the repo tree (may be truncated by GitHub for huge repos). */
  tree: string[];
  /** Text we actually fetched: source files for a repo; the page, stylesheets and scripts for a site. */
  sources: { path: string; text: string }[];
  /** Parsed package.json, if the repo has one. */
  pkg?: { dependencies: string[]; scripts: Record<string, string> };
  /** Raw HTML of the page (sites only). */
  html?: string;
  readme?: string;
}

/** `foo.test.ts`, `foo.spec.js`, a root `test.js`, `test-d.ts`, or anything under `test/`, `tests/`, `__tests__/`. */
export const TEST_FILE = /(^|\/)(__tests__|tests?|specs?)\/|(^|[._-])(test|spec)s?\.[a-z0-9]+$|(^|\/)test[-_.a-z0-9]*\.[a-z0-9]+$/i;

type Check = { id: string; test: RegExp; run: (ev: ArtifactEvidence, criterion: string) => { verdict: Verdict; evidence: string } | null };

const all = (ev: ArtifactEvidence) => ev.sources.map((s) => s.text).join('\n');
const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;
const snip = (text: string, re: RegExp, n = 70) => {
  const m = re.exec(text);
  if (!m) return '';
  const a = Math.max(0, m.index - 10);
  return text.slice(a, a + n).replace(/\s+/g, ' ').trim();
};
const isCss = (p: string) => /\.(css|scss|sass|less)$/.test(p) || p.startsWith('css:');
const isMarkup = (p: string) => /\.(html?|jsx|tsx|vue|svelte)$/.test(p) || p === 'index.html';
const isCode = (p: string) => /\.(jsx?|tsx?|mjs|cjs|vue|svelte|py|rb|go|rs|java|kt|php|cs)$/.test(p) || p.startsWith('js:');
const STOP = new Set(['should', 'must', 'with', 'that', 'this', 'from', 'have', 'works', 'working', 'down', 'when', 'into', 'each', 'does', 'every', 'using', 'which', 'smooth', 'animate', 'animated', 'animation', 'clean', 'component', 'structure']);
const topicWords = (criterion: string) => [...new Set(criterion.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)))];

/** A single-page-app shell has no markup of its own; only its scripts say anything about it. */
const isShell = (ev: ArtifactEvidence) => ev.kind === 'site' && ev.facts.shell === true;
const noCode = (ev: ArtifactEvidence) => !ev.sources.some((s) => isCode(s.path) || isMarkup(s.path) || isCss(s.path));

const CHECKS: Check[] = [
  {
    id: 'visual',
    test: /pixel|figma|visual|fidelity|matches? the (design|mock)|look(s)? like|brand/,
    run: () => ({ verdict: 'cannot_assess', evidence: 'Visual fidelity cannot be judged from source code. Compare the live result with the design by eye.' }),
  },
  {
    id: 'responsive',
    test: /responsive|mobile|breakpoint|\b\d{3}\s?px|small screens?|viewport|tablet/,
    run: (ev) => {
      if (noCode(ev) || (isShell(ev) && !ev.sources.some((s) => isCss(s.path) || isCode(s.path)))) return null;
      const t = all(ev);
      const media = count(t, /@media[^{]*\b(min|max)-width/g);
      const tw = count(t, /\b(sm|md|lg|xl):[a-z-]+/g);
      const viewport = /<meta[^>]+name=["']viewport["']/i.test(t);
      const bits = [media && `${media} width media queries (e.g. \`${snip(t, /@media[^{]*\b(min|max)-width[^{]*/)}\`)`, tw && `${tw} Tailwind responsive utilities`, viewport && 'viewport meta tag'].filter(Boolean) as string[];
      if (media + tw >= 3) return { verdict: 'met', evidence: `Found ${bits.join(', ')}.` };
      if (media + tw >= 1 || viewport) return { verdict: 'partial', evidence: bits.length ? `Only ${bits.join(', ')}; little adaptive layout code.` : 'Only a viewport meta tag; no breakpoints.' };
      return { verdict: 'not_met', evidence: `No width media queries or breakpoint utilities in ${ev.sources.length} files read.` };
    },
  },
  {
    id: 'a11y',
    test: /access|a11y|aria|keyboard|screen.?reader|wcag|focus|toggle/,
    run: (ev) => {
      if (noCode(ev) || (isShell(ev) && !ev.sources.some((s) => isCode(s.path)))) return null;
      const t = all(ev);
      const aria = count(t, /\baria-[a-z]+/g);
      const role = count(t, /\brole\s*[=:]\s*["'{]?\s*["']?(switch|tab|button|dialog|checkbox|radio|menu|tablist)/g);
      const buttons = count(t, /<button\b|createElement\(["']button/g);
      const kbd = count(t, /onkeydown|onkeyup|keydown|keyup|tabindex/gi);
      const focus = count(t, /:focus(-visible)?\b|focus-visible:|focus:/g);
      const clickDivs = count(t, /<(div|span)\b[^>]*\bonClick\b/g);
      const labels = count(t, /<label\b|aria-label/g);
      const facts = [`${aria} aria-* attributes`, `${role} ARIA roles`, `${buttons} <button> elements`, `${kbd} keyboard handlers/tabindex`, `${focus} focus styles`].join(', ');
      const good = (aria > 0 ? 1 : 0) + (role > 0 || buttons > 0 ? 1 : 0) + (kbd > 0 || buttons > 0 ? 1 : 0) + (focus > 0 ? 1 : 0);
      if (clickDivs > 0 && role === 0 && kbd === 0) return { verdict: 'not_met', evidence: `${clickDivs} clickable <div>/<span> elements with no role or keyboard handler (${facts}).` };
      if (aria >= 2 && good >= 3) return { verdict: 'met', evidence: `${facts}${labels ? `, ${labels} labels` : ''}.` };
      if (good >= 1) return { verdict: 'partial', evidence: `Some accessibility work: ${facts}.` };
      return { verdict: 'not_met', evidence: `No ARIA attributes, roles, native buttons or keyboard handling found (${facts}).` };
    },
  },
  {
    id: 'tests',
    test: /\btests?\b|testing|coverage|unit test/,
    run: (ev) => {
      if (ev.kind !== 'repo') return null;
      const files = ev.tree.filter((p) => TEST_FILE.test(p) && !/node_modules/.test(p));
      const script = ev.pkg?.scripts.test && !/no test specified/.test(ev.pkg.scripts.test);
      if (files.length >= 2 && script) return { verdict: 'met', evidence: `${files.length} test files (e.g. ${files[0]}) and a "test" script.` };
      if (files.length >= 1 || script) return { verdict: 'partial', evidence: `${files.length} test files, ${script ? 'a "test" script' : 'no "test" script'}.` };
      return { verdict: 'not_met', evidence: 'No test files or test script found in the repository.' };
    },
  },
  {
    id: 'docs',
    test: /readme|documentation|document(ed)?\b|setup instructions|explain/,
    run: (ev) => {
      if (ev.kind !== 'repo') return null;
      const r = ev.readme ?? '';
      if (!r) return { verdict: 'not_met', evidence: 'The repository has no README.' };
      const heads = count(r, /^#{1,3} /gm);
      const run = /install|npm (run|i|start)|yarn|pnpm|pip install|docker|getting started|usage|how to run/i.test(r);
      if (r.length >= 600 && heads >= 2 && run) return { verdict: 'met', evidence: `README is ${r.length} characters with ${heads} sections and run instructions.` };
      return { verdict: 'partial', evidence: `README exists (${r.length} characters, ${heads} sections${run ? '' : ', no run instructions'}).` };
    },
  },
  {
    id: 'typescript',
    test: /typescript|type[- ]?safe|strict types/,
    run: (ev) => {
      if (ev.kind !== 'repo') return null;
      const ts = ev.tree.filter((p) => /\.tsx?$/.test(p) && !/\.d\.ts$/.test(p) && !/node_modules/.test(p)).length;
      const js = ev.tree.filter((p) => /\.jsx?$/.test(p) && !/node_modules|\.config\./.test(p)).length;
      const cfg = ev.tree.some((p) => /(^|\/)tsconfig[^/]*\.json$/.test(p));
      if (ts >= 3 && ts >= js && cfg) return { verdict: 'met', evidence: `${ts} TypeScript files vs ${js} JavaScript, with a tsconfig.` };
      if (ts > 0) return { verdict: 'partial', evidence: `${ts} TypeScript files vs ${js} JavaScript${cfg ? '' : ', no tsconfig'}.` };
      return { verdict: 'not_met', evidence: `No TypeScript files (${js} JavaScript files).` };
    },
  },
  {
    id: 'deployed',
    test: /deploy|live (url|demo|site)|hosted|publicly (accessible|available)/,
    run: (ev) => {
      if (ev.kind === 'site') return ev.status === 'ok' ? { verdict: 'met', evidence: `The URL responded (HTTP ${ev.facts.http ?? 200}).` } : { verdict: 'not_met', evidence: `The URL could not be opened (${ev.status}).` };
      if (ev.kind === 'repo') return ev.facts.homepage ? { verdict: 'partial', evidence: `The repo lists a homepage (${ev.facts.homepage}). It was not opened.` } : { verdict: 'not_met', evidence: 'The repo has no homepage or live URL set.' };
      return null;
    },
  },
  {
    id: 'errors',
    test: /error handling|validat|sanitis|sanitiz|edge cases?|malformed|invalid input/,
    run: (ev) => {
      if (ev.kind !== 'repo' || !ev.sources.some((s) => isCode(s.path))) return null;
      const t = all(ev);
      const tryc = count(t, /\bcatch\s*\(|\.catch\(|except\s+\w*|rescue\b/g);
      const lib = /\b(zod|joi|yup|ajv|class-validator|pydantic|express-validator|valibot)\b/i.exec(t)?.[1];
      const status = count(t, /status\(\s*4\d\d|HttpError|raise HTTPException|abort\(\s*4\d\d/g);
      const fam = (tryc ? 1 : 0) + (lib ? 1 : 0) + (status ? 1 : 0);
      const facts = `${tryc} try/catch sites, ${lib ? `validation via ${lib}` : 'no validation library'}, ${status} explicit 4xx responses`;
      if (fam >= 2) return { verdict: 'met', evidence: `${facts}.` };
      if (fam === 1) return { verdict: 'partial', evidence: `${facts}.` };
      return { verdict: 'not_met', evidence: `No error handling or input validation found in ${ev.sources.length} files read.` };
    },
  },
  {
    id: 'animation',
    test: /anim|transition|motion|smooth|easing/,
    run: (ev, criterion) => {
      if (noCode(ev) || (isShell(ev) && !ev.sources.some((s) => isCode(s.path) || isCss(s.path)))) return null;
      const sig = /@keyframes|\btransition\s*:|transition-[a-z]+|\banimate-[a-z]+|animation\s*:|framer-motion|motion\/react|\bgsap\b|requestAnimationFrame|\.animate\(|useSpring|react-spring|anime\.js/;
      const withSignal = ev.sources.filter((s) => sig.test(s.text));
      if (!withSignal.length) return { verdict: 'not_met', evidence: `No CSS transitions, keyframes or animation libraries found in ${ev.sources.length} files read.` };
      const topics = topicWords(criterion).filter((w) => !/anim|transit|motion|smooth|easing/.test(w));
      const tied = topics.length ? withSignal.find((s) => topics.some((w) => s.text.toLowerCase().includes(w))) : undefined;
      const kinds = [...new Set(withSignal.flatMap((s) => (s.text.match(new RegExp(sig.source, 'g')) ?? []).map((m) => m.replace(/\s*:$/, ''))))].slice(0, 3);
      if (tied) return { verdict: 'met', evidence: `Animation code (${kinds.join(', ')}) in ${tied.path}, which also references "${topics.find((w) => tied.text.toLowerCase().includes(w))}".` };
      return { verdict: 'partial', evidence: `Animation code exists (${kinds.join(', ')}) in ${withSignal.length} files, but we could not tie it to the specific behaviour. Check it by eye.` };
    },
  },
  {
    id: 'structure',
    test: /structure|modular|organi[sz]ed|maintainab|separation of|component/,
    run: (ev) => {
      if (ev.kind !== 'repo') return null;
      const src = ev.tree.filter((p) => isCode(p) && !/node_modules|dist\/|build\/|\.min\./.test(p));
      if (!src.length) return null;
      const dirs = new Set(src.map((p) => p.split('/').slice(0, -1).join('/')));
      const longest = Math.max(0, ...ev.sources.filter((s) => isCode(s.path)).map((s) => s.text.split('\n').length));
      if (src.length >= 5 && dirs.size >= 3 && longest <= 500) return { verdict: 'met', evidence: `${src.length} source files across ${dirs.size} directories; longest file read is ${longest} lines.` };
      if (src.length >= 2) return { verdict: 'partial', evidence: `${src.length} source files in ${dirs.size} directories${longest > 500 ? `; one file is ${longest} lines` : ''}.` };
      return { verdict: 'not_met', evidence: 'All logic is in a single source file.' };
    },
  },
  {
    id: 'history',
    test: /commit|git history|incremental|version control/,
    run: (ev) => {
      if (ev.kind !== 'repo' || typeof ev.facts.commits !== 'number') return null;
      const n = ev.facts.commits as number;
      const days = Number(ev.facts.commitDays ?? 0);
      if (n >= 8 && days >= 2) return { verdict: 'met', evidence: `${n} commits over ${days} days.` };
      if (n >= 3) return { verdict: 'partial', evidence: `${n} commits over ${days} day(s).` };
      return { verdict: 'not_met', evidence: `Only ${n} commit(s) in the history.` };
    },
  },
  {
    id: 'tooling',
    test: /\bci\b|continuous integration|lint|pipeline|workflow|formatting/,
    run: (ev) => {
      if (ev.kind !== 'repo') return null;
      const ci = ev.tree.some((p) => /^\.github\/workflows\/|(^|\/)\.gitlab-ci\.yml$|(^|\/)\.circleci\//.test(p));
      const lint = ev.tree.some((p) => /eslint|biome|prettier|ruff|flake8/i.test(p)) || !!ev.pkg?.scripts.lint;
      if (ci && lint) return { verdict: 'met', evidence: 'A CI workflow and lint/format config are present.' };
      if (ci || lint) return { verdict: 'partial', evidence: ci ? 'A CI workflow is present, no lint config found.' : 'Lint/format config is present, no CI workflow found.' };
      return { verdict: 'not_met', evidence: 'No CI workflow or lint configuration found.' };
    },
  },
  {
    id: 'loads',
    test: /\bworks\b|working|\bruns\b|loads?\b|renders?\b|functional|usable/,
    run: (ev) => {
      if (ev.kind === 'site') return ev.status === 'ok' ? { verdict: 'partial', evidence: `The page loads (HTTP ${ev.facts.http ?? 200}, ${ev.facts.textChars ?? 0} characters of visible text). Interactions were not exercised.` } : { verdict: 'not_met', evidence: `The page did not load (${ev.status}).` };
      if (ev.kind === 'repo') {
        const build = ev.pkg?.scripts.build || ev.pkg?.scripts.start || ev.pkg?.scripts.dev;
        return build ? { verdict: 'partial', evidence: `package.json defines a run/build script ("${build.slice(0, 40)}"). The code was not executed.` } : null;
      }
      return null;
    },
  },
];

/** Marks a criterion no deterministic check covers: the only ones a model is allowed to look at. */
export const NO_CHECK_MSG = 'No automated check covers this criterion. It needs a human look.';

/** Run the deterministic checks. Anything no check applies to is `cannot_assess`, never a guess. */
export function runChecks(rubric: string[], ev: ArtifactEvidence): CriterionResult[] {
  return rubric.map((criterion) => {
    if (ev.status !== 'ok') {
      const why = ev.kind === 'text' || ev.kind === 'none' ? 'No project link was submitted, so there is nothing to inspect.' : `We could not open the submission (${ev.status}${ev.note ? `: ${ev.note}` : ''}).`;
      return { criterion, verdict: 'cannot_assess' as const, evidence: why, by: 'check' as const };
    }
    const c = criterion.toLowerCase();
    for (const chk of CHECKS) {
      if (!chk.test.test(c)) continue;
      const r = chk.run(ev, criterion);
      if (r) return { criterion, ...r, by: 'check' as const };
    }
    return { criterion, verdict: 'cannot_assess' as const, evidence: NO_CHECK_MSG, by: 'check' as const };
  });
}

export function scoreReview(criteria: CriterionResult[]) {
  const total = criteria.length;
  const assessed = criteria.filter((c) => c.verdict !== 'cannot_assess');
  const earned = assessed.reduce((a, c) => a + (c.verdict === 'met' ? 1 : c.verdict === 'partial' ? 0.5 : 0), 0);
  const score = assessed.length ? Math.round((earned / assessed.length) * 100) : 0;
  const coverage = total ? assessed.length / total : 0;
  const status: ReviewStatus = !assessed.length ? 'unassessed' : coverage < 0.6 ? 'partial' : 'assessed';
  return { score, coverage: Math.round(coverage * 100) / 100, assessed: assessed.length, total, status };
}

export function recommendationFor(r: Pick<SubmissionReview, 'status' | 'score' | 'flags'>): Recommendation {
  if (r.status === 'sample') return 'review';
  if (r.status === 'unassessed' || r.status === 'partial') return 'review';
  const warned = r.flags.some((f) => f.level === 'warn');
  if (r.score >= 80) return warned ? 'maybe' : 'shortlist';
  if (r.score >= 55) return 'maybe';
  return 'reject';
}

export function summarizeReview(r: SubmissionReview): string {
  const open = { repo: 'a GitHub repository', site: 'a live site', figma: 'a Figma link', text: 'a text write-up', none: 'nothing' }[r.inspected.kind];
  if (r.status === 'sample') return 'Demo submission. It was never inspected.';
  if (r.status === 'unassessed') return `Opened ${open}, but none of the ${r.total} rubric criteria could be assessed automatically. A human needs to review it.`;
  const tally = (['met', 'partial', 'not_met'] as const).map((v) => [v, r.criteria.filter((c) => c.verdict === v).length] as const).filter(([, n]) => n);
  const names = { met: 'met', partial: 'partly met', not_met: 'not met' } as const;
  const open2 = r.criteria.filter((c) => c.verdict === 'cannot_assess');
  return `Inspected ${open} (${r.inspected.filesRead.length} files read). ${r.assessed} of ${r.total} criteria assessed: ${tally.map(([v, n]) => `${n} ${names[v]}`).join(', ')}.${open2.length ? ` ${open2.length} need${open2.length === 1 ? 's' : ''} a human look.` : ''}`;
}

export function buildReview(rubric: string[], ev: ArtifactEvidence, criteria: CriterionResult[], flags: ReviewFlag[], method: SubmissionReview['method']): SubmissionReview {
  const s = scoreReview(criteria);
  const { tree: _t, sources: _s, pkg: _p, html: _h, readme: _r, ...summary } = ev;
  void _t; void _s; void _p; void _h; void _r; void rubric;
  return { ...s, method, criteria, flags, inspected: summary, at: Date.now() };
}
