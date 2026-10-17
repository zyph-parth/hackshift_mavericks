import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { useApp } from '@/lib/store';
import { post } from '@/lib/api';
import { errMsg, useThread, useThreads } from '@/lib/queries';
import { ago } from '@/components/shell';
import { cn } from '@/lib/utils';

const KIND: Record<string, string> = { application: 'Application', cofounder: 'Co-founder', mentor: 'Mentor session', direct: 'Direct', task: 'Proof task' };

function Conversation({ id, onBack }: { id: string; onBack: () => void }) {
  const me = useApp((s) => s.user)!;
  const toast = useApp((s) => s.toast);
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useThread(id);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const count = data?.messages.length ?? 0;
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [count]);
  useEffect(() => { if (data) qc.invalidateQueries({ queryKey: ['threads'] }); }, [data?.messages.length, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try { await post(`/threads/${id}/messages`, { text: t }); setText(''); await qc.invalidateQueries({ queryKey: ['thread', id] }); await qc.invalidateQueries({ queryKey: ['threads'] }); } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); }
    setBusy(false);
  };
  if (isError) return <ErrorState onRetry={refetch} />;
  if (isLoading || !data) return <div className="space-y-3 p-6"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-16 w-2/3" /><Skeleton className="ml-auto h-16 w-2/3" /></div>;
  const { thread, messages } = data;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <button onClick={onBack} className="text-muted hover:text-text md:hidden" aria-label="Back"><ArrowLeft size={18} /></button>
        {thread.other && <Avatar name={thread.other.name} hue={thread.other.hue} size={36} />}
        <div className="min-w-0 flex-1"><p className="truncate font-medium">{thread.other?.name}</p><p className="truncate text-xs text-muted">{thread.subject}</p></div>
        <Badge>{KIND[thread.kind] ?? 'Message'}</Badge>
        {thread.other && me.roles.some((r) => r !== 'talent') && thread.other.roles.includes('talent') && <Link to={`/u/${thread.other.username}`} className="hidden text-[13px] text-accent hover:underline sm:inline">Profile</Link>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.map((m) => {
          const mine = m.from === me.id;
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm', mine ? 'rounded-br-md bg-accent text-accent-fg' : 'rounded-bl-md border border-border bg-surface-2')}>
                <p className="whitespace-pre-line">{m.text}</p>
                <p className={cn('num mt-1 text-[10px]', mine ? 'text-accent-fg/70' : 'text-faint')}>{ago(m.created)}</p>
              </div>
            </motion.div>
          );
        })}
        <div ref={end} />
      </div>
      <form className="flex items-end gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder="Write a message…" aria-label="Message" className="max-h-32 min-h-10 flex-1 resize-none rounded-input border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15" />
        <Button type="submit" variant="primary" loading={busy} disabled={!text.trim()} aria-label="Send"><Send size={15} /></Button>
      </form>
    </div>
  );
}

export default function InboxPage() {
  const { data, isLoading, isError, refetch } = useThreads();
  const loc = useLocation();
  const initial = (loc.state as { open?: string } | null)?.open ?? null;
  const [sel, setSel] = useState<string | null>(initial);
  const threads = data?.threads ?? [];
  const active = sel ?? (typeof window !== 'undefined' && window.innerWidth >= 768 ? threads[0]?.id ?? null : null);

  return (
    <>
      <PageHeader eyebrow="Inbox" title="Conversations" sub="Applications, accepted tasks, mentor sessions and co-founder trials all land here." />
      {isError ? <ErrorState onRetry={refetch} /> : isLoading ? <Skeleton className="h-[480px]" /> : !threads.length ? (
        <EmptyState title="No messages yet" body="Apply to a role, accept a task or propose a co-founder trial and the conversation starts here." />
      ) : (
        <div className="card grid h-[calc(100dvh-16rem)] min-h-[440px] overflow-hidden md:grid-cols-[320px_1fr]">
          <div className={cn('overflow-y-auto border-r border-border', active && 'hidden md:block')}>
            {threads.map((t) => (
              <button key={t.id} onClick={() => setSel(t.id)} className={cn('flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition hover:bg-surface-2', active === t.id && 'bg-surface-2')}>
                {t.other && <Avatar name={t.other.name} hue={t.other.hue} size={38} />}
                <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className={cn('truncate text-sm', t.unread ? 'font-semibold' : 'font-medium')}>{t.other?.name}</p><span className="num shrink-0 text-[11px] text-faint">{ago(t.lastAt)}</span></div><p className="truncate text-xs text-muted">{t.subject}</p><p className="truncate text-xs text-faint">{t.last?.text}</p></div>
                {t.unread > 0 && <span className="num flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg">{t.unread}</span>}
              </button>
            ))}
          </div>
          <div className={cn('min-h-0', !active && 'hidden md:block')}>
            <AnimatePresence mode="wait">
              {active ? <motion.div key={active} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full"><Conversation id={active} onBack={() => setSel(null)} /></motion.div> : <div className="flex h-full items-center justify-center text-sm text-muted">Select a conversation</div>}
            </AnimatePresence>
          </div>
        </div>
      )}
    </>
  );
}
