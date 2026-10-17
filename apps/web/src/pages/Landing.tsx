import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'motion/react';
import Lenis from 'lenis';
import { ArrowRight, BadgeCheck, Compass, FlaskConical, Mic, Scale, Wallet } from 'lucide-react';
import { EVIDENCE_WEIGHT, TALENTS } from '@launchloop/shared';
import { LinkButton, Reveal, SpotCard } from '@/components/ui';
import { CountUp, MatchScoreRing, SkillChip } from '@/components/signature';
import { cn, EASE, evColor } from '@/lib/utils';
import { useStats } from '@/lib/queries';

function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
}

const EV_LABEL = { self: 'Self-reported', github: 'GitHub activity', interview: 'Interview', task: 'Proof task' } as const;

const SHOWCASE = [...TALENTS].sort((a, b) => b.verifiedScore - a.verifiedScore)[0];

/** A static "proof record": what a recruiter actually sees, laid out like a ledger. */
function ProofRecord() {
  const t = SHOWCASE;
  const rows = [...t.skills].sort((a, b) => EVIDENCE_WEIGHT[b.evidence] - EVIDENCE_WEIGHT[a.evidence] || b.level - a.level).slice(0, 6);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE }} className="card relative hidden w-full max-w-[440px] justify-self-end shadow-[var(--shadow)] lg:block">
      <div className="flex items-center justify-between border-b border-border px-5 py-3 text-[11px] uppercase text-faint"><span>Proof record</span><span>@{t.username}</span></div>
      <div className="px-5 pb-4 pt-5">
        <p className="serif text-[28px] leading-none">{t.name}</p>
        <p className="mt-1.5 text-[13px] text-muted">{t.headline}</p>
      </div>
      <table className="w-full text-[13px]">
        <thead><tr className="border-y border-border text-left text-[11px] uppercase text-faint"><th className="px-5 py-2 font-medium">Skill</th><th className="py-2 font-medium">Evidence</th><th className="px-5 py-2 text-right font-medium">Score</th></tr></thead>
        <tbody>
          {rows.map((k) => (
            <tr key={k.name} className="border-b border-border last:border-0">
              <td className="px-5 py-2.5 font-medium">{k.name}</td>
              <td className="py-2.5 text-muted"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: evColor(k.evidence) }} />{EV_LABEL[k.evidence]}</span></td>
              <td className="num px-5 py-2.5 text-right">{k.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-baseline justify-between border-t border-border bg-surface-2 px-5 py-3.5">
        <span className="text-[11px] uppercase text-faint">Verified score</span>
        <span className="serif text-[26px] leading-none">{t.verifiedScore}<span className="text-sm text-faint"> / 100</span></span>
      </div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="relative border-b border-border pt-16 md:pt-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-20 md:px-6 md:pb-28 lg:grid-cols-[1fr_440px]">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex items-center gap-2 text-[11px] uppercase text-faint">
            <span className="h-[7px] w-[7px] bg-accent" aria-hidden /> Built at IIIT Delhi, HackShift
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="mt-6 max-w-3xl text-[48px] leading-[0.98] sm:text-6xl md:text-7xl lg:text-[86px]">
            Hire by proof,<br /><span className="text-muted">not resumes.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6, ease: EASE }} className="mt-7 max-w-xl text-base text-muted md:text-[17px]">
            Talent proves skills in a voice interview and paid tasks. Founders validate ideas, find co-founders and hire from verified proof. One loop, no guesswork.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6, ease: EASE }} className="mt-9 flex flex-wrap gap-3">
            <LinkButton to="/signup" variant="primary" size="lg">I&apos;m talent <ArrowRight size={16} /></LinkButton>
            <LinkButton to="/login" variant="secondary" size="lg">Try a demo account</LinkButton>
          </motion.div>
          <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-xs text-muted">
            {[['self', 'Self-reported'], ['github', 'GitHub activity'], ['interview', 'Interview-verified'], ['task', 'Task-verified']].map(([e, l]) => (
              <span key={e} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: evColor(e) }} />{l}</span>
            ))}
            <span className="text-faint">Every number shows its evidence.</span>
          </div>
        </div>
        <ProofRecord />
      </div>
    </section>
  );
}

