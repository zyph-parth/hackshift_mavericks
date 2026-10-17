import { describe, expect, it } from 'vitest';
import { ASSESSED } from './types';
import { verifiedScore } from './engines';
import { TEST_FILE, recommendationFor, runChecks, scoreReview, summarizeReview, buildReview, type ArtifactEvidence } from './review';

const base = (over: Partial<ArtifactEvidence> = {}): ArtifactEvidence => ({
  kind: 'repo', url: 'https://github.com/a/b', status: 'ok', facts: {}, filesRead: [], tree: [], sources: [], ...over,
});

const goodRepo = base({
  tree: ['README.md', 'package.json', 'tsconfig.json', 'src/App.tsx', 'src/ui/Toggle.tsx', 'src/lib/price.ts', 'src/pages/Home.tsx', 'src/pages/Pricing.tsx', 'src/App.test.tsx', 'src/lib/price.test.ts', '.github/workflows/ci.yml'],
  pkg: { dependencies: ['react', 'framer-motion'], scripts: { test: 'vitest', build: 'vite build', lint: 'eslint .' } },
  readme: '# Pricing\n\n## Run\nnpm install && npm run dev\n\n## Notes\n' + 'We use a billing toggle and test it. '.repeat(20),
  facts: { commits: 14, commitDays: 4 },
  sources: [
    { path: 'src/ui/Toggle.tsx', text: '<button role="switch" aria-checked={on} aria-label="Billing" onKeyDown={k}>' },
    { path: 'src/pages/Pricing.tsx', text: 'import { motion } from "framer-motion"; const price = <motion.span animate={{ y: 0 }}>{price}</motion.span>; <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">' },
    { path: 'src/app.css', text: '@media (max-width: 480px) { .p { display: block } } :focus-visible { outline: 2px solid }' },
  ],
});

describe('runChecks', () => {
  it('assesses what it can from real evidence and cites facts', () => {
    const r = runChecks(['Responsive down to 360px', 'Accessible toggle (keyboard + aria)', 'Smooth price animation', 'Has tests', 'README explains setup'], goodRepo);
    expect(r.map((c) => c.verdict)).toEqual(['met', 'met', 'met', 'met', 'met']);
    expect(r[0].evidence).toMatch(/media queries/);
    expect(r[3].evidence).toMatch(/2 test files/);
  });

  it('recognises common test file layouts, and not look-alikes', () => {
    for (const p of ['test.js', 'src/App.test.tsx', 'lib/x.spec.ts', 'test-d.ts', 'tests/a.py', 'pkg/__tests__/b.js']) expect(TEST_FILE.test(p), p).toBe(true);
    for (const p of ['src/contest.js', 'latest.js', 'src/attest.ts', 'protest/readme.md']) expect(TEST_FILE.test(p), p).toBe(false);
  });

  it('never scores visual fidelity: that is left for a human', () => {
    const [r] = runChecks(['Pixel fidelity to Figma'], goodRepo);
    expect(r.verdict).toBe('cannot_assess');
  });

  it('leaves criteria with no applicable check unassessed instead of guessing', () => {
    const [r] = runChecks(['Rate limiter uses a sliding window'], goodRepo);
    expect(r.verdict).toBe('cannot_assess');
  });

  it('does not reward a long write-up: text-only submissions assess nothing', () => {
    const essay = base({ kind: 'text', status: 'none', url: '' });
    const r = runChecks(['Responsive down to 360px', 'Has tests', 'Smooth price animation'], essay);
    expect(r.every((c) => c.verdict === 'cannot_assess')).toBe(true);
    expect(scoreReview(r).status).toBe('unassessed');
  });

  it('marks real shortcomings as not met, with the measurement', () => {
    const bad = base({
      tree: ['index.js'], facts: { commits: 1, commitDays: 1 },
      sources: [{ path: 'index.js', text: 'document.body.innerHTML = `<div onClick="x()">toggle</div>`; const App = () => <div onClick={go}>toggle</div>' }],
    });
    const r = runChecks(['Accessible toggle', 'Has tests', 'Responsive layout', 'Clean commit history'], bad);
    expect(r.map((c) => c.verdict)).toEqual(['not_met', 'not_met', 'not_met', 'not_met']);
    expect(r[0].evidence).toMatch(/clickable <div>/);
  });

  it('cannot assess an unreachable submission', () => {
    const dead = base({ status: 'private_or_missing', note: 'HTTP 404' });
    expect(runChecks(['Has tests'], dead)[0]).toMatchObject({ verdict: 'cannot_assess' });
  });

  it('cannot judge the DOM of a script-only single-page-app shell', () => {
    const shell = base({ kind: 'site', facts: { shell: true }, html: '<div id="root"></div>', sources: [{ path: 'index.html', text: '<div id="root"></div>' }] });
    expect(runChecks(['Responsive down to 360px'], shell)[0].verdict).toBe('cannot_assess');
  });
});

describe('scoreReview', () => {
  it('scores only the assessed criteria and reports coverage', () => {
    const s = scoreReview([
      { criterion: 'a', verdict: 'met', evidence: '', by: 'check' },
      { criterion: 'b', verdict: 'partial', evidence: '', by: 'check' },
      { criterion: 'c', verdict: 'cannot_assess', evidence: '', by: 'check' },
      { criterion: 'd', verdict: 'cannot_assess', evidence: '', by: 'check' },
    ]);
    expect(s).toMatchObject({ score: 75, assessed: 2, total: 4, coverage: 0.5, status: 'partial' });
  });

  it('refuses to recommend on thin coverage, however high the score', () => {
    const r = buildReview(['a', 'b', 'c', 'd'], goodRepo, [
      { criterion: 'a', verdict: 'met', evidence: 'x', by: 'check' },
      ...['b', 'c', 'd'].map((c) => ({ criterion: c, verdict: 'cannot_assess' as const, evidence: 'x', by: 'check' as const })),
    ], [], 'checks');
    expect(r.score).toBe(100);
    expect(recommendationFor(r)).toBe('review');
    expect(summarizeReview(r)).toMatch(/1 of 4 criteria assessed/);
  });

  it('recommends by score once coverage is adequate, and downgrades on integrity warnings', () => {
    const met = (c: string) => ({ criterion: c, verdict: 'met' as const, evidence: 'x', by: 'check' as const });
    const r = buildReview(['a', 'b', 'c'], goodRepo, [met('a'), met('b'), met('c')], [], 'checks');
    expect(recommendationFor(r)).toBe('shortlist');
    expect(recommendationFor({ ...r, flags: [{ level: 'warn', text: 'not the author' }] })).toBe('maybe');
  });
});

describe('verifiedScore', () => {
  it('ignores self-claims and imported GitHub activity', () => {
    const skills = [
      { name: 'React', evidence: 'github' as const, level: 90 },
      { name: 'Go', evidence: 'self' as const, level: 85 },
    ];
    expect(verifiedScore(skills)).toBe(0);
    expect(ASSESSED.github).toBe(false);
  });
  it('counts assessed evidence', () => {
    expect(verifiedScore([{ name: 'React', evidence: 'task' as const, level: 90 }])).toBe(90);
  });
});
