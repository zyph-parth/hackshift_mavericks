import { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Minus, Plus } from 'lucide-react';
import { MATCH_WEIGHTS, EVIDENCE_LABEL, EVIDENCE_WEIGHT, type Evidence } from '@launchloop/shared';
import { PageHero } from '@/components/marketing';
import { Badge, Card, LinkButton, Reveal, Segmented, SpotCard } from '@/components/ui';
import { MatchScoreRing } from '@/components/signature';
import { ARTICLES, FAQ, PRICING } from '@/lib/content';
import { cn, evColor } from '@/lib/utils';

/* ---------------------------- How it works ---------------------------- */
export function HowItWorks() {
  const [who, setWho] = useState<'talent' | 'founder' | 'recruiter'>('talent');
  const flows = {
    talent: [
      ['Build your profile', 'Paste your resume, or prove you own a GitHub account and import your activity. Skills land as self-reported or GitHub activity. Neither counts as verified, and you can never edit an assessed level yourself.'],
      ['Take the voice interview', 'Five questions, about ten minutes, tailored to the skills on your profile. Answer by voice or typing. Each tested skill becomes interview-verified.'],
      ['Do a paid proof task', 'Real work from real startups, funded up front. Accepted work releases the reward and upgrades the skill to task-verified.'],
      ['Get matched and apply', 'Every role shows an auditable match score. Apply in one click with an AI-drafted note, then track the stage in your applications and inbox.'],
    ],
    founder: [
      ['Validate your idea', 'Describe it in three lines. Get the problem, target user, market sizing, competitors, risks and a full Lean Canvas in seconds.'],
      ['Score your readiness', 'A six-axis radar shows where you are weakest and gives concrete next actions you can tick off.'],
      ['Check every scheme', 'Enter your company facts. We run them against each scheme’s rules and show the exact rule that failed, or what is still unknown.'],
      ['Find a co-founder and hire', 'See complementary co-founders with a why-you-two breakdown, then post roles and proof tasks to build your first team.'],
    ],
    recruiter: [
      ['Post a role or task', 'Use the AI job description writer. Publish a funded proof task with a rubric so candidates know how they will be judged.'],
      ['Review blind, ranked by AI', 'Submissions arrive ranked against your rubric with identity hidden. Open any one to see what it met, what it missed and why.'],
      ['Accept and pay', 'Accepting releases the reward from escrow and the candidate’s skills become task-verified. A conversation opens automatically.'],
      ['Run the pipeline', 'Move applicants through Shortlisted, Interview, Offer and Hired. Candidates are notified at every step.'],
    ],
  } as const;
  const ev: Evidence[] = ['self', 'github', 'interview', 'task'];
  return (
    <>
      <PageHero eyebrow="How it works" title={<>Every claim gets an <span className="display">evidence level.</span></>} sub="LaunchLoop replaces guesswork with a ladder of proof. Here is exactly how it works for each side of the market, and how every number is computed." />
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
        <Segmented id="how" value={who} onChange={setWho} options={[{ value: 'talent', label: 'For talent' }, { value: 'founder', label: 'For founders' }, { value: 'recruiter', label: 'For recruiters' }]} />
        <AnimatePresence mode="wait">
          <motion.ol key={who} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8 grid gap-4 md:grid-cols-2">
            {flows[who].map(([t, d], i) => (
              <li key={t} className="card flex gap-4 p-5"><span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{i + 1}</span><div><h3 className="tight font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div></li>
            ))}
          </motion.ol>
        </AnimatePresence>
      </section>
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:grid-cols-2 md:px-6">
          <Reveal>
            <h2 className="tight text-3xl font-semibold md:text-4xl">The evidence ladder</h2>
            <p className="mt-3 text-muted">The same skill is worth more when it is proven. The weight below is what the match engine uses.</p>
            <div className="mt-6 space-y-3">
              {ev.map((e) => (
                <div key={e} className="card flex items-center gap-4 p-4">
                  <span className="h-3 w-3 rounded-full" style={{ background: evColor(e), boxShadow: `0 0 12px ${evColor(e)}` }} />
                  <span className="flex-1 font-medium">{EVIDENCE_LABEL[e]}</span>
                  <span className="num text-lg font-semibold">×{EVIDENCE_WEIGHT[e]}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="tight text-3xl font-semibold md:text-4xl">The match formula</h2>
            <p className="mt-3 text-muted">Deterministic, unit-tested and visible on every score. The AI writes the one-line explanation, never the number.</p>
            <Card className="mt-6 space-y-4 p-5">
              {([['Semantic fit', MATCH_WEIGHTS.semantic, 'How close your whole profile is to the role'], ['Skill overlap', MATCH_WEIGHTS.skill, 'Your level on each required skill, weighted'], ['Verified evidence', MATCH_WEIGHTS.verified, 'How proven those skills are'], ['Role fit', MATCH_WEIGHTS.fit, 'Remote, type and location preferences']] as const).map(([n, w, d]) => (
                <div key={n}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{n}</span><span className="num">{Math.round(w * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><motion.div initial={{ width: 0 }} whileInView={{ width: `${w * 100 * 2.5}%` }} viewport={{ once: true }} transition={{ duration: 0.9 }} className="h-full rounded-full bg-accent" /></div><p className="mt-1 text-xs text-faint">{d}</p></div>
              ))}
            </Card>
          </Reveal>
        </div>
      </section>
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[['Blind by default', 'Grading and ranking never see name, gender, college or photo. Identity is revealed only after a recruiter accepts.'], ['Humans decide', 'AI drafts, grades and ranks. A person always accepts, rejects or hires. Every AI judgement shows its reasoning.'], ['Your data, your call', 'Passwords are hashed, sessions are short-lived and you can delete your account from Settings at any time.']].map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.07}><SpotCard className="h-full p-6"><h3 className="tight text-lg font-semibold">{t}</h3><p className="mt-2 text-sm text-muted">{d}</p></SpotCard></Reveal>
          ))}
        </div>
        <div className="mt-12 text-center"><LinkButton to="/signup" variant="primary" size="lg">Try it free <ArrowRight size={16} /></LinkButton></div>
      </section>
    </>
  );
}

/* -------------------------------- Pricing ------------------------------- */
export function Pricing() {
  return (
    <>
      <PageHero eyebrow="Pricing" title={<>Free to prove. Pay only to <span className="display">hire.</span></>} sub="Talent never pays. Founders get the full studio. Recruiters pay a small share only when they accept work they value." />
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {PRICING.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <div className={cn('card relative flex h-full flex-col p-7', p.highlight && '!border-accent shadow-[0_0_0_4px_var(--accent-soft)]')}>
                {p.highlight && <Badge tone="accent" className="absolute right-5 top-5">Most popular</Badge>}
                <h3 className="tight text-lg font-semibold">{p.name}</h3>
                <p className="mt-4 flex items-baseline gap-2"><span className="num text-5xl font-semibold tracking-tight">{p.price}</span><span className="text-sm text-muted">{p.per}</span></p>
                <p className="mt-3 text-sm text-muted">{p.blurb}</p>
                <ul className="my-6 flex-1 space-y-2.5 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2.5"><Check size={15} className="mt-0.5 shrink-0 text-good" />{f}</li>)}</ul>
                <LinkButton to="/signup" variant={p.highlight ? 'primary' : 'outline'} size="lg" className="w-full">{p.cta}</LinkButton>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-faint">Launch pricing during the hackathon beta. Payments run in test mode; no real money moves.</p>
      </section>
    </>
  );
}

