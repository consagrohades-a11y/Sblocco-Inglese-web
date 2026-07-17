import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Blocks,
  BookOpen,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileCheck2,
  Languages,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Plane,
  Settings,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../auth/AuthContext.jsx';

const navigationGroups = [
  {
    id: 'home',
    label: 'Home admin',
    description: 'Riepilogo generale',
    icon: LayoutDashboard,
    items: [
      { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
    ],
  },
  {
    id: 'learners',
    label: 'Studenti',
    description: 'Account e attività assegnate',
    icon: Users,
    items: [
      { label: 'Elenco studenti', to: '/admin/learners', icon: Users },
      { label: 'Gruppi e cohort', to: '/admin/groups', icon: Users },
      { label: 'Assegnazioni', to: '/admin/assignments', icon: ClipboardList },
    ],
  },
  {
    id: 'words',
    label: 'Parole',
    description: 'Word Trainer, batch e deck',
    icon: Languages,
    items: [
      { label: 'Libreria e modifica', to: '/admin/content/words', icon: BookOpen, end: true },
      { label: 'Importa e gestisci batch', to: '/admin/content/words/import', icon: FileCheck2 },
      { label: 'Deck di parole', to: '/admin/content/words/decks', icon: Blocks },
      { label: 'Archivio parole', to: '/admin/content/words/archive', icon: FileCheck2 },
    ],
  },
  {
    id: 'expressions',
    label: 'Espressioni',
    description: 'General, Business, Hospitality e Travel',
    icon: MessageSquareText,
    items: [
      { label: 'Espressioni generali', to: '/admin/content/expressions', icon: MessageSquareText },
      { label: 'Espressioni business', to: '/admin/content/business-expressions', icon: MessageSquareText },
      { label: 'Espressioni hospitality', to: '/admin/content/hospitality-expressions', icon: MessageSquareText },
      { label: 'Travel Trainer', to: '/admin/content/travel-expressions', icon: Plane },
    ],
  },
  {
    id: 'questions',
    label: 'Domande',
    description: 'Banca, modifica, pool e diagnosi',
    icon: CircleHelp,
    items: [
      { label: 'Banca domande', to: '/admin/content/exercises/questions', icon: BookOpen, end: true },
      { label: 'Modifica domande', to: '/admin/content/exercises/questions/edit', icon: FileCheck2 },
      { label: 'Gruppi di domande', to: '/admin/content/exercises/pools', icon: Blocks },
      { label: 'Regole diagnostiche', to: '/admin/content/exercises/diagnostics', icon: BarChart3, end: true },
      { label: 'Importa diagnostica', to: '/admin/content/exercises/diagnostics/import', icon: FileCheck2 },
    ],
  },
  {
    id: 'exercises',
    label: 'Esercizi',
    description: 'Creazione, pubblicazione e risultati',
    icon: Blocks,
    items: [
      { label: 'Panoramica esercizi', to: '/admin/content/exercises', icon: LayoutDashboard, end: true },
      { label: 'Importa e revisiona', to: '/admin/content/exercises/review', icon: FileCheck2 },
      { label: 'Componi esercizi', to: '/admin/content/exercises/composer', icon: ClipboardList },
      { label: 'Libreria esercizi', to: '/admin/content/exercises/library', icon: BookOpen },
      { label: 'Raccolte di esercizi', to: '/admin/content/exercises/collections', icon: Blocks },
      { label: 'Risultati studenti', to: '/admin/content/exercises/results', icon: BarChart3 },
      { label: 'Archivio e pulizia', to: '/admin/content/exercises/maintenance', icon: FileCheck2 },
    ],
  },
  {
    id: 'analysis',
    label: 'Analisi',
    description: 'Attività, progressi e risultati',
    icon: BarChart3,
    items: [
      { label: 'Attività e risultati', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'settings',
    label: 'Impostazioni',
    description: 'Tema e account admin',
    icon: Settings,
    items: [
      { label: 'Tema e account', to: '/admin/settings', icon: Settings },
    ],
  },
];

function getInitialSidebarState() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('sblocco_admin_sidebar') === 'collapsed';
}

function getInitialOpenGroups() {
  if (typeof window === 'undefined') return ['home', 'learners'];
  try {
    const stored = JSON.parse(window.localStorage.getItem('sblocco_admin_groups') || '[]');
    return Array.isArray(stored) && stored.length ? stored : ['home', 'learners'];
  } catch {
    return ['home', 'learners'];
  }
}

function itemMatchesPath(item, pathname) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function activeGroupForPath(pathname) {
  return navigationGroups.find((group) => group.items.some((item) => itemMatchesPath(item, pathname)))?.id || 'home';
}

function AdminNavigation({ onNavigate, collapsed = false, pathname }) {
  const activeGroupId = useMemo(() => activeGroupForPath(pathname), [pathname]);
  const [openGroups, setOpenGroups] = useState(getInitialOpenGroups);

  useEffect(() => {
    setOpenGroups((current) => current.includes(activeGroupId) ? current : [...current, activeGroupId]);
  }, [activeGroupId]);

  useEffect(() => {
    window.localStorage.setItem('sblocco_admin_groups', JSON.stringify(openGroups));
  }, [openGroups]);

  function toggleGroup(groupId) {
    setOpenGroups((current) => current.includes(groupId)
      ? current.filter((id) => id !== groupId)
      : [...current, groupId]);
  }

  if (collapsed) {
    return (
      <nav className="mt-4 flex-1 overflow-y-auto px-2 pb-4 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]" aria-label="Navigazione amministrazione">
        <div className="grid gap-1.5">
          {navigationGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = group.id === activeGroupId;
            return (
              <Link
                key={group.id}
                to={group.items[0].to}
                onClick={onNavigate}
                title={`${group.label}: ${group.description}`}
                aria-label={group.label}
                className={`focus-ring flex h-11 items-center justify-center rounded-xl transition ${groupActive ? 'bg-white text-ink shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
              >
                <GroupIcon aria-hidden="true" className="h-5 w-5" />
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-4 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent" aria-label="Navigazione amministrazione">
      <div className="grid gap-1.5">
        {navigationGroups.map((group) => {
          const GroupIcon = group.icon;
          const open = openGroups.includes(group.id);
          const groupActive = group.id === activeGroupId;
          return (
            <section key={group.id} className={`overflow-hidden rounded-xl border transition ${groupActive ? 'border-white/20 bg-white/[0.07]' : 'border-transparent'}`}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${groupActive ? 'text-white' : 'text-white/72 hover:bg-white/[0.07] hover:text-white'}`}
                aria-expanded={open}
                aria-controls={`admin-group-${group.id}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${groupActive ? 'bg-white text-ink' : 'bg-white/[0.08] text-white/75'}`}>
                  <GroupIcon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">{group.label}</span>
                  <span className="mt-0.5 block truncate text-[0.68rem] font-semibold text-white/60">{group.description}</span>
                </span>
                <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open ? (
                <div id={`admin-group-${group.id}`} className="grid gap-0.5 px-2 pb-2">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        className={({ isActive }) => `focus-ring flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-black transition ${isActive ? 'bg-white text-ink shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                      >
                        <ItemIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </nav>
  );
}

export default function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarState);
  const location = useLocation();
  const { profile, user } = useAuth();
  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Admin';
  const email = user?.email || '';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem('sblocco_admin_sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  function renderSidebarContent(collapsed = false) {
    return (
      <>
        <div className={`border-b border-white/10 ${collapsed ? 'flex flex-col items-center gap-2 p-2' : 'p-4'}`}>
          <div className={collapsed ? 'w-10 overflow-hidden' : 'flex items-start justify-between gap-2'}>
            <BrandLogo to="/admin" compact light />
            {!collapsed ? (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-white/70 transition hover:bg-white/15 hover:text-white"
                aria-label="Riduci barra laterale"
                title="Riduci barra laterale"
              >
                <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.08] text-white/70 transition hover:bg-white/15 hover:text-white"
              aria-label="Espandi barra laterale"
              title="Espandi barra laterale"
            >
              <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <div className="mt-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-200/75">Pannello admin</p>
              <p className="mt-1 text-[0.68rem] font-semibold text-white/60">Scegli un’area e poi lo strumento.</p>
            </div>
          )}
        </div>

        <AdminNavigation onNavigate={() => setMobileOpen(false)} collapsed={collapsed} pathname={location.pathname} />

        <div className={`border-t border-white/10 ${collapsed ? 'grid justify-items-center gap-2 p-2' : 'p-3'}`}>
          {collapsed ? (
            <>
              <ThemeToggle />
              <Link
                to="/account"
                className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/75 transition hover:bg-white/10 hover:text-white"
                aria-label="Account personale"
                title="Account personale"
              >
                <UserRound aria-hidden="true" className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{displayName}</p>
                  {email ? <p className="mt-0.5 truncate text-xs font-semibold text-white/65">{email}</p> : null}
                </div>
                <ThemeToggle />
              </div>
              <Link to="/account" className="focus-ring mt-3 flex min-h-10 items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-xs font-black text-white/75 transition hover:bg-white/10 hover:text-white">
                Account personale
              </Link>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <div
      className="min-h-screen bg-paper text-ink dark:bg-surface-950 dark:text-white"
      style={{ '--admin-sidebar-width': sidebarCollapsed ? '5rem' : '18rem' }}
    >
      <aside
        aria-label="Workspace amministrazione"
        className={`fixed inset-y-0 left-0 z-50 hidden flex-col overflow-hidden bg-ink shadow-2xl transition-[width] duration-200 lg:flex ${sidebarCollapsed ? 'w-20' : 'w-72'}`}
      >
        {renderSidebarContent(sidebarCollapsed)}
      </aside>

      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-ink/10 bg-paper/95 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-surface-950/95 lg:hidden">
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
          <aside aria-label="Workspace amministrazione mobile" className="absolute inset-y-0 left-0 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden bg-ink shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="focus-ring absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
              aria-label="Chiudi menu"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            {renderSidebarContent(false)}
          </aside>
        </div>
      ) : null}

      <div className={`min-w-0 overflow-x-clip transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <Outlet />
      </div>
    </div>
  );
}
