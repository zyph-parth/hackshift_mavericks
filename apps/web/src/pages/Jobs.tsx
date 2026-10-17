import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, MapPin, Rocket, Search, Sparkles, Wallet } from 'lucide-react';
import { MATCH_WEIGHTS } from '@launchloop/shared';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Segmented, Sheet, Skeleton, Switch, Textarea } from '@/components/ui';
import { CountUp, Meter, MatchScoreRing, SkillChip } from '@/components/signature';
import { useApp } from '@/lib/store';
import { api, post, type JobRow } from '@/lib/api';
import { errMsg, useJobs } from '@/lib/queries';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn, scoreColor } from '@/lib/utils';

function why(r: JobRow) {
  const m = r.match;
  if (!m) return r.job.summary;
  const best = [...m.matched].sort((a, b) => b.level - a.level)[0];
  const ev = { self: 'self-reported', github: 'GitHub-verified', interview: 'interview-verified', task: 'task-verified' }[best?.evidence ?? 'self'];
  const gap = m.missing.length ? ` Closing the ${m.missing[0]} gap would lift this further.` : ' You cover every required skill.';
  return best ? `Your ${ev} ${best.name} (${best.level}) is the strongest signal for ${r.job.startup}.${gap}` : `No skill overlap yet.${gap}`;
}

