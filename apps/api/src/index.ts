import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { z, ZodError } from 'zod';
import {
  ASSESSED,
  EVIDENCE_WEIGHT,
  READINESS_AXES,
  analyseIdea,
  cofounderCompat,
  draftJobDescription,
  draftPitchNote,
  gradeAnswer,
  matchScore,
  reviewDeck,
  roadmapFor,
  verifiedScore,
  type Evidence,
  type FounderProfile,
  type Recommendation,
  type ReviewFlag,
  type SubmissionReview,
  type Job,
  type Mentor,
  type Role,
  type SkillClaim,
} from '@launchloop/shared';
import { count, get, insert, list, patch, remove, update, uid, type Doc } from './db';
import {
  HttpError, IS_PROD, SECRET, effectivePlan, sampleReview, auth, checkPassword, hashPassword, notify, openThread, privateUser, publicUser,
  requireRole, semanticSimilarity, signAccess, signRefresh, toTalent,
  type ApplicationData, type BillingData, type JobData, type MessageData, type NoticeData, type SubmissionData, type TaskData, type ThreadData, type UserData,
} from './lib';
import { DEMO, seed } from './seed';
import { evaluateSubmission } from './evaluate';
import { canonicalLink } from './inspect';
import { gh, gistsProveCode } from './github';
import { PRO, RZP_ENABLED, RZP_KEY_ID, RZP_TEST_MODE, RazorpayError, capturePayment, createOrder, fetchPayment, validCheckoutSignature, validWebhookSignature } from './razorpay';
import { randomBytes } from 'node:crypto';
import { AI_LIVE, MODELS, DeckSchema, GradeSchema, IdeaSchema, TextSchema, generate } from './ai';

seed();

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_URL ?? true, credentials: true }));
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { (req as Request).rawBody = buf; } }));
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

/* ------------------------------ rate limiting ----------------------------- */
const hits = new Map<string, number[]>();
const limit = (name: string, max: number, windowMs = 60_000) => (req: Request, res: Response, next: NextFunction) => {
  const key = `${name}:${req.user?.id ?? req.ip}`;
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return void res.status(429).json({ error: { code: 'rate_limited', message: 'Too many requests. Try again in a minute.' } });
  arr.push(now);
  hits.set(key, arr);
  next();
};

const body = <T>(schema: z.ZodType<T>, req: Request): T => schema.parse(req.body);
const cookie = (req: Request, name: string) =>
  req.headers.cookie?.split(';').map((c) => c.trim().split('=')).find(([k]) => k === name)?.[1];
const setRefresh = (res: Response, id: string) =>
  res.cookie('ll_refresh', signRefresh(id), { httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: 30 * 86400_000, path: '/api/auth' });
const me = (req: Request) => req.user!;
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const usernameFor = (name: string) => {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'user';
  let u = base;
  let i = 1;
  while (list<UserData>('users').some((x) => x.data.username === u)) u = `${base}${++i}`;
  return u;
};

/* ---------------------------------- health -------------------------------- */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: AI_LIVE ? 'groq' : 'fallback', users: count('users'), uptime: Math.round(process.uptime()) });
});
app.get('/api/stats', (_req, res) => {
  const users = list<UserData>('users');
  res.json({
    talents: users.filter((u) => u.data.roles.includes('talent')).length,
    startups: users.filter((u) => u.data.roles.some((r) => r === 'founder' || r === 'recruiter')).length,
    tasksPaid: list('payments').length,
    mentorHours: list('bookings').length,
    openJobs: list<JobData>('jobs').filter((j) => j.data.status === 'open').length,
  });
});
app.get('/api/demo-accounts', (_req, res) => {
  res.json({ password: DEMO.password, accounts: [
    { role: 'talent', email: DEMO.talent.email, label: 'Priya, frontend engineer' },
    { role: 'founder', email: DEMO.founder.email, label: 'Arjun, SME invoicing founder' },
    { role: 'recruiter', email: DEMO.recruiter.email, label: 'Neha, Nimbus Health recruiter' },
    { role: 'mentor', email: DEMO.mentor.email, label: 'Ravi, VC mentor' },
  ] });
});

/* ----------------------------------- auth --------------------------------- */
const RoleEnum = z.enum(['talent', 'founder', 'recruiter', 'mentor']);
app.post('/api/auth/signup', limit('auth', 10), (req, res) => {
  const b = body(z.object({ name: z.string().trim().min(2).max(80), email: z.string().email().toLowerCase(), password: z.string().min(8).max(128), roles: z.array(RoleEnum).min(1).default(['talent']) }), req);
  if (list<UserData>('users', { ref: b.email }).length) throw new HttpError(409, 'email_taken', 'An account with this email already exists. Try signing in.');
  const u = insert<UserData>('users', {
    email: b.email, pw: hashPassword(b.password), name: b.name, roles: b.roles, activeRole: b.roles[0], hue: hue(b.email),
    username: usernameFor(b.name), headline: '', bio: '', college: '', location: '', skills: [], links: {}, openTo: ['remote'],
    interviewsDone: 0, tasksDone: 0, earned: 0, onboarded: false, plan: 'free',
    founder: b.roles.includes('founder') ? { has: [], needs: [], commitment: 'Full-time', stage: 'Idea', values: [] } : undefined,
  }, { ref: b.email });
  notify(u.id, 'Welcome to LaunchLoop. Finish your profile to start getting matched.', '/profile');
  setRefresh(res, u.id);
  res.status(201).json({ token: signAccess(u.id), user: privateUser(u) });
});

app.post('/api/auth/login', limit('auth', 10), (req, res) => {
  const b = body(z.object({ email: z.string().email().toLowerCase(), password: z.string().min(1) }), req);
  const u = list<UserData>('users', { ref: b.email })[0];
  if (!u || !checkPassword(b.password, u.data.pw)) throw new HttpError(401, 'bad_credentials', 'Email or password is incorrect.');
  setRefresh(res, u.id);
  res.json({ token: signAccess(u.id), user: privateUser(u) });
});

app.post('/api/auth/refresh', (req, res) => {
  const t = cookie(req, 'll_refresh');
  if (!t) throw new HttpError(401, 'no_session', 'No session.');
  try {
    const p = jwt.verify(t, SECRET) as { sub: string; t?: string };
    const u = get<UserData>('users', p.sub);
    if (!u || p.t !== 'r') throw new Error();
    res.json({ token: signAccess(u.id), user: privateUser(u) });
  } catch {
    throw new HttpError(401, 'no_session', 'Session expired.');
  }
});
app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('ll_refresh', { path: '/api/auth' });
  res.json({ ok: true });
});

/* ------------------------------------ me ---------------------------------- */
app.get('/api/me', auth, (req, res) => res.json({ user: privateUser(me(req)) }));

