import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABELS } from '../../utils/format.js';
import { Button, cx } from '../ui/index.jsx';

const link = ({ isActive }) => cx('block rounded-md px-3 py-2 text-sm font-medium transition-colors',
  isActive ? 'bg-nitd-600 text-white' : 'text-slate-700 hover:bg-nitd-50 hover:text-nitd-800');

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-nitd-600 text-sm font-bold text-white" aria-hidden="true">NITD</div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-ink">NIT Delhi Club Mail</p>
        <p className="text-xs text-slate-500">Student Recipient Manager</p>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const isSuper = user.role === 'SUPER_ADMIN';
  const isAdmin = isSuper || user.role === 'CLUB_ADMIN';
  const close = () => setOpen(false);

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
      <NavLink to="/dashboard" className={link} onClick={close}>Dashboard</NavLink>
      <NavLink to="/recipients" className={link} onClick={close}>Recipient Builder</NavLink>
      <NavLink to="/saved-lists" className={link} onClick={close}>Saved Lists</NavLink>
      <NavLink to="/settings" className={link} onClick={close}>Settings</NavLink>
      {isAdmin && (
        <div className="pt-4">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{isSuper ? 'Administration' : 'Club'}</p>
          {isSuper && <>
            <NavLink to="/admin" end className={link} onClick={close}>Overview</NavLink>
            <NavLink to="/admin/batches" className={link} onClick={close}>Batches</NavLink>
            <NavLink to="/admin/branches" className={link} onClick={close}>Branches</NavLink>
            <NavLink to="/admin/roll-rules" className={link} onClick={close}>Roll Rules</NavLink>
          </>}
          <NavLink to="/admin/users" className={link} onClick={close}>{isSuper ? 'Users' : 'Members'}</NavLink>
          {isSuper && <NavLink to="/admin/audit-logs" className={link} onClick={close}>Audit Logs</NavLink>}
        </div>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex lg:h-screen lg:sticky lg:top-0">
        <div className="border-b border-slate-200 px-4 py-4"><Brand /></div>
        {nav}
      </aside>
      {/* Mobile/tablet drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4"><Brand />
              <button className="rounded p-1 text-slate-600" onClick={close} aria-label="Close menu">✕</button>
            </div>
            {nav}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-md border border-slate-300 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
              <span className="block h-0.5 w-5 bg-ink" /><span className="mt-1 block h-0.5 w-5 bg-ink" /><span className="mt-1 block h-0.5 w-5 bg-ink" />
            </button>
            <span className="text-sm font-semibold text-nitd-700 lg:hidden">NIT Delhi Club Mail</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-ink">{user.name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={logout}>Log out</Button>
          </div>
        </header>
        <main id="main" key={loc.pathname} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500">
          This tool only generates and manages recipient lists. Emails are sent separately from the official college/club account.
        </footer>
      </div>
    </div>
  );
}
