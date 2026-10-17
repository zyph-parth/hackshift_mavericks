import { clsx, type ClassValue } from 'clsx';

export const cn = (...i: ClassValue[]) => clsx(i);

export const EASE = [0.2, 0.8, 0.2, 1] as const;
export const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const hueColor = (h: number, l = 0.62) => `oklch(${l} 0.16 ${h})`;

export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
}

export function scoreColor(score: number) {
  if (score >= 75) return 'var(--good)';
  if (score >= 50) return 'var(--warn)';
  return 'var(--danger)';
}

export const evColor = (e: string) => `var(--ev-${e})`;

export function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}
