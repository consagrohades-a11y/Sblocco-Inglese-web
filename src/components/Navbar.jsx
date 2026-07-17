import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';

const publicItems = [
  { label: 'Corsi', to: '/percorsi' },
  { label: 'Metodo', to: '/metodo' },
  { label: 'Piattaforma', to: '/piattaforma' },
  { label: 'Trainer', to: '/trainers' },
  { label: 'Risultati', to: '/recensioni' },
];

const learnerItems = [
  { label: 'Attività', to: '/assignments', icon: ClipboardList },
  { label: 'Trainer', to: '/trainers', icon: Sparkles },
  { label: 'Corsi', to: '/percorsi', icon: BookOpen },
  { label: 'Progressi', to: '/progressi', icon: BarChart3 },
];

function isRouteActive(pathname, to) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function AccountMenu({ displayName, isAdmin, onSignOut }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'A';

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="focus-ring flex h-10 items-center gap-1.5 rounded-full border border-ink/15 bg-white p-1 pr-2 text-ink transition hover:border-coral/40 hover:bg-linen dark:border-white/12 dark:bg-white/[0.055] dark:text-white dark:hover:bg-white/[0.09]"
        aria-label="Apri menu account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-sm font-extrabold text-ink">{initial}</span>
        <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 text-ink/60 transition dark:text-white/65 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+0.75rem)] w-64 overflow-hidden rounded-2xl border border-ink/10 bg-white p-2 text-ink shadow-[0_24px_70px_rgba(24,34,31,0.18)] dark:border-white/15 dark:bg-surface-800 dark:text-white dark:shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
          <div className="border-b border-ink/10 px-3 py-3 dark:border-white/10">
            <p className="truncate text-sm font-black">{displayName || 'Il tuo account'}</p>
            <p className="mt-0.5 text-xs font-semibold text-ink/60 dark:text-white/65">Profilo e impostazioni</p>
          </div>
          <Link role="menuitem" to="/account" onClick={() => setOpen(false)} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-ink/80 transition hover:bg-linen/70 hover:text-ink dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white">
            <Settings aria-hidden="true" className="h-4 w-4 text-moss dark:text-mint" />
            Account
          </Link>
          {isAdmin ? (
            <Link role="menuitem" to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-ink/80 transition hover:bg-linen/70 hover:text-ink dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white">
              <GraduationCap aria-hidden="true" className="h-4 w-4 text-moss dark:text-mint" />
              Pannello admin
            </Link>
          ) : null}
          <button role="menuitem" type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-ink/70 transition hover:bg-coral/10 hover:text-ink dark:text-white/70 dark:hover:bg-coral/15 dark:hover:text-white">
            <LogOut aria-hidden="true" className="h-4 w-4 text-clay dark:text-[#ffb89a]" />
            Esci
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const { loading, profile, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isLearner = profile?.role === 'learner' && profile?.status === 'active';
  const isAdmin = profile?.role === 'admin' && profile?.status === 'active';
  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Account';
  const items = useMemo(() => (isLearner ? learnerItems : publicItems), [isLearner]);
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedReturnTo = routeParams.get('returnTo') || '';
  const practiceAssignmentId = routeParams.get('assignmentId') || '';
  const safeReturnTo = requestedReturnTo.startsWith('/assignments/') ? requestedReturnTo : '';
  const assignmentDetail = location.pathname.startsWith('/assignments/');
  const learnerAction = safeReturnTo
    ? { label: 'Torna all’attività', to: safeReturnTo }
    : location.pathname === '/practice' && practiceAssignmentId
      ? { label: 'Torna all’attività', to: `/assignments/${practiceAssignmentId}` }
      : assignmentDetail
        ? { label: 'Torna alle attività', to: '/assignments' }
        : { label: 'Indietro', to: '' };

  useEffect(() => {
    function handleScroll() {
      setCompact(window.scrollY > 24);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  async function handleSignOut() {
    setMobileOpen(false);
    await signOut();
    navigate('/', { replace: true });
  }

  function handleLearnerBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate('/assignments');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/[0.96] text-ink shadow-[0_10px_32px_rgba(24,34,31,0.08)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-surface-950/[0.97] dark:text-white dark:shadow-[0_10px_32px_rgba(3,8,7,0.20)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-24 h-44 w-44 rounded-full bg-coral/[0.055] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-moss/10 via-mint/40 to-coral/25" />
      </div>

      <div className={`section-shell relative flex items-center justify-between gap-4 transition-all duration-300 ${compact ? 'min-h-[58px] py-1' : 'min-h-[68px] py-1.5'}`}>
        <BrandLogo to={isLearner ? '/assignments' : '/'} compact />

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex" aria-label={isLearner ? 'Navigazione studente' : 'Navigazione principale'}>
          {items.map((item) => {
            const active = isRouteActive(location.pathname, item.to);
            return (
              <NavLink key={item.to} to={item.to} className={`focus-ring relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? 'text-ink dark:text-white' : 'text-ink/70 hover:bg-ink/[0.05] hover:text-ink dark:text-white/68 dark:hover:bg-white/[0.05] dark:hover:text-white'}`}>
                {item.label}
                {active ? <span aria-hidden="true" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-mint via-coral to-butter" /> : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          {isLearner ? (
            learnerAction.to ? (
              <Link to={learnerAction.to} className="focus-ring inline-flex h-10 items-center gap-2 rounded-full bg-moss px-4 text-sm font-extrabold text-white transition hover:-translate-y-px hover:bg-[#19947b]">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                {learnerAction.label}
              </Link>
            ) : (
              <button type="button" onClick={handleLearnerBack} className="focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 bg-ink/[0.05] px-4 text-sm font-extrabold text-ink transition hover:bg-ink/[0.09] dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                {learnerAction.label}
              </button>
            )
          ) : (
            <Link to="/assessment" className="focus-ring inline-flex h-10 items-center gap-2 rounded-full bg-moss px-4 text-sm font-extrabold text-white transition hover:-translate-y-px hover:bg-[#19947b]">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              Sblocco Check
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}

          <ThemeToggle />

          {!loading && user ? (
            <AccountMenu displayName={displayName} isAdmin={isAdmin} onSignOut={handleSignOut} />
          ) : !loading ? (
            <NavLink to="/login" className="focus-ring inline-flex h-10 items-center rounded-full border border-ink/15 bg-white/70 px-4 text-sm font-semibold text-ink/80 transition hover:bg-white hover:text-ink dark:border-white/12 dark:bg-white/[0.045] dark:text-white/80 dark:hover:bg-white/[0.08] dark:hover:text-white">
              Accedi
            </NavLink>
          ) : (
            <span className="h-10 w-16 animate-pulse rounded-full bg-ink/[0.08] dark:bg-white/[0.07]" aria-label="Caricamento account" />
          )}
        </div>

        <button
          type="button"
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 bg-white text-ink transition hover:bg-linen dark:border-white/12 dark:bg-white/[0.055] dark:text-white dark:hover:bg-white/[0.10] xl:hidden"
          aria-label={mobileOpen ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="relative border-t border-ink/10 bg-paper/[0.98] px-5 pb-6 pt-4 shadow-[0_24px_50px_rgba(24,34,31,0.14)] dark:border-white/10 dark:bg-surface-950/98 dark:shadow-[0_24px_50px_rgba(0,0,0,0.38)] xl:hidden">
          <nav className="mx-auto grid max-w-lg gap-2" aria-label={isLearner ? 'Navigazione studente mobile' : 'Navigazione mobile'}>
            {isLearner ? (
              learnerAction.to ? (
                <Link to={learnerAction.to} className="focus-ring mb-2 flex min-h-12 items-center gap-2 rounded-2xl bg-moss px-4 py-3 text-base font-black text-white">
                  <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                  {learnerAction.label}
                </Link>
              ) : (
                <button type="button" onClick={handleLearnerBack} className="focus-ring mb-2 flex min-h-12 w-full items-center gap-2 rounded-2xl border border-ink/15 bg-ink/[0.05] px-4 py-3 text-left text-base font-black text-ink dark:border-white/15 dark:bg-white/[0.07] dark:text-white">
                  <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                  {learnerAction.label}
                </button>
              )
            ) : null}

            {items.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(location.pathname, item.to);
              return (
                <NavLink key={item.to} to={item.to} className={`focus-ring flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-base font-extrabold transition ${active ? 'bg-mint text-ink' : 'bg-ink/[0.04] text-ink/80 hover:bg-ink/[0.08] hover:text-ink dark:bg-white/[0.05] dark:text-white/80 dark:hover:bg-white/[0.10] dark:hover:text-white'}`}>
                  {Icon ? <Icon aria-hidden="true" className={`h-5 w-5 ${active ? 'text-moss' : 'text-moss dark:text-mint'}`} /> : null}
                  {item.label}
                </NavLink>
              );
            })}

            {!isLearner ? (
              <Link to="/assessment" className="focus-ring mt-2 flex min-h-12 items-center justify-between rounded-2xl bg-moss px-4 py-3 text-base font-black text-white">
                <span className="flex items-center gap-2"><Sparkles aria-hidden="true" className="h-5 w-5" />Sblocco Check</span>
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            ) : null}

            {!loading && user ? (
              <>
                <ThemeToggle mobile />
                <Link to="/account" className="focus-ring mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-ink/12 bg-white px-4 py-3 text-base font-extrabold text-ink dark:border-white/12 dark:bg-white/[0.07] dark:text-white">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-sm font-black text-ink">{displayName.charAt(0).toUpperCase()}</span>
                  Account
                </Link>
                {isAdmin ? (
                  <Link to="/admin" className="focus-ring flex min-h-12 items-center gap-3 rounded-2xl bg-ink/[0.04] px-4 py-3 text-base font-extrabold text-ink/80 dark:bg-white/[0.05] dark:text-white/80">
                    <GraduationCap aria-hidden="true" className="h-5 w-5 text-moss dark:text-mint" />
                    Pannello admin
                  </Link>
                ) : null}
                <button type="button" onClick={handleSignOut} className="focus-ring flex min-h-12 items-center gap-3 rounded-2xl bg-ink/[0.04] px-4 py-3 text-left text-base font-extrabold text-ink/70 dark:bg-white/[0.05] dark:text-white/70">
                  <LogOut aria-hidden="true" className="h-5 w-5 text-clay dark:text-[#ffb89a]" />
                  Esci
                </button>
              </>
            ) : !loading ? (
              <Link to="/login" className="focus-ring mt-2 flex min-h-12 items-center justify-center rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base font-extrabold text-ink dark:border-white/15 dark:bg-white/[0.07] dark:text-white">Accedi</Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
