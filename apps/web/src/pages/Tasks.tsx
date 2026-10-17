import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { BadgeCheck, Clock, FileText, Link2, Plus, Sparkles, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, ChipInput, EmptyState, ErrorState, Field, Input, LinkButton, PageHeader, Segmented, Skeleton, Textarea } from '@/components/ui';
import { CountUp, Meter } from '@/components/signature';
import { useApp, useRole } from '@/lib/store';
import { patchApi, post, type TaskT } from '@/lib/api';
import { errMsg, useMyTasks, useTask, useTasks } from '@/lib/queries';
import { SKILL_SUGGESTIONS } from '@/lib/content';
import { cn, EASE, inr, scoreColor, timeLeft } from '@/lib/utils';

const DIFF = { Easy: 'good', Medium: 'warn', Hard: 'danger' } as const;

function TaskCard({ t, i, owner }: { t: TaskT; i: number; owner?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.5, ease: EASE }}>
      <Link to={owner ? `/tasks/${t.id}/review` : `/tasks/${t.id}`} className="card card-hover spotlight group block h-full p-5" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`); }}>
        <div className="flex items-start justify-between">
          <span className="inline-flex items-center gap-2 text-[13px] text-muted"><Avatar name={t.startup} hue={t.startupHue} size={20} />{t.startup}</span>
          {t.funded ? <Badge tone="good"><BadgeCheck size={11} /> Funded</Badge> : <Badge>Awaiting funds</Badge>}
        </div>
        <p className="num mt-5 text-4xl font-semibold tracking-tight">{inr(t.reward)}</p>
        <h3 className="tight mt-2 font-semibold">{t.title}</h3>
        <div className="mt-4 flex flex-wrap items-center gap-2"><Badge tone={DIFF[t.difficulty]}>{t.difficulty}</Badge>{t.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock size={12} />{t.status === 'closed' ? 'Closed' : timeLeft(t.deadline)}</span>
          <span>{owner ? <span className="font-medium text-accent">Review {t.submissions} →</span> : t.mine ? <span className="text-good">You submitted · AI {t.mine.aiScore}</span> : `${t.submissions} submission${t.submissions === 1 ? '' : 's'}`}</span>
        </div>
      </Link>
    </motion.div>
  );
}

export function Tasks() {
  const role = useRole();
  const poster = role === 'recruiter' || role === 'founder';
  const all = useTasks();
  const mine = useMyTasks(poster);
  const [tab, setTab] = useState<'open' | 'mine'>(poster ? 'mine' : 'open');
  const active = poster && tab === 'mine' ? mine : all;
  return (
    <>
      <PageHeader eyebrow="Proof tasks" title={poster ? 'Hire by watching the work' : 'Get paid to prove it'} sub={poster ? 'Fund a small, real task. AI ranks every submission against your rubric.' : 'Real work from real startups. Every task is funded up front.'} actions={<>
        {poster && <Segmented id="tt" value={tab} onChange={setTab} options={[{ value: 'mine', label: 'My tasks' }, { value: 'open', label: 'All open' }]} />}
        {poster && <LinkButton to="/tasks/new" variant="primary"><Plus size={15} /> New task</LinkButton>}
      </>} />
      {active.isError ? <ErrorState onRetry={active.refetch} /> : active.isLoading ? <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div> : !active.data?.length ? (
        <EmptyState title={poster && tab === 'mine' ? 'No tasks posted yet' : 'No open tasks right now'} body={poster ? 'A paid proof task is the fastest way to find out who can actually do the job.' : 'New funded tasks are posted every week. Check back soon.'} action={poster ? <LinkButton to="/tasks/new" variant="primary">Post your first task</LinkButton> : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{active.data.map((t, i) => <TaskCard key={t.id} t={t} i={i} owner={poster && tab === 'mine'} />)}</div>
      )}
    </>
  );
}

export function NewTask() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useApp((s) => s.toast);
  const [f, setF] = useState({ title: '', brief: '', reward: 2500, deadlineDays: 5, difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard' });
  const [skills, setSkills] = useState<string[]>([]);
  const [rubric, setRubric] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fee = Math.round(f.reward * 0.08);
  const submit = async () => {
    setErr('');
    if (f.title.trim().length < 5) return setErr('Give the task a clear title.');
    if (f.brief.trim().length < 30) return setErr('Describe the task in at least a couple of sentences.');
    if (!skills.length) return setErr('Add at least one skill.');
    if (rubric.length < 2) return setErr('Add at least two rubric points so submissions can be scored fairly.');
    setBusy(true);
    try {
      const d = await post<{ task: TaskT }>('/tasks', { ...f, skills, rubric });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task published', body: 'Funded and visible to talent now.', tone: 'good' });
      nav(`/tasks/${d.task.id}/review`);
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  return (
    <>
      <Link to="/tasks" className="mb-5 inline-block text-[13px] text-muted hover:text-text">← Tasks</Link>
      <PageHeader eyebrow="New proof task" title="Pay for proof, not promises" sub="Keep it small: two to four hours of real work, scored against a rubric you publish." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="space-y-5 p-6">
          <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Build a responsive pricing page" maxLength={120} /></Field>
          <Field label="Brief" hint="What to build, constraints, and what a great result looks like."><Textarea rows={6} value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })} maxLength={4000} /></Field>
          <Field label="Skills this task proves"><ChipInput value={skills} onChange={setSkills} suggestions={SKILL_SUGGESTIONS} placeholder="React, Tailwind…" max={6} /></Field>
          <Field label="Rubric" hint="Press Enter after each criterion. The AI scores every submission against this exact list."><ChipInput value={rubric} onChange={setRubric} placeholder="Works down to 360px wide…" max={8} /></Field>
        </Card>
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="space-y-4 p-5">
            <Field label="Reward (₹)"><Input type="number" min={500} step={500} value={f.reward} onChange={(e) => setF({ ...f, reward: Math.max(0, Number(e.target.value)) })} /></Field>
            <Field label="Deadline"><div className="flex items-center gap-2"><Input type="number" min={1} max={60} value={f.deadlineDays} onChange={(e) => setF({ ...f, deadlineDays: Number(e.target.value) })} /><span className="text-sm text-muted">days</span></div></Field>
            <Field label="Difficulty"><Segmented id="diff" value={f.difficulty} onChange={(v) => setF({ ...f, difficulty: v })} options={(['Easy', 'Medium', 'Hard'] as const).map((d) => ({ value: d, label: d }))} /></Field>
            <div className="space-y-1.5 border-t border-border pt-4 text-sm"><div className="flex justify-between"><span className="text-muted">Reward</span><span className="num">{inr(f.reward)}</span></div><div className="flex justify-between"><span className="text-muted">Platform fee (8%)</span><span className="num">{inr(fee)}</span></div><div className="flex justify-between font-semibold"><span>Total escrow</span><span className="num">{inr(f.reward + fee)}</span></div></div>
            {err && <p className="text-[13px] text-danger" role="alert">{err}</p>}
            <Button variant="primary" size="lg" className="w-full" loading={busy} onClick={submit}>Fund and publish</Button>
            <p className="text-center text-xs text-faint">Test mode: no real money moves.</p>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const { data: task, isLoading, isError, refetch } = useTask(id);
  const qc = useQueryClient();
  const toast = useApp((s) => s.toast);
  const role = useRole();
  const user = useApp((s) => s.user)!;
  const [kind, setKind] = useState<'link' | 'text'>('link');
  const [link, setLink] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (isError) return <ErrorState onRetry={refetch} />;
  if (isLoading || !task) return <Skeleton className="h-96" />;
  const mine = task.mine;
  const isOwner = task.ownerId === user.id;
  const expired = new Date(task.deadline).getTime() <= Date.now();
  const canSubmit = role === 'talent' && task.status === 'open' && !expired && !isOwner;
  const setStatus = async (status: 'open' | 'closed') => {
    try { await patchApi(`/tasks/${task.id}`, { status }); await qc.invalidateQueries(); toast({ title: status === 'closed' ? 'Task closed' : 'Task reopened' }); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
  };

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await post(`/tasks/${task.id}/submit`, kind === 'link' ? { link } : { text });
      await qc.invalidateQueries();
      toast({ title: 'Submission received', body: 'The AI pre-review is ready below.', tone: 'good' });
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <>
      <Link to="/tasks" className="mb-5 inline-block text-[13px] text-muted hover:text-text">← All tasks</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted"><Avatar name={task.startup} hue={task.startupHue} size={20} />{task.startup}{task.funded ? <Badge tone="good"><BadgeCheck size={11} /> Funded</Badge> : <Badge>Awaiting funds</Badge>}{task.status === 'closed' && <Badge tone="danger">Closed</Badge>}<Badge tone={DIFF[task.difficulty]}>{task.difficulty}</Badge></div>
          <h1 className="tight mt-3 text-3xl font-semibold md:text-4xl">{task.title}</h1>
          <p className="mt-4 whitespace-pre-line text-muted">{task.brief}</p>
          <div className="mt-4 flex flex-wrap gap-2">{task.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
          <Card className="mt-6 p-5">
            <h3 className="tight font-semibold">Rubric</h3>
            <p className="text-[13px] text-muted">How the AI and the founder will score you.</p>
            <ul className="mt-3 space-y-2.5">{task.rubric.map((r, i) => <motion.li key={r} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-start gap-2.5 text-sm"><span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] text-accent">{i + 1}</span>{r}</motion.li>)}</ul>
          </Card>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted">Reward</p>
            <p className="num mt-1 text-4xl font-semibold"><CountUp to={task.reward} prefix="₹" /></p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><Clock size={12} />{timeLeft(task.deadline)} · {task.submissions} submitted</p>
            {isOwner && <Button size="sm" variant="ghost" className="mt-3" onClick={() => setStatus(task.status === 'open' ? 'closed' : 'open')}>{task.status === 'open' ? 'Close task to new submissions' : 'Reopen task'}</Button>}
          </Card>
          <Card className="p-5">
            {mine ? (
              <div>
                <div className="text-center"><motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-full', mine.status === 'rejected' ? 'bg-danger/15 text-danger' : 'bg-good/15 text-good')}>{mine.status === 'rejected' ? <X /> : <BadgeCheck />}</motion.div><p className="tight mt-3 font-semibold">{mine.status === 'accepted' ? 'Accepted and paid' : mine.status === 'rejected' ? 'Not selected' : 'Submitted'}</p></div>
                <div className="mt-4"><div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-sm"><Sparkles size={13} className="text-accent" /> AI pre-review</span><span className="num text-2xl font-semibold" style={{ color: scoreColor(mine.aiScore) }}><CountUp to={mine.aiScore} /></span></div><div className="mt-2"><Meter value={mine.aiScore} /></div><p className="mt-3 text-[13px] text-muted">{mine.summary}</p>
                  <ul className="mt-3 space-y-1 text-[13px]">{mine.meets.map((m) => <li key={m} className="text-good">✓ {m}</li>)}{mine.missing.map((m) => <li key={m} className="text-danger">✕ {m}</li>)}</ul></div>
              </div>
            ) : canSubmit ? (
              <div className="space-y-4">
                <h3 className="tight font-semibold">Submit your work</h3>
                <Segmented id="sub" value={kind} onChange={setKind} options={[{ value: 'link', label: <span className="flex items-center gap-1.5"><Link2 size={13} />Link</span> }, { value: 'text', label: <span className="flex items-center gap-1.5"><FileText size={13} />Write-up</span> }]} />
                <Field label={kind === 'link' ? 'Repo or prototype URL' : 'Your write-up'} hint={kind === 'link' ? 'GitHub, Figma, a deployed URL…' : 'Explain what you built and the decisions you made.'}>
                  {kind === 'text' ? <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} /> : <Input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://github.com/you/project" />}
                </Field>
                {err && <p className="text-[13px] text-danger" role="alert">{err}</p>}
                <Button variant="primary" className="w-full" size="lg" loading={busy} disabled={kind === 'link' ? !/^https?:\/\//.test(link) : text.trim().length < 20} onClick={submit}>Submit for review</Button>
              </div>
            ) : (
              <div className="text-center text-sm text-muted">{isOwner ? <LinkButton to={`/tasks/${task.id}/review`} variant="primary">Review submissions</LinkButton> : role === 'talent' ? (expired || task.status === 'closed' ? 'This task is no longer accepting submissions.' : null) : 'Switch to your talent role to submit.'}</div>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

export { cn };