const SkillIn = z.object({ name: z.string().trim().min(1).max(40), level: z.number().min(0).max(100) });
app.patch('/api/me', auth, (req, res) => {
  const b = body(z.object({
    name: z.string().trim().min(2).max(80).optional(), headline: z.string().max(140).optional(), bio: z.string().max(600).optional(),
    college: z.string().max(100).optional(), location: z.string().max(80).optional(), company: z.string().max(100).optional(),
    links: z.object({ github: z.string().max(120).optional(), linkedin: z.string().max(120).optional(), website: z.string().max(120).optional() }).optional(),
    openTo: z.array(z.string()).optional(), skills: z.array(SkillIn).max(40).optional(), activeRole: RoleEnum.optional(), onboarded: z.boolean().optional(),
    addRoles: z.array(RoleEnum).optional(),
    roles: z.array(RoleEnum).min(1).optional(),
    founder: z.object({ has: z.array(z.string()), needs: z.array(z.string()), commitment: z.enum(['Full-time', 'Part-time']), stage: z.string(), values: z.array(z.string()) }).optional(),
  }), req);
  const u = me(req);
  const next: UserData = { ...u.data };
  const { skills, addRoles, activeRole, roles, ...rest } = b;
  Object.assign(next, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
  if (roles) { next.roles = [...new Set(roles)]; if (!next.roles.includes(next.activeRole)) next.activeRole = next.roles[0]; }
  if (addRoles) next.roles = [...new Set([...next.roles, ...addRoles])];
  if (activeRole) {
    if (!next.roles.includes(activeRole)) throw new HttpError(403, 'forbidden', 'You do not have that role yet.');
    next.activeRole = activeRole;
  }
  if (next.roles.includes('founder') && !next.founder) next.founder = { has: [], needs: [], commitment: 'Full-time', stage: 'Idea', values: [] };
  if (skills) {
    // users can add or re-rate skills, but can never forge verified evidence
    const byName = new Map(next.skills.map((s) => [s.name.toLowerCase(), s]));
    next.skills = skills.map((s) => {
      const cur = byName.get(s.name.toLowerCase());
      if (cur && cur.evidence !== 'self') return cur;
      return { name: s.name, evidence: 'self' as Evidence, level: Math.min(s.level, 85) };
    });
  }
  update('users', u.id, next);
  res.json({ user: privateUser({ ...u, data: next }) });
});

const KNOWN_SKILLS = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'PostgreSQL', 'SQL', 'MongoDB', 'Figma', 'Go', 'Rust', 'Java', 'Next.js', 'Vue', 'Angular', 'Tailwind', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Flutter', 'Swift', 'Kotlin', 'Machine Learning', 'Data Analysis', 'System Design', 'GraphQL', 'Redis', 'Product Management', 'Sales', 'Marketing', 'Operations', 'UI Design', 'Copywriting', 'DevOps', 'C++'];
app.post('/api/me/resume', auth, (req, res) => {
  const { text } = body(z.object({ text: z.string().min(20).max(30_000) }), req);
  const t = text.toLowerCase();
  const found = KNOWN_SKILLS.filter((s) => new RegExp(`(^|[^a-z])${s.toLowerCase().replace(/[.+#]/g, '\\$&')}([^a-z]|$)`).test(t));
  const years = text.match(/(\d+)\+?\s*(years|yrs)/i);
  const college = text.match(/(IIIT[\w\s-]*|IIT[\w\s-]*|NIT[\w\s-]*|BITS[\w\s-]*|DTU|NSUT|VIT|Manipal)/i)?.[0].trim();
  const name = text.split('\n').map((l) => l.trim()).find((l) => /^[A-Za-z]+( [A-Za-z]+){1,3}$/.test(l));
  const u = me(req);
  const existing = new Map(u.data.skills.map((s) => [s.name.toLowerCase(), s]));
  const merged: SkillClaim[] = [...u.data.skills];
  for (const s of found) if (!existing.has(s.toLowerCase())) merged.push({ name: s, evidence: 'self', level: 60 + (years ? Math.min(Number(years[1]) * 4, 20) : 0) });
  const next = { ...u.data, skills: merged, college: u.data.college || college || '' };
  update('users', u.id, next);
  res.json({ parsed: { name, college, skills: found, years: years?.[1] ?? null }, user: privateUser({ ...u, data: next }) });
});

const LANG_SKILL: Record<string, string> = { TypeScript: 'TypeScript', JavaScript: 'JavaScript', Python: 'Python', Go: 'Go', Rust: 'Rust', Java: 'Java', Kotlin: 'Kotlin', Swift: 'Swift', Dart: 'Flutter', 'C++': 'C++', Vue: 'Vue', HTML: 'Frontend', CSS: 'CSS', Shell: 'DevOps', Dockerfile: 'Docker' };
/** Imported activity is never worth more than this. It says someone wrote code in a language, not how well. */
const GITHUB_ACTIVITY_CAP = 60;

/**
 * Typing a username proves nothing: anyone can type anyone's. So linking is two steps. We hand out a one-time
 * code, the user puts it in the description of a public gist on that account, and only then do we trust it.
 */
app.post('/api/me/github/challenge', auth, requireRole('talent'), limit('gh', 10), async (req, res) => {
  const { username } = body(z.object({ username: z.string().trim().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, 'Enter just your GitHub username') }), req);
  const r = await gh(`/users/${username}`).catch(() => null);
  if (!r) throw new HttpError(502, 'github_unreachable', 'Could not reach GitHub right now. Try again shortly.');
  if (r.limited) throw new HttpError(503, 'github_rate_limited', 'GitHub is rate-limiting us. Try again in a few minutes.');
  if (r.status === 404) throw new HttpError(404, 'github_not_found', 'No GitHub user with that name.');
  if (!r.data) throw new HttpError(502, 'github_error', 'GitHub returned an unexpected response. Try again shortly.');
  const taken = list<UserData>('users').find((x) => x.id !== me(req).id && x.data.github?.username.toLowerCase() === username.toLowerCase());
  if (taken) throw new HttpError(409, 'github_taken', 'That GitHub account is already linked to another LaunchLoop profile.');
  const code = `launchloop-verify-${randomBytes(6).toString('hex')}`;
  const u = me(req);
  update('users', u.id, { ...u.data, githubChallenge: { username, code, expires: Date.now() + 30 * 60_000 } });
  res.json({ username, code, expiresInMinutes: 30 });
});

app.post('/api/me/github/verify', auth, requireRole('talent'), limit('gh', 10), async (req, res) => {
  const u = me(req);
  const c = u.data.githubChallenge;
  if (!c || c.expires < Date.now()) throw new HttpError(400, 'no_challenge', 'That code expired. Start again to get a new one.');
  const g = await gh<{ description: string | null; public: boolean; files: Record<string, unknown> }[]>(`/users/${c.username}/gists?per_page=50`).catch(() => null);
  if (!g) throw new HttpError(502, 'github_unreachable', 'Could not reach GitHub right now. Try again shortly.');
  if (g.limited) throw new HttpError(503, 'github_rate_limited', 'GitHub is rate-limiting us. Try again in a few minutes.');
  if (!g.data) throw new HttpError(502, 'github_error', 'GitHub returned an unexpected response. Try again shortly.');
  if (!gistsProveCode(g.data, c.code)) throw new HttpError(422, 'code_not_found', `We could not find a public gist on github.com/${c.username} with that code in its description yet. Create it, then try again.`);
  const taken = list<UserData>('users').find((x) => x.id !== u.id && x.data.github?.username.toLowerCase() === c.username.toLowerCase());
  if (taken) throw new HttpError(409, 'github_taken', 'That GitHub account is already linked to another LaunchLoop profile.');
  const next: UserData = { ...u.data, githubChallenge: undefined, github: { username: c.username, verifiedAt: Date.now() }, links: { ...u.data.links, github: `github.com/${c.username}` } };
  update('users', u.id, next);
  res.json(await importGithub({ ...u, data: next }));
});

app.post('/api/me/github/refresh', auth, requireRole('talent'), limit('gh', 6), async (req, res) => {
  const u = me(req);
  if (!u.data.github) throw new HttpError(400, 'not_linked', 'Link and verify a GitHub account first.');
  res.json(await importGithub(u));
});

