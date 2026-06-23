import React from 'react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { trainerConfig, trainerHome } from '../data/trainerConfig';

function navClass({ isActive }) {
  return `focus-ring rounded-full px-3 py-2 text-sm font-black transition ${
    isActive ? 'bg-moss text-white shadow-lift' : 'text-ink/65 hover:bg-white hover:text-ink'
  }`;
}

export default function TrainerNav() {
  const [open, setOpen] = useState(false);
  const items = [trainerHome, ...trainerConfig];

  return (
    <div className="rounded-lg border border-ink/10 bg-white/80 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <Link to="/trainers" className="focus-ring rounded-lg px-2 py-1">
          <span className="block text-sm font-black text-ink">Sblocco Trainer</span>
          <span className="block text-xs font-semibold text-ink/55">Review area</span>
        </Link>

        <nav className="hidden flex-wrap items-center gap-1 lg:flex" aria-label="Trainer navigation">
          {items.map((item) => (
            <NavLink key={item.id} to={item.route} end={item.route === '/trainers'} className={navClass}>
              {item.shortTitle}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink lg:hidden"
          aria-label={open ? 'Chiudi menu trainer' : 'Apri menu trainer'}
          aria-expanded={open}
        >
          {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav className="mt-3 grid gap-2 border-t border-ink/10 pt-3 lg:hidden" aria-label="Trainer navigation mobile">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.route}
              end={item.route === '/trainers'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `focus-ring rounded-lg px-4 py-3 text-sm font-black transition ${
                  isActive ? 'bg-moss text-white' : 'bg-paper text-ink/70 hover:bg-mint/50 hover:text-ink'
                }`
              }
            >
              {item.title}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
