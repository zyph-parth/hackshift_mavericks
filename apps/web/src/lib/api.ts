import type { MatchBreakdown, Mentor, Role, SkillClaim, FounderProfile, Compat, Recommendation, SubmissionReview } from '@launchloop/shared';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: { path: string; message: string }[]) {
    super(message);
  }
}

/** Access token lives in memory only. The refresh token is an httpOnly cookie. */
let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
};

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(async (r) => {
      if (!r.ok) return false;
      token = ((await r.json()) as { token: string }).token;
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const run = () =>
    fetch(`/api${path}`, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      credentials: 'include',
      headers: { ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  let res: Response;
  try {
    res = await run();
  } catch {
    throw new ApiError(0, 'network', 'Can’t reach the server. Check your connection and try again.');
  }
  if (res.status === 401 && !path.startsWith('/auth/') && (await refresh())) res = await run();
  if (!res.ok) {
    const e = (await res.json().catch(() => null)) as { error?: { code: string; message: string; details?: { path: string; message: string }[] } } | null;
    throw new ApiError(res.status, e?.error?.code ?? 'error', e?.error?.message ?? 'Something went wrong.', e?.error?.details);
  }
  return (await res.json()) as T;
}

export const post = <T>(path: string, body: unknown = {}) => api<T>(path, { method: 'POST', body });
export const patchApi = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body });
export const put = <T>(path: string, body: unknown) => api<T>(path, { method: 'PUT', body });
export const tryRefresh = refresh;

/* --------------------------------- types ---------------------------------- */
export interface PublicUser {
  id: string;
  username: string;
  name: string;
  headline: string;
  bio: string;
  college: string;
  location: string;
  hue: number;
  skills: SkillClaim[];
  links: { github?: string; linkedin?: string; website?: string };
  openTo: string[];
  interviewsDone: number;
  tasksDone: number;
  earned: number;
  roles: Role[];
  company?: string;
  verifiedScore: number;
  /** Only set when the user proved they control this GitHub account. `links.github` is just a typed-in link. */
  github: { username: string } | null;
}
export interface Me extends PublicUser {
  email: string;
  activeRole: Role;
  onboarded: boolean;
  plan: 'free' | 'pro';
  githubChallenge: { username: string; code: string } | null;
  founder?: { has: string[]; needs: string[]; commitment: 'Full-time' | 'Part-time'; stage: string; values: string[] };
  mentorId?: string;
}
export interface JobT {
  id: string;
  title: string;
  startup: string;
  startupHue: number;
  stage: string;
  type: 'Full-time' | 'Internship' | 'Contract';
  remote: boolean;
  location: string;
  stipend: string;
  equity: string | null;
  required: { name: string; weight: number }[];
  summary: string;
  posted: string;
  /** hours since posting */
  age: number;
  applicants: number;
  status: 'open' | 'closed';
  ownerId: string | null;
}
export interface JobRow {
  job: JobT;
  match?: MatchBreakdown;
  applied?: { stage: string; note: string; id: string } | null;
}
export interface TaskT {
  id: string;
  title: string;
  startup: string;
  startupHue: number;
  reward: number;
  deadline: string;
  skills: string[];
  brief: string;
  rubric: string[];
  funded: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  submissions: number;
  status: 'open' | 'closed';
  ownerId: string | null;
  mine: null | { id: string; aiScore: number; status: string; summary: string; meets: string[]; missing: string[]; recommendation: string; review: SubmissionReview };
}
export interface SubmissionT {
  id: string;
  taskId: string;
  talentId: string;
  link: string;
  text: string;
  aiScore: number;
  recommendation: Recommendation;
  meets: string[];
  missing: string[];
  summary: string;
  status: 'submitted' | 'accepted' | 'rejected';
  review: SubmissionReview;
  talent: PublicUser | null;
}
export interface ApplicationRow {
  id: string;
  jobId: string;
  note: string;
  match: number;
  stage: 'Applied' | 'Shortlisted' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';
  created: number;
  job: { id: string; title: string; startup: string; startupHue: number; location: string } | null;
}
export interface ThreadRow {
  id: string;
  subject: string;
  kind: string;
  lastAt: number;
  other: PublicUser | null;
  last?: { text: string; from: string; created: number };
  unread: number;
}
export interface MessageT {
  id: string;
  from: string;
  text: string;
  created: number;
}
export interface NoticeT {
  id: string;
  text: string;
  link?: string;
  read: boolean;
  created: number;
}
export interface InterviewResultT {
  id?: string;
  scores: Record<string, number>;
  overall: number;
  detail: { q: string; skill: string; answer: string; score: number; feedback: string }[];
  signals: number;
}
export type MentorT = Mentor & { taken: string[] };
export interface CofounderRow {
  founder: FounderProfile;
  compat: Compat;
  proposed: boolean;
}
