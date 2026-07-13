import React from 'react';
import { Archive, FileUp, Pencil } from 'lucide-react';
import { NavLink } from 'react-router-dom';

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

export default function ContentAreaNav({ type }) {
  const area = contentAreas[type];

  return (
    <nav className="mb-6 rounded-2xl border border-ink/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]" aria-label={`Strumenti ${area.label}`}>
      <p className="px-2 pb-2 text-[0.68rem] font-black uppercase tracking-[0.14em] text-ink/45 dark:text-white/45">{area.label}</p>
      <div className="flex flex-wrap gap-2">
        {area.routes.map((route) => {
          const Icon = route.icon;
          return (
            <NavLink
              key={route.to}
              to={route.to}
              end={route.end}
              className={({ isActive }) => `focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                isActive
                  ? 'border-moss bg-moss text-white dark:border-emerald-300 dark:bg-emerald-400 dark:text-[#07120f]'
                  : 'border-ink/10 bg-paper text-ink/70 hover:border-moss/25 hover:bg-mint/35 hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:border-emerald-300/25 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {route.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
