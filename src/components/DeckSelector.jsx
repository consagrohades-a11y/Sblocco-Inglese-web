import React from 'react';
import { Filter, Layers3 } from 'lucide-react';

const levels = ['all', 'A2', 'B1', 'B2'];

function optionClass(active) {
  return `focus-ring rounded-full px-4 py-2 text-sm font-black transition ${
    active ? 'bg-moss text-white shadow-lift' : 'border border-ink/10 bg-white text-ink/70 hover:border-moss/25 hover:bg-mint/40'
  }`;
}

export default function DeckSelector({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedLevel,
  onLevelChange,
  statsByCategory,
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-mint text-moss">
          <Layers3 aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-ink">Deck</h2>
          <p className="text-sm font-semibold text-ink/60">Scegli categoria e livello.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtra per categoria">
        <button type="button" onClick={() => onCategoryChange('all')} className={optionClass(selectedCategory === 'all')}>
          Tutte
        </button>
        {categories.map((category) => {
          const stats = statsByCategory[category] || { due: 0, new: 0 };
          const badge = stats.due > 0 ? stats.due : stats.new;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={optionClass(selectedCategory === category)}
            >
              {category}
              {badge > 0 ? <span className="ml-2 text-xs opacity-75">{badge}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4" aria-label="Filtra per livello">
        <Filter aria-hidden="true" className="h-4 w-4 text-moss" />
        {levels.map((level) => (
          <button key={level} type="button" onClick={() => onLevelChange(level)} className={optionClass(selectedLevel === level)}>
            {level === 'all' ? 'Tutti i livelli' : level}
          </button>
        ))}
      </div>
    </div>
  );
}
