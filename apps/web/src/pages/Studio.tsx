import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, CircleHelp, FileUp, Lightbulb, Asterisk, Users, X } from 'lucide-react';
import { READINESS_AXES, SCHEMES, checkScheme, readiness, readinessTotal, type IdeaAnalysis, type StartupFacts } from '@launchloop/shared';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Skeleton, Switch, Tabs, Textarea } from '@/components/ui';
import { AIStreamText, MatchScoreRing, ReadinessRadar } from '@/components/signature';
import { post, put } from '@/lib/api';
import { errMsg, useVenture, type VentureT } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { cn, EASE, scoreColor, sleep } from '@/lib/utils';
import { pdfText } from '@/lib/pdf';
import { useApp } from '@/lib/store';

const EXAMPLE = 'SMEs in India waste hours every week chasing unpaid invoices. We are building an AI platform that sends smart payment reminders, reconciles bank feeds and predicts which invoices will be late. Pilot running with 3 customers.';

function ValidatorOutput({ a }: { a: IdeaAnalysis }) {
  const Block = ({ title, children, i }: { title: string; children: React.ReactNode; i: number }) => (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.35, duration: 0.5, ease: EASE }}>
      <Card className="h-full p-5"><h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">{title}</h3>{children}</Card>
    </motion.div>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Block i={0} title="Problem"><p className="text-sm text-muted"><AIStreamText text={a.problem} wps={30} /></p></Block>
        <Block i={1} title="Target user"><p className="text-sm text-muted"><AIStreamText text={a.user} wps={30} /></p></Block>
        <Block i={2} title="Market size"><p className="text-sm text-muted"><AIStreamText text={a.market} wps={30} /></p></Block>
        <Block i={3} title="Competitors"><table className="w-full text-sm"><tbody>{a.competitors.map(([n, d]) => <tr key={n} className="border-b border-border last:border-0"><td className="py-1.5 pr-3 font-medium">{n}</td><td className="py-1.5 text-muted">{d}</td></tr>)}</tbody></table></Block>
      </div>
      <Block i={4} title="Risks"><ul className="space-y-1.5 text-sm text-muted">{a.risks.map((r) => <li key={r} className="flex gap-2"><span className="text-warn">▲</span>{r}</li>)}</ul></Block>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }}>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">Lean canvas</h3>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-3">
          {a.canvas.map(([k, v], i) => <motion.div key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 + i * 0.08 }} className="bg-surface p-4"><p className="text-[11px] uppercase tracking-wide text-faint">{k}</p><p className="mt-1 text-sm">{v}</p></motion.div>)}
        </div>
      </motion.div>
    </div>
  );
}

const ACTIONS: Record<string, string[]> = {
  'Problem clarity': ['Interview 5 target customers this week', 'Write the problem as one sentence with a number in it'],
  Market: ['Build a bottom-up TAM/SAM/SOM sheet', 'List your 10 closest competitors and their pricing'],
  Product: ['Ship a clickable prototype in 7 days', 'Define the single core workflow'],
  Team: ['Find a complementary co-founder', 'Book a mentor session on hiring'],
  Traction: ['Land 3 pilot customers', 'Track one weekly active metric'],
  'Funding fit': ['Register with DPIIT', 'Check scheme eligibility in the Schemes tab'],
};

