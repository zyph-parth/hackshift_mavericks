import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '@/components/ui';
import { MatchScoreRing, SkillChip } from '@/components/signature';
import { api, post, type PublicUser } from '@/lib/api';
import { errMsg } from '@/lib/queries';
import { useApp } from '@/lib/store';
import { EASE } from '@/lib/utils';

const IDEAS = ['react interview-verified', 'python machine learning', 'figma', 'node.js postgresql'];

export default function Talent() {
  const [q, setQ] = useState('');
  const [d, setD] = useState('');
  const nav = useNavigate();
  const toast = useApp((s) => s.toast);
  useEffect(() => { const t = setTimeout(() => setD(q), 250); return () => clearTimeout(t); }, [q]);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['talent', d], queryFn: () => api<{ talent: PublicUser[] }>(`/talent?q=${encodeURIComponent(d)}`).then((r) => r.talent) });
  const msg = async (t: PublicUser) => {
    try { await post('/threads', { to: t.id, subject: 'Opportunity on LaunchLoop', text: `Hi ${t.name.split(' ')[0]}, your verified ${t.skills[0]?.name ?? 'profile'} caught my eye. Open to a quick chat?` }); nav('/inbox'); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
  };
  return (
    <>
      <PageHeader eyebrow="Find talent" title="Search by what people can prove" sub="Results are ranked by skill match weighted by evidence: task-verified beats self-reported." />
      <div className="relative max-w-xl"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try: react typescript" className="h-11 pl-10" aria-label="Search talent" /></div>
      <div className="mt-3 flex flex-wrap gap-2">{IDEAS.map((i) => <button key={i} onClick={() => setQ(i)} className="rounded-full border border-dashed border-border-strong px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-accent">{i}</button>)}</div>
      <div className="mt-8">
        {isError ? <ErrorState onRetry={refetch} /> : isLoading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div> : !data?.length ? <EmptyState title="No one matches that yet" body="Try fewer words or a broader skill." /> : (
          <div className="grid gap-4 md:grid-cols-2">{data.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.45, ease: EASE }}>
              <Card hover className="p-5">
                <div className="flex items-start gap-3"><Avatar name={t.name} hue={t.hue} size={44} /><div className="min-w-0 flex-1"><Link to={`/u/${t.username}`} className="tight font-semibold hover:text-accent">{t.name}</Link><p className="truncate text-[13px] text-muted">{t.headline || t.college}</p></div><MatchScoreRing score={t.verifiedScore} size={52} stroke={4} /></div>
                <div className="mt-3 flex flex-wrap gap-1.5">{t.skills.slice(0, 5).map((s) => <SkillChip key={s.name} size="sm" name={s.name} evidence={s.evidence} level={s.level} source={s.source} />)}</div>
                <div className="mt-4 flex gap-2"><Link to={`/u/${t.username}`}><Button size="sm">View profile</Button></Link><Button size="sm" variant="ghost" onClick={() => msg(t)}><MessageSquare size={13} /> Message</Button></div>
              </Card>
            </motion.div>
          ))}</div>
        )}
      </div>
    </>
  );
}
