import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useMotionValue, useReducedMotion } from 'motion/react';

/** Simulates a network fetch so skeletons are visible and honest. */
export function useLoad<T>(data: T, ms = 650) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return { data, loading };
}

/** Animated count-up number. */
export function useCountUp(target: number, opts: { duration?: number; delay?: number; start?: boolean } = {}) {
  const { duration = 1.1, delay = 0, start = true } = opts;
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [v, setV] = useState(reduce ? target : 0);
  useEffect(() => {
    if (!start) return;
    if (reduce) {
      setV(target);
      return;
    }
    const c = animate(mv, target, { duration, delay, ease: [0.2, 0.8, 0.2, 1], onUpdate: (x) => setV(x) });
    return () => c.stop();
  }, [target, start, duration, delay, reduce, mv]);
  return v;
}

export function useInViewOnce<T extends Element>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return [ref, inView] as const;
}

/** Streams text word by word, resolves instantly under reduced motion. */
export function useStream(text: string, run: boolean, wps = 22) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  const [n, setN] = useState(reduce ? words.length : 0);
  useEffect(() => {
    if (!run) return;
    if (reduce) {
      setN(words.length);
      return;
    }
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setN(i);
      if (i >= words.length) clearInterval(id);
    }, 1000 / wps);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, run, reduce, wps]);
  return { shown: words.slice(0, n).join(' '), done: n >= words.length };
}

export function useHotkey(combo: string, cb: (e: KeyboardEvent) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const meta = combo.startsWith('mod+');
      const key = combo.replace('mod+', '');
      if (meta ? (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key : e.key.toLowerCase() === key) {
        ref.current(e);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [combo]);
}

export function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}
