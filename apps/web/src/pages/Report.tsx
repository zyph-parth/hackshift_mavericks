import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, LinkButton, PageHeader, Skeleton } from '@/components/ui';
import { CountUp, MatchScoreRing, Meter, SkillChip } from '@/components/signature';
import { useLatestInterview } from '@/lib/queries';
import { scoreColor } from '@/lib/utils';

export default function Report() {
  const { data, isLoading, isError, refetch } = useLatestInterview();
  if (isLoading) return <><PageHeader title="Interview report" /><Skeleton className="h-64" /></>;
  if (isError) return <ErrorState onRetry={refetch} />;
  const last = data?.interview;
  if (!last)
    return (
      <>
        <PageHeader title="Interview report" />
        <EmptyState title="No interview yet" body="Take the 10-minute voice interview to get a scored, evidence-backed report." action={<LinkButton to="/interview/new" variant="primary">Start interview</LinkButton>} />
      </>
    );
  const strengths = last.detail.filter((d) => d.score >= 75);
  const improve = last.detail.filter((d) => d.score < 75);
  const left = Math.max(0, (data?.attemptCap ?? 3) - (data?.attempts ?? 0));
  return (
    <>
      <PageHeader eyebrow="Interview report" title="How you did" sub="Every score is tied to your actual answer." actions={left > 0 ? <LinkButton to="/interview/new" variant="outline"><RotateCcw size={15} /> Retake ({left} left)</LinkButton> : <Badge>No attempts left</Badge>} />
      <div className="grid gap-4 md:grid-cols-12">
        <Card className="flex flex-col items-center self-start p-6 md:col-span-4">
          <MatchScoreRing score={last.overall} size={140} stroke={9} label="Overall" />
          <div className="mt-6 w-full space-y-3">{Object.entries(last.scores).map(([k, v]) => <div key={k}><div className="mb-1 flex items-center justify-between text-sm"><SkillChip name={k} evidence="interview" /><span className="num" style={{ color: scoreColor(v) }}>{v}</span></div><Meter value={v} /></div>)}</div>
          {last.signals > 0 && <Badge tone="warn" className="mt-5">{last.signals} tab-switch signal(s) logged</Badge>}
        </Card>
        <div className="space-y-4 md:col-span-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5"><h3 className="tight font-semibold text-good">Strengths</h3><ul className="mt-2 space-y-1.5 text-sm text-muted">{strengths.length ? strengths.map((s) => <li key={s.q}>• {s.skill}: {s.feedback}</li>) : <li>Keep going. Longer, example-led answers raise scores fast.</li>}</ul></Card>
            <Card className="p-5"><h3 className="tight font-semibold text-warn">To improve</h3><ul className="mt-2 space-y-1.5 text-sm text-muted">{improve.length ? improve.map((s) => <li key={s.q}>• {s.skill}: {s.feedback}</li>) : <li>Nothing urgent. Retake to push past 90.</li>}</ul></Card>
          </div>
          {last.detail.map((d, i) => (
            <motion.div key={d.q} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4"><p className="font-medium">{i + 1}. {d.q}</p><span className="num shrink-0 text-xl font-semibold" style={{ color: scoreColor(d.score) }}><CountUp to={d.score} /></span></div>
                <p className="mt-3 rounded-lg bg-surface-2 p-3 text-[13px] text-muted">{d.answer}</p>
                <p className="mt-3 text-[13px]"><span className="text-accent">AI feedback:</span> {d.feedback}</p>
              </Card>
            </motion.div>
          ))}
          <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">See your re-ranked matches <ArrowRight size={14} /></Link>
        </div>
      </div>
    </>
  );
}
