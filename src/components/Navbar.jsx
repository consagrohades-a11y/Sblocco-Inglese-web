import React from 'react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from '../data/content';
import { ctaLabels, primaryOffer } from '../config/site';
import BrandLogo from './BrandLogo';
import CTAButton from './CTAButton';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const navClass = ({ isActive }) =>
    `focus-ring rounded-full px-2.5 py-1.5 text-xs font-black transition ${
      isActive ? 'bg-ink text-white shadow-sm' : 'text-ink/70 hover:bg-white hover:text-ink'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 shadow-sm backdrop-blur-xl">
      <div className="section-shell flex min-h-[72px] items-center justify-between gap-3 py-2">
        <BrandLogo />

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Navigazione principale">
          {navItems.map((item) =>
            item.to.includes('#') ? (
              <a key={item.to} href={item.to} className={navClass({ isActive: false })}>
                {item.label}
              </a>
            ) : (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <span className="rounded-full border border-moss/15 bg-white px-3 py-1.5 text-xs font-black text-moss shadow-sm">
            Corsi + diagnosi da {primaryOffer.price}
          </span>
          <CTAButton href="/percorsi" className="!min-h-10 px-4 py-2 text-sm">Scopri i corsi</CTAButton>
        </div>

        <button
          type="button"
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-sm xl:hidden"
          aria-label={open ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-ink/10 bg-paper/95 px-5 pb-5 pt-3 shadow-soft xl:hidden">
          <nav className="grid gap-2" aria-label="Navigazione mobile">
            {navItems.map((item) =>
              item.to.includes('#') ? (
                <a
                  key={item.to}
                  href={item.to}
                  className="rounded-lg bg-white/80 px-4 py-3 text-base font-bold text-ink hover:bg-mint/50"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-lg px-4 py-3 text-base font-bold ${
                      isActive ? 'bg-ink text-white' : 'bg-white/80 text-ink hover:bg-mint/50'
                    }`
                  }
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
          <CTAButton className="mt-4 w-full" onClick={() => setOpen(false)}>
            {ctaLabels.primary}
          </CTAButton>
        </div>
      ) : null}
    </header>
  );
}
