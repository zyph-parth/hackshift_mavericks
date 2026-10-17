import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { AnimatePresence, LayoutGroup, motion, type HTMLMotionProps } from 'motion/react';
import { Link, type LinkProps } from 'react-router-dom';
import { Check, Info, Moon, Sun, X } from 'lucide-react';
import { cn, EASE, initials } from '@/lib/utils';
import { toggleThemeAnimated, useApp } from '@/lib/store';

/* ------------------------------- Logo ---------------------------------- */
export function Logo({ size = 28, text = true }: { size?: number; text?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="5" fill="var(--accent)" />
        <path d="M9 9v14h14" fill="none" stroke="var(--accent-fg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="21" cy="11" r="2.6" fill="var(--accent-fg)" />
      </svg>
      {text && <span className="serif text-[19px] leading-none">LaunchLoop</span>}
    </span>
  );
}

/* ------------------------------- Button -------------------------------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-[1.06] shadow-[inset_0_-1px_0_rgb(0_0_0/.2)]',
  secondary: 'bg-surface text-text hover:bg-surface-2 border border-border-strong shadow-[0_1px_0_rgb(0_0_0/.04)]',
  outline: 'border border-border-strong text-text hover:bg-surface-2',
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[5px]',
  md: 'h-9 px-4 text-sm gap-2 rounded-[5px]',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-md',
};

type BtnProps = { variant?: Variant; size?: Size; loading?: boolean } & HTMLMotionProps<'button'>;
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'secondary', size = 'md', loading, className, children, disabled, ...p },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.12 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background,filter,color,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...p}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children as ReactNode}
    </motion.button>
  );
});

export function LinkButton({
  variant = 'secondary',
  size = 'md',
  className,
  ...p
}: { variant?: Variant; size?: Size } & LinkProps) {
  return (
    <Link
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background,filter,color,border-color] duration-150 active:scale-[.985]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...p}
    />
  );
}

/* ------------------------------- Inputs -------------------------------- */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...p },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-input border border-border bg-surface-2 px-3 text-sm text-text outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15',
        className,
      )}
      {...p}
    />
  );
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...p }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full resize-none rounded-input border border-border bg-surface-2 p-3 text-sm text-text outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15',
          className,
        )}
        {...p}
      />
    );
  },
);
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-text">
        {label}
      </label>
      <div id={id}>{children}</div>
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </div>
  );
}

/* ------------------------------ Surfaces ------------------------------- */
export function Card({ className, hover, ...p }: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return <div className={cn('card', hover && 'card-hover', className)} {...p} />;
}

/** Card with a cursor-following accent spotlight. */
export function SpotCard({ className, children, ...p }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={cn('card card-hover spotlight', className)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      {...p}
    >
      {children as ReactNode}
    </motion.div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'danger';
  className?: string;
}) {
  const t = {
    neutral: 'bg-surface-2 text-muted border-border',
    accent: 'bg-accent-soft text-accent border-accent/30',
    good: 'bg-good/10 text-good border-good/30',
    warn: 'bg-warn/10 text-warn border-warn/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-px text-[11px] font-medium', t, className)}>
      {children}
    </span>
  );
}

export function Avatar({ name, hue, size = 36, className }: { name: string; hue: number; size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `oklch(0.56 0.075 ${hue})`,
        letterSpacing: '0.02em',
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border-strong px-6 py-14 text-center">
      <p className="mb-3 text-[11px] uppercase text-faint">Nothing here yet</p>
      <h3 className="serif text-xl">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-card border border-danger/30 bg-danger/5 p-6 text-center">
      <p className="text-sm font-medium">That didn&apos;t load.</p>
      <p className="mt-1 text-sm text-muted">Something on our side hiccuped. Your data is safe.</p>
      <Button className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/* ------------------------------ Segmented ------------------------------ */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  id: string;
  className?: string;
}) {
  return (
    <LayoutGroup id={id}>
      <div role="tablist" className={cn('relative inline-flex rounded-md border border-border bg-surface-2 p-0.5', className)}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'relative z-10 rounded-[4px] px-3 py-1 text-[13px] font-medium transition-colors',
                active ? 'text-text' : 'text-muted hover:text-text',
              )}
            >
              {active && (
                <motion.span
                  layoutId="seg"
                  className="absolute inset-0 -z-10 rounded-[4px] border border-border-strong bg-surface"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

/* Underline tabs */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  id,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  id: string;
}) {
  return (
    <LayoutGroup id={id}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'text-text' : 'text-muted hover:text-text',
              )}
            >
              {o.label}
              {active && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-3 -bottom-px h-[2px] bg-text"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

/* ---------------------------- Overlays: Sheet -------------------------- */
function useLockAndEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

export function Sheet({
  open,
  onClose,
  children,
  title,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  width?: number;
}) {
  useLockAndEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-border bg-surface shadow-2xl"
            style={{ maxWidth: width }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.38, ease: EASE }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="tight text-[15px] font-semibold">{title}</h2>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="!px-2">
                <X size={16} />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Modal({
  open,
  onClose,
  children,
  title,
  width = 440,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  width?: number;
}) {
  useLockAndEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="card relative w-full overflow-hidden shadow-2xl"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------- Toaster ------------------------------ */
export function Toaster() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 md:bottom-4">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="card glass pointer-events-auto flex items-start gap-3 p-3.5 shadow-xl"
            role="status"
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                t.tone === 'good' ? 'bg-good/20 text-good' : t.tone === 'warn' ? 'bg-warn/20 text-warn' : 'bg-accent-soft text-accent',
              )}
            >
              {t.tone === 'good' ? <Check size={12} strokeWidth={3} /> : <Info size={12} strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[13px] text-muted">{t.body}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-faint hover:text-text" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Tooltip -------------------------------- */
export function Tip({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="card glass pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-[240px] -translate-x-1/2 px-2.5 py-1.5 text-xs text-text shadow-lg"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------ Theme toggle --------------------------- */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useApp((s) => s.theme);
  return (
    <button
      onClick={(e) => toggleThemeAnimated(e)}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn('relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text', className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.22 }}
        >
          {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/* ------------------------------ Reveal --------------------------------- */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 16,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function PageHeader({
  title,
  sub,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        {eyebrow && <p className="mb-3 flex items-center gap-2 text-[11px] uppercase text-faint"><span className="h-[7px] w-[7px] bg-accent" aria-hidden />{eyebrow}</p>}
        <h1 className="text-[32px] md:text-[40px]">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-[15px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="num inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-2 px-1 text-[11px] text-muted">
      {children}
    </kbd>
  );
}

/* ------------------------------- ChipInput ------------------------------ */
export function ChipInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
  max = 20,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
}) {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase()) || value.length >= max) return setText('');
    onChange([...value, v]);
    setText('');
  };
  const rest = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <div>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-input border border-border bg-surface-2 p-1.5 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
        <AnimatePresence initial={false}>
          {value.map((v) => (
            <motion.span key={v} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="inline-flex items-center gap-1 rounded-[4px] border border-border-strong bg-surface px-2 py-0.5 text-xs font-medium">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="text-faint hover:text-text"><X size={12} /></button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); }
            if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(text)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-faint"
        />
      </div>
      {rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rest.map((s) => <button key={s} type="button" onClick={() => add(s)} className="rounded-[4px] border border-dashed border-border-strong px-2 py-0.5 text-xs text-muted transition hover:border-accent hover:text-accent">+ {s}</button>)}
        </div>
      )}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-accent' : 'bg-surface-3')}>
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow" style={{ left: on ? 18 : 2 }} />
    </button>
  );
}
