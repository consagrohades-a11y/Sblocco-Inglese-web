import React from 'react';
import { Archive, FileUp, Layers3, LayoutDashboard, Pencil, Plus } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const contentAreas = {
  word: {
    label: 'Parole',
    routes: [
      { label: 'Libreria e modifica', to: '/admin/content/words', icon: Pencil, end: true },
      { label: 'Importa e gestisci batch', to: '/admin/content/words/import', icon: FileUp },
      { label: 'Deck pubblicabili', to: '/admin/content/words/decks', icon: Layers3 },
      { label: 'Archivio e rimozione', to: '/admin/content/words/archive', icon: Archive },
    ],
  },
  expression: {
    label: 'Espressioni generali',
    routes: [
      { label: 'Libreria e modifica', to: '/admin/content/expressions', icon: Pencil, end: true },
      { label: 'Importa e gestisci batch', to: '/admin/content/expressions/import', icon: FileUp },
      { label: 'Deck pubblicabili', to: '/admin/content/expressions/decks', icon: Layers3 },
      { label: 'Archivio e rimozione', to: '/admin/content/expressions/archive', icon: Archive },
    ],
  },
  business: {
    label: 'Espressioni business',
    routes: [
      { label: 'Libreria e modifica', to: '/admin/content/business-expressions', icon: Pencil, end: true },
      { label: 'Importa e gestisci batch', to: '/admin/content/business-expressions/import', icon: FileUp },
      { label: 'Deck pubblicabili', to: '/admin/content/business-expressions/decks', icon: Layers3 },
      { label: 'Archivio e rimozione', to: '/admin/content/business-expressions/archive', icon: Archive },
    ],
  },
  hospitality: {
    label: 'Espressioni hospitality',
    routes: [
      { label: 'Libreria e modifica', to: '/admin/content/hospitality-expressions', icon: Pencil, end: true },
      { label: 'Importa e gestisci batch', to: '/admin/content/hospitality-expressions/import', icon: FileUp },
      { label: 'Deck pubblicabili', to: '/admin/content/hospitality-expressions/decks', icon: Layers3 },
      { label: 'Archivio e rimozione', to: '/admin/content/hospitality-expressions/archive', icon: Archive },
    ],
  },
};

export default function ContentAreaNav({ type, onNewCard }) {
  const area = contentAreas[type];

  return (
    <nav className="mb-4 rounded-xl border border-white/10 bg-ink p-2.5 shadow-sm dark:bg-surface-900" aria-label={`Strumenti ${area.label}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="px-2 pb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/60">{area.label}</p>
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
          ) : (
            <Link
              to={area.routes[0].to}
              className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-ink transition hover:bg-emerald-100"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nuova card
            </Link>
          )}
          <Link
            to="/admin"
            className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-black text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
            Home admin
          </Link>
        </div>
      </div>
    </nav>
  );
}
