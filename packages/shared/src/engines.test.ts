import { describe, expect, it } from 'vitest';
import { checkScheme, cofounderCompat, matchScore, readiness, readinessTotal } from './engines';
import { COFOUNDERS, JOBS, ME_FOUNDER, PRIYA, SCHEMES } from './seed';
import { gradeAnswer, reviewDeck, roadmapFor } from './ai-fallbacks';

describe('matchScore', () => {
  it('is deterministic and bounded', () => {
    const a = matchScore(PRIYA, JOBS[0]);
    expect(a).toEqual(matchScore(PRIYA, JOBS[0]));
    expect(a.total).toBeGreaterThan(0);
    expect(a.total).toBeLessThanOrEqual(100);
  });
  it('reports missing skills', () => {
    expect(matchScore(PRIYA, JOBS[3]).missing).toContain('Python');
  });
  it('ranks the frontend job above the ML job for Priya', () => {
    expect(matchScore(PRIYA, JOBS[0]).total).toBeGreaterThan(matchScore(PRIYA, JOBS[3]).total);
  });
});

describe('checkScheme', () => {
  it('flags the exact rule that failed', () => {
    const v = checkScheme(SCHEMES[1], { dpiitRegistered: true, ageYears: 4, hasPrototype: false });
    expect(v.status).toBe('ineligible');
    expect(v.results.find((r) => r.status === 'fail')?.rule.field).toBe('ageYears');
  });
  it('returns unknown when info is missing', () => {
    expect(checkScheme(SCHEMES[1], { dpiitRegistered: true }).status).toBe('unknown');
  });
});

describe('readiness', () => {
  it('rewards a prototype and users', () => {
    const base = { text: 'x', facts: {}, teamSize: 1, hasUsers: false };
    const better = { ...base, facts: { hasPrototype: true }, hasUsers: true };
    expect(readinessTotal(readiness(better))).toBeGreaterThan(readinessTotal(readiness(base)));
  });
});

describe('cofounderCompat', () => {
  it('prefers complementary skills', () => {
    const kiran = cofounderCompat(ME_FOUNDER, COFOUNDERS[0]);
    const manav = cofounderCompat(ME_FOUNDER, COFOUNDERS[2]);
    expect(kiran.total).toBeGreaterThan(manav.total);
  });
});

describe('gradeAnswer', () => {
  it('scores an empty answer as zero', () => {
    expect(gradeAnswer('React', '   ').score).toBe(0);
  });
  it('scores a detailed answer above a one-liner', () => {
    const long = 'React re-renders when state or props change. I used memo and useMemo on a heavy row, and the profiler confirmed fewer renders after keying the list correctly.';
    expect(gradeAnswer('React', long).score).toBeGreaterThan(gradeAnswer('React', 'It renders.').score);
  });
});

describe('roadmapFor', () => {
  it('spans two weeks and names every missing skill', () => {
    const r = roadmapFor(['AWS', 'Docker']);
    expect(r[0].week).toMatch(/^Week 1/);
    expect(r[r.length - 1].week).toMatch(/^Week 2/);
    expect(r[0].title).toContain('AWS and Docker');
  });
});

describe('reviewDeck', () => {
  it('flags missing sections and rewards a complete deck', () => {
    const thin = reviewDeck('We are building an app.');
    const full = reviewDeck('Problem: SMEs waste 10 hours a week. Solution: our platform automates reminders. Market: 6 crore SMEs, TAM ₹12,000 Cr. Pricing ₹999 per month subscription. Traction: 3 pilots, 40 customers on waitlist. Competition: unlike Tally we predict late invoices. Team: ex-Razorpay CTO, 8 years. Ask: raising ₹2 Cr seed for 18 months runway.');
    expect(thin.slides.find((s) => s.section === 'Ask')?.score).toBe(25);
    expect(full.overall).toBeGreaterThan(thin.overall + 25);
  });
});
