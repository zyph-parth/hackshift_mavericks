import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import {
  verifiedScore,
  type FounderProfile,
  type Job,
  type Role,
  type SkillClaim,
  type Talent,
} from '@launchloop/shared';
import { get, insert, list, patch, type Doc } from './db';

export const SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
export const IS_PROD = process.env.NODE_ENV === 'production';

/* ------------------------------- passwords ------------------------------- */
export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`;
}
export function checkPassword(pw: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(pw, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const sha = (s: string) => createHmac('sha256', 'cache').update(s).digest('hex');

/* --------------------------------- models -------------------------------- */
export interface UserData {
  email: string;
  pw: string | null;
  name: string;
  roles: Role[];
  activeRole: Role;
  hue: number;
  username: string;
  headline: string;
  bio: string;
  college: string;
  location: string;
  skills: SkillClaim[];
  links: { github?: string; linkedin?: string; website?: string };
  openTo: string[];
  interviewsDone: number;
  tasksDone: number;
  earned: number;
  company?: string;
  onboarded: boolean;
  mentorId?: string;
  founder?: Omit<FounderProfile, 'id' | 'name' | 'hue' | 'headline' | 'location'>;
  plan: 'free' | 'pro';
  seeded?: boolean;
}

export interface JobData extends Omit<Job, 'id'> {
  status: 'open' | 'closed';
}
export interface TaskData {
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
  status: 'open' | 'closed';
  baseSubmissions?: number;
}
export interface SubmissionData {
  taskId: string;
  talentId: string;
  link: string;
  text: string;
  aiScore: number;
  recommendation: 'shortlist' | 'maybe' | 'reject';
  meets: string[];
  missing: string[];
  summary: string;
  status: 'submitted' | 'accepted' | 'rejected';
}
export interface ApplicationData {
  jobId: string;
  talentId: string;
  note: string;
  match: number;
  stage: 'Applied' | 'Shortlisted' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';
}
export interface ThreadData {
  participants: string[];
  subject: string;
  kind: 'application' | 'cofounder' | 'mentor' | 'direct' | 'task';
  lastAt: number;
  reads: Record<string, number>;
}
export interface MessageData {
  threadId: string;
  from: string;
  text: string;
}
export interface NoticeData {
  text: string;
  link?: string;
  read: boolean;
}

export type UserDoc = Doc<UserData>;

export function toTalent(u: UserDoc): Talent {
  const d = u.data;
  return {
    id: u.id,
    username: d.username,
    name: d.name,
    headline: d.headline,
    college: d.college,
    location: d.location,
    hue: d.hue,
    skills: d.skills,
    verifiedScore: verifiedScore(d.skills),
    interviewsDone: d.interviewsDone,
    tasksDone: d.tasksDone,
    earned: d.earned,
    bio: d.bio,
    openTo: d.openTo,
  };
}

/** What other users may see. Never includes email or password hash. */
export function publicUser(u: UserDoc) {
  const d = u.data;
  return {
    id: u.id,
    username: d.username,
    name: d.name,
    headline: d.headline,
    bio: d.bio,
    college: d.college,
    location: d.location,
    hue: d.hue,
    skills: d.skills,
    links: d.links,
    openTo: d.openTo,
    interviewsDone: d.interviewsDone,
    tasksDone: d.tasksDone,
    earned: d.earned,
    roles: d.roles,
    company: d.company,
    verifiedScore: verifiedScore(d.skills),
  };
}

export function privateUser(u: UserDoc) {
  return { ...publicUser(u), email: u.data.email, activeRole: u.data.activeRole, onboarded: u.data.onboarded, plan: u.data.plan, founder: u.data.founder, mentorId: u.data.mentorId };
}

/* ---------------------------------- auth --------------------------------- */
export function signAccess(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '20m' });
}
export function signRefresh(userId: string) {
  return jwt.sign({ sub: userId, t: 'r' }, SECRET, { expiresIn: '30d' });
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserDoc;
  }
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return void res.status(401).json({ error: { code: 'unauthorized', message: 'Sign in to continue.' } });
  try {
    const p = jwt.verify(h.slice(7), SECRET) as { sub: string };
    const u = get<UserData>('users', p.sub);
    if (!u) throw new Error('no user');
    req.user = u;
    next();
  } catch {
    res.status(401).json({ error: { code: 'token_expired', message: 'Your session expired.' } });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.data.roles.some((r) => roles.includes(r))) {
      return void res.status(403).json({ error: { code: 'forbidden', message: `This needs the ${roles.join(' or ')} role.` } });
    }
    next();
  };
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/* --------------------------- cross-cutting helpers ----------------------- */
export function notify(userId: string, text: string, link?: string) {
  insert<NoticeData>('notices', { text, link, read: false }, { owner: userId });
}

export function openThread(a: string, b: string, subject: string, kind: ThreadData['kind'], firstMessage: string) {
  const existing = list<ThreadData>('threads').find(
    (t) => t.data.kind === kind && t.data.subject === subject && t.data.participants.includes(a) && t.data.participants.includes(b),
  );
  const now = Date.now();
  const t = existing ?? insert<ThreadData>('threads', { participants: [a, b], subject, kind, lastAt: now, reads: { [a]: now } });
  insert<MessageData>('messages', { threadId: t.id, from: a, text: firstMessage }, { ref: t.id });
  patch<ThreadData>('threads', t.id, { lastAt: Date.now(), reads: { ...t.data.reads, [a]: Date.now() } });
  notify(b, `New message: ${subject}`, '/inbox');
  return t;
}

const tokens = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 2));
/** Cheap semantic-similarity stand-in (swap for pgvector cosine). 0..1 */
export function semanticSimilarity(talentText: string, jobText: string) {
  const a = tokens(talentText);
  const b = tokens(jobText);
  if (!a.size || !b.size) return 0.4;
  let inter = 0;
  b.forEach((w) => a.has(w) && inter++);
  return Math.min(0.95, 0.38 + (inter / b.size) * 1.1);
}
