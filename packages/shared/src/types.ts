export type Role = 'talent' | 'founder' | 'recruiter' | 'mentor';
export const ROLES: Role[] = ['talent', 'founder', 'recruiter', 'mentor'];

export type Evidence = 'self' | 'github' | 'interview' | 'task';
/**
 * How much a skill claim counts toward a match. Only `interview` and `task` are
 * *assessed* by us; `github` is imported activity from an account the user has
 * proven they control, and `self` is a bare claim.
 */
export const EVIDENCE_WEIGHT: Record<Evidence, number> = {
  self: 0.3,
  github: 0.5,
  interview: 0.9,
  task: 1,
};
export const EVIDENCE_LABEL: Record<Evidence, string> = {
  self: 'Self-reported',
  github: 'GitHub activity (imported)',
  interview: 'Interview-verified',
  task: 'Task-verified',
};
/** Evidence that comes from us actually testing the person, rather than from a claim or imported activity. */
export const ASSESSED: Record<Evidence, boolean> = { self: false, github: false, interview: true, task: true };

export interface SkillClaim {
  name: string;
  evidence: Evidence;
  /** 0-100 proficiency as measured by the evidence source */
  level: number;
  source?: string;
}

export interface Talent {
  id: string;
  username: string;
  name: string;
  headline: string;
  college: string;
  location: string;
  hue: number;
  skills: SkillClaim[];
  verifiedScore: number;
  interviewsDone: number;
  tasksDone: number;
  earned: number;
  bio: string;
  openTo: string[];
}

export interface Job {
  id: string;
  title: string;
  startup: string;
  startupHue: number;
  stage: 'Pre-seed' | 'Seed' | 'Series A';
  type: 'Full-time' | 'Internship' | 'Contract';
  remote: boolean;
  location: string;
  stipend: string;
  equity: string | null;
  required: { name: string; weight: number }[];
  summary: string;
  posted: string;
  applicants: number;
  /** precomputed semantic similarity 0-1 (stand-in for pgvector cosine) */
  semantic: number;
}

export interface ProofTask {
  id: string;
  title: string;
  startup: string;
  startupHue: number;
  reward: number;
  deadline: string; // ISO
  skills: string[];
  brief: string;
  rubric: string[];
  funded: boolean;
  submissions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export type Recommendation = 'shortlist' | 'maybe' | 'reject' | 'review';

/** What happened when we checked one rubric criterion against the submitted project. */
export type Verdict = 'met' | 'partial' | 'not_met' | 'cannot_assess';
export interface CriterionResult {
  criterion: string;
  verdict: Verdict;
  /** A fact taken from the inspected project (or the reason we could not assess). */
  evidence: string;
  by: 'check' | 'model';
}
export interface ReviewFlag {
  level: 'info' | 'warn';
  text: string;
  /** Names or points at the candidate, so blind review hides it. */
  identifying?: boolean;
}
/** What we opened. `facts` are measured values, never model output. */
export interface ArtifactSummary {
  kind: 'repo' | 'site' | 'figma' | 'text' | 'none';
  url: string;
  status: 'ok' | 'unreachable' | 'private_or_missing' | 'rate_limited' | 'unsupported' | 'blocked' | 'none';
  note?: string;
  facts: Record<string, string | number | boolean>;
  filesRead: string[];
}
/** `sample` = seeded demo data that was never inspected. */
export type ReviewStatus = 'assessed' | 'partial' | 'unassessed' | 'sample';
export interface SubmissionReview {
  status: ReviewStatus;
  method: 'checks' | 'checks+model';
  /** Share of *assessed* criteria that were met (partial counts half). Not comparable across submissions with different coverage. */
  score: number;
  /** Share of rubric criteria we could assess at all. */
  coverage: number;
  assessed: number;
  total: number;
  criteria: CriterionResult[];
  flags: ReviewFlag[];
  inspected: ArtifactSummary;
  at: number;
}

export interface Submission {
  id: string;
  taskId: string;
  talentId: string;
  aiScore: number;
  recommendation: Recommendation;
  meets: string[];
  missing: string[];
  summary: string;
  link: string;
}

export interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  hue: number;
  expertise: string[];
  stages: string[];
  price: number; // INR, 0 = free
  rating: number;
  sessions: number;
  bio: string;
  slots: string[];
}

export interface FounderProfile {
  id: string;
  name: string;
  hue: number;
  headline: string;
  has: string[];
  needs: string[];
  commitment: 'Full-time' | 'Part-time';
  stage: string;
  location: string;
  values: string[];
}

export interface StartupFacts {
  dpiitRegistered?: boolean;
  ageYears?: number;
  turnoverCr?: number;
  sector?: string;
  stage?: string;
  womenLed?: boolean;
  hasPrototype?: boolean;
}

export interface SchemeRule {
  field: keyof StartupFacts;
  op: 'eq' | 'lte' | 'gte' | 'in';
  value: string | number | boolean | string[];
  label: string;
}

export interface Scheme {
  id: string;
  name: string;
  body: string;
  benefit: string;
  rules: SchemeRule[];
}
