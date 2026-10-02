import { useEffect, useId, useRef, useState } from 'react';

export const cx = (...c) => c.filter(Boolean).join(' ');

export function Spinner({ className = 'h-4 w-4' }) {
  return <span className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)} role="progressbar" aria-label="Loading" />;
}
export const Skeleton = ({ className = 'h-4 w-full' }) => <div className={cx('animate-pulse rounded bg-slate-200', className)} aria-hidden="true" />;

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600" role="status">
      <Spinner className="h-5 w-5 text-nitd-600" /> {label}
    </div>
  );
}

const btn = {
  primary: 'bg-nitd-600 text-white hover:bg-nitd-700 disabled:bg-nitd-300',
  secondary: 'border border-slate-300 bg-white text-ink hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-nitd-700 hover:bg-nitd-50 disabled:text-slate-400',
  danger: 'border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:text-red-300',
};
export function Button({ variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm', btn[variant], className)}
      {...rest}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export const Card = ({ className, children, ...r }) => <section className={cx('rounded-lg border border-slate-200 bg-white shadow-sm', className)} {...r}>{children}</section>;
export const CardHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
    <div><h2 className="text-base font-semibold text-ink">{title}</h2>{subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}</div>
    {action}
  </div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}</div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const alertTone = {
  info: 'border-nitd-200 bg-nitd-50 text-nitd-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-900',
};
export const Alert = ({ tone = 'info', title, children, className }) => (
  <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-md border px-4 py-3 text-sm', alertTone[tone], className)}>
    {title && <p className="font-medium">{title}</p>}
    {children}
  </div>
);

const badgeTone = { neutral: 'bg-slate-100 text-slate-700', blue: 'bg-nitd-50 text-nitd-800 ring-1 ring-nitd-200', muted: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200' };
export const Badge = ({ tone = 'neutral', children }) => <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeTone[tone])}>{children}</span>;

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cx('block text-sm', className)}>
      <span className="mb-1 block font-medium text-slate-800">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}
const inputCls = 'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-ink placeholder:text-slate-400 focus:border-nitd-600 focus:outline-none focus:ring-1 focus:ring-nitd-600 disabled:bg-slate-100';
export const Input = ({ className, ...r }) => <input className={cx(inputCls, className)} {...r} />;
export const Select = ({ className, children, ...r }) => <select className={cx(inputCls, className)} {...r}>{children}</select>;
export const Textarea = ({ className, ...r }) => <textarea className={cx(inputCls, 'font-mono', className)} {...r} />;

/** Accessible toggle chip (real checkbox, visually styled). */
export function Chip({ checked, onChange, disabled, children }) {
  return (
    <label className={cx('relative inline-flex cursor-pointer select-none', disabled && 'cursor-not-allowed opacity-60')}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors peer-checked:border-nitd-600 peer-checked:bg-nitd-600 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-nitd-600">
        {children}
      </span>
    </label>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement;
    ref.current?.querySelector('input,select,textarea,button')?.focus();
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={cx('max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-xl sm:rounded-xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="border-b border-slate-200 px-5 py-4"><h2 id={id} className="text-lg font-semibold">{title}</h2></div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, children, confirmLabel = 'Confirm', danger, loading, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
    </>}>
      <div className="text-sm text-slate-700">{children}</div>
    </Modal>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-base font-medium text-ink">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-slate-600">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1, to = Math.min(page * limit, total);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600" aria-label="Pagination">
      <span>{from}–{to} of {total.toLocaleString('en-IN')}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span aria-current="page">Page {page} / {pages}</span>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </nav>
  );
}

/** Dropdown menu button. items: [{ label, onClick }]. The menu is position:fixed so scroll containers never clip it and it stays on-screen on phones. */
export function MenuButton({ label, items, variant = 'primary', disabled, loading, size = 'md' }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const open = !!pos;
  const toggle = () => {
    if (open) { setPos(null); return; }
    const r = ref.current.getBoundingClientRect();
    const width = Math.min(240, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 4, left, width });
  };
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setPos(null);
    const onDoc = (e) => !ref.current?.contains(e.target) && close();
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true); window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <Button variant={variant} size={size} disabled={disabled} loading={loading} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        {label} <span aria-hidden="true">▾</span>
      </Button>
      {open && (
        <ul role="menu" style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }} className="z-[55] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((it) => (
            <li key={it.label} role="none">
              <button type="button" role="menuitem" className="block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-nitd-50" onClick={() => { setPos(null); it.onClick(); }}>{it.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const TableWrap = ({ children }) => <div className="overflow-x-auto"><table className="min-w-full text-left text-sm">{children}</table></div>;
export const Th = ({ children, className }) => <th scope="col" className={cx('whitespace-nowrap bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600', className)}>{children}</th>;
export const Td = ({ children, className }) => <td className={cx('whitespace-nowrap border-t border-slate-100 px-4 py-2.5 text-slate-800', className)}>{children}</td>;

export function SortTh({ field, sort, order, onSort, children }) {
  const active = sort === field;
  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'} className="bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
      <button type="button" className="inline-flex items-center gap-1 hover:text-nitd-700" onClick={() => onSort(field)}>
        {children}<span aria-hidden="true" className="text-nitd-600">{active ? (order === 'asc' ? '↑' : '↓') : ''}</span>
      </button>
    </th>
  );
}
