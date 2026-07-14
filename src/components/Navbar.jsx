import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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

const publicItems = [
  { label: 'Metodo', to: '/#come-funziona' },
  { label: 'Corsi', to: '/percorsi' },
  { label: 'Trainer', to: '/trainers' },
  { label: 'English Foundations', to: '/grammar' },
  { label: 'Founder', to: '/recensioni' },
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
        className="focus-ring flex h-10 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.055] p-1 pr-2 text-white transition hover:border-[#e86f51]/40 hover:bg-white/[0.09]"
        aria-label="Apri menu account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#dcefe8] text-sm font-extrabold text-[#0b1411] shadow-[0_0_16px_rgba(139,92,246,0.16)]">
          {initial}
        </span>
        <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 text-white/55 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.75rem)] w-64 overflow-hidden rounded-2xl border border-white/15 bg-[#101a17] p-2 text-white shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_32px_rgba(139,92,246,0.12)]"
        >
          <div className="border-b border-white/10 px-3 py-3">
            <p className="truncate text-sm font-black">{displayName || 'Il tuo account'}</p>
            <p className="mt-0.5 text-xs font-semibold text-white/55">Profilo e impostazioni</p>
          </div>
          <Link role="menuitem" to="/account" onClick={() => setOpen(false)} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white">
            <Settings aria-hidden="true" className="h-4 w-4 text-[#81d7c0]" />
            Account
          </Link>
          {isAdmin ? (
            <Link role="menuitem" to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white">
              <GraduationCap aria-hidden="true" className="h-4 w-4 text-[#81d7c0]" />
              Pannello admin
            </Link>
          ) : null}
          <button role="menuitem" type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-white/70 transition hover:bg-[#e86f51]/15 hover:text-white">
            <LogOut aria-hidden="true" className="h-4 w-4 text-[#ffb89a]" />
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

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a1210]/[0.97] text-white shadow-[0_10px_32px_rgba(3,8,7,0.20)] backdrop-blur-xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-24 h-44 w-44 rounded-full bg-[#e86f51]/[0.055] blur-3xl" />
        <div className="absolute left-1/3 top-0 h-px w-1/4 bg-gradient-to-r from-transparent via-[#ffc457]/25 to-transparent" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#0e7c66]/10 via-[#65d6b8]/40 to-[#e86f51]/25" />
      </div>

      <div className={`section-shell relative flex items-center justify-between gap-4 transition-[min-height,padding] duration-300 ${compact ? 'min-h-[58px] py-1' : 'min-h-[68px] py-1.5'}`}>
        <BrandLogo to={isLearner ? '/assignments' : '/'} compact light />

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 2xl:flex" aria-label={isLearner ? 'Navigazione studente' : 'Navigazione principale'}>
          {items.map((item) => {
            const active = isRouteActive(location.pathname, item.to.split('#')[0]);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`focus-ring relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold tracking-[-0.005em] transition ${
                  active
                    ? 'text-white'
                    : 'text-white/68 hover:bg-white/[0.045] hover:text-white'
                }`}
              >
                {item.label}
                {active ? <span aria-hidden="true" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-[#4ec9a8] via-[#e86f51] to-[#ffc457] shadow-[0_0_10px_rgba(232,111,81,0.28)]" /> : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 2xl:flex">
          {isLearner ? (
            <Link to="/assignments" className="focus-ring inline-flex h-10 items-center gap-2 rounded-full bg-[#137d68] px-4 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(14,124,102,0.18),0_0_18px_rgba(139,92,246,0.08)] transition hover:-translate-y-px hover:bg-[#19947b]">
              Continua
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : (
            <Link to="/prenota" className="focus-ring inline-flex h-10 items-center gap-2 rounded-full bg-[#137d68] px-4 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(14,124,102,0.18),0_0_18px_rgba(139,92,246,0.08)] transition hover:-translate-y-px hover:bg-[#19947b]">
              Inizia il tuo percorso
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}

          {!loading && user ? (
            <AccountMenu displayName={displayName} isAdmin={isAdmin} onSignOut={handleSignOut} />
          ) : !loading ? (
            <NavLink to="/login" className="focus-ring inline-flex h-10 items-center rounded-full border border-white/12 bg-white/[0.045] px-4 text-sm font-semibold text-white/80 transition hover:border-[#e86f51]/35 hover:bg-white/[0.08] hover:text-white">
              Accedi
            </NavLink>
          ) : (
            <span className="h-10 w-16 animate-pulse rounded-full bg-white/[0.07]" aria-label="Caricamento account" />
          )}
        </div>

        <button
          type="button"
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-white transition hover:border-[#e86f51]/35 hover:bg-white/[0.10] 2xl:hidden"
          aria-label={mobileOpen ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="relative border-t border-white/10 bg-[#0d1714]/98 px-5 pb-6 pt-4 shadow-[0_24px_50px_rgba(0,0,0,0.38)] 2xl:hidden">
          <nav className="mx-auto grid max-w-lg gap-2" aria-label={isLearner ? 'Navigazione studente mobile' : 'Navigazione mobile'}>
            {isLearner ? (
              <Link to="/assignments" className="focus-ring mb-2 flex min-h-12 items-center justify-between rounded-2xl bg-[#13866f] px-4 py-3 text-base font-black text-white shadow-[0_10px_26px_rgba(14,124,102,0.20)]">
                Continua
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            ) : null}

            {items.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(location.pathname, item.to.split('#')[0]);
              return (
                <NavLink key={item.to} to={item.to} className={`focus-ring flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-base font-extrabold transition ${active ? 'bg-[#dcefe8] text-[#0b1411]' : 'bg-white/[0.05] text-white/80 hover:bg-white/[0.10] hover:text-white'}`}>
                  {Icon ? <Icon aria-hidden="true" className={`h-5 w-5 ${active ? 'text-[#0e7c66]' : 'text-[#81d7c0]'}`} /> : null}
                  {item.label}
                </NavLink>
              );
            })}

            {!isLearner ? (
              <Link to="/prenota" className="focus-ring mt-2 flex min-h-12 items-center justify-between rounded-2xl bg-[#13866f] px-4 py-3 text-base font-black text-white">
                Inizia il tuo percorso
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            ) : null}

            {!loading && user ? (
              <>
                <Link to="/account" className="focus-ring mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.07] px-4 py-3 text-base font-extrabold text-white">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#dcefe8] text-sm font-black text-[#0b1411]">{displayName.charAt(0).toUpperCase()}</span>
                  Account
                </Link>
                {isAdmin ? <Link to="/admin" className="focus-ring flex min-h-12 items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 text-base font-extrabold text-white/80"><GraduationCap aria-hidden="true" className="h-5 w-5 text-[#81d7c0]" />Pannello admin</Link> : null}
                <button type="button" onClick={handleSignOut} className="focus-ring flex min-h-12 items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 text-left text-base font-extrabold text-white/70">
                  <LogOut aria-hidden="true" className="h-5 w-5 text-[#ffb89a]" />
                  Esci
                </button>
              </>
            ) : !loading ? (
              <Link to="/login" className="focus-ring mt-2 flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-base font-extrabold text-white">Accedi</Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
