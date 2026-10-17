import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer } from 'recharts';
import { EVIDENCE_LABEL, type Evidence, type MatchBreakdown, MATCH_WEIGHTS } from '@launchloop/shared';
import { cn, evColor, scoreColor } from '@/lib/utils';
import { useCountUp, useStream } from '@/lib/hooks';
import { Tip } from './ui';

/* ------------------------------- CountUp -------------------------------- */
export function CountUp({
  to,
  className,
  suffix = '',
  prefix = '',
  duration,
  delay,
  start = true,
}: {
  to: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  duration?: number;
  delay?: number;
  start?: boolean;
}) {
  const v = useCountUp(to, { duration, delay, start });
  return (
    <span className={cn('num', className)}>
      {prefix}
      {Math.round(v).toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

/* --------------------------- MatchScoreRing ----------------------------- */
export function MatchScoreRing({
  score,
  size = 64,
  stroke = 5,
  delay = 0,
  label,
  explain,
}: {
  score: number;
  size?: number;
  stroke?: number;
  delay?: number;
  label?: string;
  explain?: MatchBreakdown;
}) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  const reduce = useReducedMotion();
  const ring = (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - score / 100) : c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.1, delay, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <CountUp to={score} delay={delay} className="font-semibold" />
        {label && <span className="mt-0.5 text-[9px] uppercase tracking-wider text-faint">{label}</span>}
      </div>
    </div>
  );
  if (!explain) return ring;
  return <ExplainPopover content={<MatchExplain b={explain} />}>{ring}</ExplainPopover>;
}

function MatchExplain({ b }: { b: MatchBreakdown }) {
  const rows: [string, number, number][] = [
    ['Semantic fit', b.semantic, MATCH_WEIGHTS.semantic],
    ['Skill overlap', b.skill, MATCH_WEIGHTS.skill],
    ['Verified evidence', b.verified, MATCH_WEIGHTS.verified],
    ['Role fit', b.fit, MATCH_WEIGHTS.fit],
  ];
  return (
    <div className="w-[280px] space-y-2.5 p-1">
      <p className="text-xs font-medium text-muted">Why {b.total}% — the exact formula</p>
      {rows.map(([n, v, w], i) => (
        <div key={n}>
          <div className="mb-1 flex justify-between text-xs">
            <span>
              {n} <span className="text-faint">· {Math.round(w * 100)}%</span>
            </span>
            <span className="num">{v}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <motion.div
              className="h-full rounded-full"
              style={{ background: scoreColor(v) }}
              initial={{ width: 0 }}
              animate={{ width: `${v}%` }}
              transition={{ duration: 0.7, delay: i * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
        </div>
      ))}
      {b.missing.length > 0 && (
        <p className="border-t border-border pt-2 text-xs text-muted">
          Missing: <span className="text-text">{b.missing.join(', ')}</span>
        </p>
      )}
    </div>
  );
}

/* --------------------------- ExplainPopover ----------------------------- */
export function ExplainPopover({ children, content }: { children: ReactNode; content: ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = () => {
    clearTimeout(t.current);
    setOpen(true);
  };
  const hide = () => {
    t.current = setTimeout(() => setOpen(false), 120);
  };
  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <span tabIndex={0} className="cursor-help rounded-full outline-offset-4" aria-label="Explain this score">
        {children}
      </span>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="card glass absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 p-3 shadow-2xl"
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------ SkillChip -------------------------------- */
export function SkillChip({
  name,
  evidence,
  level,
  source,
  missing,
  size = 'md',
}: {
  name: string;
  evidence?: Evidence;
  level?: number;
  source?: string;
  missing?: boolean;
  size?: 'sm' | 'md';
}) {
  const prev = useRef(evidence);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (prev.current && evidence && prev.current !== evidence) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1200);
      prev.current = evidence;
      return () => clearTimeout(t);
    }
    prev.current = evidence;
  }, [evidence]);

  const color = evidence ? evColor(evidence) : 'var(--text-faint)';
  const chip = (
    <motion.span
      key={evidence}
      initial={pulse ? { rotateX: -90, opacity: 0 } : false}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        ['--ring' as string]: color,
        animation: pulse ? 'pulse-ring 1s ease-out 2' : undefined,
        borderColor: missing ? undefined : `color-mix(in srgb, ${color} 35%, var(--border))`,
        perspective: 400,
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[4px] border bg-surface-2 font-medium',
        size === 'sm' ? 'px-1.5 py-px text-[11px]' : 'px-2 py-0.5 text-xs',
        missing && 'border-dashed border-border-strong bg-transparent text-faint',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: missing ? 'transparent' : color, boxShadow: missing ? 'inset 0 0 0 1px var(--text-faint)' : undefined }} />
      {name}
      {level !== undefined && !missing && <span className="num text-faint">{level}</span>}
    </motion.span>
  );
  if (missing) return <Tip label="Missing for this role">{chip}</Tip>;
  if (!evidence) return chip;
  return (
    <Tip
      label={
        <span className="block">
          <span className="font-medium" style={{ color }}>
            {EVIDENCE_LABEL[evidence]}
          </span>
          {source && <span className="mt-0.5 block text-muted">{source}</span>}
        </span>
      }
    >
      {chip}
    </Tip>
  );
}

export function EvidenceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
      {(['self', 'github', 'interview', 'task'] as Evidence[]).map((e) => (
        <span key={e} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: evColor(e) }} />
          {EVIDENCE_LABEL[e]}
        </span>
      ))}
    </div>
  );
}

/* ----------------------------- AIStreamText ----------------------------- */
export function AIStreamText({
  text,
  run = true,
  className,
  wps,
}: {
  text: string;
  run?: boolean;
  className?: string;
  wps?: number;
}) {
  const { shown, done } = useStream(text, run, wps);
  return (
    <span className={className}>
      {shown}
      {!done && (
        <span
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-accent"
          style={{ animation: 'blink 0.9s step-end infinite' }}
        />
      )}
    </span>
  );
}

/* ----------------------------- ReadinessRadar --------------------------- */
export function ReadinessRadar({
  data,
  onAxis,
  active,
}: {
  data: Record<string, number>;
  onAxis?: (axis: string) => void;
  active?: string;
}) {
  const rows = Object.entries(data).map(([axis, value]) => ({ axis, value }));
  return (
    <div className="relative h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke="var(--border-strong)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={(p) => {
              const { x, y, payload, textAnchor } = p as { x: number; y: number; payload: { value: string }; textAnchor: 'start' | 'middle' | 'end' };
              const on = active === payload.value;
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  fontSize={12}
                  fill={on ? 'var(--accent)' : 'var(--text-muted)'}
                  fontWeight={on ? 600 : 400}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onAxis?.(payload.value)}
                >
                  {payload.value}
                </text>
              );
            }}
          />
          <Radar
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="var(--accent)"
            fillOpacity={0.22}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------- Meter bar ------------------------------ */
export function Meter({ value, delay = 0, color }: { value: number; delay?: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color ?? scoreColor(value) }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, delay, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </div>
  );
}
