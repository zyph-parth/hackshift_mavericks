import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, ErrorState, LinkButton, PageHeader, Skeleton } from '@/components/ui';
import { MatchScoreRing } from '@/components/signature';
import { useApplications } from '@/lib/queries';
import { cn, EASE } from '@/lib/utils';

const STAGES = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired'] as const;

export default function Applications() {
  const { data, isLoading, isError, refetch } = useApplications();
  const counts = STAGES.map((s) => [s, (data ?? []).filter((a) => a.stage === s).length] as const);
  return (
    <>
      <PageHeader eyebrow="Applications" title="Where you stand" sub="Every role you applied to, with live stage updates from the recruiter." actions={<LinkButton to="/jobs" variant="primary">Find more roles</LinkButton>} />
      {isError ? <ErrorState onRetry={refetch} /> : isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div> : !data?.length ? (
        <EmptyState title="No applications yet" body="Apply to a role with one click. We’ll draft the note from your verified evidence and open a conversation with the recruiter." action={<LinkButton to="/jobs" variant="primary">Browse matched roles</LinkButton>} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{counts.map(([s, n]) => <Card key={s} className="p-4"><p className="num text-2xl font-semibold">{n}</p><p className="text-xs text-muted">{s}</p></Card>)}</div>
          <div className="space-y-3">
            {data.map((a, i) => {
              const idx = STAGES.indexOf(a.stage as (typeof STAGES)[number]);
              const rejected = a.stage === 'Rejected';
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.45, ease: EASE }}>
                  <Card hover className="p-5">
                    <div className="flex flex-wrap items-center gap-4">
                      {a.job && <Avatar name={a.job.startup} hue={a.job.startupHue} size={40} />}
                      <div className="min-w-0 flex-1"><p className="tight font-semibold">{a.job?.title ?? 'Role no longer available'}</p><p className="text-[13px] text-muted">{a.job?.startup} · {a.job?.location} · applied {new Date(a.created).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>
                      <MatchScoreRing score={a.match} size={48} stroke={4} />
                      <Badge tone={rejected ? 'danger' : idx >= 1 ? 'good' : 'neutral'}>{a.stage}</Badge>
                    </div>
                    {!rejected && (
                      <ol className="mt-5 flex items-center" aria-label="Progress">
                        {STAGES.map((s, k) => (
                          <li key={s} className="flex flex-1 items-center last:flex-none">
                            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border text-[10px] transition', k < idx ? 'border-good bg-good text-white' : k === idx ? 'border-accent bg-accent text-accent-fg' : 'border-border-strong text-faint')}>{k < idx ? <Check size={12} strokeWidth={3} /> : k + 1}</span>
                            {k < STAGES.length - 1 && <span className={cn('mx-1 h-0.5 flex-1 rounded', k < idx ? 'bg-good' : 'bg-border')} />}
                          </li>
                        ))}
                      </ol>
                    )}
                    {!rejected && <div className="mt-1.5 hidden justify-between text-[11px] text-faint sm:flex">{STAGES.map((s) => <span key={s} className={s === a.stage ? 'font-medium text-text' : ''}>{s}</span>)}</div>}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[13px]"><p className="line-clamp-1 text-muted">“{a.note}”</p><Link to="/inbox" className="shrink-0 pl-4 font-medium text-accent hover:underline">Message</Link></div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