function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const { data } = useStats();
  const items = [[data?.talents ?? 0, 'Talents on the platform', ''], [data?.startups ?? 0, 'Founders and recruiters', ''], [data?.openJobs ?? 0, 'Open roles', ''], [data?.tasksPaid ?? 0, 'Proof tasks paid', '']] as const;
  return (
    <section ref={ref} className="border-y border-border bg-surface/40">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-y-8 px-4 py-10 md:grid-cols-4 md:px-6">
        {items.map(([n, l, s], i) => (
          <div key={l} className={cn('md:px-6', i > 0 && 'md:border-l md:border-border')}>
            <p className="tight text-4xl font-semibold md:text-5xl"><CountUp to={n} suffix={s} start={inView} duration={1.6} /></p>
            <p className="mt-1 text-sm text-muted">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* The loop: scroll-driven diagram */
function Loop() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.4'] });
  const len = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const steps = [
    { icon: Mic, t: 'Prove', d: 'A 10-minute voice interview turns self-claims into interview-verified skills.' },
    { icon: Wallet, t: 'Earn', d: 'Funded proof tasks pay in rupees and add task-verified evidence.' },
    { icon: BadgeCheck, t: 'Get matched', d: 'Explainable match scores rank you for jobs and founders for you.' },
    { icon: FlaskConical, t: 'Build', d: 'Validate the idea, check schemes, find a co-founder, hire the shortlist.' },
  ];
  return (
    <section id="loop" className="mx-auto max-w-[1200px] px-4 py-24 md:px-6 md:py-32">
      <Reveal>
        <p className="text-[11px] uppercase text-faint">The loop</p>
        <h2 className="tight mt-3 max-w-2xl text-4xl font-semibold md:text-5xl">Every proof makes the next <span className="display">match</span> better.</h2>
      </Reveal>
      <div ref={ref} className="relative mt-14">
        <svg className="absolute left-[19px] top-4 hidden h-[calc(100%-2rem)] w-1 md:block" preserveAspectRatio="none" viewBox="0 0 2 100">
          <line x1="1" y1="0" x2="1" y2="100" stroke="var(--border)" strokeWidth="2" />
          <motion.line x1="1" y1="0" x2="1" y2="100" stroke="var(--accent)" strokeWidth="2" style={{ pathLength: len }} />
        </svg>
        <div className="grid gap-5 md:gap-10">
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={0.05}>
              <div className="flex items-start gap-5 md:pl-0">
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface text-accent"><s.icon size={17} /></span>
                <div className="flex-1 border-b border-border pb-8 pt-1.5">
                  <div className="flex items-baseline gap-3"><span className="num text-xs text-faint">0{i + 1}</span><h3 className="tight text-xl font-semibold">{s.t}</h3></div>
                  <p className="mt-1.5 text-muted">{s.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Looping micro-demos for the bento */
function ChipFlip() {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = setInterval(() => setOn((o) => !o), 2200); return () => clearInterval(id); }, []);
  return <div className="flex flex-wrap gap-2"><SkillChip name="React" evidence={on ? 'interview' : 'self'} level={on ? 86 : 70} /><SkillChip name="TypeScript" evidence="github" level={78} /><SkillChip name="Node.js" evidence={on ? 'task' : 'self'} level={on ? 90 : 70} /></div>;
}
function RingLoop() {
  const [s, setS] = useState(62);
  useEffect(() => { const id = setInterval(() => setS((v) => (v === 62 ? 91 : 62)), 2600); return () => clearInterval(id); }, []);
  return <MatchScoreRing score={s} size={92} stroke={7} label="match" />;
}
function RankLoop() {
  const [order, setOrder] = useState([0, 1, 2]);
  const items = [['Priya', 91], ['Ananya', 84], ['Meera', 77]] as const;
  useEffect(() => { const id = setInterval(() => setOrder((o) => [o[2], o[0], o[1]]), 1800); return () => clearInterval(id); }, []);
  return (
    <div className="space-y-1.5">
      {order.map((idx) => (
        <motion.div key={idx} layout transition={{ type: 'spring', stiffness: 260, damping: 26 }} className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs">
          <span>{items[idx][0]}</span><span className="num text-good">{items[idx][1]}</span>
        </motion.div>
      ))}
    </div>
  );
}

function Features() {
  const f = [
    { span: 'md:col-span-4', t: 'Evidence on every skill', d: 'Self-reported, GitHub, interview, task. Chips upgrade as you prove yourself.', demo: <ChipFlip /> },
    { span: 'md:col-span-2', t: 'Matches you can audit', d: 'Hover any score for the exact formula.', demo: <RingLoop /> },
    { span: 'md:col-span-2', t: 'AI-ranked shortlists', d: 'Blind review, ranked in seconds.', demo: <RankLoop /> },
    { span: 'md:col-span-4', t: 'Voice interviews that feel human', d: 'Talk, don’t type. Audio-reactive room, live transcript, honest scoring with a typed fallback.', demo: <div className="flex items-end gap-1">{Array.from({ length: 28 }).map((_, i) => <span key={i} className="w-1.5 rounded-full bg-accent" style={{ height: 10 + Math.abs(Math.sin(i * 1.3)) * 34, opacity: 0.35 + (i % 5) * 0.12, animation: `breathe ${1.2 + (i % 4) * 0.3}s ease-in-out ${i * 0.05}s infinite` }} />)}</div> },
    { span: 'md:col-span-3', t: 'Founder Studio', d: 'Idea validator, lean canvas, readiness radar, scheme eligibility with the exact failing rule.', demo: null, icon: FlaskConical },
    { span: 'md:col-span-3', t: 'Mentors and co-founders', d: 'Book a session in two clicks. Match with complementary builders and see why you fit.', demo: null, icon: Compass },
  ];
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-4 pb-24 md:px-6 md:pb-32">
      <Reveal>
        <p className="text-[11px] uppercase text-faint">Features</p>
        <h2 className="tight mt-3 max-w-2xl text-4xl font-semibold md:text-5xl">Built around the evidence.</h2>
      </Reveal>
      <div className="mt-12 grid gap-4 md:grid-cols-6">
        {f.map((x, i) => (
          <Reveal key={x.t} delay={i * 0.05} className={x.span}>
            <SpotCard className="flex h-full min-h-[220px] flex-col justify-between p-6">
              <div>
                {x.icon && <x.icon size={20} className="mb-4 text-accent" />}
                <h3 className="tight text-lg font-semibold">{x.t}</h3>
                <p className="mt-1.5 max-w-md text-sm text-muted">{x.d}</p>
              </div>
              {x.demo && <div className="mt-6">{x.demo}</div>}
            </SpotCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Roles() {
    const roles = [
    { r: 'talent' as const, t: 'Talent', d: 'Prove it once. Get found everywhere. Earn while you build your record.', icon: Mic },
    { r: 'founder' as const, t: 'Founder', d: 'Validate, find schemes, meet a co-founder and hire the right first ten.', icon: FlaskConical },
    { r: 'recruiter' as const, t: 'Recruiter', d: 'Post a task, let AI rank blind submissions, hire the proven.', icon: Scale },
  ];
  return (
    <section id="roles" className="mx-auto max-w-[1200px] px-4 pb-24 md:px-6 md:pb-32">
      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((x, i) => (
          <Reveal key={x.r} delay={i * 0.08}>
            <Link to={`/signup?role=${x.r}`} className="group block">
              <SpotCard className="h-full p-6" whileHover={{ y: -4 }}>
                <x.icon size={22} className="text-accent" />
                <h3 className="tight mt-8 text-2xl font-semibold">{x.t}</h3>
                <p className="mt-2 text-muted">{x.d}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent">Start as {x.t.toLowerCase()} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
              </SpotCard>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--glow)' }} />
      <Reveal className="relative mx-auto max-w-3xl px-4 py-24 text-center md:py-32">
        <h2 className="tight text-4xl font-semibold md:text-6xl">Stop claiming. Start <span className="display">proving.</span></h2>
        <p className="mx-auto mt-5 max-w-md text-muted">Try the full loop with demo data in under two minutes.</p>
        <div className="mt-8 flex justify-center gap-3"><LinkButton to="/signup" variant="primary" size="lg">Get started free <ArrowRight size={16} /></LinkButton></div>
      </Reveal>
    </section>
  );
}

export default function Landing() {
  useLenis();
  return (
    <>
      <Hero />
      <Stats />
      <Loop />
      <Features />
      <Roles />
      <Cta />
    </>
  );
}
