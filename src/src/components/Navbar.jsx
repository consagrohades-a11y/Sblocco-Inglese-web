import React from 'react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { brandName, navItems } from '../data/content';
import { ctaLabels } from '../config/site';
import CTAButton from './CTAButton';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const navClass = ({ isActive }) =>
    `rounded-full px-3 py-2 text-sm font-bold transition ${
      isActive ? 'bg-mint text-moss' : 'text-ink/70 hover:bg-white hover:text-ink'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-xl">
      <div className="section-shell flex h-18 items-center justify-between gap-4 py-3">
        <Link to="/" className="focus-ring rounded-lg">
          <span className="block text-sm font-black leading-tight text-ink sm:text-base">
            {brandName}
          </span>
          <span className="hidden text-xs font-semibold text-ink/60 sm:block">
            Inglese pratico per colloqui e lavoro
          </span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Navigazione principale">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <CTAButton className="px-4 py-2 text-sm">{ctaLabels.mobile}</CTAButton>
        </div>

        <button
          type="button"
          className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white text-ink xl:hidden"
          aria-label={open ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-ink/10 bg-paper px-5 pb-5 pt-2 xl:hidden">
          <nav className="grid gap-2" aria-label="Navigazione mobile">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 text-base font-bold ${
                    isActive ? 'bg-mint text-moss' : 'bg-white/70 text-ink'
                  }`
                }
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <CTAButton className="mt-4 w-full" onClick={() => setOpen(false)}>
            {ctaLabels.primary}
          </CTAButton>
        </div>
      ) : null}
    </header>
  );
}