/** Turn public-repo activity into *imported activity* skill claims. Never assessed, never above the cap. */
async function importGithub(u: Doc<UserData>) {
  const username = u.data.github!.username;
  const r = await gh<{ language: string | null; stargazers_count: number; fork: boolean; pushed_at: string }[]>(`/users/${username}/repos?per_page=100&sort=pushed`).catch(() => null);
  if (!r) throw new HttpError(502, 'github_unreachable', 'Could not reach GitHub right now. Try again shortly.');
  if (r.limited) throw new HttpError(503, 'github_rate_limited', 'GitHub is rate-limiting us. Try again in a few minutes.');
  if (!r.data) throw new HttpError(502, 'github_error', 'GitHub returned an unexpected response. Try again shortly.');
  const own = r.data.filter((x) => !x.fork && x.language);
  const agg = new Map<string, { repos: number; stars: number; last: string }>();
  for (const rp of own) {
    const skill = LANG_SKILL[rp.language!] ?? rp.language!;
    const cur = agg.get(skill) ?? { repos: 0, stars: 0, last: '' };
    agg.set(skill, { repos: cur.repos + 1, stars: cur.stars + rp.stargazers_count, last: rp.pushed_at > cur.last ? rp.pushed_at : cur.last });
  }
  const skills = [...u.data.skills];
  const added: string[] = [];
  const yearAgo = new Date(Date.now() - 365 * 86400_000).toISOString();
  for (const [name, a] of [...agg].sort((x, y) => y[1].repos - x[1].repos).slice(0, 6)) {
    const level = Math.min(GITHUB_ACTIVITY_CAP, 30 + a.repos * 6 + (a.last > yearAgo ? 10 : 0));
    const i = skills.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
    const claim: SkillClaim = { name, evidence: 'github', level, source: `Imported GitHub activity: ${a.repos} original repo${a.repos > 1 ? 's' : ''} in ${name}, last pushed ${a.last.slice(0, 10)}. Not assessed.` };
    if (i >= 0) {
      // never overwrite anything we assessed ourselves
      if (EVIDENCE_WEIGHT[skills[i].evidence] <= EVIDENCE_WEIGHT.github && !ASSESSED[skills[i].evidence]) skills[i] = { ...claim, name: skills[i].name };
    } else skills.push(claim);
    added.push(name);
  }
  const next: UserData = { ...u.data, skills, github: { ...u.data.github!, importedAt: Date.now() } };
  update('users', u.id, next);
  return { added, repos: own.length, user: privateUser({ ...u, data: next }) };
}

/* ------------------------------ public profiles --------------------------- */
app.get('/api/users/:username', auth, (req, res) => {
  const u = list<UserData>('users').find((x) => x.data.username === req.params.username);
  if (!u) throw new HttpError(404, 'not_found', 'No such profile.');
  res.json({ user: publicUser(u) });
});

app.get('/api/talent', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const q = String(req.query.q ?? '').toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1);
  const rows = list<UserData>('users')
    .filter((u) => u.data.roles.includes('talent') && u.data.skills.length)
    .map((u) => {
      const hits = u.data.skills.filter((s) => q.some((w) => s.name.toLowerCase().includes(w)));
      const strength = hits.reduce((a, s) => a + EVIDENCE_WEIGHT[s.evidence] * (s.level / 100), 0);
      return { u, hits: hits.length, strength };
    })
    .filter((x) => !q.length || x.hits > 0)
    .sort((a, b) => b.strength - a.strength || verifiedScore(b.u.data.skills) - verifiedScore(a.u.data.skills))
    .slice(0, 30);
  res.json({ talent: rows.map((x) => publicUser(x.u)) });
});

/* ------------------------------------ jobs -------------------------------- */
/** Age in hours. Seeded jobs carry a fixed "Nd ago" label; posted ones use their creation time. */
function jobAge(j: Doc<JobData>) {
  const seeded = j.data.posted.match(/^(\d+)([hd]) ago$/);
  if (seeded) return Number(seeded[1]) * (seeded[2] === 'd' ? 24 : 1);
  return Math.max(0, (Date.now() - j.created) / 3600_000);
}
const ageLabel = (h: number) => (h < 1 ? 'just now' : h < 24 ? `${Math.floor(h)}h ago` : `${Math.floor(h / 24)}d ago`);

function jobView(j: Doc<JobData>, viewer?: Doc<UserData>) {
  const apps = list<ApplicationData>('applications', { ref: j.id });
  const { status, ...job } = j.data;
  const age = jobAge(j);
  const base = { ...job, id: j.id, status, ownerId: j.owner, applicants: j.data.applicants + apps.length, posted: ageLabel(age), age: Math.round(age) };
  if (!viewer || !viewer.data.roles.includes('talent')) return { job: base };
  const talent = toTalent(viewer);
  const text = `${talent.headline} ${talent.bio} ${talent.skills.map((s) => s.name).join(' ')}`;
  const jt = `${job.title} ${job.summary} ${job.required.map((r) => r.name).join(' ')}`;
  const withSem: Job = { ...base, semantic: semanticSimilarity(text, jt) };
  const m = matchScore(talent, withSem);
  const mine = apps.find((a) => a.data.talentId === viewer.id);
  return { job: base, match: m, applied: mine ? { stage: mine.data.stage, note: mine.data.note, id: mine.id } : null };
}

app.get('/api/jobs', auth, (req, res) => {
  const rows = list<JobData>('jobs').filter((j) => j.data.status === 'open').map((j) => jobView(j, me(req)));
  if (me(req).data.roles.includes('talent')) rows.sort((a, b) => (b.match?.total ?? 0) - (a.match?.total ?? 0));
  res.json({ jobs: rows });
});
app.get('/api/jobs/mine', auth, requireRole('recruiter', 'founder'), (req, res) => {
  res.json({ jobs: list<JobData>('jobs', { owner: me(req).id }).map((j) => jobView(j)) });
});
const JobIn = z.object({
  title: z.string().trim().min(3).max(100), summary: z.string().trim().min(20).max(4000),
  type: z.enum(['Full-time', 'Internship', 'Contract']), remote: z.boolean(), location: z.string().max(80),
  stipend: z.string().max(60), equity: z.string().max(40).nullable().optional(), stage: z.enum(['Pre-seed', 'Seed', 'Series A']),
  required: z.array(z.object({ name: z.string().trim().min(1).max(40), weight: z.number().min(1).max(5) })).min(1).max(10),
});
app.post('/api/jobs', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const b = body(JobIn, req);
  const u = me(req);
  const j = insert<JobData>('jobs', {
    ...b, equity: b.equity ?? null, startup: u.data.company || u.data.name, startupHue: u.data.hue,
    posted: 'just now', applicants: 0, semantic: 0.5, status: 'open',
  }, { owner: u.id });
  res.status(201).json(jobView(j));
});
app.patch('/api/jobs/:id', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const j = get<JobData>('jobs', String(req.params.id));
  if (!j || j.owner !== me(req).id) throw new HttpError(404, 'not_found', 'Job not found.');
  const { status } = body(z.object({ status: z.enum(['open', 'closed']) }), req);
  res.json(jobView(patch<JobData>('jobs', j.id, { status })!));
});