function JobCard({ r, i, onOpen }: { r: JobRow; i: number; onOpen: () => void }) {
  const { job, match: m, applied } = r;
  return (
    <motion.article layout transition={{ type: 'spring', stiffness: 260, damping: 28 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card card-hover relative cursor-pointer p-5" onClick={onOpen} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()} aria-label={`${job.title} at ${job.startup}${m ? `, ${m.total}% match` : ''}`}>
      <div className="flex items-start gap-4">
        {m && <MatchScoreRing score={m.total} size={64} stroke={5} delay={0.06 * i} explain={m} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="tight text-[15px] font-semibold">{job.title}</h3>
            {applied && <Badge tone="good"><Check size={11} /> {applied.stage}</Badge>}
            {job.age < 24 && <Badge tone="accent">New</Badge>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5"><Avatar name={job.startup} hue={job.startupHue} size={16} />{job.startup}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={12} />{job.location}</span>
            <span className="inline-flex items-center gap-1"><Wallet size={12} />{job.stipend}</span>
          </div>
          {m && (
            <>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.matched.slice(0, 3).map((s) => <SkillChip key={s.name} size="sm" name={s.name} evidence={s.evidence} />)}
                {m.missing.slice(0, 2).map((s) => <SkillChip key={s} size="sm" name={s} missing />)}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[13px] text-muted"><Sparkles size={13} className="mt-0.5 shrink-0 text-accent" />{why(r)}</p>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function Detail({ row, onClose }: { row: JobRow | null; onClose: () => void }) {
  const toast = useApp((s) => s.toast);
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [road, setRoad] = useState(false);
  const id = row?.job.id;
  const pitch = useQuery({ queryKey: ['pitch', id], enabled: !!id && !row?.applied, staleTime: Infinity, queryFn: () => post<{ text: string }>('/ai/pitch-note', { jobId: id }) });
  const roadmap = useQuery({ queryKey: ['roadmap', id], enabled: !!id && road, queryFn: () => api<{ roadmap: { week: string; title: string; detail: string }[] }>(`/jobs/${id}/roadmap`) });
  useEffect(() => { setNote(''); setRoad(false); }, [id]);
  const text = note || pitch.data?.text || '';

  const submit = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await post(`/jobs/${id}/apply`, { note: text });
      toast({ title: 'Application sent', body: `${row!.job.startup} can now see your verified profile. We opened a conversation in your inbox.`, tone: 'good' });
      qc.invalidateQueries();
      onClose();
    } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
    setBusy(false);
  };

  const m = row?.match;
  return (
    <Sheet open={!!row} onClose={onClose} title="Role details" width={560}>
      {row && (
        <div className="space-y-6 p-5" key={row.job.id}>
          <div className="flex items-start gap-4">
            {m && <MatchScoreRing score={m.total} size={84} stroke={6} />}
            <div><h3 className="tight text-xl font-semibold">{row.job.title}</h3><p className="text-sm text-muted">{row.job.startup} · {row.job.stage} · {row.job.type}</p><p className="num mt-1 text-sm">{row.job.stipend}{row.job.equity && <span className="text-muted"> · {row.job.equity} equity</span>}</p></div>
          </div>
          <p className="whitespace-pre-line text-sm text-muted">{row.job.summary}</p>
          {m && (
            <>
              <section>
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Why you match</h4>
                <div className="space-y-3">
                  {([['Semantic fit', m.semantic, MATCH_WEIGHTS.semantic], ['Skill overlap', m.skill, MATCH_WEIGHTS.skill], ['Verified evidence', m.verified, MATCH_WEIGHTS.verified], ['Role fit', m.fit, MATCH_WEIGHTS.fit]] as const).map(([n, v, w], k) => (
                    <div key={n}><div className="mb-1 flex justify-between text-[13px]"><span>{n} <span className="text-faint">· {Math.round(w * 100)}% weight</span></span><span className="num" style={{ color: scoreColor(v) }}><CountUp to={v} delay={0.1 * k} /></span></div><Meter value={v} delay={0.1 * k} /></div>
                  ))}
                </div>
              </section>
              <section>
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Skill gap</h4>
                <div className="flex flex-wrap gap-1.5">{m.matched.map((s) => <SkillChip key={s.name} name={s.name} evidence={s.evidence} level={s.level} />)}{m.missing.map((s) => <SkillChip key={s} name={s} missing />)}</div>
                {m.missing.length > 0 && (
                  <div className="mt-3">
                    <Button size="sm" onClick={() => setRoad((r) => !r)}><Rocket size={14} /> {road ? 'Hide' : 'Get'} 2-week roadmap</Button>
                    <AnimatePresence>
                      {road && (
                        <motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3 overflow-hidden border-l border-border pl-4">
                          {(roadmap.data?.roadmap ?? []).map((s, k) => (
                            <motion.li key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.1 }} className="relative"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" /><p className="num text-[11px] text-faint">{s.week}</p><p className="text-sm font-medium">{s.title}</p><p className="text-[13px] text-muted">{s.detail}</p></motion.li>
                          ))}
                          {roadmap.isLoading && <Skeleton className="h-12" />}
                        </motion.ol>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </section>
            </>
          )}
          <section>
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted"><Sparkles size={12} className="text-accent" /> Your application note</h4>
            {row.applied ? <p className="rounded-lg border border-good/30 bg-good/5 p-3 text-sm text-muted">{row.applied.note}</p> : pitch.isLoading ? <Skeleton className="h-28" /> : (
              <><Textarea rows={5} value={text} onChange={(e) => setNote(e.target.value)} aria-label="Application note" /><p className="mt-1.5 text-xs text-faint">Drafted from your verified evidence. Edit freely.</p></>
            )}
          </section>
          <div className="sticky bottom-0 -mx-5 -mb-6 border-t border-border bg-surface/90 p-4 backdrop-blur">
            {row.applied ? <Link to="/applications"><Button className="w-full" size="lg">Applied ✓ · Track in Applications</Button></Link> : <Button variant="primary" size="lg" className="w-full" disabled={text.trim().length < 10} loading={busy} onClick={submit}>Apply with one click</Button>}
          </div>
        </div>
      )}
    </Sheet>
  );
}

export default function Jobs() {
  const user = useApp((s) => s.user)!;
  const { data, isLoading, isError, refetch } = useJobs();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [remote, setRemote] = useState(false);
  const [type, setType] = useState<'all' | 'Full-time' | 'Internship' | 'Contract'>('all');
  const [sorted, setSorted] = useState<'match' | 'recent'>('match');
  const [stage, setStage] = useState<'all' | 'Pre-seed' | 'Seed' | 'Series A'>('all');
  const [equity, setEquity] = useState(false);
  const open = params.get('open');

  const list = useMemo(() => {
    let l = (data ?? []).filter(({ job }) => (!remote || job.remote) && (type === 'all' || job.type === type) && (stage === 'all' || job.stage === stage) && (!equity || !!job.equity) && (job.title + job.startup + job.required.map((r) => r.name).join(' ')).toLowerCase().includes(q.toLowerCase()));
    l = [...l].sort(sorted === 'recent' ? (a, b) => a.job.age - b.job.age : (a, b) => (b.match?.total ?? 0) - (a.match?.total ?? 0));
    return l;
  }, [data, q, remote, type, stage, equity, sorted]);
  const opened = (data ?? []).find((r) => r.job.id === open) ?? null;
  const setOpen = (id: string | null) => setParams(id ? { open: id } : {}, { replace: true });

  return (
    <>
      <PageHeader eyebrow="Jobs & matches" title="Roles that fit your proof" sub={user.skills.length ? 'Ranked by an auditable score. Hover any ring to see the formula.' : 'Add skills to your profile to see your match scores.'} actions={<Segmented id="sort" value={sorted} onChange={setSorted} options={[{ value: 'match', label: 'Best match' }, { value: 'recent', label: 'Newest' }]} />} />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" /><Input placeholder="Search roles, startups, skills" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Search roles" /></div>
          <Card className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Type</p>
              <div className="flex flex-wrap gap-1.5">{(['all', 'Full-time', 'Internship', 'Contract'] as const).map((t) => <button key={t} onClick={() => setType(t)} className={cn('rounded-full border px-2.5 py-1 text-xs transition', type === t ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted hover:text-text')}>{t === 'all' ? 'All' : t}</button>)}</div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Stage</p>
              <div className="flex flex-wrap gap-1.5">{(['all', 'Pre-seed', 'Seed', 'Series A'] as const).map((t) => <button key={t} onClick={() => setStage(t)} className={cn('rounded-full border px-2.5 py-1 text-xs transition', stage === t ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted hover:text-text')}>{t === 'all' ? 'All' : t}</button>)}</div>
            </div>
            <label className="flex cursor-pointer items-center justify-between text-sm">Remote only<Switch on={remote} onChange={setRemote} label="Remote only" /></label>
            <label className="flex cursor-pointer items-center justify-between text-sm">Offers equity<Switch on={equity} onChange={setEquity} label="Offers equity" /></label>
          </Card>
          {!user.skills.length && <Link to="/profile" className="block rounded-card border border-accent/40 bg-accent-soft p-4 text-sm"><p className="font-medium text-accent">Get matched</p><p className="mt-1 text-muted">Add skills so we can rank these roles for you.</p></Link>}
        </aside>
        <div className="space-y-3">
          {isError ? <ErrorState onRetry={refetch} /> : isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />) : list.length === 0 ? (
            <EmptyState title="No roles match those filters" body="Loosen a filter or clear the search to see everything." action={<Button onClick={() => { setQ(''); setRemote(false); setType('all'); setStage('all'); setEquity(false); }}>Clear filters</Button>} />
          ) : list.map((r, i) => <JobCard key={r.job.id} r={r} i={i} onOpen={() => setOpen(r.job.id)} />)}
        </div>
      </div>
      <Detail row={opened} onClose={() => setOpen(null)} />
    </>
  );
}
