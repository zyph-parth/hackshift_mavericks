import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'motion/react';
import Lenis from 'lenis';
import { ArrowRight, BadgeCheck, Compass, FlaskConical, Mic, Scale, Wallet } from 'lucide-react';
import { PROOF_FEED } from '@launchloop/shared';
import { Badge, LinkButton, Reveal, SpotCard } from '@/components/ui';
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

function ProofCard({ p }: { p: (typeof PROOF_FEED)[number] }) {
  return (
    <div className="card glass flex w-[260px] items-center gap-3 p-3">
      <MatchScoreRing score={p.score} size={44} stroke={4} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{p.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: evColor(p.ev) }} />
          {p.skill} verified
        </p>
      </div>
    </div>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const cols = [PROOF_FEED, [...PROOF_FEED].reverse(), [...PROOF_FEED.slice(3), ...PROOF_FEED.slice(0, 3)]];
  return (
    <section ref={ref} className="relative overflow-hidden pt-20 md:pt-28">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--glow)' }} />
      <div className="grid-bg pointer-events-none absolute inset-0" />
      {/* drifting proof feed */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[60%] justify-end gap-4 overflow-hidden pr-6 opacity-60 [mask-image:linear-gradient(to_bottom,transparent,#000_20%,#000_80%,transparent)] xl:flex">
        {cols.map((c, i) => (
          <div key={i} className="flex flex-col gap-4" style={{ animation: `marquee-up ${38 + i * 9}s linear infinite ${i % 2 ? 'reverse' : ''}`, marginTop: i * 40 }}>
            {[...c, ...c].map((p, j) => <ProofCard key={j} p={p} />)}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] bg-gradient-to-r from-bg via-bg/50 to-transparent xl:block" />

      <motion.div style={{ y, opacity: fade }} className="relative mx-auto max-w-[1200px] px-4 pb-24 md:px-6 md:pb-36">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <Badge tone="accent" className="!px-3 !py-1 !text-xs">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Built at IIIT Delhi · HackShift
          </Badge>
        </motion.div>
        <h1 className="tight mt-6 max-w-3xl text-[44px] font-semibold leading-[1.02] sm:text-6xl md:text-7xl lg:text-[84px]">
          {['Hire', 'by'].map((w, i) => (
            <motion.span key={w} className="mr-[0.25em] inline-block" initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.15 + i * 0.08, duration: 0.8, ease: EASE }}>{w}</motion.span>
          ))}
          <motion.span className="display mr-[0.25em] inline-block text-accent" initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.35, duration: 0.9, ease: EASE }}>proof,</motion.span>
          <br />
          {['not', 'resumes.'].map((w, i) => (
            <motion.span key={w} className="mr-[0.25em] inline-block" initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.5 + i * 0.08, duration: 0.8, ease: EASE }}>{w}</motion.span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.7, ease: EASE }} className="mt-6 max-w-xl text-base text-muted md:text-lg">
          Talent proves skills in a voice interview and paid tasks. Founders validate ideas, find co-founders and hire from verified proof. One loop, no guesswork.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95, duration: 0.7, ease: EASE }} className="mt-9 flex flex-wrap gap-3">
          <LinkButton to="/signup" variant="primary" size="lg">I&apos;m talent <ArrowRight size={16} /></LinkButton>
          <LinkButton to="/login" variant="outline" size="lg">Try a demo account</LinkButton>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          {[['self', 'Self-reported'], ['github', 'GitHub'], ['interview', 'Interview'], ['task', 'Task-verified']].map(([e, l]) => (
            <span key={e} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: evColor(e) }} />{l}</span>
          ))}
          <span className="text-faint">— every number shows its evidence.</span>
        </motion.div>
      </motion.div>
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
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-accent">The loop</p>
        <h2 className="tight mt-3 max-w-2xl text-4xl font-semibold md:text-5xl">Every proof makes the next <span className="display text-accent">match</span> better.</h2>
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
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-accent"><s.icon size={17} /></span>
                <div className="card flex-1 p-5">
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
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-accent">Features</p>
        <h2 className="tight mt-3 max-w-2xl text-4xl font-semibold md:text-5xl">Quiet surface. <span className="display text-accent">Dramatic</span> moments.</h2>
      </Reveal>
      <div className="mt-12 grid gap-4 md:grid-cols-6">
        {f.map((x, i) => (
          <Reveal key={x.t} delay={i * 0.05} className={x.span}>
            <SpotCard className="flex h-full min-h-[220px] flex-col justify-between p-6" whileHover={{ y: -3 }}>
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
        <h2 className="tight text-4xl font-semibold md:text-6xl">Stop claiming. Start <span className="display text-accent">proving.</span></h2>
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
