import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MessageSquare, Plus, Asterisk } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, ChipInput, EmptyState, ErrorState, Field, Input, PageHeader, Segmented, Sheet, Skeleton, Switch, Tabs, Textarea } from '@/components/ui';
import { AIStreamText, MatchScoreRing, SkillChip } from '@/components/signature';
import { useApp } from '@/lib/store';
import { patchApi, post, type ApplicationRow, type PublicUser } from '@/lib/api';
import { errMsg, useJobApplicants, useMyJobs } from '@/lib/queries';
import { SKILL_SUGGESTIONS } from '@/lib/content';
import { cn, scoreColor } from '@/lib/utils';

const COLS = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired'] as const;
type Col = (typeof COLS)[number];
type Applicant = ApplicationRow & { talent: PublicUser };

function Kanban({ jobId }: { jobId: string }) {
  const { data, isLoading, isError, refetch } = useJobApplicants(jobId);
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useApp((s) => s.toast);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Col | null>(null);
  const [local, setLocal] = useState<Record<string, Col>>({});
  useEffect(() => setLocal({}), [data]);
  if (isError) return <ErrorState onRetry={refetch} />;
  if (isLoading) return <Skeleton className="h-64" />;
  if (!data?.length) return <EmptyState title="No applicants yet" body="Once talent applies, you’ll see them here ranked by match, with their evidence." />;

  const stageOf = (a: Applicant) => (local[a.id] ?? a.stage) as Col | 'Rejected';
  const move = async (id: string, stage: Col | 'Rejected') => {
    setLocal((l) => ({ ...l, [id]: stage as Col }));
    try { await patchApi(`/applications/${id}`, { stage }); qc.invalidateQueries({ queryKey: ['jobs'] }); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); setLocal({}); }
  };
  const message = async (t: PublicUser) => {
    try { await post('/threads', { to: t.id, subject: `About your application`, text: `Hi ${t.name.split(' ')[0]}, thanks for applying. Do you have time for a quick chat this week?` }); nav('/inbox'); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
  };

  return (
    <div className="grid gap-3 overflow-x-auto md:grid-cols-5">
      {COLS.map((c) => (
        <div key={c} onDragOver={(e) => { e.preventDefault(); setOver(c); }} onDragLeave={() => setOver(null)} onDrop={() => { if (drag) move(drag, c); setDrag(null); setOver(null); }}
          className={cn('min-h-[280px] min-w-[210px] rounded-card border border-dashed p-2.5 transition-colors', over === c ? 'border-accent bg-accent-soft' : 'border-border bg-surface/40')}>
          <p className="mb-2 flex items-center justify-between px-1.5 text-xs font-medium uppercase tracking-wider text-muted">{c}<span className="num">{data.filter((a) => stageOf(a) === c).length}</span></p>
          <div className="space-y-2">
            <AnimatePresence>
              {data.filter((a) => stageOf(a) === c).map((a) => (
                <motion.div layout key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} draggable onDragStart={() => setDrag(a.id)} onDragEnd={() => { setDrag(null); setOver(null); }} className="card cursor-grab p-3 active:cursor-grabbing">
                  <div className="flex items-center gap-2.5"><Avatar name={a.talent.name} hue={a.talent.hue} size={28} /><div className="min-w-0 flex-1"><Link to={`/u/${a.talent.username}`} className="block truncate text-sm font-medium hover:text-accent">{a.talent.name}</Link><p className="truncate text-[11px] text-muted">{a.talent.headline || 'Talent'}</p></div><span className="num text-sm font-semibold" style={{ color: scoreColor(a.match) }}>{a.match}</span></div>
                  <div className="mt-2 flex flex-wrap gap-1">{a.talent.skills.slice(0, 3).map((s) => <SkillChip key={s.name} size="sm" name={s.name} evidence={s.evidence} source={s.source} />)}</div>
                  <div className="mt-2 flex items-center justify-between"><button onClick={() => message(a.talent)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-accent"><MessageSquare size={11} /> Message</button><button onClick={() => move(a.id, 'Rejected')} className="text-[11px] text-faint hover:text-danger">Pass</button></div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

function PostJob({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useApp((s) => s.toast);
  const [f, setF] = useState({ title: '', summary: '', type: 'Full-time' as 'Full-time' | 'Internship' | 'Contract', remote: true, location: 'Remote (India)', stipend: '', equity: '', stage: 'Seed' as 'Pre-seed' | 'Seed' | 'Series A' });
  const [req, setReq] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const [err, setErr] = useState('');
  const [typed, setTyped] = useState(false);

  const draft = async () => {
    if (f.title.trim().length < 3) return setErr('Add a title first.');
    setErr(''); setAi(true);
    try { const d = await post<{ text: string }>('/ai/jd', { title: f.title, notes: req.join(', ') }); setF((x) => ({ ...x, summary: d.text })); setTyped(true); } catch (e) { setErr(errMsg(e)); }
    setAi(false);
  };
  const submit = async () => {
    setErr('');
    if (f.title.trim().length < 3) return setErr('Add a job title.');
    if (f.summary.trim().length < 20) return setErr('Write a description of at least 20 characters, or use the AI writer.');
    if (!req.length) return setErr('Add at least one required skill.');
    if (!f.stipend.trim()) return setErr('Add the pay range. Roles with pay get 3× more applicants.');
    setBusy(true);
    try {
      await post('/jobs', { ...f, equity: f.equity || null, required: req.map((name, i) => ({ name, weight: Math.max(1, 3 - Math.floor(i / 2)) })) });
      await qc.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: 'Job posted', body: 'Matching talent can see it now.', tone: 'good' });
      onClose(); setF({ ...f, title: '', summary: '' }); setReq([]);
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Post a role" width={560}>
      <div className="space-y-5 p-5">
        <Field label="Job title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Founding Frontend Engineer" maxLength={100} /></Field>
        <Field label="Required skills" hint="Order matters: the first skills are weighted highest."><ChipInput value={req} onChange={setReq} suggestions={SKILL_SUGGESTIONS} placeholder="React, TypeScript…" max={10} /></Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between"><span className="text-[13px] font-medium">Description</span><Button size="sm" loading={ai} onClick={draft}><Asterisk size={13} /> Write with AI</Button></div>
          <Textarea rows={8} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} maxLength={4000} aria-label="Description" />
          {typed && <p className="mt-1 text-xs text-faint"><AIStreamText text="Drafted from your title and skills. Edit anything." run /></p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type"><Segmented id="jt" value={f.type} onChange={(v) => setF({ ...f, type: v })} options={(['Full-time', 'Internship', 'Contract'] as const).map((v) => ({ value: v, label: v }))} /></Field>
          <Field label="Stage"><Segmented id="js" value={f.stage} onChange={(v) => setF({ ...f, stage: v })} options={(['Pre-seed', 'Seed', 'Series A'] as const).map((v) => ({ value: v, label: v }))} /></Field>
          <Field label="Pay"><Input value={f.stipend} onChange={(e) => setF({ ...f, stipend: e.target.value })} placeholder="₹14–22 LPA or ₹25k / month" /></Field>
          <Field label="Equity (optional)"><Input value={f.equity} onChange={(e) => setF({ ...f, equity: e.target.value })} placeholder="0.5–1.0%" /></Field>
          <Field label="Location"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
          <label className="flex items-end justify-between pb-2 text-sm">Remote friendly<Switch on={f.remote} onChange={(v) => setF({ ...f, remote: v })} label="Remote friendly" /></label>
        </div>
        {err && <p className="text-[13px] text-danger" role="alert">{err}</p>}
        <Button variant="primary" size="lg" className="w-full" loading={busy} onClick={submit}>Publish role</Button>
      </div>
    </Sheet>
  );
}

export default function Recruiter() {
  const jobs = useMyJobs();
  const [tab, setTab] = useState<'jobs' | 'pipeline'>('jobs');
  const [job, setJob] = useState<string | null>(null);
  const [post_, setPost] = useState(false);
  const qc = useQueryClient();
  const toast = useApp((s) => s.toast);
  const list = jobs.data ?? [];
  const active = job ?? list[0]?.job.id ?? null;

  const toggle = async (id: string, status: 'open' | 'closed') => {
    try { await patchApi(`/jobs/${id}`, { status }); qc.invalidateQueries({ queryKey: ['jobs'] }); toast({ title: status === 'closed' ? 'Role closed' : 'Role reopened' }); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
  };

  return (
    <>
      <PageHeader eyebrow="Hiring" title="Hire from proof" sub="Post once. See every applicant ranked by an explainable score." actions={<><Link to="/tasks/new"><Button variant="outline">Post proof task</Button></Link><Button variant="primary" onClick={() => setPost(true)}><Plus size={15} /> New role</Button></>} />
      <Tabs id="rec" value={tab} onChange={setTab} options={[{ value: 'jobs', label: 'Roles' }, { value: 'pipeline', label: 'Pipeline' }]} />
      <div className="pt-6">
        {jobs.isError ? <ErrorState onRetry={jobs.refetch} /> : jobs.isLoading ? <Skeleton className="h-48" /> : !list.length ? (
          <EmptyState title="Post your first role" body="Add the skills you need, let AI draft the description, and applicants arrive ranked by match." action={<Button variant="primary" onClick={() => setPost(true)}><Plus size={15} /> New role</Button>} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              {tab === 'jobs' ? (
                <div className="space-y-3">{list.map(({ job: j }, i) => (
                  <motion.div key={j.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card hover className="flex flex-wrap items-center gap-4 p-4">
                      <Avatar name={j.startup} hue={j.startupHue} size={38} />
                      <div className="min-w-0 flex-1"><p className="font-medium">{j.title} {j.status === 'closed' && <Badge>Closed</Badge>}</p><p className="text-[13px] text-muted">{j.startup} · {j.posted === 'just now' ? 'just posted' : `posted ${j.posted}`}</p></div>
                      <div className="hidden gap-1.5 sm:flex">{j.required.slice(0, 3).map((r) => <SkillChip key={r.name} size="sm" name={r.name} />)}</div>
                      <Badge tone="accent"><span className="num">{j.applicants}</span> applicants</Badge>
                      <Button onClick={() => { setJob(j.id); setTab('pipeline'); }}>Pipeline</Button>
                      <Button variant="ghost" onClick={() => toggle(j.id, j.status === 'open' ? 'closed' : 'open')}>{j.status === 'open' ? 'Close' : 'Reopen'}</Button>
                    </Card>
                  </motion.div>
                ))}</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-muted">Role</span><select value={active ?? ''} onChange={(e) => setJob(e.target.value)} className="h-9 rounded-input border border-border bg-surface-2 px-3 text-sm" aria-label="Select role">{list.map(({ job: j }) => <option key={j.id} value={j.id}>{j.title}</option>)}</select><span className="text-xs text-faint">Drag cards between stages. Candidates are notified automatically.</span></div>
                  {active && <Kanban key={active} jobId={active} />}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      <PostJob open={post_} onClose={() => setPost(false)} />
    </>
  );
}

export { MatchScoreRing };
