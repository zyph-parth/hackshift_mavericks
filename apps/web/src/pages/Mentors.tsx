import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CalendarPlus, Check, CreditCard, MessageSquare, Sparkles, Star, Video } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Mentor } from '@launchloop/shared';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, PageHeader, Sheet, Skeleton, Textarea } from '@/components/ui';
import { useApp } from '@/lib/store';
import { post } from '@/lib/api';
import { errMsg, useBookings, useMentors } from '@/lib/queries';
import type { MentorT } from '@/lib/api';
import { cn, EASE, inr } from '@/lib/utils';

function MentorCard({ m, i, onBook, booked, rec }: { m: Mentor; i: number; onBook: () => void; booked: boolean; rec?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }} whileHover={{ y: -3 }}>
      <Card hover className="flex h-full flex-col p-5">
        <div className="flex items-start gap-3.5">
          <Avatar name={m.name} hue={m.hue} size={48} />
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="tight font-semibold">{m.name}</h3>{rec && <Badge tone="accent"><Sparkles size={10} /> For you</Badge>}</div><p className="truncate text-[13px] text-muted">{m.title}, {m.company}</p></div>
          <span className="num flex items-center gap-1 text-sm"><Star size={13} className="fill-warn text-warn" />{m.rating}</span>
        </div>
        <p className="mt-3 flex-1 text-[13px] text-muted">{m.bio}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{m.expertise.map((e) => <Badge key={e}>{e}</Badge>)}</div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div><p className="num text-lg font-semibold">{m.price ? inr(m.price) : 'Free'}</p><p className="text-[11px] text-faint">{m.sessions} sessions</p></div>
          <Button variant={booked ? 'secondary' : 'primary'} onClick={onBook}>{booked ? <><Check size={14} /> Booked</> : 'Book session'}</Button>
        </div>
      </Card>
    </motion.div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Next occurrence of a slot like "Tue 11:00 AM", in local time. */
