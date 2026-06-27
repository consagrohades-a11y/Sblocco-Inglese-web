import React from 'react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from '../data/content';
import { ctaLabels, primaryOffer } from '../config/site';
import BrandLogo from './BrandLogo';
import CTAButton from './CTAButton';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const desktopItems = navItems.filter((item) => !['/prenota', '/simulazione-39'].includes(item.to));
  const navLabel = (item) => {
    if (item.to === '/') return 'La piattaforma';
    if (item.to === '/simulazione-39') return `Simulazione ${primaryOffer.price}`;
    if (item.to === '/grammar') return 'Grammar';
    return item.label;
  };

  const navClass = ({ isActive }) =>
    `focus-ring whitespace-nowrap rounded-full px-3 py-2 text-[0.82rem] font-black transition 2xl:px-4 2xl:text-sm ${
      isActive ? 'bg-ink text-white shadow-sm dark:bg-mint dark:text-ink' : 'text-ink/70 hover:bg-white hover:text-ink dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 shadow-sm backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#101816]/90">
      <div className="section-shell flex min-h-[76px] items-center justify-between gap-4 py-2">
        <BrandLogo />

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 xl:flex 2xl:gap-2" aria-label="Navigazione principale">
          {desktopItems.map((item) =>
            item.to.includes('#') ? (
              <a key={item.to} href={item.to} className={navClass({ isActive: false })}>
                {navLabel(item)}
              </a>
            ) : (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {navLabel(item)}
              </NavLink>
            ),
          )}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <ThemeToggle />
          <CTAButton href="/simulazione-39" className="!min-h-11 whitespace-nowrap !px-5 !py-2.5 !text-sm" icon={false}>
            Prenota l'audit a 39 euro
          </CTAButton>
        </div>

        <button
          type="button"
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white xl:hidden"
          aria-label={open ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-ink/10 bg-paper/95 px-5 pb-5 pt-3 shadow-soft dark:border-white/10 dark:bg-[#101816]/95 xl:hidden">
          <nav className="grid gap-2" aria-label="Navigazione mobile">
            {navItems.map((item) =>
              item.to.includes('#') ? (
                <a
                  key={item.to}
                  href={item.to}
                  className="whitespace-nowrap rounded-lg bg-white/80 px-4 py-3 text-base font-bold text-ink hover:bg-mint/50 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  onClick={() => setOpen(false)}
                >
                  {navLabel(item)}
                </a>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-lg px-4 py-3 text-base font-bold ${
                      isActive ? 'bg-ink text-white dark:bg-mint dark:text-ink' : 'bg-white/80 text-ink hover:bg-mint/50 dark:bg-white/10 dark:text-white dark:hover:bg-white/15'
                    }`
                  }
                  onClick={() => setOpen(false)}
                >
                  {navLabel(item)}
                </NavLink>
              ),
            )}
            <ThemeToggle mobile />
          </nav>
          <CTAButton className="mt-4 w-full" onClick={() => setOpen(false)}>
            Prenota l'audit a 39 euro
          </CTAButton>
        </div>
      ) : null}
    </header>
  );
}