function Readiness({ v, save }: { v: VentureT; save: (c: Partial<VentureT>) => void }) {
  const [axis, setAxis] = useState<string>('Funding fit');
  const data: Record<string, number> = readiness({ text: v.text || EXAMPLE, facts: v.facts, teamSize: v.teamSize, hasUsers: v.hasUsers });
  const total = readinessTotal(data);
  const weakest = [...READINESS_AXES].sort((a, b) => data[a] - data[b]);
  return (
    <div className="grid gap-4 md:grid-cols-12">
      {!v.text && <p className="rounded-lg border border-warn/30 bg-warn/5 p-3 text-[13px] text-muted md:col-span-12">Showing an example idea. Validate yours in the first tab for a personalised score.</p>}
      <Card className="p-5 md:col-span-7"><div className="flex items-center justify-between"><h3 className="tight font-semibold">Readiness radar</h3><span className="text-xs text-muted">Click an axis</span></div><ReadinessRadar data={data} onAxis={setAxis} active={axis} /></Card>
      <div className="space-y-4 md:col-span-5">
        <Card className="flex items-center gap-5 p-5"><MatchScoreRing score={total} size={96} stroke={7} label="ready" /><div><p className="tight font-semibold">{total >= 70 ? 'Investor-ready soon' : total >= 50 ? 'Promising, with gaps' : 'Early, and that is fine'}</p><p className="mt-0.5 text-sm text-muted">Weakest: <span className="text-text">{weakest[0]}</span></p></div></Card>
        <Card className="p-5">
          <h3 className="tight font-semibold">{axis}: next actions <span className="num ml-1 text-sm text-faint">{data[axis]}</span></h3>
          <ul className="mt-3 space-y-2">{(ACTIONS[axis] ?? []).map((a) => (
            <li key={a}><button onClick={() => save({ done: { ...v.done, [a]: !v.done[a] } })} className="flex w-full items-start gap-2.5 text-left text-sm"><span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition', v.done[a] ? 'border-good bg-good text-white' : 'border-border-strong')}>{v.done[a] && <Check size={11} strokeWidth={3} />}</span><span className={v.done[a] ? 'text-faint line-through' : 'text-muted'}>{a}</span></button></li>
          ))}</ul>
        </Card>
        <Card className="space-y-3 p-5 text-sm">
          <label className="flex items-center justify-between">Team size <span className="flex items-center gap-2"><Button size="sm" onClick={() => save({ teamSize: Math.max(1, v.teamSize - 1) })}>−</Button><span className="num w-4 text-center">{v.teamSize}</span><Button size="sm" onClick={() => save({ teamSize: Math.min(6, v.teamSize + 1) })}>+</Button></span></label>
          <label className="flex items-center justify-between">Has real users <Switch on={v.hasUsers} onChange={(x) => save({ hasUsers: x })} label="Has real users" /></label>
        </Card>
      </div>
    </div>
  );
}