/* --------------------------------- About -------------------------------- */
export function About() {
  return (
    <>
      <PageHero eyebrow="About" title={<>Resumes describe the past. <span className="display">Proof</span> predicts the future.</>} sub="LaunchLoop started with a simple frustration: the best people we knew were invisible to the companies that needed them, because their proof lived in places a resume cannot reach." />
      <section className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 md:grid-cols-2 md:px-6">
        <Reveal>
          <h2 className="tight text-3xl font-semibold">Why this exists</h2>
          <div className="mt-4 space-y-4 text-muted">
            <p>Hiring in early-stage India is broken on both sides. Talented students and self-taught builders cannot signal ability without a famous name on the resume. Founders burn weeks reading applications that all look the same.</p>
            <p>At the same time, first-time founders struggle to validate ideas, discover the government support they qualify for and find a co-founder they will actually work well with.</p>
            <p>LaunchLoop connects these into one loop: proof makes talent discoverable, discoverable talent helps founders build, and founders create the tasks and roles that generate more proof.</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="tight text-3xl font-semibold">What we believe</h2>
          <ul className="mt-4 space-y-4">
            {[['Evidence over assertion', 'Every score should show why. Black boxes do not belong anywhere near someone’s career.'], ['Pay for work', 'Asking people to work for free filters for privilege. Tasks are funded.'], ['Blind first, human last', 'Judge the work before the person, and let people make the final call.'], ['Quiet UI, loud moments', 'Software for serious decisions should feel calm, and celebrate the moments that matter.']].map(([t, d]) => (
              <li key={t} className="card p-4"><p className="font-medium">{t}</p><p className="mt-1 text-sm text-muted">{d}</p></li>
            ))}
          </ul>
        </Reveal>
      </section>
      <section id="contact" className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-[1200px] px-4 py-16 text-center md:px-6">
          <h2 className="tight text-3xl font-semibold">Get in touch</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">Questions, partnerships or feedback from the hackathon judges are all welcome.</p>
          <a href="mailto:hello@launchloop.app" className="mt-6 inline-block font-medium text-accent hover:underline">hello@launchloop.app</a>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------- FAQ --------------------------------- */
export function FAQPage() {
  const [open, setOpen] = useState<string | null>(FAQ[0].q);
  const [group, setGroup] = useState<'All' | 'Talent' | 'Hiring' | 'Platform'>('All');
  const list = FAQ.filter((f) => group === 'All' || f.group === group);
  return (
    <>
      <PageHero eyebrow="FAQ" title={<>Questions, <span className="display">answered.</span></>} />
      <section className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        <Segmented id="faq" value={group} onChange={setGroup} options={(['All', 'Talent', 'Hiring', 'Platform'] as const).map((v) => ({ value: v, label: v }))} />
        <div className="mt-6 divide-y divide-border rounded-card border border-border bg-surface">
          {list.map((f) => {
            const on = open === f.q;
            return (
              <div key={f.q}>
                <button onClick={() => setOpen(on ? null : f.q)} aria-expanded={on} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium">
                  {f.q}
                  <motion.span animate={{ rotate: on ? 180 : 0 }} className="text-muted">{on ? <Minus size={16} /> : <Plus size={16} />}</motion.span>
                </button>
                <AnimatePresence initial={false}>{on && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="px-5 pb-5 text-sm text-muted">{f.a}</p></motion.div>}</AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

/* ------------------------------- Resources ------------------------------ */
export function Resources() {
  return (
    <>
      <PageHero eyebrow="Resources" title={<>Practical guides for <span className="display">builders.</span></>} sub="Short, specific and written by people who have hired, been hired and raised." />
      <section className="mx-auto max-w-[1200px] px-4 py-14 md:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          {ARTICLES.map((a, i) => (
            <Reveal key={a.slug} delay={i * 0.06}>
              <Link to={`/resources/${a.slug}`} className="group block h-full">
                <SpotCard className="flex h-full flex-col p-6">
                  <div className="flex items-center gap-3 text-xs text-muted"><Badge tone="accent">{a.tag}</Badge><span>{a.read} read</span><span className="text-faint">·</span><span>{a.date}</span></div>
                  <h2 className="tight mt-4 text-xl font-semibold">{a.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted">{a.excerpt}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">Read article <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
                </SpotCard>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

export function ArticlePage() {
  const { slug } = useParams();
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) return <Navigate to="/resources" replace />;
  const more = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 2);
  return (
    <article className="mx-auto max-w-2xl px-4 py-14 md:px-6 md:py-20">
      <Link to="/resources" className="text-[13px] text-muted hover:text-text">← All resources</Link>
      <div className="mt-6 flex items-center gap-3 text-xs text-muted"><Badge tone="accent">{a.tag}</Badge><span>{a.read} read</span><span className="text-faint">·</span><span>{a.date}</span></div>
      <h1 className="tight mt-4 text-4xl font-semibold leading-tight md:text-5xl">{a.title}</h1>
      <div className="mt-10 space-y-5">
        {a.body.map((b, i) => (
          <Reveal key={i} y={10}>
            {b.h && <h2 className="tight mb-2 mt-4 text-xl font-semibold">{b.h}</h2>}
            <p className="text-[16px] leading-[1.75] text-muted">{b.p}</p>
          </Reveal>
        ))}
      </div>
      <div className="card mt-14 flex items-center gap-5 p-6">
        <MatchScoreRing score={92} size={64} stroke={5} />
        <div className="flex-1"><p className="tight font-semibold">Put it into practice</p><p className="text-sm text-muted">Create a free profile and see your own evidence ladder.</p></div>
        <LinkButton to="/signup" variant="primary">Get started</LinkButton>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">{more.map((m) => <Link key={m.slug} to={`/resources/${m.slug}`} className="card card-hover p-5"><p className="text-xs text-accent">{m.tag}</p><p className="tight mt-1 font-semibold">{m.title}</p></Link>)}</div>
    </article>
  );
}

/* --------------------------------- Legal -------------------------------- */
const LEGAL = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'October 1, 2026',
    sections: [
      ['What we collect', 'Account details (name, email), the profile information you add (skills, links, bio), your interview answers and scores, task submissions, messages you send through the platform, and basic usage logs needed to keep the service secure.'],
      ['How we use it', 'To run your account, compute match scores, generate AI feedback you request, rank task submissions for recruiters, and send notifications. We do not sell your personal data.'],
      ['Who can see what', 'Signed-in recruiters and founders can see your public profile: name, headline, skills and evidence, and links you choose to add. Your email address is never shown to other users. Interview transcripts are visible only to you.'],
      ['AI processing', 'Grading, ranking and drafting may be performed by a third-party language model. Profiles sent for grading and ranking have name, gender, college and photo removed to reduce bias.'],
      ['Security', 'Passwords are hashed with scrypt. Sessions use short-lived access tokens and an httpOnly refresh cookie. Requests are rate limited and traffic should be served over HTTPS.'],
      ['Your controls', 'You can edit or remove information from your profile at any time and delete your account from Settings. Deleting your account removes your profile.'],
      ['Contact', 'Questions about privacy: hello@launchloop.app.'],
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'October 1, 2026',
    sections: [
      ['Using LaunchLoop', 'You must provide accurate information and keep your credentials secure. You may not impersonate others, upload malicious content, scrape the platform or attempt to manipulate verification.'],
      ['Verification and evidence', 'Verified levels reflect interviews, imports and accepted tasks on the platform. Attempting to falsify evidence, including submitting work that is not your own, may result in removal.'],
      ['Proof tasks and payments', 'Recruiters fund tasks before they open. Accepting a submission releases the reward to the candidate. During the beta, payments run in test mode and no real money moves.'],
      ['AI features', 'AI output is advisory. Match scores come from a published formula, and recruiters make the final hiring decision. AI feedback may contain mistakes; verify anything important.'],
      ['Content', 'You own what you submit. You grant LaunchLoop permission to process and display it as needed to operate the service, including to recruiters you submit work to.'],
      ['Termination', 'You can delete your account at any time. We may suspend accounts that violate these terms.'],
      ['Disclaimer', 'The service is provided as is during a hackathon beta. Scheme eligibility checks are a first filter and not legal or financial advice.'],
    ],
  },
} as const;
export function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const d = LEGAL[kind];
  return (
    <article className="mx-auto max-w-2xl px-4 py-14 md:px-6 md:py-20">
      <h1 className="tight text-4xl font-semibold">{d.title}</h1>
      <p className="mt-2 text-sm text-faint">Last updated {d.updated}</p>
      <div className="mt-10 space-y-8">{d.sections.map(([h, p]) => <section key={h}><h2 className="tight text-lg font-semibold">{h}</h2><p className="mt-2 leading-relaxed text-muted">{p}</p></section>)}</div>
    </article>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-28 text-center">
      <p className="num text-7xl font-semibold text-accent">404</p>
      <h1 className="tight mt-4 text-2xl font-semibold">This page wandered off the loop.</h1>
      <p className="mt-2 text-muted">The link may be broken or the page may have moved.</p>
      <div className="mt-6 flex justify-center gap-3"><LinkButton to="/" variant="primary">Go home</LinkButton><LinkButton to="/dashboard" variant="outline">Open app</LinkButton></div>
    </div>
  );
}
