import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, MapPin, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, LinkButton, PageHeader, Skeleton } from '@/components/ui';
import { MatchScoreRing, Meter } from '@/components/signature';
import { useApp } from '@/lib/store';
import { post } from '@/lib/api';
import { errMsg, useCofounders } from '@/lib/queries';
import { EASE } from '@/lib/utils';

const TRIALS = (a: string, b: string) => [`Ship a one-week MVP of the core workflow together (${a} + ${b})`, 'Run 5 customer interviews and share notes', 'Build and demo a landing page with a waitlist'];

export default function Cofounders() {
  const user = useApp((s) => s.user)!;
  const toast = useApp((s) => s.toast);
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useCofounders();
  const [busy, setBusy] = useState<string | null>(null);
  const has = user.founder?.has ?? [];
  const needs = user.founder?.needs ?? [];

  const propose = async (id: string, name: string, trial: string) => {
    setBusy(id);
    try { await post(`/cofounders/${id}/propose`, { trial }); await qc.invalidateQueries({ queryKey: ['cofounders'] }); toast({ title: `Trial proposed to ${name.split(' ')[0]}`, body: 'We opened a conversation in your inbox.', tone: 'good' }); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
    setBusy(null);
  };

  return (
    <>
      <Link to="/studio" className="mb-5 inline-block text-[13px] text-muted hover:text-text">← Founder Studio</Link>
      <PageHeader eyebrow="Co-founders" title="People who complete your team" sub={has.length || needs.length ? `You bring ${has.join(', ') || '…'}. You need ${needs.join(', ') || '…'}.` : 'Tell us what you bring and what you need to get matched.'} actions={<LinkButton to="/settings" variant="outline">Edit what I bring and need</LinkButton>} />
      {isError ? <ErrorState onRetry={refetch} /> : isLoading ? <div className="grid gap-5 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-96" />)}</div> : !has.length && !needs.length ? (
        <EmptyState title="Fill in your profile first" body="Matching works by comparing what you bring against what others need, and the reverse." action={<LinkButton to="/settings" variant="primary">Add what I bring and need</LinkButton>} />
      ) : !data?.length ? <EmptyState title="No matches yet" body="As more founders join, complementary profiles will appear here." /> : (
      <div className="grid gap-5 lg:grid-cols-2">
        {data.map(({ founder: f, compat: c, proposed }, i) => (
          <motion.div key={f.id} initial={{ opacity: 0, y: 24, rotate: i % 2 ? 0.6 : -0.6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}>
            <Card hover className="h-full p-6">
              <div className="flex items-start gap-4">
                <Avatar name={f.name} hue={f.hue} size={52} />
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="tight text-lg font-semibold">{f.name}</h3>{i === 0 && <Badge tone="accent">Best fit</Badge>}</div><p className="text-sm text-muted">{f.headline}</p><p className="mt-1 flex items-center gap-1 text-xs text-faint"><MapPin size={11} />{f.location || 'India'} · {f.commitment} · {f.stage}</p></div>
                <MatchScoreRing score={c.total} size={64} stroke={5} delay={0.1 * i} label="fit" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-surface-2/60 p-3"><p className="mb-2 text-[11px] uppercase tracking-wide text-faint">They have</p><div className="flex flex-wrap gap-1">{f.has.map((h) => <Badge key={h} tone={c.theyCover.includes(h) ? 'good' : 'neutral'}>{c.theyCover.includes(h) && <Check size={10} />}{h}</Badge>)}</div></div>
                <div className="rounded-lg border border-border bg-surface-2/60 p-3"><p className="mb-2 text-[11px] uppercase tracking-wide text-faint">They need</p><div className="flex flex-wrap gap-1">{f.needs.map((h) => <Badge key={h} tone={c.youCover.includes(h) ? 'good' : 'neutral'}>{c.youCover.includes(h) && <Check size={10} />}{h}</Badge>)}</div></div>
              </div>
              <div className="mt-4 space-y-2.5">{([['Skill complement', c.skillComplement], ['Shared values', c.values], ['Commitment', c.commitment]] as const).map(([k, v], j) => <div key={k}><div className="mb-1 flex justify-between text-xs"><span className="text-muted">{k}</span><span className="num">{v}</span></div><Meter value={v} delay={0.1 * j} /></div>)}</div>
              <p className="mt-4 text-[13px] text-muted"><span className="font-medium text-text">Why you two:</span> {c.theyCover.length ? `${f.name.split(' ')[0]} covers your ${c.theyCover.join(' and ')}` : 'Adjacent skills'}, and you cover their {c.youCover.join(' and ') || 'gaps'}.{c.sharedValues.length ? ` You both value ${c.sharedValues.slice(0, 2).join(' and ').toLowerCase()}.` : ''}</p>
              <div className="mt-4 rounded-lg bg-accent-soft p-3"><p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-accent">3 trial-project ideas</p><ul className="space-y-1 text-[13px] text-muted">{TRIALS(has[0] ?? 'your strength', f.has[0] ?? 'theirs').map((t) => <li key={t}>• {t}</li>)}</ul></div>
              <Button variant={proposed ? 'secondary' : 'primary'} className="mt-4 w-full" disabled={proposed} loading={busy === f.id} onClick={() => propose(f.id, f.name, TRIALS(has[0] ?? 'your strength', f.has[0] ?? 'theirs')[0])}>
                {proposed ? <><Check size={15} /> Proposal sent</> : <><Send size={14} /> Propose trial</>}
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>
      )}
    </>
  );
}
