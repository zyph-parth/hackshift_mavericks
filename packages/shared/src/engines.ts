import type {
  Evidence,
  FounderProfile,
  Job,
  Scheme,
  SchemeRule,
  SkillClaim,
  StartupFacts,
  Talent,
} from './types';
import { EVIDENCE_WEIGHT } from './types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const norm = (s: string) => s.trim().toLowerCase();

/* ----------------------------- MATCH ENGINE ----------------------------- */

export interface MatchBreakdown {
  semantic: number;
  skill: number;
  verified: number;
  fit: number;
  total: number;
  matched: { name: string; evidence: Evidence; level: number }[];
  missing: string[];
}

export const MATCH_WEIGHTS = { semantic: 0.35, skill: 0.35, verified: 0.2, fit: 0.1 } as const;

export function findSkill(skills: SkillClaim[], name: string) {
  return skills.find((s) => norm(s.name) === norm(name));
}

/** Pure, deterministic and explainable: the number judges will question. */
export function matchScore(talent: Talent, job: Job): MatchBreakdown {
  const totalWeight = job.required.reduce((a, r) => a + r.weight, 0) || 1;
  let skillAcc = 0;
  let verifiedAcc = 0;
  const matched: MatchBreakdown['matched'] = [];
  const missing: string[] = [];

  for (const req of job.required) {
    const claim = findSkill(talent.skills, req.name);
    if (!claim) {
      missing.push(req.name);
      continue;
    }
    skillAcc += req.weight * (claim.level / 100);
    verifiedAcc += req.weight * EVIDENCE_WEIGHT[claim.evidence];
    matched.push({ name: claim.name, evidence: claim.evidence, level: claim.level });
  }

  const semantic = clamp(job.semantic * 100 + (talent.verifiedScore - 70) * 0.15);
  const skill = clamp((skillAcc / totalWeight) * 100);
  const verified = clamp((verifiedAcc / totalWeight) * 100);
  const wantsRemote = talent.openTo.includes('remote');
  const fit = clamp(
    (job.remote && wantsRemote ? 90 : job.remote ? 75 : 60) +
      (talent.openTo.includes(job.type.toLowerCase()) ? 10 : 0),
  );

  const total = Math.round(
    semantic * MATCH_WEIGHTS.semantic +
      skill * MATCH_WEIGHTS.skill +
      verified * MATCH_WEIGHTS.verified +
      fit * MATCH_WEIGHTS.fit,
  );
  return {
    semantic: Math.round(semantic),
    skill: Math.round(skill),
    verified: Math.round(verified),
    fit: Math.round(fit),
    total,
    matched,
    missing,
  };
}

export function verifiedScore(skills: SkillClaim[]): number {
  if (!skills.length) return 0;
  const sum = skills.reduce((a, s) => a + s.level * EVIDENCE_WEIGHT[s.evidence], 0);
  return Math.round(sum / skills.length);
}

export function scoreTone(score: number): 'danger' | 'warn' | 'good' {
  return score >= 75 ? 'good' : score >= 50 ? 'warn' : 'danger';
}

/* --------------------------- SCHEME RULE ENGINE -------------------------- */

export type RuleResult = { rule: SchemeRule; status: 'pass' | 'fail' | 'unknown' };
export interface SchemeVerdict {
  scheme: Scheme;
  status: 'eligible' | 'unknown' | 'ineligible';
  results: RuleResult[];
}

function evalRule(rule: SchemeRule, facts: StartupFacts): RuleResult['status'] {
  const v = facts[rule.field];
  if (v === undefined || v === '') return 'unknown';
  switch (rule.op) {
    case 'eq':
      return v === rule.value ? 'pass' : 'fail';
    case 'lte':
      return Number(v) <= Number(rule.value) ? 'pass' : 'fail';
    case 'gte':
      return Number(v) >= Number(rule.value) ? 'pass' : 'fail';
    case 'in':
      return (rule.value as string[]).includes(String(v)) ? 'pass' : 'fail';
  }
}

