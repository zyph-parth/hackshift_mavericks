import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Check, FlaskConical, Mic, Moon, Sun } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Role } from '@launchloop/shared';
import { Badge, Button, Card, ChipInput, Field, Input, Modal, PageHeader, Segmented, Switch, Textarea } from '@/components/ui';
import { useApp } from '@/lib/store';
import { api, post } from '@/lib/api';
import { errMsg } from '@/lib/queries';
import { FOUNDER_SKILLS, FOUNDER_VALUES } from '@/lib/content';

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return <Card className="p-6"><h2 className="tight font-semibold">{title}</h2>{sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}<div className="mt-5 space-y-4">{children}</div></Card>;
}

export default function Settings() {
  const user = useApp((s) => s.user)!;
  const updateMe = useApp((s) => s.updateMe);
  const logout = useApp((s) => s.logout);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const toast = useApp((s) => s.toast);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [f, setF] = useState({ name: user.name, headline: user.headline, bio: user.bio, college: user.college, location: user.location, company: user.company ?? '', github: user.links.github ?? '', linkedin: user.links.linkedin ?? '', website: user.links.website ?? '' });
  const [openTo, setOpenTo] = useState(user.openTo);
  const [fnd, setFnd] = useState(user.founder ?? { has: [], needs: [], commitment: 'Full-time' as const, stage: 'Idea', values: [] });
  const [busy, setBusy] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [confirm, setConfirm] = useState('');

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast({ title: ok, tone: 'good' }); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
    setBusy(null);
  };
  const save = () => run('profile', () => updateMe({ name: f.name, headline: f.headline, bio: f.bio, college: f.college, location: f.location, ...(user.roles.some((r) => r === 'founder' || r === 'recruiter') ? { company: f.company } : {}), links: { github: f.github || undefined, linkedin: f.linkedin || undefined, website: f.website || undefined }, openTo }), 'Profile saved');
  const addRole = (r: Role) => run('role' + r, async () => { await updateMe({ addRoles: [r] }); qc.invalidateQueries(); }, `${r[0].toUpperCase() + r.slice(1)} role added. Switch from the top bar.`);
  const available = (['talent', 'founder', 'recruiter'] as Role[]).filter((r) => !user.roles.includes(r));
  const icons = { talent: Mic, founder: FlaskConical, recruiter: Briefcase } as const;
  const isDemo = ['priya@demo.dev', 'arjun@demo.dev', 'recruiter@demo.dev', 'mentor@demo.dev'].includes(user.email);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Settings" title="Your account" sub={user.email} />
      <Section title="Profile" sub="What recruiters and founders see. Your email is never shown.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Headline"><Input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} maxLength={140} /></Field>
          <Field label="College or organisation"><Input value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })} /></Field>
          <Field label="City"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
          {user.roles.some((r) => r === 'founder' || r === 'recruiter') && <Field label="Company"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>}
        </div>
        <Field label="About"><Textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={600} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="GitHub"><Input value={f.github} onChange={(e) => setF({ ...f, github: e.target.value })} placeholder="github.com/you" /></Field>
          <Field label="LinkedIn"><Input value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} placeholder="linkedin.com/in/you" /></Field>
          <Field label="Website"><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="you.dev" /></Field>
        </div>
        {user.roles.includes('talent') && (
          <Field label="I’m open to">
            <div className="flex flex-wrap gap-2">{['remote', 'internship', 'full-time', 'contract'].map((o) => { const on = openTo.includes(o); return <button key={o} onClick={() => setOpenTo(on ? openTo.filter((x) => x !== o) : [...openTo, o])} aria-pressed={on} className={`rounded-full border px-3 py-1 text-sm capitalize transition ${on ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted hover:text-text'}`}>{on && <Check size={12} className="mr-1 inline" />}{o}</button>; })}</div>
          </Field>
        )}
        <Button variant="primary" loading={busy === 'profile'} onClick={save}>Save profile</Button>
      </Section>

      {user.roles.includes('founder') && (
        <Section title="Co-founder matching" sub="Matches compare what you bring against what others need.">
          <Field label="I bring"><ChipInput value={fnd.has} onChange={(has) => setFnd({ ...fnd, has })} suggestions={FOUNDER_SKILLS} /></Field>
          <Field label="I need"><ChipInput value={fnd.needs} onChange={(needs) => setFnd({ ...fnd, needs })} suggestions={FOUNDER_SKILLS} /></Field>
          <Field label="What we value"><ChipInput value={fnd.values} onChange={(values) => setFnd({ ...fnd, values })} suggestions={FOUNDER_VALUES} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Commitment"><Segmented id="cm" value={fnd.commitment} onChange={(commitment) => setFnd({ ...fnd, commitment })} options={[{ value: 'Full-time', label: 'Full-time' }, { value: 'Part-time', label: 'Part-time' }]} /></Field>
            <Field label="Stage"><Segmented id="st" value={fnd.stage as 'Idea'} onChange={(stage) => setFnd({ ...fnd, stage })} options={['Idea', 'Pre-seed', 'Seed'].map((v) => ({ value: v as 'Idea', label: v }))} /></Field>
          </div>
          <Button variant="primary" loading={busy === 'founder'} onClick={() => run('founder', () => updateMe({ founder: fnd }).then(() => qc.invalidateQueries({ queryKey: ['cofounders'] })), 'Matching profile saved')}>Save</Button>
        </Section>
      )}

      <Section title="Roles" sub="Use LaunchLoop as more than one thing. Switch from the top bar.">
        <div className="flex flex-wrap gap-2">{user.roles.map((r) => <Badge key={r} tone="accent" className="capitalize">{r}</Badge>)}</div>
        {available.length > 0 && <div className="flex flex-wrap gap-2">{available.map((r) => { const I = icons[r as keyof typeof icons]; return <Button key={r} loading={busy === 'role' + r} onClick={() => addRole(r)}><I size={14} /> Add {r} role</Button>; })}</div>}
      </Section>

      <Section title="Appearance">
        <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Dark mode</p><p className="text-[13px] text-muted">Also available from the top bar and ⌘K.</p></div><span className="flex items-center gap-2"><Sun size={14} className="text-muted" /><Switch on={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} label="Dark mode" /><Moon size={14} className="text-muted" /></span></div>
      </Section>

      <Section title="Session & data">
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => { await logout(); qc.clear(); nav('/'); }}>Sign out</Button>
          {user.id === 't_priya' && <Button onClick={() => run('reset', async () => { await post('/me/reset-demo'); const d = await api<{ user: typeof user }>('/me'); useApp.getState().setUser(d.user); qc.invalidateQueries(); }, 'Demo reset to a clean starting state')} loading={busy === 'reset'}>Reset demo data</Button>}
          {!isDemo && <Button variant="danger" onClick={() => setDel(true)}>Delete account</Button>}
        </div>
        {isDemo && <p className="text-xs text-faint">This is a shared demo account, so it can’t be deleted.</p>}
      </Section>

      <Modal open={del} onClose={() => setDel(false)} width={420}>
        <div className="space-y-4 p-6">
          <h3 className="tight text-lg font-semibold">Delete your account?</h3>
          <p className="text-sm text-muted">This removes your profile and signs you out everywhere. Type <span className="num font-medium text-text">DELETE</span> to confirm.</p>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type DELETE" />
          <div className="flex justify-end gap-2"><Button onClick={() => setDel(false)}>Cancel</Button><Button variant="danger" disabled={confirm !== 'DELETE'} loading={busy === 'del'} onClick={() => run('del', async () => { await api('/me', { method: 'DELETE', body: { confirm: 'DELETE' } }); await logout(); qc.clear(); nav('/'); }, 'Account deleted')}>Delete forever</Button></div>
        </div>
      </Modal>
    </div>
  );
}
