import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Save, Search, Trash2 } from 'lucide-react';
import SEO from '../components/SEO';
import ContentAreaNav from '../components/admin/ContentAreaNav';
import { supabase } from '../lib/supabaseClient.js';

const emptyDeck = {
  id: '',
  public_id: '',
  title: '',
  description: '',
  collection_type: 'reusable',
  status: 'draft',
  card_ids: [],
};

const fieldClass = 'w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/15 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function batchOf(card) {
  const tag = (card.tags || []).find((value) => String(value).toLowerCase().startsWith('batch:'));
  return tag ? tag.slice(tag.indexOf(':') + 1).trim() : '';
}

function Field({ label, children }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-wide text-ink/55 dark:text-white/65">{label}</span><div className="mt-1.5">{children}</div></label>;
}

export default function AdminWordDecks() {
  const [decks, setDecks] = useState([]);
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState(emptyDeck);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');
  const [batch, setBatch] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadData(preferredDeckId = null) {
    setLoading(true);
    const [{ data: deckData, error: deckError }, { data: cardData, error: cardError }] = await Promise.all([
      supabase.rpc('admin_list_word_decks'),
      supabase.rpc('admin_list_word_cards'),
    ]);
    if (deckError || cardError) {
      setError('Impossibile caricare deck e word card. Applica la migrazione Word deck in Supabase.');
      setDecks([]);
      setCards([]);
    } else {
      const nextDecks = deckData || [];
      setDecks(nextDecks);
      setCards(cardData || []);
      setError('');
      const deckToOpen = nextDecks.find((deck) => deck.id === preferredDeckId)
        || nextDecks.find((deck) => deck.id === selected.id);
      if (deckToOpen) {
        setSelected({ ...emptyDeck, ...deckToOpen, card_ids: deckToOpen.card_ids || [] });
        setSelectedCardIds(deckToOpen.card_ids || []);
      }
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const levels = useMemo(() => Array.from(new Set(cards.map((card) => card.level).filter(Boolean))).sort(), [cards]);
  const categories = useMemo(() => Array.from(new Set(cards.map((card) => card.topic).filter(Boolean))).sort(), [cards]);
  const batches = useMemo(() => Array.from(new Set(cards.map(batchOf).filter(Boolean))).sort(), [cards]);
  const filteredCards = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter((card) =>
      (level === 'all' || card.level === level)
      && (category === 'all' || card.topic === category)
      && (batch === 'all' || batchOf(card) === batch)
      && (!needle || [card.public_id, card.lemma, card.italian_meaning, card.topic].some((value) => String(value || '').toLowerCase().includes(needle))));
  }, [cards, query, level, category, batch]);

  const visibleIds = filteredCards.map((card) => card.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCardIds.includes(id));

  function openDeck(deck) {
    setSelected({ ...emptyDeck, ...deck, card_ids: deck.card_ids || [] });
    setSelectedCardIds(deck.card_ids || []);
    setError('');
    setMessage('');
  }

  function newDeck() {
    setSelected(emptyDeck);
    setSelectedCardIds([]);
    setError('');
    setMessage('');
  }

  function updateField(field, value) {
    setSelected((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title' && !current.id && (!current.public_id || current.public_id === slugify(current.title))) {
        next.public_id = slugify(value);
      }
      return next;
    });
    setMessage('');
  }

  function toggleCard(cardId) {
    setSelectedCardIds((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  }

  function toggleVisible() {
    setSelectedCardIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])));
  }

  async function saveDeck() {
    if (!selected.public_id.trim() || !selected.title.trim()) {
      setError('Inserisci ID e titolo del deck.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    const { data: deckId, error: saveError } = await supabase.rpc('admin_save_word_deck', {
      p_deck: { ...selected, id: selected.id || null },
    });
    if (saveError) {
      setError(saveError.message || 'Salvataggio deck non riuscito.');
      setSaving(false);
      return;
    }
    const { error: itemsError } = await supabase.rpc('admin_replace_word_deck_items', {
      p_deck_id: deckId,
      p_card_ids: selectedCardIds,
    });
    if (itemsError) {
      setError(`Deck salvato, ma le card non sono state aggiornate: ${itemsError.message}`);
    } else {
      setMessage(`Deck salvato con ${selectedCardIds.length} card.`);
      await loadData(deckId);
    }
    setSaving(false);
  }

  async function deleteDeck() {
    if (!selected.id || !window.confirm(`Eliminare definitivamente il deck "${selected.title}"? Le word card non verranno eliminate.`)) return;
    setSaving(true);
    setError('');
    setMessage('');
    const { error: deleteError } = await supabase.rpc('admin_delete_word_deck', { p_deck_id: selected.id });
    if (deleteError) {
      setError(deleteError.message || 'Eliminazione deck non riuscita.');
    } else {
      setSelected(emptyDeck);
      setSelectedCardIds([]);
      setMessage('Deck eliminato. Le word card sono rimaste disponibili.');
      await loadData();
    }
    setSaving(false);
  }

  return (
    <>
      <SEO title="Word deck | Pannello admin | Sblocco Inglese" description="Crea deck e organizza le Word card pubblicate." />
      <section className="section-shell py-5 lg:py-6">
        <div className="mx-auto max-w-[96rem]">
          <ContentAreaNav type="word" />
          <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,0.8fr)_minmax(24rem,1.2fr)]">
            <aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-4 xl:h-[calc(100vh-6rem)] xl:overflow-y-auto">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-wide text-moss">Word Trainer</p><h1 className="mt-1 text-xl font-black text-ink dark:text-white">Deck</h1></div>
                <button type="button" onClick={newDeck} className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-ink text-white dark:bg-mint dark:text-ink" aria-label="Nuovo deck"><Plus className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 grid gap-2">
                {loading ? <p className="text-sm font-bold text-ink/55 dark:text-white/55">Caricamento...</p> : null}
                {!loading && decks.length === 0 ? <p className="rounded-lg border border-dashed border-ink/15 p-3 text-sm font-semibold text-ink/60 dark:border-white/15 dark:text-white/60">Nessun deck. Creane uno.</p> : null}
                {decks.map((deck) => <button key={deck.id} type="button" onClick={() => openDeck(deck)} className={`focus-ring rounded-lg border p-3 text-left transition ${selected.id === deck.id ? 'border-moss bg-mint/50 dark:border-emerald-300 dark:bg-emerald-400/15' : 'border-ink/10 hover:border-moss/30 dark:border-white/10 dark:hover:bg-white/5'}`}><span className="block font-black text-ink dark:text-white">{deck.title}</span><span className="mt-1 block text-xs font-bold text-ink/50 dark:text-white/50">{deck.card_count} card · {deck.status}</span></button>)}
              </div>
            </aside>

            <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-4 xl:self-start">
              <p className="text-xs font-black uppercase tracking-wide text-moss">{selected.id ? 'Modifica deck' : 'Nuovo deck'}</p>
              <h2 className="mt-1 text-xl font-black text-ink dark:text-white">Dati del deck</h2>
              <div className="mt-5 grid gap-4">
                <Field label="ID pubblico"><input value={selected.public_id} onChange={(event) => updateField('public_id', slugify(event.target.value))} placeholder="travel-english" className={fieldClass} /></Field>
                <Field label="Titolo"><input value={selected.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Travel English" className={fieldClass} /></Field>
                <Field label="Descrizione"><textarea rows="4" value={selected.description || ''} onChange={(event) => updateField('description', event.target.value)} className={fieldClass} /></Field>
                <Field label="Tipo"><select value={selected.collection_type} onChange={(event) => updateField('collection_type', event.target.value)} className={fieldClass}><option value="reusable">Riutilizzabile</option><option value="starter_pack">Starter pack</option><option value="specialist">Specialistico</option></select></Field>
                <Field label="Stato"><select value={selected.status} onChange={(event) => updateField('status', event.target.value)} className={fieldClass}><option value="draft">Bozza</option><option value="published">Pubblicato</option><option value="archived">Archiviato</option></select></Field>
              </div>
              <button type="button" disabled={saving} onClick={saveDeck} className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-moss disabled:opacity-50 dark:bg-mint dark:text-ink"><Save className="h-4 w-4" />{saving ? 'Salvataggio...' : 'Salva deck e card'}</button>
              {selected.id && selected.status !== 'published' ? <button type="button" disabled={saving} onClick={deleteDeck} className="focus-ring mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-red-300 px-4 py-2 text-sm font-black text-red-800 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-300/30 dark:text-red-200 dark:hover:bg-red-300/10"><Trash2 className="h-4 w-4" />Elimina deck</button> : null}
              {error ? <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-300/30 dark:bg-red-300/10 dark:text-red-200">{error}</p> : null}
              {message ? <p className="mt-4 rounded-lg border border-moss/25 bg-mint/40 p-3 text-sm font-bold text-ink dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-100">{message}</p> : null}
            </section>

            <section className="min-h-0 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-4 xl:flex xl:h-[calc(100vh-6rem)] xl:flex-col xl:overflow-hidden">
              <div className="shrink-0">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-moss">Composizione</p><h2 className="mt-1 text-xl font-black text-ink dark:text-white">{selectedCardIds.length} card nel deck</h2></div><button type="button" onClick={toggleVisible} disabled={!visibleIds.length} className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-xs font-black text-ink disabled:opacity-40 dark:border-white/20 dark:text-white">{allVisibleSelected ? 'Rimuovi visibili' : 'Aggiungi visibili'}</button></div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <label className="relative sm:col-span-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink/40 dark:text-white/40" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca parola, italiano, categoria o ID" className={`${fieldClass} pl-9`} /></label>
                  <select value={level} onChange={(event) => setLevel(event.target.value)} className={fieldClass}><option value="all">Tutti i livelli</option>{levels.map((value) => <option key={value}>{value}</option>)}</select>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}><option value="all">Tutte le categorie</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
                  <select value={batch} onChange={(event) => setBatch(event.target.value)} className={`${fieldClass} sm:col-span-2`}><option value="all">Tutti i batch</option>{batches.map((value) => <option key={value}>{value}</option>)}</select>
                </div>
              </div>
              <div className="mt-4 min-h-0 flex-1 divide-y divide-ink/10 overflow-y-auto overscroll-contain rounded-xl border border-ink/10 dark:divide-white/10 dark:border-white/10">
                {filteredCards.map((card) => { const active = selectedCardIds.includes(card.id); return <button key={card.id} type="button" onClick={() => toggleCard(card.id)} className={`focus-ring flex w-full items-center gap-3 p-3 text-left transition ${active ? 'bg-mint/45 dark:bg-emerald-400/10' : 'hover:bg-linen/50 dark:hover:bg-white/5'}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${active ? 'border-moss bg-moss text-white' : 'border-ink/20 dark:border-white/20'}`}>{active ? <Check className="h-4 w-4" /> : null}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-ink dark:text-white">{card.lemma}</span><span className="block truncate text-xs font-semibold text-ink/50 dark:text-white/50">{card.italian_meaning} · {card.level} · {card.topic}</span></span></button>; })}
                {!loading && filteredCards.length === 0 ? <p className="p-4 text-sm font-bold text-ink/55 dark:text-white/55">Nessuna card corrisponde ai filtri.</p> : null}
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