function Schemes({ v, save }: { v: VentureT; save: (c: Partial<VentureT>) => void }) {
  const facts = v.facts;
  const setFacts = (f: StartupFacts) => save({ facts: f });
  const verdicts = SCHEMES.map((s) => checkScheme(s, facts));
  const order = { eligible: 0, unknown: 1, ineligible: 2 } as const;
  const tone = { eligible: 'good', unknown: 'warn', ineligible: 'danger' } as const;
  const sel = 'h-10 w-full rounded-input border border-border bg-surface-2 px-3 text-sm';
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card className="space-y-4 self-start p-5 text-sm">
        <h3 className="tight font-semibold">Your startup facts</h3>
        <label className="flex items-center justify-between">DPIIT recognised <Switch on={!!facts.dpiitRegistered} onChange={(x) => setFacts({ ...facts, dpiitRegistered: x })} label="DPIIT recognised" /></label>
        <label className="flex items-center justify-between">Women-led <Switch on={!!facts.womenLed} onChange={(x) => setFacts({ ...facts, womenLed: x })} label="Women-led" /></label>
        <label className="flex items-center justify-between">Has prototype <Switch on={!!facts.hasPrototype} onChange={(x) => setFacts({ ...facts, hasPrototype: x })} label="Has prototype" /></label>
        <Field label="Age of company (years)"><Input type="number" min={0} max={15} value={facts.ageYears ?? ''} onChange={(e) => setFacts({ ...facts, ageYears: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Leave empty if unknown" /></Field>
        <Field label="Annual turnover (₹ Cr)"><Input type="number" min={0} step={0.5} value={facts.turnoverCr ?? ''} onChange={(e) => setFacts({ ...facts, turnoverCr: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Leave empty if unknown" /></Field>
        <Field label="Sector"><select value={facts.sector ?? ''} onChange={(e) => setFacts({ ...facts, sector: e.target.value || undefined })} className={sel}><option value="">Unknown</option>{['AI', 'SaaS', 'Fintech', 'Deeptech', 'Consumer'].map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Stage"><select value={facts.stage ?? ''} onChange={(e) => setFacts({ ...facts, stage: e.target.value || undefined })} className={sel}><option value="">Unknown</option>{['Idea', 'Pre-seed', 'Seed'].map((s) => <option key={s}>{s}</option>)}</select></Field>
      </Card>
      <div className="space-y-3">
        {[...verdicts].sort((a, b) => order[a.status] - order[b.status]).map((vd) => (
          <motion.div layout key={vd.scheme.id} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="tight font-semibold">{vd.scheme.name}</h3><p className="text-[13px] text-muted">{vd.scheme.body} · {vd.scheme.benefit}</p></div>
                <Badge tone={tone[vd.status]}>{vd.status === 'eligible' ? <><Check size={11} /> Eligible</> : vd.status === 'unknown' ? <><CircleHelp size={11} /> Need more info</> : <><X size={11} /> Not eligible</>}</Badge>
              </div>
              <ul className="mt-3 space-y-1.5">{vd.results.map((r) => (
                <li key={r.rule.label} className={cn('flex items-center gap-2 text-[13px]', r.status === 'pass' ? 'text-muted' : r.status === 'fail' ? 'text-danger' : 'text-warn')}>
                  {r.status === 'pass' ? <Check size={13} className="text-good" /> : r.status === 'fail' ? <X size={13} /> : <CircleHelp size={13} />}
                  {r.rule.label}{r.status === 'fail' && <span className="ml-1 font-medium">· this rule failed</span>}
                </li>
              ))}</ul>
            </Card>
          </motion.div>
        ))}
        <p className="px-1 text-xs text-faint">A fast first filter, not legal advice. Confirm on the official portal before applying.</p>
      </div>
    </div>
  );
}

interface DeckReview { overall: number; summary: string; slides: { section: string; score: number; note: string }[] }

function Deck() {
  const toast = useApp((s) => s.toast);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [name, setName] = useState('');
  const [paste, setPaste] = useState('');
  const [review, setReview] = useState<DeckReview | null>(null);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const run = async (n: string, text: string) => {
    setName(n); setState('busy'); setErr('');
    try {
      const [d] = await Promise.all([post<{ review: DeckReview }>('/ai/deck-review', { text, name: n }), sleep(1200)]);
      setReview(d.review); setState('done');
    } catch (e) { setErr(errMsg(e)); setState('idle'); }
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    if (file.current) file.current.value = '';
    if (f.size > 5_000_000) return setErr('That deck is over 5 MB. Export a lighter PDF or paste the slide text.');
    setName(f.name); setState('busy'); setErr('');
    try {
      const { text } = await pdfText(f);
      if (text.length < 40) { setState('idle'); return setErr('That PDF has almost no selectable text (slides exported as images?). Paste the slide text below instead.'); }
      await run(f.name, text);
    } catch { setState('idle'); toast({ title: 'Could not read that PDF', tone: 'warn' }); }
  };
  if (state === 'busy') return <div className="space-y-3"><p className="flex items-center gap-2 text-sm text-muted"><Asterisk size={14} className="animate-pulse text-accent" /> Reviewing {name}…</p>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (state === 'done' && review) return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-5 p-5"><MatchScoreRing score={review.overall} size={88} stroke={6} label="deck" /><div className="min-w-0 flex-1"><p className="truncate text-xs text-faint">{name}</p><p className="mt-1 text-sm text-muted"><AIStreamText text={review.summary} wps={30} /></p></div></Card>
      {review.slides.map((sl, i) => <motion.div key={sl.section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}><Card className="flex items-center gap-4 p-4"><span className="num w-6 text-faint">{i + 1}</span><div className="flex-1"><p className="font-medium">{sl.section}</p><p className="text-[13px] text-muted">{sl.note}</p></div><span className="num text-xl font-semibold" style={{ color: scoreColor(sl.score) }}>{sl.score}</span></Card></motion.div>)}
      <Button onClick={() => { setState('idle'); setReview(null); }}>Review another deck</Button>
    </div>
  );
  return (
    <div className="space-y-4">
      <input ref={file} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <EmptyState title="Upload your pitch deck" body="Get section-by-section feedback on problem, market, traction, team and the ask. PDF up to 5 MB, read in your browser." action={<Button variant="primary" onClick={() => file.current?.click()}><FileUp size={15} /> Choose PDF</Button>} />
      <Card className="space-y-3 p-5">
        <p className="text-sm font-medium">Or paste your slide text</p>
        <Textarea rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Problem: … Solution: … Market: … Traction: … Team: … Ask: …" aria-label="Deck text" maxLength={30000} />
        <div className="flex justify-end"><Button variant="primary" disabled={paste.trim().length < 40} onClick={() => run('Pasted deck', paste)}><Asterisk size={14} /> Review</Button></div>
      </Card>
      {err && <p className="text-[13px] text-danger" role="alert">{err}</p>}
    </div>
  );
}

const BLANK: VentureT = { id: '', text: '', analysis: null, facts: {}, teamSize: 1, hasUsers: false, done: {} };

export default function Studio() {
  const { data, isLoading } = useVenture();
  const qc = useQueryClient();
  const toast = useApp((s) => s.toast);
  const [v, setV] = useState<VentureT>(BLANK);
  const [hydrated, setHydrated] = useState(false);
  const [stage, setStage] = useState<'input' | 'loading' | 'out'>('input');
  const [tab, setTab] = useState<'validate' | 'ready' | 'schemes' | 'deck'>('validate');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isLoading || hydrated) return;
    if (data) { setV(data); if (data.analysis) setStage('out'); }
    setHydrated(true);
  }, [data, isLoading, hydrated]);

  const save = (c: Partial<VentureT>) => {
    setV((cur) => {
      const next = { ...cur, ...c };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => put('/venture', { text: next.text, facts: next.facts, teamSize: next.teamSize, hasUsers: next.hasUsers, done: next.done }).catch(() => undefined), 600);
      return next;
    });
  };
  const go = async () => {
    setStage('loading');
    try {
      const [d] = await Promise.all([post<{ analysis: IdeaAnalysis }>('/ai/validate-idea', { text: v.text }), sleep(1400)]);
      setV((cur) => ({ ...cur, analysis: d.analysis }));
      setStage('out');
      qc.invalidateQueries({ queryKey: ['venture'] });
    } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); setStage('input'); }
  };

  return (
    <>
      <PageHeader eyebrow="Founder Studio" title="From idea to investor-ready" sub="Validate in seconds, score your readiness and find every scheme you qualify for. Everything saves automatically." actions={<Link to="/studio/cofounders"><Button variant="outline"><Users size={15} /> Find co-founders</Button></Link>} />
      <Tabs id="studio-tabs" value={tab} onChange={setTab} options={[{ value: 'validate', label: 'Validate idea' }, { value: 'ready', label: 'Readiness' }, { value: 'schemes', label: 'Schemes' }, { value: 'deck', label: 'Pitch deck' }]} />
      <div className="pt-6">
        {isLoading ? <Skeleton className="h-64" /> : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              {tab === 'validate' && (
                stage === 'input' ? (
                  <div className="mx-auto max-w-2xl py-6">
                    <h2 className="tight text-center text-3xl font-semibold md:text-4xl">Describe your idea in <span className="display">3 lines.</span></h2>
                    <Textarea rows={6} value={v.text} onChange={(e) => save({ text: e.target.value })} placeholder="Who has the problem, what you are building, and what proof you have so far…" className="mt-8 !p-4 !text-[15px]" aria-label="Your idea" maxLength={4000} />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <button onClick={() => save({ text: EXAMPLE })} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent"><Lightbulb size={14} /> Use an example</button>
                      <Button variant="primary" size="lg" disabled={v.text.trim().length < 20} onClick={go}><Asterisk size={15} /> Validate with AI</Button>
                    </div>
                  </div>
                ) : stage === 'loading' ? (
                  <div className="space-y-4"><p className="flex items-center gap-2 text-sm text-muted"><Asterisk size={14} className="animate-pulse text-accent" /> Analysing your idea…</p><div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div></div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between"><Badge tone="good"><Check size={11} /> Validated and saved</Badge><div className="flex gap-2"><Button size="sm" onClick={() => setStage('input')}>Edit idea</Button><Button size="sm" variant="primary" onClick={() => setTab('ready')}>Check readiness <ArrowRight size={13} /></Button></div></div>
                    {v.analysis && <ValidatorOutput a={v.analysis} />}
                  </div>
                )
              )}
              {tab === 'ready' && <Readiness v={v} save={save} />}
              {tab === 'schemes' && <Schemes v={v} save={save} />}
              {tab === 'deck' && <Deck />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </>
  );
}
