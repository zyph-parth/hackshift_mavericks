import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { cn, EASE } from '@/lib/utils';
import { LinkButton, Logo, ThemeToggle } from './ui';

const LINKS = [
  ['How it works', '/how-it-works'],
  ['Pricing', '/pricing'],
  ['Resources', '/resources'],
  ['About', '/about'],
  ['FAQ', '/faq'],
] as const;

export function MarketingNav() {
  const user = useApp((s) => s.user);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <header className="glass fixed inset-x-0 top-0 z-40 border-b border-border/70">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4 md:px-6">
        <Link to="/"><Logo /></Link>
        <nav className="ml-8 hidden gap-6 text-[13.5px] md:flex" aria-label="Site">
          {LINKS.map(([l, h]) => (
            <NavLink key={h} to={h} className={({ isActive }) => cn('transition hover:text-text', isActive ? 'text-text' : 'text-muted')}>{l}</NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <LinkButton to="/dashboard" variant="primary" size="sm">Open app <ArrowRight size={14} /></LinkButton>
          ) : (
            <>
              <LinkButton to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</LinkButton>
              <LinkButton to="/signup" variant="primary" size="sm">Get started</LinkButton>
            </>
          )}
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden border-t border-border md:hidden">
            <div className="flex flex-col p-3">{LINKS.map(([l, h]) => <Link key={h} to={h} className="rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-text">{l}</Link>)}</div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function MarketingFooter() {
  const cols: [string, [string, string][]][] = [
    ['Product', [['How it works', '/how-it-works'], ['Pricing', '/pricing'], ['FAQ', '/faq']]],
    ['Company', [['About', '/about'], ['Resources', '/resources'], ['Contact', '/about#contact']]],
    ['Legal', [['Privacy', '/privacy'], ['Terms', '/terms']]],
  ];
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">Hire by proof, not resumes. Built by Team Mavericks for the IIIT Delhi HackShift hackathon.</p>
        </div>
        {cols.map(([t, ls]) => (
          <div key={t}>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-faint">{t}</p>
            <ul className="space-y-2 text-sm">{ls.map(([l, h]) => <li key={l}><Link to={h} className="text-muted transition hover:text-text">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border"><p className="mx-auto max-w-[1200px] px-4 py-5 text-xs text-faint md:px-6">© 2026 LaunchLoop. All rights reserved.</p></div>
    </footer>
  );
}

export function MarketingLayout() {
  const { pathname } = useLocation();
  return (
    <div className="noise relative min-h-dvh">
      <MarketingNav />
      <main className="relative z-10 pt-14">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--glow)' }} />
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-24">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-medium uppercase tracking-[0.1em] text-accent">{eyebrow}</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.6, ease: EASE }} className="tight mt-3 max-w-3xl text-4xl font-semibold leading-[1.05] md:text-6xl">{title}</motion.h1>
        {sub && <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.6, ease: EASE }} className="mt-5 max-w-2xl text-base text-muted md:text-lg">{sub}</motion.p>}
        {children}
      </div>
    </section>
  );
}