function nextSlotDate(slot: string) {
  const m = slot.match(/^(\w{3}) (\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!m) return null;
  const d = new Date();
  let h = Number(m[2]) % 12;
  if (m[4] === 'PM') h += 12;
  d.setHours(h, Number(m[3]), 0, 0);
  const diff = (DAYS.indexOf(m[1]) - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 && d.getTime() < Date.now() ? 7 : diff));
  return d;
}
function downloadIcs(m: Mentor, slot: string, link: string, goal: string) {
  const start = nextSlotDate(slot);
  if (!start) return;
  const end = new Date(start.getTime() + 30 * 60_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (t: string) => t.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LaunchLoop//Mentors//EN', 'BEGIN:VEVENT', `UID:${f(start)}-${m.id}@launchloop`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${esc(`LaunchLoop session with ${m.name}`)}`, `DESCRIPTION:${esc(`Goal: ${goal}\nJoin: ${link}`)}`, `LOCATION:${esc(link)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `launchloop-${m.name.split(' ')[0].toLowerCase()}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function BookingSheet({ m, onClose, bookedSlots }: { m: Mentor | null; onClose: () => void; bookedSlots: string[] }) {
  const toast = useApp((s) => s.toast);
  const qc = useQueryClient();
  const [slot, setSlot] = useState('');
  const [goal, setGoal] = useState('');
  const [step, setStep] = useState<'pick' | 'pay' | 'done'>('pick');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const reset = () => { setSlot(''); setGoal(''); setStep('pick'); setLink(''); };
  const close = () => { onClose(); setTimeout(reset, 300); };
  const pay = async () => {
    if (!m) return;
    setBusy(true);
    try {
      const d = await post<{ booking: { link: string } }>('/bookings', { mentorId: m.id, slot, goal });
      setLink(d.booking.link);
      await qc.invalidateQueries();
      setStep('done');
      toast({ title: 'Session confirmed', body: `${slot} with ${m.name}`, tone: 'good' });
    } catch (e) { toast({ title: errMsg(e), tone: 'warn' }); setStep('pick'); }
    setBusy(false);
  };
  return (
    <Sheet open={!!m} onClose={close} title={step === 'done' ? 'You’re booked' : `Book ${m?.name ?? ''}`} width={460}>
      {m && (
        <div className="space-y-6 p-5">
          {step === 'pick' && (
            <>
              <div><p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Pick a slot</p>
                <div className="grid grid-cols-2 gap-2">{m.slots.map((s) => { const taken = bookedSlots.includes(s); return <button key={s} disabled={taken} onClick={() => setSlot(s)} className={cn('rounded-lg border px-3 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through', slot === s ? 'border-accent bg-accent-soft text-accent' : 'border-border hover:border-border-strong')}>{s}</button>; })}</div></div>
              <Field label="What do you want from this session?"><Textarea rows={4} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Review my seed pitch and tell me what's missing" /></Field>
              <Button variant="primary" size="lg" className="w-full" disabled={!slot || goal.trim().length < 5} loading={busy && !m.price} onClick={() => (m.price ? setStep('pay') : pay())}>{m.price ? 'Continue to payment' : 'Confirm free session'}</Button>
            </>
          )}
          {step === 'pay' && (
            <>
              <Card className="space-y-2 p-4 text-sm"><div className="flex justify-between"><span className="text-muted">Mentor</span>{m.name}</div><div className="flex justify-between"><span className="text-muted">Slot</span>{slot}</div><div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span className="num">{inr(m.price)}</span></div></Card>
              <Button variant="primary" size="lg" className="w-full" loading={busy} onClick={pay}><CreditCard size={15} /> Pay with Razorpay</Button>
              <p className="text-center text-xs text-faint">Test mode. Payment is confirmed server-side before your slot is held.</p>
            </>
          )}
          {step === 'done' && (
            <div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good/15 text-good"><Check size={28} strokeWidth={3} /></motion.div>
              <h3 className="tight mt-4 text-xl font-semibold">{slot} with {m.name}</h3>
              <Card className="mt-6 p-4 text-left"><p className="flex items-center gap-2 text-sm font-medium"><Video size={15} className="text-accent" /> Video room</p><p className="num mt-1 break-all text-xs text-muted">{link}</p></Card>
              <div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={() => window.open(link, '_blank', 'noopener')}><Video size={14} /> Open room</Button><Button onClick={() => downloadIcs(m, slot, link, goal)}><CalendarPlus size={14} /> Add to calendar</Button></div>
              <Link to="/inbox" className="mt-2 block"><Button variant="ghost" className="w-full"><MessageSquare size={14} /> Message mentor</Button></Link>
              <Button variant="ghost" className="mt-3 w-full" onClick={close}>Done</Button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

export default function Mentors() {
  const { data, isLoading, isError, refetch } = useMentors();
  const bookings = useBookings();
  const user = useApp((s) => s.user)!;
  const [open, setOpen] = useState<MentorT | null>(null);
  const founderMode = user.activeRole === 'founder';
  const stage = user.founder?.stage || 'Pre-seed';
  const mySkills = user.skills.map((k) => k.name.toLowerCase());
  const TALENT_TOPICS = ['engineering', 'hiring', 'architecture', 'product design', 'ux', 'growth', 'analytics'];
  const fitFor = (m: MentorT) => founderMode
    ? Number(m.stages.includes(stage)) * 2 + m.rating
    : m.expertise.filter((e) => TALENT_TOPICS.includes(e.toLowerCase()) || mySkills.some((k) => e.toLowerCase().includes(k))).length * 2 + m.rating;
  const rec = [...(data ?? [])].sort((a, b) => fitFor(b) - fitFor(a)).slice(0, 3);
  const mineIds = new Set((bookings.data ?? []).map((b) => b.mentorId));
  return (
    <>
      <PageHeader eyebrow="Mentors" title="Talk to people who've done it" sub="Free sessions for first-time founders, ₹499 for the rest." />
      {isError ? <ErrorState onRetry={refetch} /> : isLoading ? <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div> : !data?.length ? <EmptyState title="No mentors yet" body="Check back soon." /> : (
        <>
          <section className="mb-10"><h2 className="tight mb-4 flex items-center gap-2 text-sm font-semibold"><Sparkles size={14} className="text-accent" /> {founderMode ? `Recommended for your stage (${stage})` : 'Recommended for your career'}</h2><div className="grid gap-4 md:grid-cols-3">{rec.map((m, i) => <MentorCard key={m.id} m={m} i={i} rec booked={mineIds.has(m.id)} onBook={() => setOpen(m)} />)}</div></section>
          <h2 className="tight mb-4 text-sm font-semibold">Everyone</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((m, i) => <MentorCard key={m.id} m={m} i={i} booked={mineIds.has(m.id)} onBook={() => setOpen(m)} />)}</div>
        </>
      )}
      <BookingSheet m={open} onClose={() => setOpen(null)} bookedSlots={open?.taken ?? []} />
    </>
  );
}
