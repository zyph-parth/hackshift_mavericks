export type Role = 'talent' | 'founder' | 'recruiter' | 'mentor';
export const ROLES: Role[] = ['talent', 'founder', 'recruiter', 'mentor'];

export type Evidence = 'self' | 'github' | 'interview' | 'task';
export const EVIDENCE_WEIGHT: Record<Evidence, number> = {
  self: 0.4,
  github: 0.7,
  interview: 0.9,
  task: 1,
};
export const EVIDENCE_LABEL: Record<Evidence, string> = {
  self: 'Self-reported',
  github: 'GitHub-verified',
  interview: 'Interview-verified',
  task: 'Task-verified',
};

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

export interface Submission {
  id: string;
  taskId: string;
  talentId: string;
  aiScore: number;
  recommendation: 'shortlist' | 'maybe' | 'reject';
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
