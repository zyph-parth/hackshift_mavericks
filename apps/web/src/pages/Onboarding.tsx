import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Briefcase, Check, Compass, FlaskConical, Mic } from 'lucide-react';
import type { Role } from '@launchloop/shared';
import { Button, ChipInput, Field, Input, Logo, Textarea, ThemeToggle } from '@/components/ui';
import { ImportPanel, SkillsEditor } from '@/components/profile';
import { useApp } from '@/lib/store';
import { errMsg } from '@/lib/queries';
import { FOUNDER_SKILLS, FOUNDER_VALUES } from '@/lib/content';
import { cn, EASE } from '@/lib/utils';

const ROLE_CARDS: { r: Role; t: string; d: string; icon: typeof Mic }[] = [
  { r: 'talent', t: 'Talent', d: 'Prove skills, get matched, earn from tasks', icon: Mic },
  { r: 'founder', t: 'Founder', d: 'Validate an idea, find co-founders and funding', icon: FlaskConical },
  { r: 'recruiter', t: 'Recruiter', d: 'Post tasks and hire from AI-ranked proof', icon: Briefcase },
  { r: 'mentor', t: 'Mentor', d: 'Share expertise and get booked (by invite)', icon: Compass },
];

export default function Onboarding() {
  const nav = useNavigate();
  const user = useApp((s) => s.user);
  const booting = useApp((s) => s.booting);
  const updateMe = useApp((s) => s.updateMe);
  const toast = useApp((s) => s.toast);
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState<Role[]>(user?.roles ?? ['talent']);
  const [f, setF] = useState({ headline: user?.headline ?? '', college: user?.college ?? '', location: user?.location ?? '', company: user?.company ?? '', bio: user?.bio ?? '' });
  const [fnd, setFnd] = useState({ has: user?.founder?.has ?? [], needs: user?.founder?.needs ?? [], values: user?.founder?.values ?? [], commitment: user?.founder?.commitment ?? 'Full-time' as 'Full-time' | 'Part-time', stage: user?.founder?.stage ?? 'Idea' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (booting) return null;
  if (!user) return <Navigate to="/login" replace />;
  const talent = roles.includes('talent');
  const founder = roles.includes('founder');
  const recruiter = roles.includes('recruiter');
  const toggle = (r: Role) => r !== 'mentor' && setRoles((cur) => (cur.includes(r) ? (cur.length > 1 ? cur.filter((x) => x !== r) : cur) : [...cur, r]));

  const next = async () => {
    setErr('');
    if (step === 0) {
      setBusy(true);
      try { await updateMe({ roles, activeRole: roles[0] }); setStep(1); } catch (e) { setErr(errMsg(e)); }
      setBusy(false);
    } else if (step === 1) {
      setBusy(true);
      try { await updateMe({ headline: f.headline, college: f.college, location: f.location, bio: f.bio, ...(recruiter || founder ? { company: f.company } : {}) }); setStep(2); } catch (e) { setErr(errMsg(e)); }
      setBusy(false);
    }
  };
  const finish = async () => {
    setBusy(true);
    try {
      await updateMe({ onboarded: true, ...(founder ? { founder: fnd } : {}) });
      toast({ title: 'You’re all set', body: talent ? 'Take the AI interview to verify your skills.' : 'Your workspace is ready.', tone: 'good' });
      nav('/dashboard');
    } catch (e) { setErr(errMsg(e)); setBusy(false); }
  };

  return (
    <div className="noise relative min-h-dvh">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--glow)' }} />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6">
        <div className="flex items-center justify-between"><Logo /><div className="flex items-center gap-2"><ThemeToggle /><button onClick={finish} className="text-sm text-muted hover:text-text">Skip for now</button></div></div>
        <div className="mt-8 h-1 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
          <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${((step + 1) / 3) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
        </div>
        <p className="num mt-3 text-xs text-faint">Step {step + 1} of 3</p>

        <div className="flex flex-1 flex-col justify-center py-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: EASE }}>
                <h1 className="tight text-3xl font-semibold md:text-4xl">What brings you <span className="display text-accent">here, {user.name.split(' ')[0]}?</span></h1>
                <p className="mt-2 text-muted">Pick one or more. You can switch between them any time.</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {ROLE_CARDS.map((c) => {
                    const on = roles.includes(c.r);
                    const disabled = c.r === 'mentor' && !on;
                    return (
                      <motion.button key={c.r} onClick={() => toggle(c.r)} disabled={disabled} whileTap={{ scale: 0.98 }} className={cn('card card-hover relative p-5 text-left disabled:opacity-50', on && '!border-accent shadow-[0_0_0_3px_var(--accent-soft)]')} aria-pressed={on}>
                        <c.icon size={20} className={on ? 'text-accent' : 'text-muted'} />
                        <p className="tight mt-4 font-semibold">{c.t}</p>
                        <p className="mt-0.5 text-[13px] text-muted">{c.d}</p>
                        <AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-fg"><Check size={12} strokeWidth={3} /></motion.span>}</AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-4">
                <h1 className="tight text-3xl font-semibold md:text-4xl">A few <span className="display text-accent">basics.</span></h1>
                <Field label="Headline" hint="One line on what you do best."><Input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} placeholder={talent ? 'Frontend engineer · design-minded' : 'Founder building…'} maxLength={140} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={talent ? 'College or company' : 'Organisation'}><Input value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })} placeholder="IIIT Delhi" /></Field>
                  <Field label="City"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="New Delhi" /></Field>
                </div>
                {(founder || recruiter) && <Field label="Company or startup name" hint="Shown on your jobs and tasks."><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Nimbus Health" /></Field>}
                <Field label="About you" hint="Optional. Two sentences recruiters will actually read."><Textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={600} /></Field>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
                {talent && (
                  <>
                    <div><h1 className="tight text-3xl font-semibold md:text-4xl">Show us what you <span className="display text-accent">can do.</span></h1><p className="mt-2 text-muted">Import from a resume or GitHub, then fine-tune. Everything starts self-reported until you prove it.</p></div>
                    <ImportPanel />
                    <SkillsEditor compact />
                  </>
                )}
                {founder && (
                  <>
                    {talent ? <h2 className="tight border-t border-border pt-6 text-xl font-semibold">As a founder, what do you bring?</h2> : <div><h1 className="tight text-3xl font-semibold md:text-4xl">What do you <span className="display text-accent">bring?</span></h1><p className="mt-2 text-muted">This powers co-founder matching.</p></div>}
                    <Field label="I bring"><ChipInput value={fnd.has} onChange={(has) => setFnd({ ...fnd, has })} suggestions={FOUNDER_SKILLS} placeholder="Sales, Operations…" /></Field>
                    <Field label="I need"><ChipInput value={fnd.needs} onChange={(needs) => setFnd({ ...fnd, needs })} suggestions={FOUNDER_SKILLS} placeholder="Backend, Design…" /></Field>
                    <Field label="What we value"><ChipInput value={fnd.values} onChange={(values) => setFnd({ ...fnd, values })} suggestions={FOUNDER_VALUES} /></Field>
                  </>
                )}
                {!talent && !founder && (
                  <div><h1 className="tight text-3xl font-semibold md:text-4xl">You&apos;re <span className="display text-accent">ready.</span></h1><p className="mt-2 text-muted">Post your first role or proof task from the Hiring console.</p></div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {err && <p className="mt-4 text-[13px] text-danger" role="alert">{err}</p>}
        </div>

        <div className="flex items-center justify-between pb-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} className={step === 0 ? 'invisible' : ''}>Back</Button>
          {step < 2 ? <Button variant="primary" size="lg" loading={busy} onClick={next}>Continue</Button> : <Button variant="primary" size="lg" loading={busy} onClick={finish}>Enter LaunchLoop</Button>}
        </div>
      </div>
    </div>
  );
}
