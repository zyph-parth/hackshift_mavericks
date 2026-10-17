import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Keyboard, Mic, MicOff, ShieldCheck, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Logo, Textarea, ThemeToggle } from '@/components/ui';
import { ScoreReveal } from '@/components/hero';
import { speak, useMicLevel, useSpeechRecognition, VoiceOrb, type OrbState } from '@/components/voice';
import { useApp } from '@/lib/store';
import { api, post, type InterviewResultT } from '@/lib/api';
import { errMsg } from '@/lib/queries';
import { cn, EASE, sleep } from '@/lib/utils';

export default function Interview() {
  const nav = useNavigate();
  const toast = useApp((s) => s.toast);
  const qc = useQueryClient();
  const qs = useQuery({ queryKey: ['interview', 'questions'], staleTime: 0, gcTime: 0, queryFn: () => api<{ questions: { q: string; skill: string }[]; retakesLeft: number; attemptCap: number }>('/interview/questions') });
  const QUESTIONS = qs.data?.questions ?? [];
  const [phase, setPhase] = useState<'intro' | 'live' | 'grading' | 'reveal'>('intro');
  const [idx, setIdx] = useState(0);
  const [orb, setOrb] = useState<OrbState>('idle');
  const [typed, setTyped] = useState(false);
  const [text, setText] = useState('');
  const [words, setWords] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [signals, setSignals] = useState(0);
  const [result, setResult] = useState<InterviewResultT | null>(null);
  const answers = useRef<string[]>([]);
  const sr = useSpeechRecognition();
  const { level } = useMicLevel(phase === 'live' && orb === 'listening' && !typed);
  const q = QUESTIONS[idx] ?? { q: '', skill: '' };
  const retakesLeft = qs.data?.retakesLeft ?? 0;

  // timer
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // tab-switch integrity signal
  useEffect(() => {
    if (phase !== 'live') return;
    const h = () => {
      if (document.hidden) {
        setSignals((s) => s + 1);
        toast({ title: 'We noticed you left the tab', body: 'This is logged as a signal. No penalty on its own.', tone: 'warn' });
      }
    };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [phase, toast]);

  // read the question aloud, word reveal
  useEffect(() => {
    if (phase !== 'live' || !q.q) return;
    setOrb('speaking');
    setWords(0);
    setText('');
    sr.setTranscript('');
    const total = q.q.split(' ').length;
    let n = 0;
    const id = setInterval(() => {
      n++;
      setWords(n);
      if (n >= total) clearInterval(id);
    }, 200);
    const stopSpeak = speak(q.q, () => setOrb((o) => (o === 'speaking' ? 'idle' : o)));
    const fallback = setTimeout(() => setOrb((o) => (o === 'speaking' ? 'idle' : o)), total * 220 + 600);
    return () => {
      clearInterval(id);
      clearTimeout(fallback);
      stopSpeak?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  const toggleMic = useCallback(() => {
    if (orb === 'listening') {
      sr.stop();
      setOrb('idle');
    } else {
      window.speechSynthesis?.cancel();
      setOrb('listening');
      sr.start();
    }
  }, [orb, sr]);

  // space = push-to-talk toggle
  useEffect(() => {
    if (phase !== 'live' || typed) return;
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [phase, typed, toggleMic]);

  const answer = typed ? text : sr.transcript;

  const finish = async (all: string[]) => {
    setPhase('grading');
    setOrb('thinking');
    try {
      const [r] = await Promise.all([
        post<InterviewResultT>('/interview/complete', { answers: QUESTIONS.map((qq, i) => ({ q: qq.q, skill: qq.skill, answer: all[i] ?? '' })), signals, seconds: elapsed }),
        sleep(2200),
      ]);
      setResult(r);
      await qc.invalidateQueries();
      const me = await api<{ user: import('@/lib/api').Me }>('/me');
      useApp.getState().setUser(me.user);
      setPhase('reveal');
    } catch (e) {
      toast({ title: errMsg(e), tone: 'warn' });
      setPhase('live');
      setOrb('idle');
    }
  };

  const next = () => {
    sr.stop();
    window.speechSynthesis?.cancel();
    answers.current[idx] = answer;
    if (idx + 1 >= QUESTIONS.length) finish(answers.current);
    else {
      setIdx((i) => i + 1);
      setOrb('thinking');
      setTimeout(() => setOrb('idle'), 500);
    }
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const orbShown: OrbState = sr.listening || (orb === 'listening') ? 'listening' : orb;

  return (
    <div className="noise relative flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--glow)' }} />
      <header className="relative z-10 flex items-center justify-between px-4 py-4 md:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => { window.speechSynthesis?.cancel(); nav('/dashboard'); }} aria-label="Leave interview"><X size={16} /> Exit</Button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.main key="intro" exit={{ opacity: 0, scale: 0.98 }} className="relative z-10 mx-auto flex flex-1 flex-col items-center justify-center px-5 text-center">
            <VoiceOrb state="idle" level={0} size={220} />
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7, ease: EASE }} className="tight mt-2 text-4xl font-semibold md:text-5xl">Ready when <span className="display">you</span> are.</motion.h1>
            <p className="mt-3 max-w-md text-muted">Five questions, about ten minutes. Talk naturally. Your verified skills update the moment you finish.</p>
            <ul className="mt-6 space-y-1.5 text-left text-sm text-muted">
              <li className="flex items-center gap-2"><Mic size={14} className="text-accent" /> Allow the mic, or switch to typing at any time</li>
              <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-accent" /> We log tab switches as a signal. Nothing else is recorded</li>
              <li className="flex items-center gap-2"><Keyboard size={14} className="text-accent" /> Press <kbd className="num rounded border border-border-strong bg-surface-2 px-1.5 text-xs">Space</kbd> to start and stop talking</li>
            </ul>
            <Button variant="primary" size="lg" className="mt-8" disabled={!QUESTIONS.length || retakesLeft === 0} loading={qs.isLoading} onClick={() => setPhase('live')}>{retakesLeft === 0 && !qs.isLoading ? 'No attempts left' : <>Begin interview <ArrowRight size={16} /></>}</Button>
            <p className="mt-3 text-xs text-faint">{qs.isError ? errMsg(qs.error) : `Attempts left: ${retakesLeft} of ${qs.data?.attemptCap ?? 3}`}</p>
          </motion.main>
        )}

        {(phase === 'live' || phase === 'grading') && (
          <motion.main key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-5 pb-8">
            <div className="flex w-full items-center justify-between">
              <div className="flex gap-1.5" aria-label={`Question ${idx + 1} of ${QUESTIONS.length}`}>
                {QUESTIONS.map((_, i) => <motion.span key={i} animate={{ width: i === idx ? 28 : 8, background: i <= idx ? 'var(--accent)' : 'var(--border-strong)' }} className="h-2 rounded-full" />)}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="num">{mm}:{ss}</span>
                <span className="flex items-center gap-1.5"><span className={cn('h-1.5 w-1.5 rounded-full', signals ? 'bg-warn' : 'bg-good')} />Integrity {signals ? `· ${signals} signal${signals > 1 ? 's' : ''}` : 'clear'}</span>
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center">
              <VoiceOrb state={phase === 'grading' ? 'thinking' : orbShown} level={level} size={260} />
              {phase === 'grading' ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tight mt-2 text-2xl font-semibold">Reading your answers…</motion.p>
              ) : (
                <>
                  <p className="mb-2 text-[11px] uppercase text-faint">{q.skill}</p>
                  <h2 className="tight max-w-2xl text-center text-xl font-medium leading-snug md:text-2xl" aria-live="polite">
                    {q.q.split(' ').map((w, i) => (
                      <motion.span key={idx + '-' + i} initial={false} animate={{ opacity: i < words ? 1 : 0.12, filter: i < words ? 'blur(0px)' : 'blur(3px)' }} transition={{ duration: 0.3 }} className="mr-[0.28em] inline-block">{w}</motion.span>
                    ))}
                  </h2>
                  <div className="mt-6 min-h-[84px] w-full max-w-xl">
                    {typed ? (
                      <Textarea rows={4} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer…" aria-label="Your answer" />
                    ) : (
                      <p className="text-center text-[15px] leading-relaxed text-muted" aria-live="off">
                        {answer ? answer : orbShown === 'listening' ? <span className="text-faint">Listening…</span> : <span className="text-faint">{sr.supported ? 'Press the mic and start talking.' : 'Speech recognition isn’t available in this browser. Switch to typing.'}</span>}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {phase === 'live' && (
              <div className="flex w-full items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => { sr.stop(); setTyped((t) => !t); setOrb('idle'); }}><Keyboard size={15} /> {typed ? 'Use voice' : 'Switch to typing'}</Button>
                {!typed && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={toggleMic}
                    aria-label={orb === 'listening' ? 'Stop recording' : 'Start recording'}
                    className={cn('relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-colors', orb === 'listening' ? 'bg-ev-interview' : 'bg-accent')}
                    style={{ ['--ring' as string]: orb === 'listening' ? 'var(--ev-interview)' : 'var(--accent)', animation: orb === 'listening' ? 'pulse-ring 1.2s ease-out infinite' : undefined }}
                  >
                    {orb === 'listening' ? <MicOff size={24} /> : <Mic size={24} />}
                  </motion.button>
                )}
                <Button variant={answer.trim() || typed ? 'primary' : 'secondary'} onClick={next}>{idx + 1 === QUESTIONS.length ? 'Finish' : 'Next question'} <ArrowRight size={15} /></Button>
              </div>
            )}
          </motion.main>
        )}
      </AnimatePresence>

      {phase === 'reveal' && result && (
        <ScoreReveal overall={result.overall} scores={result.scores} onContinue={() => { toast({ title: 'Matches re-ranked', body: 'Your interview-verified skills are now live.', tone: 'good' }); nav('/jobs'); }} onReport={() => nav(`/interview/${result.id ?? 'latest'}/report`)} />
      )}
    </div>
  );
}
