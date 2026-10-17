import { create } from 'zustand';
import type { Role } from '@launchloop/shared';
import { api, patchApi, post, setToken, tryRefresh, ApiError, type Me } from './api';

export type Theme = 'dark' | 'light';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: 'default' | 'good' | 'warn';
}

const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
};

interface AppState {
  theme: Theme;
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  toasts: Toast[];
  user: Me | null;
  /** true until the first session check finishes */
  booting: boolean;

  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  setPalette: (o: boolean) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;

  boot: () => Promise<void>;
  setUser: (u: Me | null) => void;
  login: (email: string, password: string) => Promise<Me>;
  signup: (input: { name: string; email: string; password: string; roles: Role[] }) => Promise<Me>;
  logout: () => Promise<void>;
  switchRole: (r: Role) => Promise<void>;
  updateMe: (changes: Record<string, unknown>) => Promise<Me>;
}

let tid = 1;

export const useApp = create<AppState>((set, get) => ({
  theme: (document.documentElement.getAttribute('data-theme') as Theme) || 'dark',
  sidebarCollapsed: read('ll-sidebar', false),
  paletteOpen: false,
  toasts: [],
  user: null,
  booting: true,

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('ll-theme', theme);
    } catch {
      /* noop */
    }
    set({ theme });
  },
  toggleSidebar: () => {
    const v = !get().sidebarCollapsed;
    write('ll-sidebar', v);
    set({ sidebarCollapsed: v });
  },
  setPalette: (paletteOpen) => set({ paletteOpen }),
  toast: (t) => {
    const id = tid++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  boot: async () => {
    try {
      const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (r.ok) {
        const d = (await r.json()) as { token: string; user: Me };
        setToken(d.token);
        set({ user: d.user });
      }
    } catch {
      /* offline: stay signed out */
    } finally {
      set({ booting: false });
    }
  },
  setUser: (user) => set({ user }),
  login: async (email, password) => {
    const d = await post<{ token: string; user: Me }>('/auth/login', { email, password });
    setToken(d.token);
    set({ user: d.user });
    return d.user;
  },
  signup: async (input) => {
    const d = await post<{ token: string; user: Me }>('/auth/signup', input);
    setToken(d.token);
    set({ user: d.user });
    return d.user;
  },
  logout: async () => {
    await post('/auth/logout').catch(() => undefined);
    setToken(null);
    set({ user: null });
  },
  switchRole: async (role) => {
    const d = await patchApi<{ user: Me }>('/me', { activeRole: role });
    set({ user: d.user });
  },
  updateMe: async (changes) => {
    const d = await patchApi<{ user: Me }>('/me', changes);
    set({ user: d.user });
    return d.user;
  },
}));

export const useRole = (): Role => useApp((s) => s.user?.activeRole ?? 'talent');

/** Theme toggle with a circular reveal from the click point (View Transitions API). */
export function toggleThemeAnimated(e?: { clientX: number; clientY: number }) {
  const { theme, setTheme } = useApp.getState();
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduce) {
    setTheme(next);
    return;
  }
  const x = e?.clientX ?? window.innerWidth - 40;
  const y = e?.clientY ?? 30;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const t = doc.startViewTransition(() => setTheme(next));
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
}

export { api, ApiError, tryRefresh };
