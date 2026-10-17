import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Command } from 'cmdk';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck, Bell, Briefcase, ClipboardList, Compass, FlaskConical, Inbox, LayoutDashboard, ListChecks, LogOut, Mic, Moon,
  Search, Settings, Sun, UserRound, UserSearch, Users, Video, Wand2, type LucideIcon,
} from 'lucide-react';
import type { Role } from '@launchloop/shared';
import { useApp, toggleThemeAnimated } from '@/lib/store';
import { api, type PublicUser } from '@/lib/api';
import { useNotices, useThreads } from '@/lib/queries';
import { useHotkey, useMedia } from '@/lib/hooks';
import { cn, EASE } from '@/lib/utils';
import { Avatar, Badge, Kbd, Logo, Segmented, ThemeToggle, Toaster } from './ui';

interface NavItem { to: string; label: string; icon: LucideIcon; badge?: 'inbox' }
export const NAV: Record<Role, NavItem[]> = {
  talent: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/jobs', label: 'Jobs & matches', icon: Briefcase },
    { to: '/applications', label: 'Applications', icon: ClipboardList },
    { to: '/interview/new', label: 'AI interview', icon: Mic },
    { to: '/tasks', label: 'Proof tasks', icon: ListChecks },
    { to: '/mentors', label: 'Mentors', icon: Compass },
    { to: '/inbox', label: 'Inbox', icon: Inbox, badge: 'inbox' },
    { to: '/profile', label: 'Profile', icon: UserRound },
  ],
  founder: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/studio', label: 'Founder Studio', icon: FlaskConical },
    { to: '/studio/cofounders', label: 'Co-founders', icon: Users },
    { to: '/recruiter', label: 'Hiring', icon: Briefcase },
    { to: '/tasks', label: 'Proof tasks', icon: ListChecks },
    { to: '/mentors', label: 'Mentors', icon: Compass },
    { to: '/inbox', label: 'Inbox', icon: Inbox, badge: 'inbox' },
  ],
  recruiter: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/recruiter', label: 'Hiring console', icon: Briefcase },
    { to: '/tasks', label: 'Proof tasks', icon: ListChecks },
    { to: '/talent', label: 'Find talent', icon: UserSearch },
    { to: '/inbox', label: 'Inbox', icon: Inbox, badge: 'inbox' },
  ],
  mentor: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sessions', label: 'Sessions', icon: Video },
    { to: '/mentors', label: 'Directory', icon: Compass },
    { to: '/inbox', label: 'Inbox', icon: Inbox, badge: 'inbox' },
  ],
};
const ROLE_LABEL: Record<Role, string> = { talent: 'Talent', founder: 'Founder', recruiter: 'Recruiter', mentor: 'Mentor' };

function useUnread() {
  return useThreads().data?.unread ?? 0;
}

/* ------------------------------- Sidebar -------------------------------- */
function Sidebar() {
  const role = useApp((s) => s.user!.activeRole);
  const collapsed = useApp((s) => s.sidebarCollapsed);
  const toggle = useApp((s) => s.toggleSidebar);
  const unread = useUnread();
  const items = NAV[role];
  return (
    <motion.aside animate={{ width: collapsed ? 64 : 240 }} transition={{ duration: 0.32, ease: EASE }} className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-bg/60 py-4 md:flex">
      <Link to="/" className="mb-6 flex h-9 items-center px-[18px]" aria-label="LaunchLoop home"><Logo text={!collapsed} /></Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5" aria-label="Primary">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((it) => (
            <motion.div key={role + it.to} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>
              <NavLink to={it.to} end={['/studio', '/dashboard', '/jobs'].includes(it.to)} title={collapsed ? it.label : undefined}
                className={({ isActive }) => cn('group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors', isActive ? 'text-text' : 'text-muted hover:bg-surface-2 hover:text-text')}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg border border-border bg-surface-2" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    {isActive && <span className="absolute -left-2.5 h-4 w-0.5 rounded bg-accent" />}
                    <it.icon size={16} strokeWidth={1.5} className={cn('relative shrink-0', isActive && 'text-accent')} />
                    {!collapsed && <span className="relative flex-1 truncate">{it.label}</span>}
                    {it.badge === 'inbox' && unread > 0 && <span className="num relative flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg">{unread}</span>}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </AnimatePresence>
      </nav>
      <button onClick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="mx-2.5 flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] text-faint transition hover:bg-surface-2 hover:text-text">
        <motion.span animate={{ rotate: collapsed ? 180 : 0 }} className="inline-flex shrink-0"><Search size={0} /><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5M18 17l-5-5 5-5" /></svg></motion.span>
        {!collapsed && 'Collapse'}
      </button>
    </motion.aside>
  );
}

