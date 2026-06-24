import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

const levels = ['A2', 'B1', 'B2'];

function PillButton({ active, children, count, onClick, dark = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring inline-flex max-w-full shrink-0 items-center gap-2 break-words rounded-full border px-3 py-1.5 text-left text-xs font-black transition sm:py-2 sm:text-sm ${
        active
          ? 'border-moss bg-moss text-white shadow-lift'
          : dark
            ? 'border-white/10 bg-white/[0.08] text-white/70 hover:border-mint/30 hover:bg-white/[0.14] hover:text-white'
            : 'border-ink/10 bg-white/90 text-ink/70 hover:border-moss/25 hover:bg-mint/50 hover:text-ink'
      }`}
    >
      <span>{children}</span>
      {typeof count === 'number' ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[0.65rem] font-black leading-none ${
            active ? 'bg-white/20 text-white' : dark ? 'bg-white/10 text-white/60' : 'bg-ink/5 text-ink/50'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function DeckSelector({
  categories,
  categoryCounts = {},
  selectedCategories,
  onToggleCategory,
  selectedLevels,
  onToggleLevel,
  onClear,
  dark = false,
}) {
  const hasFilters = selectedCategories.length > 0 || selectedLevels.length > 0;

  return (
    <section className={`min-w-0 rounded-lg border p-3 shadow-sm sm:p-4 ${dark ? 'border-white/10 bg-white/[0.06]' : 'border-ink/10 bg-white/80'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${dark ? 'bg-white/10 text-mint' : 'bg-mint text-moss'}`}>
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className={`text-sm font-black ${dark ? 'text-white' : 'text-ink'}`}>Filters</h2>
            <p className={`text-xs font-semibold ${dark ? 'text-white/60' : 'text-ink/55'}`}>Nessuna selezione = tutto il deck.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasFilters}
          className={`focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
            dark
              ? 'border-white/10 bg-white/[0.08] text-white/70 hover:border-coral/30 hover:bg-blush hover:text-ink'
              : 'border-ink/10 bg-white text-ink/60 hover:border-coral/25 hover:bg-blush'
          }`}
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
          Clear filters
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <p className={`text-[0.68rem] font-black uppercase tracking-[0.08em] ${dark ? 'text-white/50' : 'text-ink/50'}`}>Categories</p>
          <div className="-mx-1 mt-2 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0" aria-label="Filtra per categoria">
            {categories.map((category) => (
              <PillButton
                key={category}
                active={selectedCategories.includes(category)}
                count={categoryCounts[category] || 0}
                onClick={() => onToggleCategory(category)}
                dark={dark}
              >
                {category}
              </PillButton>
            ))}
          </div>
        </div>

        <div className={`border-t pt-3 ${dark ? 'border-white/10' : 'border-ink/10'}`}>
          <p className={`text-[0.68rem] font-black uppercase tracking-[0.08em] ${dark ? 'text-white/50' : 'text-ink/50'}`}>Levels</p>
          <div className="-mx-1 mt-2 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0" aria-label="Filtra per livello">
            {levels.map((level) => (
              <PillButton key={level} active={selectedLevels.includes(level)} onClick={() => onToggleLevel(level)} dark={dark}>
                {level}
              </PillButton>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