app.post('/api/jobs/:id/apply', auth, requireRole('talent'), (req, res) => {
  const j = get<JobData>('jobs', String(req.params.id));
  if (!j || j.data.status !== 'open') throw new HttpError(404, 'not_found', 'This role is no longer open.');
  const { note } = body(z.object({ note: z.string().trim().min(10).max(1200) }), req);
  const u = me(req);
  if (list<ApplicationData>('applications', { ref: j.id }).some((a) => a.data.talentId === u.id)) throw new HttpError(409, 'already_applied', 'You already applied to this role.');
  const v = jobView(j, u);
  const a = insert<ApplicationData>('applications', { jobId: j.id, talentId: u.id, note, match: v.match?.total ?? 0, stage: 'Applied' }, { owner: u.id, ref: j.id });
  if (j.owner) openThread(u.id, j.owner, `${j.data.title} at ${j.data.startup}`, 'application', note);
  if (j.owner) notify(j.owner, `${u.data.name} applied to ${j.data.title} (${v.match?.total ?? 0}% match)`, `/recruiter`);
  res.status(201).json({ application: a.data, id: a.id });
});
app.get('/api/applications/mine', auth, (req, res) => {
  const rows = list<ApplicationData>('applications', { owner: me(req).id }).map((a) => {
    const j = get<JobData>('jobs', a.data.jobId);
    return { id: a.id, ...a.data, created: a.created, job: j ? { id: j.id, title: j.data.title, startup: j.data.startup, startupHue: j.data.startupHue, location: j.data.location } : null };
  });
  res.json({ applications: rows });
});
app.get('/api/jobs/:id/applications', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const j = get<JobData>('jobs', String(req.params.id));
  if (!j || j.owner !== me(req).id) throw new HttpError(404, 'not_found', 'Job not found.');
  const rows = list<ApplicationData>('applications', { ref: j.id }).map((a) => {
    const t = get<UserData>('users', a.data.talentId)!;
    return { id: a.id, ...a.data, created: a.created, talent: publicUser(t) };
  }).sort((x, y) => y.match - x.match);
  res.json({ applications: rows });
});
app.patch('/api/applications/:id', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const a = get<ApplicationData>('applications', String(req.params.id));
  const j = a && get<JobData>('jobs', a.data.jobId);
  if (!a || !j || j.owner !== me(req).id) throw new HttpError(404, 'not_found', 'Application not found.');
  const { stage } = body(z.object({ stage: z.enum(['Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired', 'Rejected']) }), req);
  patch<ApplicationData>('applications', a.id, { stage });
  notify(a.data.talentId, `${j.data.startup} moved your application for ${j.data.title} to “${stage}”`, '/applications');
  res.json({ ok: true, stage });
});
app.get('/api/jobs/:id/roadmap', auth, (req, res) => {
  const j = get<JobData>('jobs', String(req.params.id));
  if (!j) throw new HttpError(404, 'not_found', 'Job not found.');
  const v = jobView(j, me(req));
  res.json({ roadmap: roadmapFor(v.match?.missing ?? []) });
});
app.post('/api/ai/pitch-note', auth, limit('ai', 20), async (req, res) => {
  const { jobId } = body(z.object({ jobId: z.string() }), req);
  const j = get<JobData>('jobs', jobId);
  if (!j) throw new HttpError(404, 'not_found', 'Job not found.');
  const v = jobView(j, me(req));
  const best = [...(v.match?.matched ?? [])].sort((a, b) => b.level - a.level)[0];
  const args = { name: me(req).data.name, startup: j.data.startup, jobTitle: j.data.title, topSkill: best?.name, level: best?.level, evidence: best?.evidence };
  const r = await generate({ promptId: 'pitch-note', system: 'Write a warm, specific 2-3 sentence application note from a candidate to a startup. Mention verified evidence. JSON: {"text": string}', input: args, schema: TextSchema, fallback: () => ({ text: draftPitchNote(args) }), model: MODELS.fast });
  res.json({ text: r.data.text, source: r.source });
});
app.post('/api/ai/jd', auth, requireRole('recruiter', 'founder'), limit('ai', 20), async (req, res) => {
  const b = body(z.object({ title: z.string().min(3).max(100), notes: z.string().max(1000) }), req);
  const r = await generate({ promptId: 'jd', system: 'Write a concise, honest job description for an Indian startup. JSON: {"text": string}', input: b, schema: TextSchema, fallback: () => ({ text: draftJobDescription(b.title, b.notes) }), model: MODELS.fast });
  res.json({ text: r.data.text, source: r.source });
});

/* ------------------------------------ tasks ------------------------------- */
const reviewOf = (s: Doc<SubmissionData>) => s.data.review ?? sampleReview(s.data.link, s.data.aiScore);

/** Demo rows carry invented prose and rubric chips. Never show those as if they were findings. */
function shown(s: Doc<SubmissionData>) {
  const review = reviewOf(s);
  if (review.status !== 'sample') return { ...s.data, review };
  return { ...s.data, review, summary: 'Demo submission. It was never inspected.', meets: [] as string[], missing: [] as string[] };
}

/** Everything a reviewer sees is derived from one inspection, so the list fields can never disagree with it. */
function reviewFields(r: SubmissionReview, summary: string, recommendation: Recommendation) {
  return {
    review: r, summary, recommendation,
    aiScore: r.status === 'unassessed' ? 0 : r.score,
    meets: r.criteria.filter((c) => c.verdict === 'met').map((c) => c.criterion),
    missing: r.criteria.filter((c) => c.verdict === 'not_met' || c.verdict === 'partial').map((c) => c.criterion),
  };
}

function taskView(t: Doc<TaskData>, viewer: Doc<UserData>) {
  const subs = list<SubmissionData>('submissions', { ref: t.id });
  const mine = subs.find((s) => s.data.talentId === viewer.id);
  const { status, baseSubmissions, ...rest } = t.data;
  return { ...rest, id: t.id, status, ownerId: t.owner, submissions: (baseSubmissions ?? 0) + subs.length, mine: mine ? (({ aiScore, status, summary, meets, missing, recommendation, review }) => ({ id: mine.id, aiScore, status, summary, meets, missing, recommendation, review }))(shown(mine)) : null };
}
app.get('/api/tasks', auth, (req, res) => {
  res.json({ tasks: list<TaskData>('tasks').filter((t) => t.data.status === 'open').map((t) => taskView(t, me(req))) });
});
app.get('/api/tasks/mine', auth, requireRole('recruiter', 'founder'), (req, res) => {
  res.json({ tasks: list<TaskData>('tasks', { owner: me(req).id }).map((t) => taskView(t, me(req))) });
});
app.get('/api/tasks/:id', auth, (req, res) => {
  const t = get<TaskData>('tasks', String(req.params.id));
  if (!t) throw new HttpError(404, 'not_found', 'Task not found.');
  res.json({ task: taskView(t, me(req)) });
});
app.post('/api/tasks', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const b = body(z.object({
    title: z.string().trim().min(5).max(120), brief: z.string().trim().min(30).max(4000), reward: z.number().int().min(500).max(200000),
    deadlineDays: z.number().int().min(1).max(60), skills: z.array(z.string()).min(1).max(6), rubric: z.array(z.string().trim().min(3)).min(2).max(8),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  }), req);
  const u = me(req);
  const { deadlineDays, ...rest } = b;
  const t = insert<TaskData>('tasks', { ...rest, startup: u.data.company || u.data.name, startupHue: u.data.hue, deadline: new Date(Date.now() + deadlineDays * 86400_000).toISOString(), funded: true, status: 'open' }, { owner: u.id });
  res.status(201).json({ task: taskView(t, u) });
});
app.patch('/api/tasks/:id', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const t = get<TaskData>('tasks', String(req.params.id));
  if (!t || t.owner !== me(req).id) throw new HttpError(404, 'not_found', 'Task not found.');
  const { status } = body(z.object({ status: z.enum(['open', 'closed']) }), req);
  res.json({ task: taskView(patch<TaskData>('tasks', t.id, { status })!, me(req)) });
});
/** Same project link, already submitted to this task by someone else. */
function duplicateFlag(taskId: string, key: string, exceptId?: string): ReviewFlag[] {
  const other = list<SubmissionData>('submissions', { ref: taskId }).find((x) => x.id !== exceptId && x.data.linkKey && x.data.linkKey === key && key);
  return other ? [{ level: 'warn', text: 'Another candidate submitted this exact link to this task. Check which of them did the work.' }] : [];
}
async function runEvaluation(t: Doc<TaskData>, talent: Doc<UserData>, link: string, exceptId?: string) {
  const key = canonicalLink(link);
  try {
    return await evaluateSubmission({ link, rubric: t.data.rubric, brief: t.data.brief, taskPostedAt: t.created, verifiedLogin: talent.data.github?.username, extraFlags: duplicateFlag(t.id, key, exceptId) });
  } catch (e) {
    console.error('[inspect] failed', e);
    const r = sampleReview(link, 0);
    return { review: { ...r, status: 'unassessed' as const, flags: [{ level: 'warn' as const, text: 'The inspection failed unexpectedly. Re-run it, or review the submission by hand.' }], at: Date.now() }, summary: 'The inspection failed, so nothing was assessed.', recommendation: 'review' as const };
  }
}