/* ------------------------------ RoleSwitcher ----------------------------- */
export function RoleSwitcher() {
  const user = useApp((s) => s.user)!;
  const switchRole = useApp((s) => s.switchRole);
  const nav = useNavigate();
  const qc = useQueryClient();
  if (user.roles.length < 2) {
    return <Link to="/settings" className="hidden rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-muted transition hover:text-text lg:inline-block" title="Add another role in Settings">{ROLE_LABEL[user.activeRole]}</Link>;
  }
  return (
    <Segmented id="roles" value={user.activeRole}
      onChange={async (r) => { await switchRole(r); qc.invalidateQueries(); nav('/dashboard'); }}
      options={user.roles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
  );
}

/* ------------------------------ Notifications ---------------------------- */
function Bells() {
  const { data } = useNotices();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = data?.unread ?? 0;
  const close = async () => {
    setOpen(false);
    if (unread) { await api('/notices/read', { method: 'POST', body: {} }); qc.invalidateQueries({ queryKey: ['notices'] }); }
  };
  return (
    <div className="relative">
      <button onClick={() => (open ? close() : setOpen(true))} aria-label={`Notifications, ${unread} unread`} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text">
        <Bell size={17} />
        <AnimatePresence>{unread > 0 && <motion.span key={unread} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="num absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg">{unread}</motion.span>}</AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={close} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: EASE }} className="card glass absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-[min(360px,calc(100vw-2rem))] origin-top-right overflow-y-auto p-1.5 shadow-2xl">
              <p className="px-3 py-2 text-xs font-medium text-muted">Notifications</p>
              {!data?.notices.length && <p className="px-3 py-8 text-center text-sm text-muted">You&apos;re all caught up.</p>}
              {data?.notices.map((n) => (
                <button key={n.id} onClick={() => { close(); if (n.link) nav(n.link); }} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-2">
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', !n.read ? 'bg-accent' : 'bg-transparent')} />
                  <p className="flex-1 text-[13px]">{n.text}</p>
                  <span className="num text-[11px] text-faint">{ago(n.created)}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
export function ago(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

/* ------------------------------- Account menu ---------------------------- */
function AccountMenu() {
  const user = useApp((s) => s.user)!;
  const logout = useApp((s) => s.logout);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  const go = (to: string) => { setOpen(false); nav(to); };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open} className="rounded-full"><Avatar name={user.name} hue={user.hue} size={32} /></button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: EASE }} className="card glass absolute right-0 top-full z-40 mt-2 w-60 origin-top-right p-1.5 shadow-2xl">
            <div className="px-3 py-2.5"><p className="flex items-center gap-2 text-sm font-medium"><span className="truncate">{user.name}</span>{user.plan === 'pro' && <Badge tone="accent">Pro</Badge>}</p><p className="truncate text-xs text-muted">{user.email}</p></div>
            <div className="my-1 h-px bg-border" />
            {user.roles.includes('talent') && <MenuItem icon={UserRound} onClick={() => go('/profile')}>Your profile</MenuItem>}
            <MenuItem icon={Settings} onClick={() => go('/settings')}>Settings</MenuItem>
            <MenuItem icon={LogOut} onClick={async () => { setOpen(false); await logout(); qc.clear(); nav('/'); }}>Sign out</MenuItem>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function MenuItem({ icon: I, children, onClick }: { icon: LucideIcon; children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] text-muted transition hover:bg-surface-2 hover:text-text"><I size={15} />{children}</button>;
}

/* -------------------------------- Topbar -------------------------------- */
const CRUMB: Record<string, string> = {
  dashboard: 'Dashboard', jobs: 'Jobs & matches', tasks: 'Proof tasks', studio: 'Founder Studio', mentors: 'Mentors', recruiter: 'Hiring', profile: 'Profile',
  interview: 'AI interview', cofounders: 'Co-founders', review: 'Review', report: 'Report', u: 'Profile', inbox: 'Inbox', applications: 'Applications', settings: 'Settings',
  talent: 'Find talent', sessions: 'Sessions', new: 'New',
};
function Topbar() {
  const setPalette = useApp((s) => s.setPalette);
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const mac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border px-4 md:px-6">
      <Link to="/" className="md:hidden" aria-label="Home"><Logo text={false} size={26} /></Link>
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] text-muted lg:flex">
        <span>LaunchLoop</span>
        {parts.slice(0, 2).map((p, i) => (
          <span key={i} className="flex items-center gap-1.5"><span className="text-faint">/</span><span className={cn(i === Math.min(parts.length, 2) - 1 && 'text-text')}>{CRUMB[p] ?? (p.length > 12 ? '…' : p)}</span></span>
        ))}
      </nav>
      <button onClick={() => setPalette(true)} className="ml-auto flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 text-[13px] text-faint transition hover:border-border-strong hover:text-muted md:ml-4 md:w-64 md:flex-none" aria-label="Open command palette">
        <Search size={14} /><span className="hidden flex-1 text-left md:inline">Search or jump to…</span>
        <span className="hidden items-center gap-1 md:flex"><Kbd>{mac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd></span>
      </button>
      <div className="hidden md:block lg:ml-auto"><RoleSwitcher /></div>
      <ThemeToggle />
      <Bells />
      <AccountMenu />
    </header>
  );
}

/* ---------------------------- Mobile tab bar ---------------------------- */
function TabBar() {
  const role = useApp((s) => s.user!.activeRole);
  const unread = useUnread();
  const items = NAV[role].filter((i) => !['/profile'].includes(i.to) || role === 'talent').slice(0, 5);
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Primary mobile">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={['/studio', '/dashboard', '/jobs'].includes(it.to)} className={({ isActive }) => cn('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive ? 'text-accent' : 'text-faint')}>
          <span className="relative"><it.icon size={18} strokeWidth={1.6} />{it.badge === 'inbox' && unread > 0 && <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-accent" />}</span>
          <span className="max-w-full truncate px-1">{it.label.split(' ')[0]}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/* ------------------------------ Command palette ------------------------- */
export function CommandPalette() {
  const open = useApp((s) => s.paletteOpen);
  const setOpen = useApp((s) => s.setPalette);
  const switchRole = useApp((s) => s.switchRole);
  const user = useApp((s) => s.user)!;
  const nav = useNavigate();
  const theme = useApp((s) => s.theme);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useHotkey('mod+k', (e) => { e.preventDefault(); setOpen(!useApp.getState().paletteOpen); });
  useEffect(() => { if (!open) setQ(''); }, [open]);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 220); return () => clearTimeout(t); }, [q]);
  const go = (to: string) => { setOpen(false); nav(to); };
  const canSearch = user.activeRole === 'recruiter' || user.activeRole === 'founder';
  const { data: hits } = useQuery({ queryKey: ['palette-talent', debounced], enabled: open && canSearch && debounced.length > 1, queryFn: () => api<{ talent: PublicUser[] }>(`/talent?q=${encodeURIComponent(debounced)}`).then((d) => d.talent.slice(0, 4)) });
  const pages = useMemo(() => NAV[user.activeRole].map((n) => [n.label, n.to, n.icon] as const), [user.activeRole]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[14vh]">
          <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.22, ease: EASE }} className="card glass relative w-full max-w-xl overflow-hidden shadow-2xl">
            <Command label="Command palette" shouldFilter>
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search size={16} className="text-faint" />
                <Command.Input value={q} onValueChange={setQ} autoFocus placeholder={canSearch ? 'Jump anywhere, or search talent (e.g. “react verified”)…' : 'Jump to a page or action…'} className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-faint" />
                <Kbd>esc</Kbd>
              </div>
              <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
                <Command.Empty className="px-4 py-8 text-center text-sm text-muted">Nothing found.</Command.Empty>
                {hits && hits.length > 0 && (
                  <Command.Group heading="Talent (verified search)">
                    {hits.map((t) => (
                      <Item key={t.id} value={`talent ${t.name} ${q}`} onSelect={() => go(`/u/${t.username}`)}>
                        <Avatar name={t.name} hue={t.hue} size={22} /><span className="flex-1">{t.name}</span><span className="num text-xs text-faint">{t.verifiedScore} verified</span>
                      </Item>
                    ))}
                  </Command.Group>
                )}
                <Command.Group heading="Go to">
                  {pages.map(([label, to, I]) => <Item key={to} value={label} onSelect={() => go(to)}><I size={15} className="text-muted" />{label}</Item>)}
                  <Item value="settings account" onSelect={() => go('/settings')}><Settings size={15} className="text-muted" />Settings</Item>
                  <Item value="home landing" onSelect={() => go('/')}><Compass size={15} className="text-muted" />Landing page</Item>
                </Command.Group>
                {user.roles.length > 1 && (
                  <Command.Group heading="Switch role">
                    {user.roles.filter((r) => r !== user.activeRole).map((r) => <Item key={r} value={`switch role ${r}`} onSelect={async () => { await switchRole(r); setOpen(false); nav('/dashboard'); }}><Wand2 size={15} className="text-muted" />Act as {ROLE_LABEL[r]}</Item>)}
                  </Command.Group>
                )}
                <Command.Group heading="Preferences">
                  <Item value="toggle theme dark light" onSelect={() => { setOpen(false); setTimeout(() => toggleThemeAnimated(), 120); }}>
                    {theme === 'dark' ? <Sun size={15} className="text-muted" /> : <Moon size={15} className="text-muted" />}Switch to {theme === 'dark' ? 'light' : 'dark'} mode
                  </Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
function Item({ children, onSelect, value }: { children: ReactNode; onSelect: () => void; value: string }) {
  return <Command.Item value={value} onSelect={onSelect} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm">{children}</Command.Item>;
}

/* --------------------------------- Layout -------------------------------- */
export function AppLayout() {
  const { pathname } = useLocation();
  const user = useApp((s) => s.user);
  const booting = useApp((s) => s.booting);
  const isMobile = useMedia('(max-width: 767px)');
  if (booting) return <div className="flex min-h-dvh items-center justify-center bg-bg"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  return (
    <div className="noise relative flex min-h-dvh">
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        {isMobile && user.roles.length > 1 && <div className="overflow-x-auto border-b border-border px-4 py-2"><RoleSwitcher /></div>}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 pb-28 md:px-8 md:py-9 md:pb-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.28, ease: EASE }}>
              <Suspense fallback={<div className="h-64" />}><Outlet /></Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <TabBar />
      <CommandPalette />
      <Toaster />
    </div>
  );
}

export { BadgeCheck };
