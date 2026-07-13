import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, Sparkles } from 'lucide-react';
import { loadPublishedPracticeCards, PRACTICE_TRAINERS } from '../../lib/practiceContent.js';

const SOURCES = ['word', 'general', 'business', 'hospitality'];

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'it'));
}

export default function AssignmentStudyScopeEditor({
  enabled,
  onEnabledChange,
  selectedDeckIds,
  onDeckIdsChange,
  selectedItemIds,
  onItemIdsChange,
  onResolvedItemIdsChange,
}) {
  const [cards, setCards] = useState([]);
  const [source, setSource] = useState('all');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    Promise.all(SOURCES.map((trainerId) => loadPublishedPracticeCards(trainerId)))
      .then((groups) => {
        if (!active) return;
        const byId = new Map();
        groups.flat().forEach((card) => byId.set(card.id, card));
        setCards(Array.from(byId.values()));
      })
      .catch(() => { if (active) setError('Non è stato possibile caricare le card pubblicate.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled]);

  const decks = useMemo(() => {
    const byId = new Map();
    cards.forEach((card) => (card.decks || []).forEach((deck) => {
      const current = byId.get(deck.id) || { ...deck, itemIds: [], trainerIds: new Set() };
      current.itemIds.push(card.id);
      current.trainerIds.add(card.trainerId);
      byId.set(deck.id, current);
    }));
    return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title, 'it'));
  }, [cards]);

  const inheritedIds = useMemo(() => new Set(decks
    .filter((deck) => selectedDeckIds.includes(deck.id))
    .flatMap((deck) => deck.itemIds)), [decks, selectedDeckIds]);
  const resolvedIds = useMemo(() => unique([...selectedItemIds, ...inheritedIds]), [selectedItemIds, inheritedIds]);

  useEffect(() => { onResolvedItemIdsChange(resolvedIds); }, [resolvedIds.join('|')]);

  const levels = useMemo(() => unique(cards.filter((card) => source === 'all' || card.trainerId === source).map((card) => card.level)), [cards, source]);
  const categories = useMemo(() => unique(cards.filter((card) =>
    (source === 'all' || card.trainerId === source) && (level === 'all' || card.level === level)).map((card) => card.category)), [cards, source, level]);
  const filteredCards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('it');
    return cards.filter((card) => (source === 'all' || card.trainerId === source)
      && (level === 'all' || card.level === level)
      && (category === 'all' || card.category === category)
      && (!term || `${card.english} ${card.italian} ${card.publicId}`.toLocaleLowerCase('it').includes(term)));
  }, [cards, source, level, category, search]);

  function toggleDeck(deckId) {
    onDeckIdsChange(selectedDeckIds.includes(deckId)
      ? selectedDeckIds.filter((id) => id !== deckId)
      : [...selectedDeckIds, deckId]);
  }

  function toggleItem(itemId) {
    onItemIdsChange(selectedItemIds.includes(itemId)
      ? selectedItemIds.filter((id) => id !== itemId)
      : [...selectedItemIds, itemId]);
  }

  const fieldClass = 'rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white';

  return (
    <section className="rounded-2xl border border-sea/25 bg-sea/5 p-5 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/[0.05] sm:p-6">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} className="mt-1 h-4 w-4 accent-moss" />
        <span>
          <span className="flex items-center gap-2 text-lg font-black text-ink dark:text-white"><Sparkles className="h-5 w-5 text-sea" />Contenuti del percorso guidato</span>
          <span className="mt-1 block text-sm leading-6 text-ink/65 dark:text-white/60">Scegli deck completi oppure singole parole ed espressioni. Queste saranno le card visibili nel normale SRS dello studente.</span>
        </span>
      </label>

      {enabled ? (
        <div className="mt-6 grid gap-5">
          <div className="flex flex-wrap gap-2">
            {[['all', 'Tutti'], ...SOURCES.map((id) => [id, PRACTICE_TRAINERS[id].label])].map(([id, label]) => (
              <button key={id} type="button" onClick={() => { setSource(id); setLevel('all'); setCategory('all'); }} className={`rounded-full border px-3 py-2 text-xs font-black transition ${source === id ? 'border-ink bg-ink text-white dark:border-mint dark:bg-mint dark:text-ink' : 'border-ink/15 bg-white text-ink dark:border-white/15 dark:bg-white/5 dark:text-white'}`}>{label}</button>
            ))}
          </div>

          {decks.length ? (
            <div>
              <div className="flex items-end justify-between gap-3"><h3 className="text-sm font-black text-ink dark:text-white">Deck pubblicati</h3><span className="text-xs font-bold text-ink/50 dark:text-white/50">{selectedDeckIds.length} selezionati</span></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {decks.filter((deck) => source === 'all' || deck.trainerIds.has(source)).map((deck) => {
                  const selected = selectedDeckIds.includes(deck.id);
                  return <button key={deck.id} type="button" onClick={() => toggleDeck(deck.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-moss bg-mint/55 dark:border-emerald-300/40 dark:bg-emerald-400/15' : 'border-ink/10 bg-white hover:border-moss/40 dark:border-white/10 dark:bg-white/5'}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selected ? 'border-moss bg-moss text-white' : 'border-ink/20 dark:border-white/25'}`}>{selected ? <Check className="h-4 w-4" /> : null}</span><span><span className="block text-sm font-black text-ink dark:text-white">{deck.title}</span><span className="mt-0.5 block text-xs font-bold text-ink/50 dark:text-white/50">{unique(deck.itemIds).length} card</span></span></button>;
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_160px_220px]">
            <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-ink/35 dark:text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca parola o espressione" className={`${fieldClass} w-full pl-9`} /></label>
            <select value={level} onChange={(event) => { setLevel(event.target.value); setCategory('all'); }} className={fieldClass}><option value="all">Tutti i livelli</option>{levels.map((value) => <option key={value}>{value}</option>)}</select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}><option value="all">Tutte le categorie</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-sm font-black text-ink dark:text-white">{resolvedIds.length} card nel percorso <span className="font-semibold text-ink/55 dark:text-white/55">({selectedItemIds.length} singole, le altre dai deck)</span></p>
            <div className="flex gap-2"><button type="button" onClick={() => onItemIdsChange(unique([...selectedItemIds, ...filteredCards.map((card) => card.id)]))} className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-black dark:border-white/15">Seleziona risultati</button><button type="button" onClick={() => onItemIdsChange(selectedItemIds.filter((id) => !filteredCards.some((card) => card.id === id)))} className="rounded-full px-3 py-1.5 text-xs font-black text-red-700 dark:text-red-300">Rimuovi risultati</button></div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#101a17]">
            {loading ? <p className="p-5 text-sm font-bold text-ink/60 dark:text-white/60">Caricamento card pubblicate...</p> : null}
            {error ? <p className="p-5 text-sm font-bold text-red-700 dark:text-red-300">{error}</p> : null}
            {!loading && !error && filteredCards.map((card) => {
              const direct = selectedItemIds.includes(card.id);
              const inherited = inheritedIds.has(card.id);
              const selected = direct || inherited;
              return (
                <button key={card.id} type="button" onClick={() => toggleItem(card.id)} className="flex w-full items-center gap-3 border-b border-ink/10 px-4 py-3 text-left last:border-0 hover:bg-linen/40 dark:border-white/10 dark:hover:bg-white/5">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${selected ? 'border-moss bg-moss text-white' : 'border-ink/20 dark:border-white/25'}`}>{selected ? <Check className="h-4 w-4" /> : null}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-ink dark:text-white">{card.english}</span><span className="mt-0.5 block truncate text-xs font-semibold text-ink/55 dark:text-white/55">{card.italian}</span></span>
                  <span className="shrink-0 text-right text-[0.68rem] font-black uppercase text-ink/45 dark:text-white/45">{card.level}<br />{inherited && !direct ? 'nel deck' : PRACTICE_TRAINERS[card.trainerId]?.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
