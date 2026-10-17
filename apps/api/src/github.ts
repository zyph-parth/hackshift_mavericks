const TOKEN = process.env.GITHUB_TOKEN;

export interface GhResult<T = unknown> {
  status: number;
  data?: T;
  text?: string;
  /** GitHub's anonymous quota (60/hour) is easy to exhaust. Set GITHUB_TOKEN to lift it. */
  limited: boolean;
}

/** Call api.github.com. Only ever goes to this one fixed host. */
export async function gh<T = unknown>(path: string, opts: { raw?: boolean } = {}): Promise<GhResult<T>> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: opts.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'user-agent': 'launchloop',
      'x-github-api-version': '2022-11-28',
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  const limited = (res.status === 403 || res.status === 429) && (res.headers.get('x-ratelimit-remaining') === '0' || res.status === 429);
  if (!res.ok) return { status: res.status, limited };
  if (opts.raw) return { status: res.status, text: await res.text(), limited };
  return { status: res.status, data: (await res.json()) as T, limited };
}

/** Raw file contents from raw.githubusercontent.com. Another fixed host. */
export async function ghRaw(owner: string, repo: string, ref: string, path: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, { headers: { 'user-agent': 'launchloop' }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res?.ok) return null;
  return res.text();
}

/** True if any *public* gist carries the one-time code in its description or a filename. */
export function gistsProveCode(gists: { description: string | null; public?: boolean; files?: Record<string, unknown> }[], code: string): boolean {
  return gists.some((g) => g.public !== false && ((g.description ?? '').includes(code) || Object.keys(g.files ?? {}).some((n) => n.includes(code))));
}

export const GH_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
export const GH_REPO = /^[A-Za-z0-9_.-]{1,100}$/;
