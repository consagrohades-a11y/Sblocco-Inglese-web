import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Check, Plus, Save, Search, Send, Trash2, Undo2 } from 'lucide-react';
import SEO from '../components/SEO';
import ContentAreaNav from '../components/admin/ContentAreaNav';
import { supabase } from '../lib/supabaseClient.js';

const emptyDeck = {
  id: '',
  public_id: '',
  title: '',
  description: '',
  collection_type: 'reusable',
  content_type: 'expression',
  status: 'draft',
  card_ids: [],
};

const fieldClass = 'w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/15 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

const statusLabels = {
  draft: 'Bozza',
  review_needed: 'Da revisionare',
  approved: 'Approvato',
  published: 'Pubblicato',
  archived: 'Archiviato',
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normaliseIdInput(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '');
}

function batchOf(card) {
  const tag = (card.tags || []).find((value) => String(value).toLowerCase().startsWith('batch:'));
  return tag ? tag.slice(tag.indexOf(':') + 1).trim() : '';
}

function Field({ label, children }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-wide text-ink/65 dark:text-white/65">{label}</span><div className="mt-1.5">{children}</div></label>;
}

const domainConfig = {
  general: { label: 'General Expressions', navType: 'expression' },
  business: { label: 'Business Expressions', navType: 'business' },
  hospitality: { label: 'Hospitality Expressions', navType: 'hospitality' },
};