app.post('/api/tasks/:id/submit', auth, requireRole('talent'), limit('submit', 10), async (req, res) => {
  const t = get<TaskData>('tasks', String(req.params.id));
  if (!t || t.data.status !== 'open') throw new HttpError(404, 'not_found', 'This task is closed.');
  if (new Date(t.data.deadline).getTime() < Date.now()) throw new HttpError(410, 'deadline_passed', 'The deadline for this task has passed.');
  const b = body(z.object({ link: z.string().trim().max(300).default(''), text: z.string().trim().max(5000).default('') }).refine((v) => v.link || v.text.length >= 20, 'Add a link or a write-up of at least 20 characters.'), req);
  const u = me(req);
  if (list<SubmissionData>('submissions', { ref: t.id }).some((s) => s.data.talentId === u.id)) throw new HttpError(409, 'already_submitted', 'You already submitted to this task.');
  const ev = await runEvaluation(t, u, b.link);
  const s = insert<SubmissionData>('submissions', { taskId: t.id, talentId: u.id, link: b.link, text: b.text, linkKey: canonicalLink(b.link), status: 'submitted', ...reviewFields(ev.review, ev.summary, ev.recommendation) }, { owner: u.id, ref: t.id });
  if (t.owner) notify(t.owner, `New submission on “${t.data.title}”: ${ev.review.status === 'unassessed' ? 'needs a manual look' : `${ev.review.assessed}/${ev.review.total} criteria assessed, ${ev.review.score}% met`}`, `/tasks/${t.id}/review`);
  res.status(201).json({ submission: { id: s.id, ...s.data } });
});

/** Re-open the submitted project and re-check it (e.g. after a rate limit, or after the candidate fixed their repo). */
app.post('/api/submissions/:id/reinspect', auth, limit('inspect', 6), async (req, res) => {
  const s = get<SubmissionData>('submissions', String(req.params.id));
  const t = s && get<TaskData>('tasks', s.data.taskId);
  if (!s || !t || (t.owner !== me(req).id && s.data.talentId !== me(req).id)) throw new HttpError(404, 'not_found', 'Submission not found.');
  if (s.data.status !== 'submitted') throw new HttpError(409, 'closed', 'This submission is already decided.');
  const talent = get<UserData>('users', s.data.talentId)!;
  const ev = await runEvaluation(t, talent, s.data.link, s.id);
  patch<SubmissionData>('submissions', s.id, reviewFields(ev.review, ev.summary, ev.recommendation));
  res.json({ review: ev.review });
});
app.get('/api/tasks/:id/submissions', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const t = get<TaskData>('tasks', String(req.params.id));
  if (!t || t.owner !== me(req).id) throw new HttpError(404, 'not_found', 'Task not found.');
  const rows = list<SubmissionData>('submissions', { ref: t.id }).map((s) => {
    const tal = get<UserData>('users', s.data.talentId);
    return { id: s.id, ...shown(s), created: s.created, talent: tal ? publicUser(tal) : null };
  }).sort((a, b) => b.aiScore - a.aiScore);
  res.json({ task: taskView(t, me(req)), submissions: rows });
});
app.post('/api/submissions/:id/accept', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const s = get<SubmissionData>('submissions', String(req.params.id));
  const t = s && get<TaskData>('tasks', s.data.taskId);
  if (!s || !t || t.owner !== me(req).id) throw new HttpError(404, 'not_found', 'Submission not found.');
  if (s.data.status === 'accepted') throw new HttpError(409, 'already_accepted', 'Already accepted and paid.');
  const tal = get<UserData>('users', s.data.talentId)!;
  // payment: webhook-verified in production, simulated here
  const pay = insert('payments', { taskId: t.id, submissionId: s.id, to: tal.id, amount: t.data.reward, provider: process.env.SIMULATE_PAYMENTS === 'false' ? 'razorpay' : 'simulated', status: 'paid' }, { owner: me(req).id, ref: t.id });
  patch<SubmissionData>('submissions', s.id, { status: 'accepted' });
  // The founder's acceptance is the human verdict. The level reflects how much we could actually check:
  // a fully assessed project earns its score, a thinly assessed one is capped so it can't claim more than we saw.
  const rv = reviewOf(s);
  const level = rv.status === 'assessed' ? Math.max(50, Math.min(95, rv.score)) : 65;
  const src = rv.status === 'assessed' ? `Proof task: ${t.data.title}. ${rv.assessed}/${rv.total} criteria inspected, ${rv.score}% met, accepted by the founder.` : `Proof task: ${t.data.title}. Accepted by the founder after manual review (${rv.status === 'sample' ? 'demo' : `${rv.assessed}/${rv.total} criteria could be inspected automatically`}).`;
  const skills = tal.data.skills.map((k) => (t.data.skills.some((x) => x.toLowerCase() === k.name.toLowerCase()) ? { ...k, evidence: 'task' as Evidence, level: k.evidence === 'task' ? Math.max(k.level, level) : level, source: src } : k));
  for (const name of t.data.skills) if (!skills.some((k) => k.name.toLowerCase() === name.toLowerCase())) skills.push({ name, evidence: 'task', level, source: src });
  update('users', tal.id, { ...tal.data, skills, tasksDone: tal.data.tasksDone + 1, earned: tal.data.earned + t.data.reward });
  notify(tal.id, `Your submission for “${t.data.title}” was accepted. ₹${t.data.reward.toLocaleString('en-IN')} paid.`, '/profile');
  openThread(me(req).id, tal.id, `Accepted: ${t.data.title}`, 'task', `Congrats ${tal.data.name.split(' ')[0]}! Your submission was accepted and ₹${t.data.reward.toLocaleString('en-IN')} has been released. Let's talk about working together.`);
  res.json({ ok: true, paymentId: pay.id });
});
app.post('/api/submissions/:id/reject', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const s = get<SubmissionData>('submissions', String(req.params.id));
  const t = s && get<TaskData>('tasks', s.data.taskId);
  if (!s || !t || t.owner !== me(req).id) throw new HttpError(404, 'not_found', 'Submission not found.');
  if (s.data.status === 'accepted') throw new HttpError(409, 'already_accepted', 'This submission was already accepted and paid.');
  patch<SubmissionData>('submissions', s.id, { status: 'rejected' });
  notify(s.data.talentId, `Your submission for “${t.data.title}” was not selected this time.`, '/tasks');
  res.json({ ok: true });
});
app.post('/api/submissions/:id/hire', auth, requireRole('recruiter', 'founder'), (req, res) => {
  const s = get<SubmissionData>('submissions', String(req.params.id));
  const t = s && get<TaskData>('tasks', s.data.taskId);
  if (!s || !t || t.owner !== me(req).id) throw new HttpError(404, 'not_found', 'Submission not found.');
  if (s.data.status !== 'accepted') throw new HttpError(409, 'not_accepted', 'Accept the submission before making an offer.');
  const { role } = body(z.object({ role: z.string().trim().min(2).max(100) }), req);
  const tal = get<UserData>('users', s.data.talentId)!;
  const u = me(req);
  const th = openThread(u.id, tal.id, `Offer: ${role}`, 'task', `Hi ${tal.data.name.split(' ')[0]}, your work on “${t.data.title}” stood out. We'd like to offer you the ${role} role at ${u.data.company || u.data.name}. Can we set up a call to talk details?`);
  notify(tal.id, `${u.data.company || u.data.name} wants to hire you as ${role}`, '/inbox');
  res.status(201).json({ threadId: th.id });
});

