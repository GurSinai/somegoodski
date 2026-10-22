import { X } from 'lucide-react';
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../lib/util';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
  accent: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-glow hover:brightness-110',
  secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100/80',
  danger: 'text-rose-600 hover:bg-rose-50',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-7 py-3.5 text-base',
        VARIANTS[variant],
        className,
      )}
    />
  );
}

export function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  ...props
}: { value: number; onChange: (n: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      type="number"
      className="input"
      value={Number.isFinite(value) && value !== 0 ? value : ''}
      placeholder="0"
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      {...props}
    />
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
      <span className={cx('relative h-6 w-10 rounded-full transition', checked ? 'bg-sky-500' : 'bg-slate-200')}>
        <span className={cx('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-5' : 'left-1')} />
      </span>
      {label}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-full border border-slate-100 bg-slate-100/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-full font-semibold transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end p-2 sm:p-3">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-up relative flex h-full w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-lift">
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

const BADGES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-600',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100',
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100',
};

export function Badge({ children, color = 'slate', className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', BADGES[color], className)}>
      {children}
    </span>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 p-4 text-sky-600">{icon}</div>
      <div className="text-lg font-bold">{title}</div>
      {children && <div className="max-w-md text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, color, size = 28, ring }: { name: string; color: string; size?: number; ring?: boolean }) {
  const initials = name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white', ring && 'ring-2 ring-white')}
      style={{ background: color, width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials}
    </span>
  );
}

export function Stat({ icon, label, value, sub }: { icon?: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {icon && <span className="text-sky-500">{icon}</span>} {label}
      </div>
      <div className="mt-1.5 text-2xl font-extrabold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

/** Soft mountain silhouette used in hero headers. */
export function Mountains({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M0 200 L140 90 L230 140 L380 40 L520 130 L640 70 L780 150 L900 60 L1040 120 L1200 80 L1200 200 Z" fill="currentColor" opacity="0.35" />
      <path d="M0 200 L90 150 L210 175 L330 110 L470 170 L600 120 L760 180 L880 130 L1010 170 L1200 140 L1200 200 Z" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
