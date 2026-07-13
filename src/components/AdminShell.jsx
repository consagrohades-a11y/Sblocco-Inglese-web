import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../auth/AuthContext.jsx';

const navigationGroups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Studenti',
    items: [
      { label: 'Tutti gli studenti', to: '/admin/learners', icon: Users },
    ],
  },
  {
    label: 'Contenuti',
    items: [
      { label: 'Panoramica', to: '/admin/content', icon: BookOpen, end: true },
      { label: 'Word Trainer', to: '/admin/content/words', icon: BookOpen },
      { label: 'General Expressions', to: '/admin/content/expressions', icon: BookOpen },
    ],
  },
  {
    label: 'Assegnazioni',
    items: [
      { label: 'Panoramica', to: '/admin/assignments', icon: ClipboardList },
    ],
  },
  {
    label: 'Analisi',
    items: [
      { label: 'Attività e risultati', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Impostazioni',
    items: [
      { label: 'Tema e account', to: '/admin/settings', icon: Settings },
    ],
  },
];

function AdminNavigation({ onNavigate }) {
  return (
    <nav className="mt-7 flex-1 overflow-y-auto px-3 pb-5" aria-label="Navigazione amministrazione">
      <div className="space-y-6">
        {navigationGroups.map((group) => (
          <section key={group.label}>
            <p className="px-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/45">
              {group.label}
            </p>
            <div className="mt-2 grid gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) => `focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black transition ${
                      isActive
                        ? 'bg-white text-ink shadow-sm'
                        : 'text-white/72 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}

export default function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { profile, user } = useAuth();
  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Admin';
  const email = user?.email || '';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const sidebarContent = (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <BrandLogo to="/admin" compact light />
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.15em] text-emerald-200/75">Admin workspace</p>
      </div>
      <AdminNavigation onNavigate={() => setMobileOpen(false)} />
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{displayName}</p>
            {email ? <p className="mt-0.5 truncate text-xs font-semibold text-white/50">{email}</p> : null}
          </div>
          <ThemeToggle />
        </div>
        <Link to="/account" className="focus-ring mt-3 flex min-h-10 items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-xs font-black text-white/75 transition hover:bg-white/10 hover:text-white">
          Account personale
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-[#0f1715] dark:text-white">
      <aside aria-label="Workspace amministrazione" className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col overflow-hidden bg-ink shadow-2xl lg:flex">
        {sidebarContent}
      </aside>

      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-ink/10 bg-paper/95 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1715]/95 lg:hidden">
        <BrandLogo to="/admin" compact />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-white text-ink shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
          aria-label="Apri navigazione admin"
          aria-expanded={mobileOpen}
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Chiudi navigazione admin"
          />
          <aside aria-label="Workspace amministrazione mobile" className="absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-3rem))] flex-col overflow-hidden bg-ink shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="focus-ring absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
              aria-label="Chiudi menu"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-72">
        <Outlet />
      </div>
    </div>
  );
}