/* ---------------------------------- interview ----------------------------- */
const BANK: Record<string, string[]> = {
  React: ['Walk me through how React decides when to re-render a component, and one way you have avoided a needless re-render.', 'A list of 10,000 rows is janky to scroll. How do you diagnose and fix it?'],
  TypeScript: ['You have a TypeScript function that accepts a union of three shapes. How do you narrow it safely without type assertions?'],
  'System Design': ['Design the data model and API for a notification system that supports email, push and in-app.'],
  'Node.js': ['How does the Node.js event loop handle a slow CPU-bound request, and what would you change?'],
  Python: ['Explain how you would profile and speed up a slow Python data-processing script.'],
  PostgreSQL: ['A query on a 50M-row table is slow. How do you find out why and what do you try?'],
  Figma: ['Walk me through how you would design a flow for low-literacy users, and how you would test it.'],
  'Machine Learning': ['How do you decide a model is actually better, and avoid fooling yourself with the evaluation split?'],
  Sales: ['How would you land your first ten paying customers with no brand?'],
  Communication: ['Tell me about a time a decision you made was wrong. What did you do?'],
};
function questionsFor(u: Doc<UserData>) {
  const ranked = [...u.data.skills].sort((a, b) => Number(!!BANK[b.name]) - Number(!!BANK[a.name]) || EVIDENCE_WEIGHT[a.evidence] - EVIDENCE_WEIGHT[b.evidence] || b.level - a.level);
  const qs: { q: string; skill: string }[] = [];
  for (const s of ranked) {
    const bank = BANK[s.name];
    for (const q of bank ?? (qs.some((x) => x.skill === s.name) ? [] : [`Explain a real problem you solved using ${s.name}. What was hard, and what would you do differently?`])) {
      if (qs.length < 4 && !qs.some((x) => x.q === q)) qs.push({ q, skill: s.name });
    }
  }
  for (const d of ['React', 'TypeScript', 'System Design']) if (qs.length < 4 && BANK[d] && !qs.some((x) => x.skill === d)) qs.push({ q: BANK[d][0], skill: d });
  qs.push({ q: BANK.Communication[0], skill: 'Communication' });
  return qs.slice(0, 5);
}
const attemptCap = (u: Doc<UserData>) => (effectivePlan(u.data) === 'pro' ? PRO.interviewAttempts : 3);
app.get('/api/interview/questions', auth, requireRole('talent'), (req, res) => {
  const cap = attemptCap(me(req));
  res.json({ questions: questionsFor(me(req)), retakesLeft: Math.max(0, cap - me(req).data.interviewsDone), attemptCap: cap });
});
app.post('/api/interview/complete', auth, requireRole('talent'), limit('ai', 20), async (req, res) => {
  const b = body(z.object({ answers: z.array(z.object({ q: z.string(), skill: z.string(), answer: z.string().max(4000) })).min(1).max(8), signals: z.number().int().min(0).default(0), seconds: z.number().min(0).default(0) }), req);
  const u = me(req);
  if (u.data.interviewsDone >= attemptCap(u)) throw new HttpError(429, 'retakes_exhausted', `You have used all ${attemptCap(u)} interview attempts.${effectivePlan(u.data) === 'free' ? ' Pro raises the limit.' : ''}`);
  const detail = await Promise.all(b.answers.map(async (a, i) => {
    const r = await generate({ promptId: 'grade-answer', system: `You are a strict, fair technical interviewer grading one answer on ${a.skill}. Score 0-100 and give one sentence of feedback. JSON: {"score": number, "feedback": string}`, input: { q: a.q, skill: a.skill, answer: a.answer }, schema: GradeSchema, fallback: () => gradeAnswer(a.skill, a.answer, i), model: MODELS.smart });
    return { ...a, answer: a.answer || '(no answer)', score: Math.round(r.data.score), feedback: r.data.feedback };
  }));
  const bySkill: Record<string, number[]> = {};
  detail.forEach((d) => (bySkill[d.skill] ??= []).push(d.score));
  const scores = Object.fromEntries(Object.entries(bySkill).map(([k, v]) => [k, Math.round(v.reduce((x, y) => x + y, 0) / v.length)]));
  const overall = Math.round(detail.reduce((x, d) => x + d.score, 0) / detail.length);
  // only answered questions count as evidence; skipped ones never touch the profile
  const answered = new Set(b.answers.filter((a) => a.answer.trim()).map((a) => a.skill));
  const skills = [...u.data.skills];
  for (const [name, lvl] of Object.entries(scores)) {
    if (!answered.has(name)) continue;
    const claim: SkillClaim = { name, evidence: 'interview', level: lvl, source: `Verified in AI interview · ${lvl}/100` };
    const i = skills.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
    if (i < 0) skills.push(claim);
    else if (skills[i].evidence !== 'task') skills[i] = { ...claim, name: skills[i].name };
  }
  update('users', u.id, { ...u.data, skills, interviewsDone: u.data.interviewsDone + 1 });
  const rec = insert('interviews', { scores, overall, detail, signals: b.signals, seconds: b.seconds }, { owner: u.id });
  notify(u.id, `Interview scored ${overall}/100. Your matches have been re-ranked.`, '/jobs');
  res.json({ id: rec.id, scores, overall, detail, signals: b.signals });
});
app.get('/api/interview/latest', auth, (req, res) => {
  const r = list<{ scores: Record<string, number>; overall: number; detail: unknown[]; signals: number }>('interviews', { owner: me(req).id })[0];
  res.json({ interview: r ? { id: r.id, created: r.created, ...r.data } : null, attempts: me(req).data.interviewsDone, attemptCap: attemptCap(me(req)) });
});

/* ----------------------------------- mentors ------------------------------ */
app.get('/api/mentors', auth, (_req, res) => {
  res.json({ mentors: list<Mentor>('mentors', {}, 'asc').map((m) => ({ ...m.data, id: m.id, taken: list<{ slot: string }>('bookings', { ref: m.id }).map((b) => b.data.slot) })) });
});
app.post('/api/bookings', auth, (req, res) => {
  const b = body(z.object({ mentorId: z.string(), slot: z.string().min(3), goal: z.string().trim().min(5).max(800) }), req);
  const m = get<Mentor>('mentors', b.mentorId);
  if (!m || !m.data.slots.includes(b.slot)) throw new HttpError(400, 'bad_slot', 'That slot is not available.');
  if (list<{ mentorId: string; slot: string }>('bookings', { ref: m.id }).some((x) => x.data.slot === b.slot)) throw new HttpError(409, 'slot_taken', 'Someone just booked that slot. Pick another.');
  const u = me(req);
  const room = `launchloop-${m.id}-${uid().slice(0, 8)}`;
  const bk = insert('bookings', { ...b, price: m.data.price, room, status: 'confirmed' }, { owner: u.id, ref: m.id });
  if (m.data.price) insert('payments', { bookingId: bk.id, amount: m.data.price, provider: 'simulated', status: 'paid' }, { owner: u.id, ref: bk.id });
  const mentorUser = list<UserData>('users').find((x) => x.data.mentorId === m.id);
  if (mentorUser) { notify(mentorUser.id, `${u.data.name} booked ${b.slot}`, '/dashboard'); openThread(u.id, mentorUser.id, `Session: ${b.slot}`, 'mentor', `Goal for our session: ${b.goal}`); }
  res.status(201).json({ booking: { id: bk.id, ...bk.data, link: `https://meet.jit.si/${room}` } });
});
app.get('/api/bookings/mine', auth, (req, res) => {
  const mid = me(req).data.mentorId;
  const rows = (mid ? list<{ mentorId: string; slot: string; goal: string; price: number; room: string }>('bookings', { ref: mid }) : list<{ mentorId: string; slot: string; goal: string; price: number; room: string }>('bookings', { owner: me(req).id })).map((b) => {
    const m = get<Mentor>('mentors', b.data.mentorId);
    const who = get<UserData>('users', b.owner!);
    return { id: b.id, ...b.data, link: `https://meet.jit.si/${b.data.room}`, mentor: m && { id: m.id, name: m.data.name, hue: m.data.hue, title: m.data.title }, mentee: who && publicUser(who) };
  });
  res.json({ bookings: rows });
});

