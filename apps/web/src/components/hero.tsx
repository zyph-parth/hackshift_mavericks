import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Asterisk, X as XIcon } from 'lucide-react';
import { Avatar, Badge, Button } from './ui';
import { CountUp, Meter, MatchScoreRing, SkillChip } from './signature';
import { cn, EASE, scoreColor } from '@/lib/utils';

/* ------------------------------ ScoreReveal ------------------------------ */
export function ScoreReveal({
  overall,
  scores,
  onContinue,
  onReport,
}: {
  overall: number;
  scores: Record<string, number>;
  onContinue: () => void;
  onReport?: () => void;
}) {
  const entries = Object.entries(scores);
  const [flipped, setFlipped] = useState(0);
  useEffect(() => {
    const t0 = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        i++;
        setFlipped(i);
        if (i >= entries.length) clearInterval(id);
      }, 420);
    }, 2400);
    return () => clearTimeout(t0);
  }, [entries.length]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-bg/90 p-4 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--glow)' }} />
      <div className="relative w-full max-w-xl py-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-medium uppercase tracking-[0.12em] text-accent"
        >
          Interview complete
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7, ease: EASE }}
          className="tight mt-2 text-4xl font-semibold md:text-5xl"
        >
          Your proof, <span className="display">earned.</span>
        </motion.h2>

        <motion.div
          className="mx-auto mt-8 flex justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
        >
          <MatchScoreRing score={overall} size={176} stroke={9} delay={0.9} label="Overall" />
        </motion.div>

        <div className="card mx-auto mt-8 space-y-4 p-5 text-left">
          {entries.map(([skill, v], i) => (
            <motion.div
              key={skill}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 + i * 0.18, duration: 0.5, ease: EASE }}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <SkillChip name={skill} evidence={i < flipped && v > 0 ? 'interview' : 'self'} source={`Verified in AI interview · ${v}/100`} />
                <span className="num text-sm font-semibold" style={{ color: scoreColor(v) }}>
                  <CountUp to={v} delay={1.6 + i * 0.18} />
                </span>
              </div>
              <Meter value={v} delay={1.6 + i * 0.18} />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6 + entries.length * 0.1 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <p className="text-sm text-muted">{flipped >= entries.length ? 'Your skills just flipped from self-reported to interview-verified.' : 'Verifying skills…'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {onReport && <Button size="lg" onClick={onReport}>Full report</Button>}
            <Button variant="primary" size="lg" onClick={onContinue}>
              See your new matches <ArrowRight size={16} />
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ----------------------------- ShortlistBoard ---------------------------- */
export interface Row {
  id: string;
  name: string;
  hue: number;
  score: number;
  rec: 'shortlist' | 'maybe' | 'reject' | 'review';
  meets: string[];
  missing: string[];
  subtitle?: string;
  status?: 'assessed' | 'partial' | 'unassessed' | 'sample';
  assessed?: number;
  total?: number;
}
const REC = {
  shortlist: { tone: 'good', label: 'Shortlist' },
  maybe: { tone: 'warn', label: 'Maybe' },
  review: { tone: 'neutral', label: 'Needs review' },
  reject: { tone: 'danger', label: 'Pass' },
} as const;
/** Inspected-and-good first, then "a human should look", then inspected-and-poor. */
const REC_RANK = { shortlist: 0, maybe: 1, review: 2, reject: 3 } as const;

export function ShortlistBoard({
  rows,
  selectedId,
  onSelect,
  acceptedId,
  anonymous,
}: {
  rows: Row[];
  selectedId?: string;
  onSelect: (id: string) => void;
  acceptedId?: string | null;
  anonymous?: boolean;
}) {
  const [phase, setPhase] = useState<'unsorted' | 'scoring' | 'sorted'>('unsorted');
  useEffect(() => {
    const a = setTimeout(() => setPhase('scoring'), 500);
    const b = setTimeout(() => setPhase('sorted'), 1900);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const ordered = useMemo(() => {
    if (phase === 'sorted') return [...rows].sort((a, b) => REC_RANK[a.rec] - REC_RANK[b.rec] || b.score - a.score);
    return [...rows].sort((a, b) => a.id.localeCompare(b.id) * -1);
  }, [rows, phase]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 pb-1 text-xs text-muted">
        <Asterisk size={13} className="text-accent" />
        {phase === 'sorted' ? 'Ranked by what each project was inspected to contain' : 'Ordering submissions…'}
        {anonymous && <Badge className="ml-auto">Identity blinded</Badge>}
      </div>
      {ordered.map((r, i) => {
        const rec = REC[r.rec];
        const selected = selectedId === r.id;
        const accepted = acceptedId === r.id;
        return (
          <motion.button
            key={r.id}
            layout
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={() => onSelect(r.id)}
            className={cn(
              'card card-hover relative flex w-full items-center gap-3 p-3 text-left',
              selected && '!border-accent shadow-[0_0_0_3px_var(--accent-soft)]',
              accepted && '!border-good',
            )}
          >
            <span className="num w-5 text-center text-xs text-faint">{phase === 'sorted' ? i + 1 : '·'}</span>
            <Avatar name={anonymous ? 'A N' : r.name} hue={r.hue} size={34} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{anonymous ? `Candidate ${String(r.id).slice(-4).toUpperCase()}` : r.name}</p>
                {phase === 'sorted' && (
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }}>
                    <Badge tone={accepted ? 'good' : r.status === 'sample' ? 'neutral' : rec.tone}>{accepted ? 'Accepted' : r.status === 'sample' ? 'Demo' : rec.label}</Badge>
                  </motion.span>
                )}
              </div>
              {r.subtitle && !anonymous && <p className="truncate text-[11px] text-muted">{r.subtitle}</p>}
              <div className="mt-1 flex flex-wrap gap-1">
                {r.meets.slice(0, 3).map((m) => (
                  <span key={m} className="inline-flex items-center gap-1 text-[11px] text-good">
                    <Check size={11} /> {m}
                  </span>
                ))}
                {r.missing.slice(0, 2).map((m) => (
                  <span key={m} className="inline-flex items-center gap-1 text-[11px] text-danger/90">
                    <XIcon size={11} /> {m}
                  </span>
                ))}
              </div>
            </div>
            <div className="w-14 shrink-0 text-right">
              {phase === 'unsorted' ? (
                <div className="skeleton ml-auto h-6 w-10" />
              ) : (
                r.status === 'unassessed' ? (
                  <span className="num text-lg text-faint" title="Nothing could be assessed automatically">—</span>
                ) : (
                  <span className="block">
                    <span className="num block text-lg font-semibold" style={{ color: scoreColor(r.score) }}><CountUp to={r.score} duration={1.2} /></span>
                    {r.status === 'partial' && <span className="num block text-[10px] text-faint">{r.assessed}/{r.total} checked</span>}
                  </span>
                )
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
