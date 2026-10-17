import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Briefcase, Check, CreditCard, Lock, MessageSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Skeleton } from '@/components/ui';
import { CountUp, SkillChip } from '@/components/signature';
import { ReviewPanel } from '@/components/review';
import { ShortlistBoard, type Row } from '@/components/hero';
import { useApp } from '@/lib/store';
import { post } from '@/lib/api';
import { errMsg, useSubmissions } from '@/lib/queries';
import { EASE, inr, scoreColor, sleep } from '@/lib/utils';

export default function Review() {
  const { id } = useParams();
  const { data, isLoading, isError, refetch } = useSubmissions(id);
  const qc = useQueryClient();
  const toast = useApp((s) => s.toast);
  const [sel, setSel] = useState<string | null>(null);
  const [pay, setPay] = useState<'closed' | 'confirm' | 'processing' | 'done'>('closed');
  const [role, setRole] = useState('');
  const [hiring, setHiring] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const nav = useNavigate();
  const [blind, setBlind] = useState(true);
  const subs = data?.submissions ?? [];
  const task = data?.task;
  const accepted = subs.find((s) => s.status === 'accepted')?.id ?? null;
  const rows: Row[] = useMemo(() => subs.map((s) => ({ id: s.id, name: s.talent?.name ?? 'Candidate', hue: s.talent?.hue ?? 0, score: s.aiScore, rec: s.recommendation, meets: s.meets, missing: s.missing, subtitle: s.talent?.headline, status: s.review.status, assessed: s.review.assessed, total: s.review.total })), [subs]);
  const cur = subs.find((s) => s.id === (sel ?? subs[0]?.id));

  if (isError) return <ErrorState onRetry={refetch} />;
  if (isLoading || !task) return <Skeleton className="h-96" />;
  if (!subs.length) return (<><PageHeader eyebrow="Proof task review" title={task.title} /><EmptyState title="No submissions yet" body="Talent can see this task now. Each submitted repo or site is opened and checked against your rubric the moment it arrives." action={<Link to="/tasks"><Button>Back to tasks</Button></Link>} /></>);

  const doPay = async () => {
    if (!cur) return;
    setPay('processing');
    try {
      await Promise.all([post(`/submissions/${cur.id}/accept`), sleep(1500)]);
      await qc.invalidateQueries();
      setPay('done');
    } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); setPay('closed'); }
  };
  const reject = async () => {
    if (!cur) return;
    try { await post(`/submissions/${cur.id}/reject`); await qc.invalidateQueries(); toast({ title: 'Marked as not selected' }); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
  };
  const revealed = !blind || cur?.status === 'accepted';
  const rerun = async () => {
    if (!cur) return;
    setRerunning(true);
    try { await post(`/submissions/${cur.id}/reinspect`); await qc.invalidateQueries(); toast({ title: 'Inspection re-run', tone: 'good' }); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
    setRerunning(false);
  };
  const first = cur?.talent?.name.split(' ')[0] ?? 'them';
  const hire = async () => {
    if (!cur) return;
    setHiring(true);
    try {
      await post(`/submissions/${cur.id}/hire`, { role: role.trim() || `${task.skills[0] ?? 'Founding'} Engineer` });
      await qc.invalidateQueries({ queryKey: ['threads'] });
      toast({ title: `Offer sent to ${first}`, body: 'The conversation is open in your inbox.', tone: 'good' });
      setPay('closed');
      nav('/inbox');
    } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
    setHiring(false);
  };

  return (
    <>
      <PageHeader eyebrow="Proof task review" title={task.title} sub={`${inr(task.reward)} reward · ${task.submissions} submissions · repos and sites inspected against your rubric`} actions={<Button variant={blind ? 'secondary' : 'outline'} size="sm" onClick={() => setBlind((b) => !b)}><Lock size={13} /> {blind ? 'Blind review on' : 'Blind review off'}</Button>} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <ShortlistBoard rows={rows} selectedId={cur?.id} onSelect={setSel} acceptedId={accepted} anonymous={blind && !accepted} />
        {cur && (
          <AnimatePresence mode="wait">
            <motion.div key={cur.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3, ease: EASE }} className="lg:sticky lg:top-20 lg:self-start">
              <Card className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <Avatar name={revealed ? cur.talent?.name ?? 'C' : 'A N'} hue={cur.talent?.hue ?? 0} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{revealed ? cur.talent?.name : `Candidate ${cur.id.slice(-4).toUpperCase()}`}</p>
                    <p className="text-xs text-muted">{cur.review.status === 'sample' ? 'Demo submission' : cur.review.status === 'unassessed' ? 'Nothing could be assessed automatically' : `${cur.review.assessed} of ${cur.review.total} criteria assessed`}</p>
                  </div>
                  <div className="text-right">
                    {cur.review.status === 'unassessed' ? <p className="num text-3xl text-faint">—</p> : <p className="num text-3xl font-semibold" style={{ color: scoreColor(cur.review.score) }}><CountUp to={cur.review.score} suffix="%" /></p>}
                    <p className="text-[11px] uppercase tracking-wide text-faint">{cur.review.status === 'assessed' ? 'criteria met' : cur.review.status === 'partial' ? 'of those checked' : cur.review.status === 'sample' ? 'illustrative' : 'not scored'}</p>
                  </div>
                </div>
                <p className="border-b border-border px-4 py-3 text-[13px] text-muted">{cur.summary}</p>
                <ReviewPanel review={cur.review} blind={!revealed} onRerun={cur.status === 'submitted' && cur.review.status !== 'sample' ? rerun : undefined} rerunning={rerunning} />
                {cur.text && (
                  <details className="border-t border-border px-4 py-3 text-[13px]">
                    <summary className="cursor-pointer text-muted">Candidate&apos;s write-up (not scored)</summary>
                    <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line text-muted">{cur.text}</p>
                  </details>
                )}
                {revealed && cur.talent && <div className="flex flex-wrap gap-1.5 border-t border-border p-4">{cur.talent.skills.slice(0, 6).map((s) => <SkillChip key={s.name} size="sm" name={s.name} evidence={s.evidence} source={s.source} />)}</div>}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-2/50 p-4">
                  {cur.status === 'accepted' ? (
                    <><Badge tone="good"><Check size={11} /> Accepted and paid</Badge><div className="flex gap-2"><Link to="/inbox"><Button><MessageSquare size={14} /> Message</Button></Link><Button variant="primary" onClick={() => setPay('done')}><Briefcase size={14} /> Hire {first}</Button></div></>
                  ) : cur.status === 'rejected' ? <Badge tone="danger">Not selected</Badge> : (
                    <><Badge tone={cur.review.status === 'sample' ? 'neutral' : cur.recommendation === 'shortlist' ? 'good' : cur.recommendation === 'maybe' ? 'warn' : cur.recommendation === 'review' ? 'neutral' : 'danger'}>{cur.review.status === 'sample' ? 'Demo data' : `Evidence suggests: ${({ shortlist: 'shortlist', maybe: 'maybe', review: 'look closely', reject: 'pass' } as const)[cur.recommendation]}`}</Badge><div className="flex gap-2"><Button variant="ghost" onClick={reject}>Pass</Button><Button variant="primary" disabled={!!accepted} onClick={() => setPay('confirm')}>Accept and pay {inr(task.reward)}</Button></div></>
                  )}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Modal open={pay !== 'closed'} onClose={() => pay !== 'processing' && setPay('closed')} title="Razorpay payout" width={420}>
        <div className="relative p-6">
          {pay === 'done' && <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.1, ease: EASE }} className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-good/25 to-transparent" />}
          <AnimatePresence mode="wait">
            {pay === 'done' ? (
              <motion.div key="d" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }} className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good/15 text-good"><Check size={28} strokeWidth={3} /></motion.div>
                <h3 className="tight mt-4 text-xl font-semibold">{inr(task.reward)} paid</h3>
                <p className="mt-1 text-sm text-muted">{cur?.talent?.name}&apos;s {task.skills.join(', ')} are now <SkillChip name="task-verified" evidence="task" size="sm" />. A conversation is open in your inbox.</p>
                <div className="mt-6 space-y-2 text-left">
                  <label className="text-[13px] font-medium" htmlFor="offer-role">Offer {first} a role</label>
                  <Input id="offer-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder={`${task.skills[0] ?? 'Founding'} Engineer`} maxLength={100} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => setPay('closed')}>Later</Button><Button variant="primary" loading={hiring} onClick={hire}><Briefcase size={14} /> Hire {first}</Button></div>
              </motion.div>
            ) : (
              <motion.div key="c" exit={{ opacity: 0 }}>
                <h3 className="tight text-lg font-semibold">Confirm payout</h3>
                <p className="mt-1 text-sm text-muted">Funds are released from escrow. Test mode, no real money moves.</p>
                {cur && cur.review.status !== 'assessed' && <p className="mt-3 rounded-md border border-warn/30 bg-warn/5 p-3 text-[13px] text-muted">{cur.review.status === 'sample' ? 'This is demo data that was never inspected.' : `Only ${cur.review.assessed} of ${cur.review.total} criteria could be checked automatically.`} Your acceptance is the verdict, so look at the work yourself first.</p>}
                <div className="mt-5 space-y-2 rounded-lg border border-border bg-surface-2 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted">To</span><span>{revealed ? cur?.talent?.name : 'Selected candidate'}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Task</span><span className="truncate pl-4">{task.title}</span></div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span className="num">{inr(task.reward)}</span></div>
                </div>
                <Button variant="primary" size="lg" className="mt-5 w-full" loading={pay === 'processing'} onClick={doPay}><CreditCard size={15} /> Pay with Razorpay</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Modal>
    </>
  );
}