/* ------------------------------- co-founders ------------------------------ */
const asFounder = (u: Doc<UserData>): FounderProfile => ({ id: u.id, name: u.data.name, hue: u.data.hue, headline: u.data.headline, location: u.data.location, has: u.data.founder?.has ?? [], needs: u.data.founder?.needs ?? [], commitment: u.data.founder?.commitment ?? 'Full-time', stage: u.data.founder?.stage ?? 'Idea', values: u.data.founder?.values ?? [] });
app.get('/api/cofounders', auth, requireRole('founder'), (req, res) => {
  const mine = asFounder(me(req));
  const others = list<UserData>('users').filter((u) => u.id !== me(req).id && u.data.founder && u.data.founder.has.length);
  const props = list<{ to: string }>('proposals', { owner: me(req).id }).map((p) => p.data.to);
  const rows = others.map((o) => ({ founder: asFounder(o), compat: cofounderCompat(mine, asFounder(o)), proposed: props.includes(o.id) })).sort((a, b) => b.compat.total - a.compat.total);
  res.json({ me: mine, matches: rows });
});
app.post('/api/cofounders/:id/propose', auth, requireRole('founder'), (req, res) => {
  const other = get<UserData>('users', String(req.params.id));
  if (!other?.data.founder) throw new HttpError(404, 'not_found', 'Founder not found.');
  const { trial } = body(z.object({ trial: z.string().max(300).default('') }), req);
  const u = me(req);
  if (list('proposals', { owner: u.id }).some((p) => (p.data as { to: string }).to === other.id)) throw new HttpError(409, 'already', 'You already proposed a trial.');
  insert('proposals', { to: other.id, trial }, { owner: u.id, ref: other.id });
  openThread(u.id, other.id, 'Co-founder trial proposal', 'cofounder', `Hi ${other.data.name.split(' ')[0]}, I think we complement each other. Want to try a one-week trial project${trial ? `: ${trial}` : '?'}`);
  res.status(201).json({ ok: true });
});

/* ------------------------------------ studio ------------------------------ */
interface VentureData { text: string; analysis: unknown; facts: Record<string, unknown>; teamSize: number; hasUsers: boolean; done: Record<string, boolean>; axis?: string }
app.get('/api/venture', auth, (req, res) => {
  const v = list<VentureData>('ventures', { owner: me(req).id })[0];
  res.json({ venture: v ? { id: v.id, ...v.data } : null });
});
app.put('/api/venture', auth, (req, res) => {
  const b = body(z.object({ text: z.string().max(4000).default(''), facts: z.record(z.string(), z.any()).default({}), teamSize: z.number().int().min(1).max(50).default(1), hasUsers: z.boolean().default(false), done: z.record(z.string(), z.boolean()).default({}) }), req);
  const cur = list<VentureData>('ventures', { owner: me(req).id })[0];
  if (cur) patch<VentureData>('ventures', cur.id, b);
  else insert<VentureData>('ventures', { ...b, analysis: null }, { owner: me(req).id });
  res.json({ ok: true });
});
app.post('/api/ai/validate-idea', auth, limit('ai', 20), async (req, res) => {
  const { text } = body(z.object({ text: z.string().trim().min(20).max(4000) }), req);
  const r = await generate({ promptId: 'validate-idea', system: 'You are a sharp, honest startup analyst for the Indian market. Return: problem, user, market (with a bottom-up sizing), competitors [[name, note]...] (3), risks (3 strings), canvas [[block, text]...] for the 9 Lean Canvas blocks in order. JSON: {"problem": string, "user": string, "market": string, "competitors": [[string, string], [string, string], [string, string]], "risks": [string, string, string], "canvas": [["Problem", string], ["Customer segments", string], ["Unique value proposition", string], ["Solution", string], ["Channels", string], ["Revenue streams", string], ["Cost structure", string], ["Key metrics", string], ["Unfair advantage", string]]}', input: { text }, schema: IdeaSchema, fallback: () => analyseIdea(text) });
  const cur = list<VentureData>('ventures', { owner: me(req).id })[0];
  if (cur) patch<VentureData>('ventures', cur.id, { text, analysis: r.data }); else insert<VentureData>('ventures', { text, analysis: r.data, facts: {}, teamSize: 1, hasUsers: false, done: {} }, { owner: me(req).id });
  res.json({ analysis: r.data, source: r.source, axes: READINESS_AXES });
});

app.post('/api/ai/deck-review', auth, limit('ai', 20), async (req, res) => {
  const { text, name } = body(z.object({ text: z.string().trim().min(40, 'We could not read enough text from that deck. Paste the slide text instead.').max(30_000), name: z.string().max(200).default('deck') }), req);
  const r = await generate({ promptId: 'deck-review', system: 'You are a seed-stage VC reviewing a pitch deck from its extracted text. Score each of these sections 0-100 with one sentence of specific, actionable feedback: Problem, Solution, Market, Business model, Traction, Competition, Team, Ask. JSON: {"overall": number, "summary": string, "slides": [{"section": string, "score": number, "note": string}]}', input: { text: text.slice(0, 12_000) }, schema: DeckSchema, fallback: () => reviewDeck(text) });
  res.json({ review: r.data, name, source: r.source });
});

/* ------------------------------------ inbox ------------------------------- */
function threadView(t: Doc<ThreadData>, viewerId: string) {
  const otherId = t.data.participants.find((p) => p !== viewerId)!;
  const other = get<UserData>('users', otherId);
  const msgs = list<MessageData>('messages', { ref: t.id }, 'asc');
  const last = msgs[msgs.length - 1];
  const readAt = t.data.reads[viewerId] ?? 0;
  return { id: t.id, subject: t.data.subject, kind: t.data.kind, lastAt: t.data.lastAt, other: other && publicUser(other), last: last && { text: last.data.text, from: last.data.from, created: last.created }, unread: msgs.filter((m) => m.data.from !== viewerId && m.created > readAt).length };
}
app.get('/api/threads', auth, (req, res) => {
  const rows = list<ThreadData>('threads').filter((t) => t.data.participants.includes(me(req).id)).map((t) => threadView(t, me(req).id)).sort((a, b) => b.lastAt - a.lastAt);
  res.json({ threads: rows, unread: rows.reduce((a, t) => a + t.unread, 0) });
});
app.get('/api/threads/:id', auth, (req, res) => {
  const t = get<ThreadData>('threads', String(req.params.id));
  if (!t || !t.data.participants.includes(me(req).id)) throw new HttpError(404, 'not_found', 'Conversation not found.');
  const messages = list<MessageData>('messages', { ref: t.id }, 'asc').map((m) => ({ id: m.id, from: m.data.from, text: m.data.text, created: m.created }));
  patch<ThreadData>('threads', t.id, { reads: { ...t.data.reads, [me(req).id]: Date.now() } });
  res.json({ thread: threadView(t, me(req).id), messages });
});
app.post('/api/threads/:id/messages', auth, limit('msg', 30), (req, res) => {
  const t = get<ThreadData>('threads', String(req.params.id));
  if (!t || !t.data.participants.includes(me(req).id)) throw new HttpError(404, 'not_found', 'Conversation not found.');
  const { text } = body(z.object({ text: z.string().trim().min(1).max(2000) }), req);
  const m = insert<MessageData>('messages', { threadId: t.id, from: me(req).id, text }, { ref: t.id });
  patch<ThreadData>('threads', t.id, { lastAt: Date.now(), reads: { ...t.data.reads, [me(req).id]: Date.now() } });
  const other = t.data.participants.find((p) => p !== me(req).id)!;
  notify(other, `${me(req).data.name}: ${text.slice(0, 60)}`, '/inbox');
  res.status(201).json({ message: { id: m.id, from: m.data.from, text, created: m.created } });
});
app.post('/api/threads', auth, (req, res) => {
  const b = body(z.object({ to: z.string(), subject: z.string().trim().min(2).max(100), text: z.string().trim().min(1).max(2000) }), req);
  const other = get<UserData>('users', b.to);
  if (!other || other.id === me(req).id) throw new HttpError(404, 'not_found', 'Recipient not found.');
  const t = openThread(me(req).id, other.id, b.subject, 'direct', b.text);
  res.status(201).json({ id: t.id });
});

