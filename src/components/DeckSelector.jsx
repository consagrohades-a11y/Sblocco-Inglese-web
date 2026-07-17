import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

const supportedLevels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1'];

function PillButton({ active, children, count, onClick, dark = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring inline-flex max-w-full min-w-0 items-center gap-2 whitespace-normal break-words rounded-full border px-3 py-1.5 text-left text-xs font-black transition sm:py-2 sm:text-sm ${
        active
          ? 'border-moss bg-moss text-white shadow-lift'
          : dark
            ? 'border-white/10 bg-white/[0.08] text-white/70 hover:border-mint/30 hover:bg-white/[0.14] hover:text-white'
            : 'border-ink/10 bg-white/90 text-ink/70 hover:border-moss/25 hover:bg-mint/50 hover:text-ink'
      }`}
    >
      <span className="min-w-0 flex-1 leading-snug break-words">{children}</span>
      {typeof count === 'number' ? (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-black leading-none ${
            active ? 'bg-white/20 text-white' : dark ? 'bg-white/10 text-white/60' : 'bg-ink/5 text-ink/65'
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
  levels = supportedLevels,
  selectedCategories,
  onToggleCategory,
  selectedLevels,
  onToggleLevel,
  onClear,
  dark = false,
}) {
  const hasFilters = selectedCategories.length > 0 || selectedLevels.length > 0;
  const filterSummary = hasFilters
    ? [
        selectedCategories.length ? `${selectedCategories.length} ${selectedCategories.length === 1 ? 'categoria' : 'categorie'}` : '',
        selectedLevels.length ? `${selectedLevels.length} ${selectedLevels.length === 1 ? 'livello' : 'livelli'}` : '',
      ].filter(Boolean).join(' e ')
    : 'Nessun filtro: tutte le card assegnate.';

  return (
    <section className={`min-w-0 max-w-full overflow-hidden rounded-lg border p-3 shadow-sm sm:p-4 ${dark ? 'border-white/10 bg-white/[0.06]' : 'border-ink/10 bg-white/80'}`}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${dark ? 'bg-white/10 text-mint' : 'bg-mint text-moss'}`}>
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className={`text-sm font-black ${dark ? 'text-white' : 'text-ink'}`}>Filtri</h2>
            <p className={`text-xs font-semibold ${dark ? 'text-white/60' : 'text-ink/65'}`}>{filterSummary}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasFilters}
          className={`focus-ring inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
            dark
              ? 'border-white/10 bg-white/[0.08] text-white/70 hover:border-coral/30 hover:bg-blush hover:text-ink'
              : 'border-ink/10 bg-white text-ink/60 hover:border-coral/25 hover:bg-blush'
          }`}
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
          Azzera
        </button>
      </div>

      <div className="mt-4 grid min-w-0 gap-3">
        <div className="min-w-0">
          <p className={`text-[0.68rem] font-bold uppercase tracking-[0.08em] ${dark ? 'text-white/65' : 'text-ink/65'}`}>Categorie</p>
          <div className="mt-2 flex min-w-0 max-w-full flex-wrap gap-2" aria-label="Filtra per categoria">
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

        <div className={`min-w-0 border-t pt-3 ${dark ? 'border-white/10' : 'border-ink/10'}`}>
          <p className={`text-[0.68rem] font-bold uppercase tracking-[0.08em] ${dark ? 'text-white/65' : 'text-ink/65'}`}>Livelli</p>
          <div className="mt-2 flex min-w-0 max-w-full flex-wrap gap-2" aria-label="Filtra per livello">
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
