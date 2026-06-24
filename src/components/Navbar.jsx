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
    `focus-ring whitespace-nowrap rounded-full px-2 py-1.5 text-[0.68rem] font-black transition 2xl:px-2.5 2xl:text-xs ${
      isActive ? 'bg-ink text-white shadow-sm' : 'text-ink/70 hover:bg-white hover:text-ink'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 shadow-sm backdrop-blur-xl">
      <div className="section-shell flex min-h-[68px] items-center justify-between gap-2 py-2 2xl:gap-3">
        <BrandLogo />

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex 2xl:gap-1" aria-label="Navigazione principale">
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

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <span className="hidden whitespace-nowrap rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs font-black text-ink shadow-sm 2xl:inline-flex">
            Diagnosi iniziale {primaryOffer.price}
          </span>
          <CTAButton href="/prenota#booking-form" className="!min-h-10 whitespace-nowrap !px-3 !py-2 !text-xs 2xl:!px-4 2xl:!text-sm" icon={false}>
            {ctaLabels.mobile}
          </CTAButton>
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
                  className="whitespace-nowrap rounded-lg bg-white/80 px-4 py-3 text-base font-bold text-ink hover:bg-mint/50"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-lg px-4 py-3 text-base font-bold ${
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
