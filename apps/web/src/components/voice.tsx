import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export type OrbState = 'idle' | 'speaking' | 'listening' | 'thinking';

/** Mic loudness 0..1 via Web Audio AnalyserNode. Falls back to simulated motion when no mic. */
export function useMicLevel(active: boolean) {
  const [level, setLevel] = useState(0);
  const [hasMic, setHasMic] = useState(false);
  useEffect(() => {
    if (!active) {
      setLevel(0);
      return;
    }
    let raf = 0;
    let stream: MediaStream | undefined;
    let ctx: AudioContext | undefined;
    let cancelled = false;
    const sim = () => {
      const t = performance.now() / 1000;
      setLevel(0.25 + 0.2 * Math.abs(Math.sin(t * 3.1)) + 0.15 * Math.abs(Math.sin(t * 7.3)));
      raf = requestAnimationFrame(sim);
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        setHasMic(true);
        const tick = () => {
          an.getByteFrequencyData(buf);
          let s = 0;
          for (const v of buf) s += v;
          setLevel(Math.min(1, s / buf.length / 90));
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setHasMic(false);
        sim();
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [active]);
  return { level, hasMic };
}

/* Web Speech wrappers with graceful fallback */
type SRCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
const getSR = (): SRCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export function useSpeechRecognition() {
  const supported = !!getSR();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const rec = useRef<InstanceType<SRCtor> | null>(null);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-IN';
    r.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setTranscript('');
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);
  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);
  useEffect(() => () => rec.current?.stop(), []);
  return { supported, listening, transcript, setTranscript, start, stop };
}

export function speak(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) {
    onEnd?.();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return () => window.speechSynthesis.cancel();
}

/* ------------------------------- VoiceOrb -------------------------------- */
export function VoiceOrb({ state, level, size = 240 }: { state: OrbState; level: number; size?: number }) {
  const scale = state === 'listening' ? 1 + level * 0.55 : state === 'speaking' ? 1.04 : 1;
  const color = state === 'listening' ? 'var(--ev-interview)' : 'var(--accent)';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      {/* outer halos */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: size * (0.72 + i * 0.14),
            height: size * (0.72 + i * 0.14),
            border: `1px solid color-mix(in srgb, ${color} ${28 - i * 8}%, transparent)`,
          }}
          animate={{
            scale: state === 'idle' ? 1 : state === 'listening' ? 1 + level * (0.25 + i * 0.1) : [1, 1.06 + i * 0.02, 1],
            opacity: state === 'idle' ? 0.4 : 1,
          }}
          transition={
            state === 'listening'
              ? { type: 'spring', stiffness: 220, damping: 18 }
              : { duration: 2.6 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      ))}
      {/* glow */}
      <motion.span
        className="absolute rounded-full blur-3xl"
        style={{ width: size * 0.8, height: size * 0.8, background: color }}
        animate={{ opacity: state === 'idle' ? 0.12 : 0.28 + level * 0.3 }}
        transition={{ duration: 0.3 }}
      />
      {/* blob */}
      <motion.div
        className="relative"
        style={{ width: size * 0.5, height: size * 0.5 }}
        animate={{ scale }}
        transition={{ type: 'spring', stiffness: 240, damping: 16, mass: 0.6 }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
          <defs>
            <radialGradient id="orbg" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#fff" stopOpacity=".9" />
              <stop offset="35%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity=".55" />
            </radialGradient>
          </defs>
          <motion.path
            fill="url(#orbg)"
            initial={{ d: 'M100,10 C150,10 190,50 190,100 C190,150 150,190 100,190 C50,190 10,150 10,100 C10,50 50,10 100,10 Z' }}
            animate={{
              d: [
                'M100,10 C150,10 190,50 190,100 C190,150 150,190 100,190 C50,190 10,150 10,100 C10,50 50,10 100,10 Z',
                'M100,16 C160,22 184,60 186,104 C186,148 144,186 98,184 C48,182 14,146 16,98 C18,52 48,12 100,16 Z',
                'M100,12 C146,6 192,56 188,98 C184,152 150,192 102,190 C54,194 8,148 12,104 C14,56 56,18 100,12 Z',
                'M100,10 C150,10 190,50 190,100 C190,150 150,190 100,190 C50,190 10,150 10,100 C10,50 50,10 100,10 Z',
              ],
            }}
            transition={{
              duration: state === 'thinking' ? 1.6 : state === 'speaking' ? 3.2 : 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {state === 'thinking' && (
            <circle cx="100" cy="100" r="86" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeDasharray="40 500" style={{ transformOrigin: 'center', animation: 'spin-slow 1.2s linear infinite' }} />
          )}
        </svg>
      </motion.div>
    </div>
  );
}
