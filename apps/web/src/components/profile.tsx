import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Github, FileText, Plus, Trash2, Upload } from 'lucide-react';
import type { SkillClaim } from '@launchloop/shared';
import { Button, Input, Textarea } from './ui';
import { SkillChip } from './signature';
import { api, post, type Me } from '@/lib/api';
import { useApp } from '@/lib/store';
import { errMsg } from '@/lib/queries';
import { SKILL_SUGGESTIONS } from '@/lib/content';
import { cn } from '@/lib/utils';
import { pdfText } from '@/lib/pdf';

/** Add / re-rate / remove skills. Verified evidence is preserved by the server and cannot be forged. */
export function SkillsEditor({ compact }: { compact?: boolean }) {
  const user = useApp((s) => s.user)!;
  const updateMe = useApp((s) => s.updateMe);
  const toast = useApp((s) => s.toast);
  const [name, setName] = useState('');
  const save = async (skills: SkillClaim[]) => {
    try {
      await updateMe({ skills: skills.map((s) => ({ name: s.name, level: s.level })) });
    } catch (e) {
      toast({ title: errMsg(e), tone: 'warn' });
    }
  };
  const add = (n: string) => {
    const v = n.trim();
    if (!v || user.skills.some((s) => s.name.toLowerCase() === v.toLowerCase())) return setName('');
    save([...user.skills, { name: v, evidence: 'self', level: 65 }]);
    setName('');
  };
  const rest = SKILL_SUGGESTIONS.filter((s) => !user.skills.some((k) => k.name.toLowerCase() === s.toLowerCase())).slice(0, compact ? 6 : 10);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {user.skills.map((s) => (
            <motion.div key={s.name} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2">
                <div className="w-36 shrink-0"><SkillChip name={s.name} evidence={s.evidence} source={s.source} /></div>
                {s.evidence === 'self' ? (
                  <LevelSlider value={s.level} label={`${s.name} level`} onCommit={(level) => save(user.skills.map((k) => (k.name === s.name ? { ...k, level } : k)))} />
                ) : (
                  <>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${s.level}%`, background: `var(--ev-${s.evidence})` }} /></div>
                    <span className="num w-7 text-right text-sm">{s.level}</span>
                  </>
                )}
                <button onClick={() => save(user.skills.filter((k) => k.name !== s.name))} aria-label={`Remove ${s.name}`} className="text-faint transition hover:text-danger"><Trash2 size={14} /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {user.skills.length === 0 && <p className="rounded-lg border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted">No skills yet. Add a few below, paste a resume or import GitHub.</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add(name); }} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a skill, e.g. React" aria-label="Add a skill" />
        <Button type="submit" disabled={!name.trim()}><Plus size={14} /> Add</Button>
      </form>
      {rest.length > 0 && <div className="flex flex-wrap gap-1.5">{rest.map((s) => <button key={s} onClick={() => add(s)} className="rounded-[4px] border border-dashed border-border-strong px-2 py-0.5 text-xs text-muted transition hover:border-accent hover:text-accent">+ {s}</button>)}</div>}
      <p className="text-xs text-faint">Self-reported levels are capped at 85. To go higher, prove it with the interview, GitHub or a task.</p>
    </div>
  );
}

/** Range input that only saves when the user lets go, instead of one request per pixel dragged. */
function LevelSlider({ value, label, onCommit }: { value: number; label: string; onCommit: (v: number) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => v !== value && onCommit(v);
  return (
    <>
      <input type="range" min={20} max={85} value={v} aria-label={label} onChange={(e) => setV(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} className="h-1 flex-1 cursor-pointer accent-[var(--accent)]" />
      <span className="num w-7 text-right text-sm">{v}</span>
    </>
  );
}

/** Import evidence: paste/upload resume text, or pull public GitHub repos. */
export function ImportPanel() {
  const setUser = useApp((s) => s.setUser);
  const toast = useApp((s) => s.toast);
  const [mode, setMode] = useState<'resume' | 'github'>('resume');
  const [text, setText] = useState('');
  const [gh, setGh] = useState('');
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(false);
  const [found, setFound] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    setError('');
    if (f.size > 5_000_000) return setError('That file is over 5 MB.');
    if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
      setScan(true);
      try {
        const { text: t } = await pdfText(f, 6);
        if (t.length < 20) setError('That PDF has no selectable text (it may be a scan). Paste the text instead.');
        else setText(t);
      } catch { setError('We could not read that PDF. Paste the text instead.'); }
      setScan(false);
      return;
    }
    setText(await f.text());
  };

  const runResume = async () => {
    setBusy(true); setScan(true); setError(''); setFound(null);
    try {
      const [d] = await Promise.all([post<{ parsed: { skills: string[] }; user: Me }>('/me/resume', { text }), new Promise((r) => setTimeout(r, 1500))]);
      setUser(d.user);
      setFound(d.parsed.skills);
      toast({ title: d.parsed.skills.length ? `Found ${d.parsed.skills.length} skills` : 'No known skills found', body: d.parsed.skills.length ? 'Added as self-reported. Prove them to verify.' : 'Try adding skills manually.', tone: d.parsed.skills.length ? 'good' : 'warn' });
    } catch (e) { setError(errMsg(e)); }
    setBusy(false); setScan(false);
  };
  const runGithub = async () => {
    setBusy(true); setError(''); setFound(null);
    try {
      const d = await post<{ added: string[]; repos: number; user: Me }>('/me/github', { username: gh });
      setUser(d.user);
      setFound(d.added);
      toast({ title: `Imported from ${d.repos} repos`, body: 'These skills are now GitHub-verified.', tone: 'good' });
    } catch (e) { setError(errMsg(e)); }
    setBusy(false);
  };

  return (
    <div className="rounded-card border border-border bg-surface-2/40 p-4">
      <div className="mb-3 flex gap-1.5">
        {([['resume', 'Resume', FileText], ['github', 'GitHub', Github]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => { setMode(k); setError(''); }} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition', mode === k ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted hover:text-text')}><I size={12} />{l}</button>
        ))}
      </div>
      {mode === 'resume' ? (
        <div className="space-y-3">
          <div className="relative">
            <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume text here, or upload a PDF, .txt or .md file…" aria-label="Resume text" />
            {scan && <div className="pointer-events-none absolute inset-x-0 h-14 overflow-hidden rounded-input bg-gradient-to-b from-transparent via-accent/25 to-transparent" style={{ animation: 'scan 1.2s ease-in-out infinite alternate' }}><div className="absolute inset-x-0 bottom-0 h-px bg-accent shadow-[0_0_12px_var(--accent)]" /></div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={file} type="file" accept=".txt,.md,.pdf,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button size="sm" onClick={() => file.current?.click()}><Upload size={13} /> Upload file</Button>
            <Button size="sm" variant="primary" loading={busy} disabled={text.trim().length < 20} onClick={runResume}>Extract skills</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-muted">We read your public repos and turn languages into GitHub-verified skills. No login or token needed.</p>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); runGithub(); }}>
            <Input value={gh} onChange={(e) => setGh(e.target.value)} placeholder="github-username" aria-label="GitHub username" />
            <Button type="submit" variant="primary" loading={busy} disabled={!gh.trim()}>Import</Button>
          </form>
        </div>
      )}
      {error && <p className="mt-3 text-[13px] text-danger" role="alert">{error}</p>}
      {found && found.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{found.map((f, i) => <motion.span key={f} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}><SkillChip name={f} evidence={mode === 'github' ? 'github' : 'self'} size="sm" /></motion.span>)}</div>}
    </div>
  );
}

export { api };
