import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

const levels = ['A2', 'B1', 'B2'];

function PillButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring max-w-full break-words rounded-full border px-3 py-2 text-left text-xs font-black transition sm:text-sm ${
        active
          ? 'border-moss bg-moss text-white shadow-lift'
          : 'border-ink/10 bg-white/85 text-ink/65 hover:border-moss/25 hover:bg-mint/45 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export default function DeckSelector({
  categories,
  selectedCategories,
  onToggleCategory,
  selectedLevels,
  onToggleLevel,
  onClear,
}) {
  const hasFilters = selectedCategories.length > 0 || selectedLevels.length > 0;

  return (
    <section className="rounded-lg border border-ink/10 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-mint text-moss">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-ink">Filters</h2>
            <p className="text-xs font-semibold text-ink/55">Nessuna selezione = tutto il deck.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasFilters}
          className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-black text-ink/60 transition hover:border-coral/25 hover:bg-blush disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
          Clear filters
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-ink/45">Categories</p>
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Filtra per categoria">
            {categories.map((category) => (
              <PillButton
                key={category}
                active={selectedCategories.includes(category)}
                onClick={() => onToggleCategory(category)}
              >
                {category}
              </PillButton>
            ))}
          </div>
        </div>

        <div className="border-t border-ink/10 pt-3">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-ink/45">Levels</p>
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Filtra per livello">
            {levels.map((level) => (
              <PillButton key={level} active={selectedLevels.includes(level)} onClick={() => onToggleLevel(level)}>
                {level}
              </PillButton>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
