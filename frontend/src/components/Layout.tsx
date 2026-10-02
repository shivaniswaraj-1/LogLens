import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/logs', label: 'Logs' },
  { to: '/error-patterns', label: 'Error Patterns' },
  { to: '/incidents', label: 'Incidents' },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-sky-500/10 text-sky-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
  }`;
}

export function Layout() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <span className="font-mono text-lg font-semibold tracking-tight text-sky-400">LogLens</span>
            <nav className="hidden gap-1 md:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-4 text-sm text-slate-400 md:flex">
            <span>{user?.name}</span>
            <button onClick={logout} className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800">
              Log out
            </button>
          </div>
          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
              {isMenuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div id="mobile-nav" className="border-t border-slate-800 px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={navLinkClass}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-sm text-slate-400">
              <span className="truncate">{user?.name}</span>
              <button onClick={logout} className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800">
                Log out
              </button>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