export default function AdminDecks({ itemType = 'word', domain = 'general' }) {
  const isWord = itemType === 'word';
  const area = isWord ? { label: 'Word Trainer', navType: 'word' } : domainConfig[domain];
  const cardLabel = isWord ? 'card' : 'expression card';
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

  const blankDeck = useMemo(() => ({ ...emptyDeck, content_type: isWord ? 'word' : 'expression' }), [isWord]);

  async function loadData(preferredDeckId = null) {
    setLoading(true);
    const requests = [
      isWord
        ? supabase.rpc('admin_list_word_decks')
        : supabase.rpc('admin_list_expression_decks', { p_domain: domain }),
      supabase.rpc(isWord ? 'admin_list_word_cards' : 'admin_list_expression_cards'),
    ];
    if (!isWord) requests.push(supabase.rpc('admin_list_word_cards'));
    const [deckResult, cardResult, wordResult] = await Promise.all(requests);
    const deckError = deckResult.error;
    const cardError = cardResult.error || wordResult?.error;
    if (deckError || cardError) {
      setError(`Impossibile caricare deck e ${cardLabel}. Applica la migrazione Deck in Supabase.`);
      setDecks([]);
      setCards([]);
    } else {
      const nextDecks = deckResult.data || [];
      setDecks(nextDecks);
      const expressionCards = (cardResult.data || [])
        .filter((card) => isWord || card.primary_domain === domain)
        .map((card) => ({ ...card, item_type: isWord ? 'word' : 'expression' }));
      const wordCards = isWord ? [] : (wordResult.data || []).map((card) => ({ ...card, item_type: 'word' }));
      setCards([...expressionCards, ...wordCards]);
      setError('');
      const deckToOpen = nextDecks.find((deck) => deck.id === preferredDeckId)
        || nextDecks.find((deck) => deck.id === selected.id);
      if (deckToOpen) {
        setSelected({ ...blankDeck, ...deckToOpen, card_ids: deckToOpen.card_ids || [] });
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
      (isWord || selected.content_type === 'mixed' || card.item_type === 'expression')
      && (level === 'all' || card.level === level)
      && (category === 'all' || card.topic === category)
      && (batch === 'all' || batchOf(card) === batch)
      && (!needle || [card.public_id, card.lemma, card.canonical_text, card.italian_meaning, card.topic].some((value) => String(value || '').toLowerCase().includes(needle))));
  }, [cards, isWord, selected.content_type, query, level, category, batch]);

  const visibleIds = filteredCards.map((card) => card.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCardIds.includes(id));

  function openDeck(deck) {
    setSelected({ ...blankDeck, ...deck, card_ids: deck.card_ids || [] });
    setSelectedCardIds(deck.card_ids || []);
    setError('');
    setMessage('');
  }

  function newDeck() {
    setSelected(blankDeck);
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

  function updateContentType(value) {
    updateField('content_type', value);
    if (value === 'expression') {
      const expressionIds = new Set(cards.filter((card) => card.item_type === 'expression').map((card) => card.id));
      setSelectedCardIds((current) => current.filter((id) => expressionIds.has(id)));
    }
  }

  function toggleCard(cardId) {
    setSelectedCardIds((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  }

  function toggleVisible() {
    setSelectedCardIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])));
  }

  async function saveDeck(nextStatus = selected.status || 'draft') {
    const publicId = String(selected.public_id || '').trim();
    const title = String(selected.title || '').trim();
    if (!publicId || !title) {
      setError('Inserisci ID e titolo del deck.');
      return;
    }
    if (nextStatus === 'published' && selectedCardIds.length === 0) {
      setError('Aggiungi almeno una card prima di pubblicare il deck.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    const rpcName = isWord ? 'admin_save_word_deck' : 'admin_save_expression_deck';
    const itemsRpcName = isWord ? 'admin_replace_word_deck_items' : 'admin_replace_expression_deck_items';
    const safeInitialStatus = nextStatus === 'published' ? 'draft' : nextStatus;
    const basePayload = {
      ...selected,
      id: selected.id || null,
      public_id: publicId,
      title,
      content_domain: domain,
      content_type: isWord ? 'word' : selected.content_type,
    };

    const { data: deckId, error: saveError } = await supabase.rpc(rpcName, {
      p_deck: { ...basePayload, status: safeInitialStatus },
    });
    if (saveError) {
      setError(saveError.message || 'Salvataggio deck non riuscito.');
      setSaving(false);
      return;
    }

    const { error: itemsError } = await supabase.rpc(itemsRpcName, {
      p_deck_id: deckId,
      p_card_ids: selectedCardIds,
    });
    if (itemsError) {
      setError(`Deck salvato, ma le card non sono state aggiornate: ${itemsError.message}`);
      setSaving(false);
      return;
    }

    if (nextStatus === 'published') {
      const { error: publishError } = await supabase.rpc(rpcName, {
        p_deck: { ...basePayload, id: deckId, status: 'published' },
      });
      if (publishError) {
        setError(`Le card sono state salvate, ma il deck non è stato pubblicato: ${publishError.message}`);
        setSaving(false);
        await loadData(deckId);
        return;
      }
    }

    const actionLabel = nextStatus === 'published'
      ? 'pubblicato'
      : nextStatus === 'archived'
        ? 'archiviato'
        : nextStatus === 'draft'
          ? 'salvato come bozza'
          : 'salvato';
    setMessage(`Deck ${actionLabel} con ${selectedCardIds.length} card.`);
    await loadData(deckId);
    setSaving(false);
  }

  async function deleteDeck() {
    if (!selected.id || !window.confirm(`Eliminare definitivamente il deck "${selected.title}"? Le card non verranno eliminate.`)) return;
    setSaving(true);
    setError('');
    setMessage('');
    const { error: deleteError } = await supabase.rpc(isWord ? 'admin_delete_word_deck' : 'admin_delete_expression_deck', { p_deck_id: selected.id });
    if (deleteError) {
      setError(deleteError.message || 'Eliminazione deck non riuscita.');
    } else {
      setSelected(blankDeck);
      setSelectedCardIds([]);
      setMessage('Deck eliminato. Le card sono rimaste disponibili.');
      await loadData();
    }
    setSaving(false);
  }

  return (
    <>
      <SEO title={`Deck ${area.label} | Pannello admin | Sblocco Inglese`} description={`Crea deck e organizza le ${cardLabel}.`} />
      <section className="section-shell py-5 lg:py-6">
        <div className="mx-auto max-w-[96rem]">
          <ContentAreaNav type={area.navType} />
          <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,0.8fr)_minmax(24rem,1.2fr)]">
            <aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-4 xl:h-[calc(100vh-6rem)] xl:overflow-y-auto">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-wide text-moss">{area.label}</p><h1 className="mt-1 text-xl font-black text-ink dark:text-white">Deck</h1></div>
                <button type="button" onClick={newDeck} className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-ink text-white dark:bg-mint dark:text-ink" aria-label="Nuovo deck"><Plus className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-ink/65 dark:text-white/65">Crea gruppi riutilizzabili di card. Solo i deck pubblicati compaiono nelle assegnazioni.</p>
              <div className="mt-4 grid gap-2">
                {loading ? <p className="text-sm font-bold text-ink/65 dark:text-white/65">Caricamento...</p> : null}
                {!loading && decks.length === 0 ? <p className="rounded-lg border border-dashed border-ink/15 p-3 text-sm font-semibold text-ink/60 dark:border-white/15 dark:text-white/60">Nessun deck. Creane uno.</p> : null}
                {decks.map((deck) => <button key={deck.id} type="button" onClick={() => openDeck(deck)} className={`focus-ring rounded-lg border p-3 text-left transition ${selected.id === deck.id ? 'border-moss bg-mint/50 dark:border-emerald-300 dark:bg-emerald-400/15' : 'border-ink/10 hover:border-moss/30 dark:border-white/10 dark:hover:bg-white/5'}`}><span className="block font-black text-ink dark:text-white">{deck.title}</span><span className="mt-1 block text-xs font-bold text-ink/65 dark:text-white/65">{deck.card_count} card · {statusLabels[deck.status] || deck.status}</span></button>)}
              </div>
            </aside>

            <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-4 xl:self-start">
              <p className="text-xs font-black uppercase tracking-wide text-moss">{selected.id ? 'Modifica deck' : 'Nuovo deck'}</p>
              <h2 className="mt-1 text-xl font-black text-ink dark:text-white">Dati e pubblicazione</h2>
              <div className="mt-5 grid gap-4">
                <Field label="ID pubblico"><input value={selected.public_id} onChange={(event) => updateField('public_id', normaliseIdInput(event.target.value))} onBlur={(event) => updateField('public_id', slugify(event.target.value))} placeholder="travel-english" className={fieldClass} /></Field>
                <Field label="Titolo"><input value={selected.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Travel English" className={fieldClass} /></Field>
                <Field label="Descrizione"><textarea rows="4" value={selected.description || ''} onChange={(event) => updateField('description', event.target.value)} className={fieldClass} /></Field>
                {!isWord ? <Field label="Contenuto"><select value={selected.content_type || 'expression'} onChange={(event) => updateContentType(event.target.value)} className={fieldClass}><option value="expression">Solo Expressions</option><option value="mixed">Misto: Words + Expressions</option></select></Field> : null}
                <Field label="Tipo"><select value={selected.collection_type} onChange={(event) => updateField('collection_type', event.target.value)} className={fieldClass}><option value="reusable">Riutilizzabile</option><option value="starter_pack">Starter pack</option><option value="specialist">Specialistico</option></select></Field>
              </div>

              <div className="mt-5 rounded-xl border border-ink/10 bg-linen/45 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-ink/60 dark:text-white/60">Stato attuale</p><p className="mt-1 text-base font-black text-ink dark:text-white">{statusLabels[selected.status] || selected.status}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-black ${selected.status === 'published' ? 'bg-mint text-moss dark:bg-emerald-400/15 dark:text-emerald-200' : selected.status === 'archived' ? 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/65' : 'bg-white text-ink dark:bg-white/10 dark:text-white'}`}>{selectedCardIds.length} card</span></div>
                <p className="mt-2 text-xs font-semibold leading-5 text-ink/65 dark:text-white/65">Pubblica il deck per renderlo selezionabile nelle assegnazioni. Le singole card devono essere pubblicate per essere incluse nello SRS.</p>
              </div>

              <button type="button" disabled={saving} onClick={() => saveDeck(selected.status || 'draft')} className="focus-ring mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink transition hover:bg-linen disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:text-white"><Save className="h-4 w-4" />{saving ? 'Salvataggio...' : 'Salva modifiche'}</button>
              {selected.status !== 'published' ? <button type="button" disabled={saving} onClick={() => saveDeck('published')} className="focus-ring mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-moss disabled:opacity-50 dark:bg-mint dark:text-ink"><Send className="h-4 w-4" />Pubblica deck</button> : <button type="button" disabled={saving} onClick={() => saveDeck('draft')} className="focus-ring mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/15 px-5 py-3 text-sm font-black text-ink transition hover:bg-linen disabled:opacity-50 dark:border-white/20 dark:text-white"><Undo2 className="h-4 w-4" />Riporta in bozza</button>}
              {selected.id && selected.status !== 'archived' ? <button type="button" disabled={saving} onClick={() => saveDeck('archived')} className="focus-ring mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/5"><Archive className="h-4 w-4" />Archivia deck</button> : null}
              {selected.id && selected.status !== 'published' ? <button type="button" disabled={saving} onClick={deleteDeck} className="focus-ring mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-red-300 px-4 py-2 text-sm font-black text-red-800 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-300/30 dark:text-red-200 dark:hover:bg-red-300/10"><Trash2 className="h-4 w-4" />Elimina definitivamente</button> : null}
              {error ? <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900 dark:border-red-300/30 dark:bg-red-300/10 dark:text-red-200">{error}</p> : null}
              {message ? <p className="mt-4 rounded-lg border border-moss/25 bg-mint/40 p-3 text-sm font-bold text-ink dark:border-emerald-300/25 dark:bg-emerald-400/10 dark:text-emerald-100">{message}</p> : null}
            </section>

            <section className="min-h-0 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-4 xl:flex xl:h-[calc(100vh-6rem)] xl:flex-col xl:overflow-hidden">
              <div className="shrink-0">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-moss">Composizione</p><h2 className="mt-1 text-xl font-black text-ink dark:text-white">{selectedCardIds.length} card nel deck</h2></div><button type="button" onClick={toggleVisible} disabled={!visibleIds.length} className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-xs font-black text-ink disabled:opacity-40 dark:border-white/20 dark:text-white">{allVisibleSelected ? 'Rimuovi visibili' : 'Aggiungi visibili'}</button></div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <label className="relative sm:col-span-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink/60 dark:text-white/60" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cerca ${isWord ? 'parola' : selected.content_type === 'mixed' ? 'parola o espressione' : 'espressione'}, italiano, categoria o ID`} className={`${fieldClass} pl-9`} /></label>
                  <select value={level} onChange={(event) => setLevel(event.target.value)} className={fieldClass}><option value="all">Tutti i livelli</option>{levels.map((value) => <option key={value}>{value}</option>)}</select>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}><option value="all">Tutte le categorie</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
                  <select value={batch} onChange={(event) => setBatch(event.target.value)} className={`${fieldClass} sm:col-span-2`}><option value="all">Tutti i batch</option>{batches.map((value) => <option key={value}>{value}</option>)}</select>
                </div>
              </div>
              <div className="mt-4 min-h-0 flex-1 divide-y divide-ink/10 overflow-y-auto overscroll-contain rounded-xl border border-ink/10 dark:divide-white/10 dark:border-white/10">
                {filteredCards.map((card) => { const active = selectedCardIds.includes(card.id); return <button key={card.id} type="button" onClick={() => toggleCard(card.id)} className={`focus-ring flex w-full items-center gap-3 p-3 text-left transition ${active ? 'bg-mint/45 dark:bg-emerald-400/10' : 'hover:bg-linen/50 dark:hover:bg-white/5'}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${active ? 'border-moss bg-moss text-white' : 'border-ink/20 dark:border-white/20'}`}>{active ? <Check className="h-4 w-4" /> : null}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-black text-ink dark:text-white">{card.lemma || card.canonical_text}</span>{!isWord && selected.content_type === 'mixed' ? <span className="shrink-0 rounded-full border border-ink/10 px-2 py-0.5 text-[10px] font-black uppercase text-ink/65 dark:border-white/15 dark:text-white/65">{card.item_type === 'word' ? 'Word' : 'Expression'}</span> : null}</span><span className="block truncate text-xs font-semibold text-ink/65 dark:text-white/65">{card.italian_meaning} · {card.level} · {card.topic}{batchOf(card) ? ` · batch ${batchOf(card)}` : ''}</span></span></button>; })}
                {!loading && filteredCards.length === 0 ? <p className="p-4 text-sm font-bold text-ink/65 dark:text-white/65">Nessuna card corrisponde ai filtri.</p> : null}
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
