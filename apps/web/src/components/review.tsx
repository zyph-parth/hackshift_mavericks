import { useState } from 'react';
import { Check, CircleHelp, ExternalLink, Info, Minus, RefreshCw, TriangleAlert, X } from 'lucide-react';
import type { CriterionResult, SubmissionReview, Verdict } from '@launchloop/shared';
import { Badge, Button } from './ui';
import { cn } from '@/lib/utils';

const KIND = { repo: 'GitHub repository', site: 'Live site', figma: 'Figma link', text: 'Write-up only', none: 'Nothing to inspect' } as const;
const STATUS_NOTE = {
  ok: '',
  unreachable: 'Could not be reached',
  private_or_missing: 'Not found or private',
  rate_limited: 'GitHub rate limit, try again shortly',
  unsupported: 'Not supported for automatic inspection',
  blocked: 'Blocked: not a public web address',
  none: '',
} as const;

const VERDICT: Record<Verdict, { icon: typeof Check; tone: string; label: string }> = {
  met: { icon: Check, tone: 'text-good', label: 'Met' },
  partial: { icon: Minus, tone: 'text-warn', label: 'Partly met' },
  not_met: { icon: X, tone: 'text-danger', label: 'Not met' },
  cannot_assess: { icon: CircleHelp, tone: 'text-faint', label: 'Needs a human look' },
};

/** Measured facts, in the order a reviewer wants them. Anything that names the candidate is hidden in blind mode. */
const FACTS: [string, string, boolean?][] = [
  ['repo', 'Repository', true], ['host', 'Host', true], ['languages', 'Languages'], ['files', 'Files'], ['commits', 'Commits'], ['commitDays', 'Active days'],
  ['authors', 'Committers'], ['pushed', 'Last push'], ['created', 'Created'], ['stars', 'Stars'], ['http', 'HTTP status'], ['htmlKb', 'Page KB'], ['stylesheets', 'Stylesheets read'], ['scripts', 'Scripts read'],
];

export function ReviewPanel({ review, blind, onRerun, rerunning }: { review: SubmissionReview; blind?: boolean; onRerun?: () => void; rerunning?: boolean }) {
  const [showFiles, setShowFiles] = useState(false);
  const ins = review.inspected;
  const opened = ins.status === 'ok';
  const flags = review.flags.map((f) => (blind && f.identifying ? { ...f, text: 'Authorship details are hidden while blind review is on.' } : f));
  const facts = FACTS.filter(([k, , hide]) => ins.facts[k] !== undefined && !(blind && hide));
  const modelCount = review.criteria.filter((c) => c.by === 'model' && c.verdict !== 'cannot_assess').length;
  const href = ins.url ? (ins.url.startsWith('http') ? ins.url : `https://${ins.url}`) : '';

  if (review.status === 'sample') {
    return (
      <div className="space-y-3 p-4">
        <div className="flex gap-2.5 rounded-md border border-border-strong bg-surface-2 p-3 text-[13px] text-muted"><Info size={15} className="mt-0.5 shrink-0" /><p>Demo submission. It was never inspected, so the score shown is illustrative. Submissions made through the app are inspected for real.</p></div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      <section className="space-y-2.5 p-4">
        <p className="text-[11px] uppercase text-faint">What we inspected</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{KIND[ins.kind]}</span>
          {!opened && STATUS_NOTE[ins.status] && <Badge tone="warn">{STATUS_NOTE[ins.status]}</Badge>}
          {!blind && href && opened && <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[240px] items-center gap-1 truncate text-xs text-muted hover:text-accent">{ins.url.replace(/^https?:\/\//, '')} <ExternalLink size={11} /></a>}
        </div>
        {ins.note && <p className="text-[13px] text-muted">{ins.note}</p>}
        {facts.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-3">
            {facts.map(([k, label]) => <div key={k}><dt className="text-faint">{label}</dt><dd className="num truncate" title={String(ins.facts[k])}>{String(ins.facts[k])}</dd></div>)}
          </dl>
        )}
        {ins.filesRead.length > 0 && (
          <div>
            <button onClick={() => setShowFiles((s) => !s)} className="text-xs text-muted underline-offset-2 hover:text-text hover:underline">{showFiles ? 'Hide' : 'Show'} the {ins.filesRead.length} files we read</button>
            {showFiles && <ul className="num mt-2 max-h-32 space-y-0.5 overflow-y-auto text-[11.5px] text-muted">{ins.filesRead.map((f) => <li key={f} className="truncate">{f}</li>)}</ul>}
          </div>
        )}
      </section>

      {opened ? (
        <section className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase text-faint">Rubric, checked against the project</p>
            <span className="num text-xs text-muted">{review.assessed} of {review.total} assessed</span>
          </div>
          <ul className="space-y-3">
            {review.criteria.map((c) => <Criterion key={c.criterion} c={c} />)}
          </ul>
          <p className="text-xs text-faint">{review.method === 'checks+model' ? `Rule-based checks, plus a model for ${modelCount} criteri${modelCount === 1 ? 'on' : 'a'}; its answers count only when they quote text from the files.` : 'Rule-based checks on the files above. Nothing was run.'}</p>
        </section>
      ) : null}

      {flags.length > 0 && (
        <section className="space-y-2 p-4">
          <p className="text-[11px] uppercase text-faint">Integrity notes</p>
          {flags.map((f, i) => (
            <p key={i} className={cn('flex gap-2 text-[13px]', f.level === 'warn' ? 'text-warn' : 'text-muted')}>
              {f.level === 'warn' ? <TriangleAlert size={14} className="mt-0.5 shrink-0" /> : <Info size={14} className="mt-0.5 shrink-0 text-faint" />}{f.text}
            </p>
          ))}
        </section>
      )}

      {onRerun && (
        <section className="flex items-center justify-between gap-3 p-4">
          <p className="text-xs text-faint">{ins.status === 'rate_limited' || !opened ? 'The project could not be inspected.' : 'Inspected just now.'} Re-run after a fix or a rate limit.</p>
          <Button size="sm" onClick={onRerun} loading={rerunning}><RefreshCw size={13} /> Re-run inspection</Button>
        </section>
      )}
    </div>
  );
}

function Criterion({ c }: { c: CriterionResult }) {
  const v = VERDICT[c.verdict];
  const Icon = v.icon;
  return (
    <li className="flex gap-2.5">
      <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-current', v.tone)} title={v.label}><Icon size={12} strokeWidth={2.5} /></span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[13.5px] font-medium">{c.criterion}<span className={cn('text-[11px] font-normal', v.tone)}>{v.label}{c.by === 'model' && c.verdict !== 'cannot_assess' ? ' · model-assisted' : ''}</span></p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{c.evidence}</p>
      </div>
    </li>
  );
}
