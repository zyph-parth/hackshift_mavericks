import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Briefcase, Compass, FlaskConical, Mic } from 'lucide-react';
import type { Role } from '@launchloop/shared';
import { Button, Field, Input, Logo, ThemeToggle } from '@/components/ui';
import { MatchScoreRing, SkillChip } from '@/components/signature';
import { useApp } from '@/lib/store';
import { errMsg } from '@/lib/queries';
import { ApiError } from '@/lib/api';
import { EASE } from '@/lib/utils';

const STORIES = [
  { q: 'I stopped sending resumes. One interview, and three founders reached out.', n: 'Priya S.', r: 'Frontend engineer', score: 86, skill: 'React' },
  { q: 'We shortlisted from 48 blind submissions in the time it takes to make chai.', n: 'Neha K.', r: 'Recruiter, health-tech', score: 91, skill: 'Hiring' },
  { q: 'The ₹2,500 proof task got me my first offer. They had already seen my work.', n: 'Ananya N.', r: 'Product designer', score: 88, skill: 'Figma' },
];
const DEMOS: { role: Role; email: string; label: string; icon: typeof Mic }[] = [
  { role: 'talent', email: 'priya@demo.dev', label: 'Talent', icon: Mic },
  { role: 'founder', email: 'arjun@demo.dev', label: 'Founder', icon: FlaskConical },
  { role: 'recruiter', email: 'recruiter@demo.dev', label: 'Recruiter', icon: Briefcase },
  { role: 'mentor', email: 'mentor@demo.dev', label: 'Mentor', icon: Compass },
];

export default function Auth({ mode }: { mode: 'login' | 'signup' }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const user = useApp((s) => s.user);
  const booting = useApp((s) => s.booting);
  const login = useApp((s) => s.login);
  const signupFn = useApp((s) => s.signup);
  const toast = useApp((s) => s.toast);
  const signup = mode === 'signup';
  const [busy, setBusy] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const initialRole = (['talent', 'founder', 'recruiter', 'mentor'] as Role[]).find((r) => r === params.get('role')) ?? 'talent';
  const from = (loc.state as { from?: string } | null)?.from;

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % STORIES.length), 5000);
    return () => clearInterval(id);
  }, []);

  if (!booting && user) return <Navigate to={user.onboarded ? (from ?? '/dashboard') : '/onboarding'} replace />;

  const run = async (key: string, fn: () => Promise<{ onboarded: boolean; name: string }>) => {
    setErr('');
    setBusy(key);
    try {
      const u = await fn();
      toast({ title: signup ? 'Welcome to LaunchLoop' : `Welcome back, ${u.name.split(' ')[0]}`, tone: 'good' });
      nav(u.onboarded ? (from ?? '/dashboard') : '/onboarding');
    } catch (e) {
      setErr(errMsg(e));
      if (e instanceof ApiError && e.code === 'network') setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const submit = () => {
    if (signup && name.trim().length < 2) return setErr('Tell us your name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address.');
    if (pw.length < (signup ? 8 : 1)) return setErr(signup ? 'Use a password of at least 8 characters.' : 'Enter your password.');
    run('e', () => (signup ? signupFn({ name: name.trim(), email, password: pw, roles: [initialRole] }) : login(email, pw)));
  };

  const q = STORIES[i];
  return (
    <div className="noise relative grid min-h-dvh lg:grid-cols-2">
      <div className="relative z-10 flex flex-col px-5 py-6 md:px-12">
        <div className="flex items-center justify-between"><Link to="/"><Logo /></Link><ThemeToggle /></div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <h1 className="tight text-3xl font-semibold md:text-4xl">{signup ? <>Start with <span className="display text-accent">proof.</span></> : <>Welcome <span className="display text-accent">back.</span></>}</h1>
            <p className="mt-2 text-muted">{signup ? 'Create your account. It takes 20 seconds.' : 'Sign in to continue your loop.'}</p>

            <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
              {signup && <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Priya Sharma" /></Field>}
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" aria-invalid={!!err} /></Field>
              <Field label="Password" hint={signup ? 'At least 8 characters.' : undefined}><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} /></Field>
              <AnimatePresence>{err && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[13px] text-danger" role="alert">{err}</motion.p>}</AnimatePresence>
              <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy === 'e'} disabled={!!busy}>{signup ? 'Create account' : 'Sign in'}</Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">
              {signup ? 'Already have an account? ' : 'New here? '}
              <Link to={signup ? '/login' : '/signup'} className="font-medium text-accent hover:underline">{signup ? 'Sign in' : 'Create one'}</Link>
            </p>

            {!signup && (
              <div className="mt-8 rounded-card border border-dashed border-border-strong p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Explore with a demo account</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {DEMOS.map((d) => (
                    <Button key={d.role} size="sm" loading={busy === d.role} disabled={!!busy} onClick={() => run(d.role, () => login(d.email, 'demo1234'))}><d.icon size={14} /> {d.label}</Button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-6 text-center text-xs text-faint">By continuing you agree to our <Link to="/terms" className="underline hover:text-muted">Terms</Link> and <Link to="/privacy" className="underline hover:text-muted">Privacy Policy</Link>.</p>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 hidden overflow-hidden border-l border-border bg-surface/50 lg:flex lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--glow)' }} />
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.6, ease: EASE }} className="card glass relative mx-10 w-full max-w-md p-8">
            <div className="flex items-center gap-4"><MatchScoreRing score={q.score} size={72} stroke={6} /><div><p className="font-medium">{q.n}</p><p className="text-sm text-muted">{q.r}</p></div></div>
            <p className="display mt-7 text-3xl leading-snug">&ldquo;{q.q}&rdquo;</p>
            <div className="mt-6 flex items-center justify-between"><SkillChip name={q.skill} evidence="interview" level={q.score} source="Verified in AI interview" /><span className="text-[11px] text-faint">Illustrative story</span></div>
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-8 flex gap-1.5">{STORIES.map((_, k) => <span key={k} className={`h-1 rounded-full transition-all duration-500 ${k === i ? 'w-6 bg-accent' : 'w-1.5 bg-border-strong'}`} />)}</div>
      </div>
    </div>
  );
}
