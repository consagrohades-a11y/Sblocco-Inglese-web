import React, { useEffect, useMemo, useState } from 'react';
import { Check, Layers3, Search, Sparkles, Tags } from 'lucide-react';
import { loadPublishedPracticeCards, PRACTICE_TRAINERS } from '../../lib/practiceContent.js';
import { supabase } from '../../lib/supabaseClient.js';

const SOURCES = ['word', 'general', 'business', 'hospitality'];

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'it'));
}

function normaliseDeck(row) {
  const sourceId = row.content_type === 'word' ? 'word' : row.content_domain || 'general';
  return {
    id: row.id,
    publicId: row.public_id,
    title: row.title,
    description: row.description || '',
    contentType: row.content_type,
    contentDomain: row.content_domain,
    sourceId,
    itemIds: unique(row.item_ids || []),
    publishedItemCount: Number(row.published_item_count || 0),
    totalItemCount: Number(row.total_item_count || 0),
  };
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
  const [publishedDecks, setPublishedDecks] = useState([]);
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

    Promise.all([
      Promise.all(SOURCES.map((trainerId) => loadPublishedPracticeCards(trainerId))),
      supabase.rpc('admin_list_assignment_decks'),
    ])
      .then(([groups, deckResult]) => {
        if (!active) return;
        const byId = new Map();
        groups.flat().forEach((card) => byId.set(card.id, card));
        setCards(Array.from(byId.values()));

        if (deckResult.error) {
          setPublishedDecks([]);
          setError('Le card sono disponibili, ma non è stato possibile caricare i deck pubblicati. Applica la migrazione assignment_decks_and_learner_controls in Supabase.');
        } else {
          setPublishedDecks((deckResult.data || []).map(normaliseDeck));
        }
      })
      .catch(() => {
        if (active) {
          setCards([]);
          setPublishedDecks([]);
          setError('Non è stato possibile caricare i contenuti pubblicati.');
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [enabled]);

  const fallbackDecks = useMemo(() => {
    const byId = new Map();
    cards.forEach((card) => (card.decks || []).forEach((deck) => {
      const current = byId.get(deck.id) || {
        id: deck.id,
        publicId: deck.publicId,
        title: deck.title,
        description: '',
        sourceId: card.trainerId,
        itemIds: [],
        publishedItemCount: 0,
        totalItemCount: 0,
      };
      current.itemIds.push(card.id);
      current.publishedItemCount = unique(current.itemIds).length;
      current.totalItemCount = current.publishedItemCount;
      byId.set(deck.id, current);
    }));
    return Array.from(byId.values());
  }, [cards]);

  const decks = useMemo(() => {
    const sourceDecks = publishedDecks.length ? publishedDecks : fallbackDecks;
    return sourceDecks
      .map((deck) => ({ ...deck, itemIds: unique(deck.itemIds) }))
      .sort((a, b) => a.title.localeCompare(b.title, 'it'));
  }, [publishedDecks, fallbackDecks]);

  const inheritedIds = useMemo(() => new Set(decks
    .filter((deck) => selectedDeckIds.includes(deck.id))
    .flatMap((deck) => deck.itemIds)), [decks, selectedDeckIds]);
  const resolvedIds = useMemo(() => unique([...selectedItemIds, ...inheritedIds]), [selectedItemIds, inheritedIds]);
  const resolvedSet = useMemo(() => new Set(resolvedIds), [resolvedIds]);
  const directSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);

  useEffect(() => { onResolvedItemIdsChange(resolvedIds); }, [resolvedIds.join('|')]);

  const levels = useMemo(() => unique(cards.filter((card) => source === 'all' || card.trainerId === source).map((card) => card.level)), [cards, source]);
  const categories = useMemo(() => unique(cards.filter((card) =>
    (source === 'all' || card.trainerId === source) && (level === 'all' || card.level === level)).map((card) => card.category)), [cards, source, level]);
  const filteredCards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('it');
    return cards.filter((card) => (source === 'all' || card.trainerId === source)
      && (level === 'all' || card.level === level)
      && (category === 'all' || card.category === category)
      && (!term || `${card.english} ${card.italian} ${card.publicId} ${card.batch}`.toLocaleLowerCase('it').includes(term)));
  }, [cards, source, level, category, search]);

  const visibleDecks = useMemo(() => decks.filter((deck) => source === 'all' || deck.sourceId === source), [decks, source]);

  const batches = useMemo(() => {
    const byKey = new Map();
    cards.forEach((card) => {
      if (!card.batch || (source !== 'all' && card.trainerId !== source)) return;
      const key = `${card.trainerId}:${card.batch}`;
      const current = byKey.get(key) || {
        key,
        name: card.batch,
        trainerId: card.trainerId,
        itemIds: [],
      };
      current.itemIds.push(card.id);
      byKey.set(key, current);
    });
    return Array.from(byKey.values())
      .map((batch) => ({ ...batch, itemIds: unique(batch.itemIds) }))
      .sort((a, b) => `${a.trainerId} ${a.name}`.localeCompare(`${b.trainerId} ${b.name}`, 'it'));
  }, [cards, source]);

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

  function toggleBatch(batch) {
    const allDirect = batch.itemIds.every((id) => directSet.has(id));
    onItemIdsChange(allDirect
      ? selectedItemIds.filter((id) => !batch.itemIds.includes(id))
      : unique([...selectedItemIds, ...batch.itemIds]));
  }

  const fieldClass = 'rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white';

  return (
    <section className="rounded-2xl border border-sea/25 bg-sea/5 p-5 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/[0.05] sm:p-6">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} className="mt-1 h-4 w-4 accent-moss" />
        <span>
          <span className="flex items-center gap-2 text-lg font-black text-ink dark:text-white"><Sparkles className="h-5 w-5 text-sea" />Word ed Expressions da studiare</span>
          <span className="mt-1 block text-sm leading-6 text-ink/65 dark:text-white/60">Seleziona deck pubblicati, batch completi oppure singole card. Tutto confluisce nel percorso SRS dello studente.</span>
        </span>
      </label>

      {enabled ? (
        <div className="mt-6 grid gap-6">
          <div className="flex flex-wrap gap-2">
            {[['all', 'Tutti i contenuti'], ...SOURCES.map((id) => [id, PRACTICE_TRAINERS[id].label])].map(([id, label]) => (
              <button key={id} type="button" onClick={() => { setSource(id); setLevel('all'); setCategory('all'); }} className={`rounded-full border px-3 py-2 text-xs font-black transition ${source === id ? 'border-ink bg-ink text-white dark:border-mint dark:bg-mint dark:text-ink' : 'border-ink/15 bg-white text-ink dark:border-white/15 dark:bg-white/5 dark:text-white'}`}>{label}</button>
            ))}
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-end justify-between gap-3">
              <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-moss"><Layers3 className="h-4 w-4" />Deck pubblicati</p><p className="mt-1 text-sm font-semibold text-ink/60 dark:text-white/60">Un deck aggiunge tutte le sue card pubblicate.</p></div>
              <span className="text-xs font-bold text-ink/50 dark:text-white/50">{selectedDeckIds.length} selezionati</span>
            </div>
            {visibleDecks.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visibleDecks.map((deck) => {
                  const selected = selectedDeckIds.includes(deck.id);
                  const unavailable = Math.max(0, deck.totalItemCount - deck.publishedItemCount);
                  return <button key={deck.id} type="button" onClick={() => toggleDeck(deck.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-moss bg-mint/55 dark:border-emerald-300/40 dark:bg-emerald-400/15' : 'border-ink/10 bg-white hover:border-moss/40 dark:border-white/10 dark:bg-white/5'}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selected ? 'border-moss bg-moss text-white' : 'border-ink/20 dark:border-white/25'}`}>{selected ? <Check className="h-4 w-4" /> : null}</span><span className="min-w-0"><span className="block truncate text-sm font-black text-ink dark:text-white">{deck.title}</span><span className="mt-0.5 block text-xs font-bold text-ink/50 dark:text-white/50">{deck.publishedItemCount} card{unavailable ? ` · ${unavailable} non pubblicate escluse` : ''}</span></span></button>;
                })}
              </div>
            ) : <p className="mt-3 rounded-xl border border-dashed border-ink/15 p-4 text-sm font-semibold text-ink/60 dark:border-white/15 dark:text-white/60">Nessun deck pubblicato per questo Trainer. Pubblica prima il deck dalla relativa pagina Deck.</p>}
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/55 p-4 dark:border-violet-300/15 dark:bg-violet-400/[0.06]">
            <div className="flex items-end justify-between gap-3">
              <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300"><Tags className="h-4 w-4" />Batch disponibili</p><p className="mt-1 text-sm font-semibold text-ink/60 dark:text-white/60">Seleziona in una volta tutte le card appartenenti a uno specifico batch.</p></div>
            </div>
            {batches.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {batches.map((batch) => {
                  const allDirect = batch.itemIds.every((id) => directSet.has(id));
                  const allResolved = batch.itemIds.every((id) => resolvedSet.has(id));
                  const inheritedOnly = allResolved && !allDirect;
                  return <button key={batch.key} type="button" onClick={() => toggleBatch(batch)} disabled={inheritedOnly} className={`rounded-xl border p-3 text-left transition ${allResolved ? 'border-violet-400 bg-white dark:border-violet-300/40 dark:bg-violet-400/10' : 'border-violet-200 bg-white/70 hover:border-violet-400 dark:border-violet-300/15 dark:bg-white/5'} disabled:cursor-default`}><span className="block text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">{PRACTICE_TRAINERS[batch.trainerId]?.label}</span><span className="mt-1 block text-sm font-black text-ink dark:text-white">{batch.name}</span><span className="mt-1 block text-xs font-semibold text-ink/55 dark:text-white/55">{batch.itemIds.length} card · {inheritedOnly ? 'incluso da un deck' : allDirect ? 'selezionato' : 'clicca per aggiungere'}</span></button>;
                })}
              </div>
            ) : <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-white/60">Nessun batch disponibile per questo filtro.</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_160px_220px]">
            <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-ink/35 dark:text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca parola, espressione, ID o batch" className={`${fieldClass} w-full pl-9`} /></label>
            <select value={level} onChange={(event) => { setLevel(event.target.value); setCategory('all'); }} className={fieldClass}><option value="all">Tutti i livelli</option>{levels.map((value) => <option key={value}>{value}</option>)}</select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}><option value="all">Tutte le categorie</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-sm font-black text-ink dark:text-white">{resolvedIds.length} card nel percorso <span className="font-semibold text-ink/55 dark:text-white/55">({selectedItemIds.length} selezionate direttamente, le altre dai deck)</span></p>
            <div className="flex gap-2"><button type="button" onClick={() => onItemIdsChange(unique([...selectedItemIds, ...filteredCards.map((card) => card.id)]))} className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-black dark:border-white/15">Seleziona risultati</button><button type="button" onClick={() => onItemIdsChange(selectedItemIds.filter((id) => !filteredCards.some((card) => card.id === id)))} className="rounded-full px-3 py-1.5 text-xs font-black text-red-700 dark:text-red-300">Rimuovi risultati</button></div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#101a17]">
            {loading ? <p className="p-5 text-sm font-bold text-ink/60 dark:text-white/60">Caricamento contenuti pubblicati...</p> : null}
            {error ? <p className="p-5 text-sm font-bold text-red-700 dark:text-red-300">{error}</p> : null}
            {!loading && filteredCards.map((card) => {
              const direct = selectedItemIds.includes(card.id);
              const inherited = inheritedIds.has(card.id);
              const selected = direct || inherited;
              return (
                <button key={card.id} type="button" onClick={() => toggleItem(card.id)} className="flex w-full items-center gap-3 border-b border-ink/10 px-4 py-3 text-left last:border-0 hover:bg-linen/40 dark:border-white/10 dark:hover:bg-white/5">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${selected ? 'border-moss bg-moss text-white' : 'border-ink/20 dark:border-white/25'}`}>{selected ? <Check className="h-4 w-4" /> : null}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-ink dark:text-white">{card.english}</span><span className="mt-0.5 block truncate text-xs font-semibold text-ink/55 dark:text-white/55">{card.italian}{card.batch ? ` · batch ${card.batch}` : ''}</span></span>
                  <span className="shrink-0 text-right text-[0.68rem] font-black uppercase text-ink/45 dark:text-white/45">{card.level}<br />{inherited && !direct ? 'nel deck' : PRACTICE_TRAINERS[card.trainerId]?.label}</span>
                </button>
              );
            })}
            {!loading && !error && filteredCards.length === 0 ? <p className="p-5 text-sm font-bold text-ink/60 dark:text-white/60">Nessuna card corrisponde ai filtri.</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
