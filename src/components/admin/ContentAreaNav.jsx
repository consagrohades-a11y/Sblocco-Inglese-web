import React from 'react';
import { Archive, FileUp, LayoutDashboard, Pencil, Plus } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const contentAreas = {
  word: {
    label: 'Word Trainer',
    routes: [
      { label: 'Editor e revisione', to: '/admin/content/words', icon: Pencil, end: true },
      { label: 'Importazioni e batch', to: '/admin/content/words/import', icon: FileUp },
      { label: 'Archivio', to: '/admin/content/words/archive', icon: Archive },
    ],
  },
  expression: {
    label: 'General Expressions',
    routes: [
      { label: 'Editor e revisione', to: '/admin/content/expressions', icon: Pencil, end: true },
      { label: 'Importazioni e batch', to: '/admin/content/expressions/import', icon: FileUp },
      { label: 'Archivio', to: '/admin/content/expressions/archive', icon: Archive },
    ],
  },
};

export default function ContentAreaNav({ type, onNewCard }) {
  const area = contentAreas[type];

  return (
    <nav className="mb-4 rounded-xl border border-white/10 bg-ink p-2.5 shadow-sm dark:bg-[#16211e]" aria-label={`Strumenti ${area.label}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="px-2 pb-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-white/45">{area.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {area.routes.map((route) => {
              const Icon = route.icon;
              return (
                <NavLink
                  key={route.to}
                  to={route.to}
                  end={route.end}
                  className={({ isActive }) => `focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-black transition ${
                    isActive
                      ? 'border-emerald-300 bg-emerald-400 text-[#07120f]'
                      : 'border-white/10 bg-white/[0.06] text-white/70 hover:border-emerald-300/30 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {route.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {onNewCard ? (
            <button
              type="button"
              onClick={onNewCard}
              className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-ink transition hover:bg-emerald-100"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nuova card
            </button>
          ) : null}
          <Link
            to="/admin"
            className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-black text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
            Pannello admin
          </Link>
        </div>
      </div>
    </nav>
  );
}