export function checkScheme(scheme: Scheme, facts: StartupFacts): SchemeVerdict {
  const results = scheme.rules.map((rule) => ({ rule, status: evalRule(rule, facts) }));
  const status = results.some((r) => r.status === 'fail')
    ? 'ineligible'
    : results.some((r) => r.status === 'unknown')
      ? 'unknown'
      : 'eligible';
  return { scheme, status, results };
}

/* ---------------------------- READINESS SCORE ---------------------------- */

export const READINESS_AXES = [
  'Problem clarity',
  'Market',
  'Product',
  'Team',
  'Traction',
  'Funding fit',
] as const;
export type ReadinessAxis = (typeof READINESS_AXES)[number];

export interface IdeaInput {
  text: string;
  facts: StartupFacts;
  teamSize: number;
  hasUsers: boolean;
}

export function readiness(input: IdeaInput): Record<ReadinessAxis, number> {
  const words = input.text.trim().split(/\s+/).filter(Boolean).length;
  const t = norm(input.text);
  const has = (...k: string[]) => k.some((x) => t.includes(x));
  const problem = clamp(
    35 + Math.min(words, 60) * 0.7 + (has('struggle', 'pain', 'problem', 'waste', 'hard') ? 12 : 0),
  );
  const market = clamp(
    40 + (has('india', 'million', 'crore', 'sme', 'students', 'farmers') ? 22 : 8) + (words > 25 ? 10 : 0),
  );
  const product = clamp(
    30 + (input.facts.hasPrototype ? 38 : 6) + (has('app', 'platform', 'ai', 'marketplace') ? 12 : 0),
  );
  const team = clamp(25 + input.teamSize * 18);
  const traction = clamp(
    10 + (input.hasUsers ? 45 : 0) + (has('pilot', 'users', 'customers', 'paid') ? 18 : 0),
  );
  const funding = clamp(
    30 +
      (input.facts.dpiitRegistered ? 28 : 0) +
      (input.facts.womenLed ? 8 : 0) +
      (input.facts.ageYears !== undefined && input.facts.ageYears <= 3 ? 14 : 0),
  );
  return {
    'Problem clarity': Math.round(problem),
    Market: Math.round(market),
    Product: Math.round(product),
    Team: Math.round(team),
    Traction: Math.round(traction),
    'Funding fit': Math.round(funding),
  };
}

export function readinessTotal(r: Record<string, number>) {
  const vals = Object.values(r);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/* ------------------------- CO-FOUNDER COMPATIBILITY ---------------------- */

export interface Compat {
  total: number;
  skillComplement: number;
  commitment: number;
  values: number;
  stage: number;
  theyCover: string[];
  youCover: string[];
  sharedValues: string[];
}

export function cofounderCompat(me: FounderProfile, other: FounderProfile): Compat {
  const theyCover = me.needs.filter((n) => other.has.map(norm).includes(norm(n)));
  const youCover = other.needs.filter((n) => me.has.map(norm).includes(norm(n)));
  const comp =
    (theyCover.length / Math.max(me.needs.length, 1) + youCover.length / Math.max(other.needs.length, 1)) / 2;
  const sharedValues = me.values.filter((v) => other.values.includes(v));
  const values = sharedValues.length / Math.max(me.values.length, 1);
  const commitment = me.commitment === other.commitment ? 1 : 0.45;
  const stage = me.stage === other.stage ? 1 : 0.6;
  const total = Math.round((comp * 0.4 + values * 0.25 + commitment * 0.2 + stage * 0.15) * 100);
  return {
    total,
    skillComplement: Math.round(comp * 100),
    commitment: Math.round(commitment * 100),
    values: Math.round(values * 100),
    stage: Math.round(stage * 100),
    theyCover,
    youCover,
    sharedValues,
  };
}