/* ----------------------------------- notices ------------------------------ */
app.get('/api/notices', auth, (req, res) => {
  const rows = list<NoticeData>('notices', { owner: me(req).id }).slice(0, 30).map((n) => ({ id: n.id, ...n.data, created: n.created }));
  res.json({ notices: rows, unread: rows.filter((n) => !n.read).length });
});
app.post('/api/notices/read', auth, (req, res) => {
  for (const n of list<NoticeData>('notices', { owner: me(req).id })) if (!n.data.read) patch<NoticeData>('notices', n.id, { read: true });
  res.json({ ok: true });
});

/* ---------------------------------- billing ------------------------------- */
/** Mark an order paid and extend Pro. Idempotent: the webhook and the checkout callback can both arrive. */
function grantPro(orderId: string, paymentId: string) {
  const order = list<BillingData>('billing', { ref: orderId })[0];
  if (!order || order.data.status === 'paid') return;
  const u = order.owner ? get<UserData>('users', order.owner) : undefined;
  patch<BillingData>('billing', order.id, { status: 'paid', paymentId, paidAt: Date.now() });
  if (!u) return;
  const from = Math.max(Date.now(), effectivePlan(u.data) === 'pro' ? u.data.planUntil ?? 0 : 0);
  update('users', u.id, { ...u.data, plan: 'pro', planUntil: from + PRO.days * 86400_000 });
  notify(u.id, `Pro is active until ${new Date(from + PRO.days * 86400_000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Thank you.`, '/settings');
}
const billingErr = (e: unknown): never => {
  if (e instanceof RazorpayError) throw new HttpError(e.status, 'billing', e.message);
  throw e;
};

app.get('/api/billing/config', auth, (req, res) => {
  const u = me(req);
  res.json({ enabled: RZP_ENABLED, testMode: RZP_TEST_MODE, priceInr: PRO.priceInr, days: PRO.days, interviewAttempts: PRO.interviewAttempts, plan: effectivePlan(u.data), planUntil: effectivePlan(u.data) === 'pro' ? u.data.planUntil : null });
});

app.post('/api/billing/order', auth, limit('billing', 8), async (req, res) => {
  if (!RZP_ENABLED) throw new HttpError(503, 'billing_unavailable', 'Payments are not configured on this server.');
  const u = me(req);
  const amount = PRO.priceInr * 100; // the server decides the price, never the browser
  const receipt = `pro_${u.id.slice(-10)}_${Date.now().toString(36)}`.slice(0, 40);
  const o = await createOrder(amount, receipt, { userId: u.id, plan: 'pro' }).catch(billingErr);
  insert<BillingData>('billing', { plan: 'pro', amount, status: 'created' }, { owner: u.id, ref: o.id });
  res.status(201).json({ orderId: o.id, amount: o.amount, currency: o.currency, keyId: RZP_KEY_ID, name: u.data.name, email: u.data.email });
});

app.post('/api/billing/verify', auth, limit('billing', 12), async (req, res) => {
  if (!RZP_ENABLED) throw new HttpError(503, 'billing_unavailable', 'Payments are not configured on this server.');
  const b = body(z.object({ razorpay_order_id: z.string().max(64), razorpay_payment_id: z.string().max(64), razorpay_signature: z.string().max(128) }), req);
  const u = me(req);
  const order = list<BillingData>('billing', { ref: b.razorpay_order_id }).find((o) => o.owner === u.id);
  if (!order) throw new HttpError(404, 'not_found', 'We have no such order for your account.');
  if (order.data.status !== 'paid') {
    if (!validCheckoutSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) throw new HttpError(400, 'bad_signature', 'The payment signature did not match, so nothing was upgraded.');
    // belt and braces: ask Razorpay what really happened, and check it is this order and this amount
    let pay = await fetchPayment(b.razorpay_payment_id).catch(billingErr);
    if (pay.order_id !== b.razorpay_order_id || pay.amount !== order.data.amount || pay.currency !== 'INR') throw new HttpError(400, 'mismatch', 'That payment does not match this order.');
    if (pay.status === 'authorized') pay = await capturePayment(pay.id, order.data.amount).catch(billingErr);
    if (pay.status !== 'captured') throw new HttpError(402, 'not_captured', `The payment is ${pay.status}, not completed. Nothing was charged to your plan.`);
    grantPro(b.razorpay_order_id, pay.id);
  }
  res.json({ ok: true, user: privateUser(get<UserData>('users', u.id)!) });
});

/** Razorpay calls this server-to-server. A valid signature over the raw body is the only thing that makes it trusted. */
app.post('/api/billing/webhook', (req, res) => {
  const sig = String(req.headers['x-razorpay-signature'] ?? '');
  if (!req.rawBody || !validWebhookSignature(req.rawBody, sig)) return void res.status(400).json({ error: { code: 'bad_signature', message: 'Invalid signature.' } });
  const ev = req.body as { event?: string; payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; currency: string; status: string } }; order?: { entity?: { id: string } } } };
  if (ev.event === 'payment.captured' || ev.event === 'order.paid') {
    const pay = ev.payload?.payment?.entity;
    const orderId = pay?.order_id ?? ev.payload?.order?.entity?.id;
    const order = orderId ? list<BillingData>('billing', { ref: orderId })[0] : undefined;
    if (order && pay && pay.status === 'captured' && pay.amount === order.data.amount && pay.currency === 'INR') grantPro(orderId!, pay.id);
  }
  res.json({ ok: true });
});

/* --------------------------------- account -------------------------------- */
app.delete('/api/me', auth, (req, res) => {
  const { confirm } = body(z.object({ confirm: z.literal('DELETE') }), req);
  void confirm;
  const u = me(req);
  if (u.data.seeded || [DEMO.talent.email, DEMO.founder.email, DEMO.recruiter.email, DEMO.mentor.email].includes(u.data.email)) throw new HttpError(403, 'demo', 'Demo accounts cannot be deleted.');
  remove('users', u.id);
  res.clearCookie('ll_refresh', { path: '/api/auth' });
  res.json({ ok: true });
});
app.post('/api/me/reset-demo', auth, (req, res) => {
  const u = me(req);
  if (u.id !== DEMO.talent.id) throw new HttpError(403, 'demo', 'Only the demo talent account can be reset.');
  for (const a of list<ApplicationData>('applications', { owner: u.id })) remove('applications', a.id);
  for (const s of list<SubmissionData>('submissions', { owner: u.id })) if (!['s1'].includes(s.id)) remove('submissions', s.id);
  for (const i of list('interviews', { owner: u.id })) remove('interviews', i.id);
  update('users', u.id, { ...u.data, skills: u.data.skills.map((s) => (s.evidence === 'interview' || s.evidence === 'task' ? { ...s, evidence: 'self' as Evidence, level: Math.min(s.level, 70), source: undefined } : s)), interviewsDone: 0, tasksDone: 0, earned: 0 });
  res.json({ ok: true });
});

/* ------------------------------ errors + startup -------------------------- */
app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'not_found', message: 'No such endpoint.' } }));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return void res.status(err.status).json({ error: { code: err.code, message: err.message } });
  if (err instanceof ZodError) return void res.status(400).json({ error: { code: 'invalid', message: err.issues[0]?.message ?? 'Invalid request.', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } });
  console.error(err);
  res.status(500).json({ error: { code: 'internal', message: 'Something went wrong on our side.' } });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => console.log(`LaunchLoop API on :${PORT} · AI: ${AI_LIVE ? `Groq (${MODELS.smart})` : 'deterministic fallback'}`));
