import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import SrsCard from '../components/SrsCard';
import ContentAreaNav from '../components/admin/ContentAreaNav';
import { supabase } from '../lib/supabaseClient.js';
import useDarkMode from '../hooks/useDarkMode.js';
import {
  filterAdminCards,
  getNextQueueCard,
  getQueueLabel,
  getQueuePosition,
  isCardPublishable,
  reviewFilterOptions,
} from '../lib/cardWorkflow.js';

const emptyCard = {
  id: '',
  public_id: '',
  canonical_text: '',
  italian_meaning: '',
  english_explanation: '',
  communicative_function: '',
  primary_context: '',
  level: 'A2',
  primary_domain: 'general',
  topic: '',
  priority: 'useful',
  register: 'neutral',
  usage_channel: 'both',
  tone: '',
  accepted_answers: [],
  pronunciation_ipa_us: '',
  pronunciation_learner_us: '',
  example_1: '',
  example_2: '',
  usage_note: '',
  collocations: [],
  tags: [],
  status: 'draft',
  review_status: 'pending',
  review_decision: '',
  review_notes: '',
};

const splitLines = (value) => String(value || '')
  .split('\n')
  .map((item) => item.trim())
  .filter(Boolean);

const joinLines = (value) => (Array.isArray(value) ? value.join('\n') : '');

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-ink/55 dark:text-white/65">
        {label}{required ? ' *' : ''}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass = 'w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/15 dark:bg-[#101a17] dark:text-white dark:placeholder:text-white/35 dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

export default function AdminTrainerContent() {
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState(emptyCard);
  const [query, setQuery] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [previewRevealed, setPreviewRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedForPublish, setSelectedForPublish] = useState([]);
  const [publishingBatch, setPublishingBatch] = useState(false);
  const darkMode = useDarkMode();

  async function loadCards() {
    setLoading(true);
    setError('');

    const { data, error: rpcError } = await supabase.rpc('admin_list_expression_cards');

    if (rpcError) {
      setError('Impossibile caricare i contenuti. Verifica che la migrazione admin_trainer_content sia stata applicata in Supabase.');
      setCards([]);
    } else {
      setCards(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCards();
  }, []);

  const filteredCards = useMemo(
    () => filterAdminCards(cards, reviewFilter, query, ['canonical_text', 'italian_meaning', 'public_id', 'topic']),
    [cards, query, reviewFilter],
  );

  const selectedQueueIndex = useMemo(
    () => getQueuePosition(filteredCards, selected.id),
    [filteredCards, selected.id],
  );
  const nextCard = getNextQueueCard(filteredCards, selectedQueueIndex);
  const queueLabel = getQueueLabel(filteredCards, selectedQueueIndex);
  const publishableCards = useMemo(
    () => filteredCards.filter((card) => isCardPublishable(card, 'expression')),
    [filteredCards],
  );
  const allPublishableSelected = publishableCards.length > 0
    && publishableCards.every((card) => selectedForPublish.includes(card.id));

  const previewCard = useMemo(() => {
    const pronunciation = [selected.pronunciation_ipa_us, selected.pronunciation_learner_us]
      .filter(Boolean)
      .join('  ·  ');

    return {
      id: selected.public_id || 'preview-card',
      category: selected.topic || selected.primary_context || 'General English',
      level: selected.level || 'A2',
      type: 'Expression',
      expression: selected.canonical_text || 'Your English expression',
      pronunciation: pronunciation || 'American pronunciation will appear here',
      italian: selected.italian_meaning || 'Il significato italiano apparirà qui',
      collocations: selected.collocations.length > 0 ? selected.collocations.join(' · ') : '',
      example1: selected.example_1 || 'Your first natural example will appear here.',
      example2: selected.example_2 || 'Your second natural example will appear here.',
      note: selected.usage_note || selected.english_explanation || 'A specific usage note will appear here.',
    };
  }, [selected]);

  function updateField(field, value) {
    setSelected((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function openCard(card, options = {}) {
    setSelected({
      ...emptyCard,
      ...card,
      accepted_answers: card.accepted_answers ?? [],
      collocations: card.collocations ?? [],
      tags: card.tags ?? [],
    });
    setPreviewRevealed(false);
    setMessage(options.feedback || '');
    setError('');
    if (options.scroll !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function newCard() {
    setSelected({
      ...emptyCard,
      public_id: `general-${String(cards.length + 1).padStart(4, '0')}`,
    });
    setPreviewRevealed(false);
    setMessage('');
    setError('');
  }

  async function saveCard(nextStatus = selected.status, nextReviewStatus = selected.review_status, advanceToNext = false) {
    const nextCardBeforeSave = advanceToNext ? nextCard : null;
    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      ...selected,
      id: selected.id || null,
      status: nextStatus,
      review_status: nextReviewStatus,
      accepted_answers: selected.accepted_answers,
      collocations: selected.collocations,
      tags: selected.tags,
    };

    const { data, error: rpcError } = await supabase.rpc('admin_save_expression_card', { p_card: payload });

    if (rpcError) {
      setError(rpcError.message || 'Salvataggio non riuscito.');
    } else {
      const successMessage = nextStatus === 'published' ? 'Carta pubblicata.' : nextReviewStatus === 'approved' ? 'Carta approvata.' : 'Bozza salvata.';
      await loadCards();
      if (nextCardBeforeSave) {
        openCard(nextCardBeforeSave, { feedback: `${successMessage} Prossima carta caricata.` });
      } else {
        setSelected((current) => ({ ...current, id: data, status: nextStatus, review_status: nextReviewStatus }));
        setMessage(advanceToNext ? `${successMessage} Hai completato l'ultima carta della coda.` : successMessage);
      }
    }

    setSaving(false);
  }

  function togglePublishSelection(cardId) {
    setSelectedForPublish((current) => current.includes(cardId)
      ? current.filter((id) => id !== cardId)
      : [...current, cardId]);
  }

  function toggleAllPublishable() {
    const visibleIds = publishableCards.map((card) => card.id);
    setSelectedForPublish((current) => {
      if (allPublishableSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function publishSelectedCards() {
    if (selectedForPublish.length === 0) return;
    if (!window.confirm(`Pubblicare ${selectedForPublish.length} expression card approvate?`)) return;

    setPublishingBatch(true);
    setError('');
    setMessage('');
    const idsToPublish = [...selectedForPublish];
    const { data, error: rpcError } = await supabase.rpc('admin_publish_expression_cards', {
      p_card_ids: idsToPublish,
    });

    if (rpcError) {
      setError(rpcError.message || 'Pubblicazione batch non riuscita.');
    } else {
      setSelectedForPublish([]);
      setSelected((current) => idsToPublish.includes(current.id)
        ? { ...current, status: 'published' }
        : current);
      setMessage(`${data || idsToPublish.length} expression card pubblicate.`);
      await loadCards();
    }
    setPublishingBatch(false);
  }

  const canPublish = isCardPublishable(selected, 'expression');

  return (
    <>
      <SEO
        title="Contenuti Trainer | Pannello admin | Sblocco Inglese"
        description="Crea, revisiona e pubblica le carte Trainer."
      />

      <section className="section-shell py-5 lg:py-6">
        <div className="mx-auto max-w-[96rem]">
          <ContentAreaNav type="expression" />
          <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="eyebrow">Contenuti Trainer</span>
              <h1 className="mt-2 text-2xl font-black text-ink dark:text-white sm:text-3xl">Espressioni General</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70 dark:text-white/65">
                Le nuove carte vengono salvate direttamente in Supabase come bozze. Solo le carte complete e approvate possono essere pubblicate.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={newCard}
                className="focus-ring min-h-10 rounded-full bg-ink px-4 py-2 text-sm font-black text-white transition hover:bg-moss dark:bg-emerald-400 dark:text-[#07120f] dark:hover:bg-emerald-300"
              >
                Nuova carta
              </button>
              <Link
                to="/admin"
                className="focus-ring inline-flex min-h-10 items-center rounded-full border border-ink/15 px-4 py-2 text-sm font-black text-ink transition hover:bg-linen dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              >
                Pannello admin
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.72fr)]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveCard();
              }}
              className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3 dark:border-white/10">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-moss">
                    {selected.id ? 'Modifica carta' : 'Nuova bozza'}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-ink dark:text-white">
                    {selected.canonical_text || 'Carta senza titolo'}
                  </h2>
                </div>
                <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black text-ink dark:bg-white/10 dark:text-white">
                  {selected.status} · {selected.review_status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="ID pubblico" required>
                  <input className={inputClass} value={selected.public_id} onChange={(event) => updateField('public_id', event.target.value)} />
                </Field>
                <Field label="Livello" required>
                  <select className={inputClass} value={selected.level} onChange={(event) => updateField('level', event.target.value)}>
                    <option>A2</option>
                    <option>B1</option>
                    <option>B2</option>
                    <option>C1</option>
                  </select>
                </Field>
                <Field label="Espressione inglese" required>
                  <input className={inputClass} value={selected.canonical_text} onChange={(event) => updateField('canonical_text', event.target.value)} />
                </Field>
                <Field label="Significato italiano" required>
                  <input className={inputClass} value={selected.italian_meaning} onChange={(event) => updateField('italian_meaning', event.target.value)} />
                </Field>
                <Field label="Funzione comunicativa" required>
                  <input className={inputClass} value={selected.communicative_function} onChange={(event) => updateField('communicative_function', event.target.value)} placeholder="es. chiedere chiarimenti" />
                </Field>
                <Field label="Contesto principale" required>
                  <input className={inputClass} value={selected.primary_context} onChange={(event) => updateField('primary_context', event.target.value)} placeholder="es. conversazione quotidiana" />
                </Field>
                <Field label="Categoria">
                  <input className={inputClass} value={selected.topic} onChange={(event) => updateField('topic', event.target.value)} />
                </Field>
                <Field label="Registro">
                  <select className={inputClass} value={selected.register} onChange={(event) => updateField('register', event.target.value)}>
                    <option value="informal">Informale</option>
                    <option value="neutral">Neutro</option>
                    <option value="professional">Professionale</option>
                    <option value="formal">Formale</option>
                  </select>
                </Field>
              </div>

              <div className="mt-5 grid gap-3">
                <Field label="Spiegazione d'uso" required>
                  <textarea rows="2" className={inputClass} value={selected.english_explanation} onChange={(event) => updateField('english_explanation', event.target.value)} />
                </Field>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Pronuncia IPA americana">
                    <input className={inputClass} value={selected.pronunciation_ipa_us} onChange={(event) => updateField('pronunciation_ipa_us', event.target.value)} placeholder="/aɪm ɑn maɪ weɪ/" />
                  </Field>
                  <Field label="Pronuncia facilitata americana">
                    <input className={inputClass} value={selected.pronunciation_learner_us} onChange={(event) => updateField('pronunciation_learner_us', event.target.value)} />
                  </Field>
                </div>

                <Field label="Risposte accettate, una per riga">
                  <textarea rows="2" className={inputClass} value={joinLines(selected.accepted_answers)} onChange={(event) => updateField('accepted_answers', splitLines(event.target.value))} />
                </Field>
                <Field label="Esempio 1">
                  <textarea rows="2" className={inputClass} value={selected.example_1} onChange={(event) => updateField('example_1', event.target.value)} />
                </Field>
                <Field label="Esempio 2">
                  <textarea rows="2" className={inputClass} value={selected.example_2} onChange={(event) => updateField('example_2', event.target.value)} />
                </Field>
                <Field label="Nota d'uso">
                  <textarea rows="2" className={inputClass} value={selected.usage_note} onChange={(event) => updateField('usage_note', event.target.value)} />
                </Field>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Collocazioni, una per riga">
                    <textarea rows="2" className={inputClass} value={joinLines(selected.collocations)} onChange={(event) => updateField('collocations', splitLines(event.target.value))} />
                  </Field>
                  <Field label="Tag, uno per riga">
                    <textarea rows="2" className={inputClass} value={joinLines(selected.tags)} onChange={(event) => updateField('tags', splitLines(event.target.value))} />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Decisione revisione">
                    <select className={inputClass} value={selected.review_decision || ''} onChange={(event) => updateField('review_decision', event.target.value)}>
                      <option value="">Da decidere</option>
                      <option value="approve">Approva</option>
                      <option value="approve_after_edit">Approva dopo modifica</option>
                      <option value="rewrite">Riscrivi</option>
                      <option value="merge">Unisci</option>
                      <option value="reclassify">Riclassifica</option>
                      <option value="reject">Rifiuta</option>
                    </select>
                  </Field>
                  <Field label="Stato contenuto">
                    <select className={inputClass} value={selected.status} onChange={(event) => updateField('status', event.target.value)}>
                      <option value="draft">Bozza</option>
                      <option value="review_needed">Da revisionare</option>
                      <option value="approved">Approvata</option>
                      <option value="published">Pubblicata</option>
                      <option value="archived">Archiviata</option>
                    </select>
                  </Field>
                </div>

                <Field label="Note di revisione">
                  <textarea rows="2" className={inputClass} value={selected.review_notes || ''} onChange={(event) => updateField('review_notes', event.target.value)} />
                </Field>
              </div>

              {error ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="mt-5 rounded-xl border border-moss/20 bg-mint/30 p-4 text-sm font-bold text-ink">
                  {message}
                </div>
              ) : null}

              <div className="fixed bottom-2 left-1/2 z-[70] max-h-[45vh] w-[calc(100vw-1rem)] max-w-6xl -translate-x-1/2 overflow-y-auto rounded-xl border border-ink/15 bg-white/95 p-2.5 shadow-[0_14px_40px_rgba(24,34,31,0.2)] backdrop-blur-xl dark:border-white/15 dark:bg-[#16211e]/95 dark:shadow-[0_14px_40px_rgba(0,0,0,0.42)] sm:p-3 lg:flex lg:items-center lg:justify-between lg:gap-4">
                <div className="mb-2 flex shrink-0 items-center justify-between gap-3 lg:mb-0">
                  <p className="text-xs font-black uppercase tracking-wide text-ink/55 dark:text-white/65">Coda di revisione · {queueLabel}</p>
                  {saving ? <span className="text-xs font-black text-moss dark:text-emerald-300">Salvataggio...</span> : null}
                </div>
                <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                  <button disabled={saving} type="submit" className="focus-ring min-h-11 rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-ink/45 disabled:text-white/75 dark:bg-white dark:text-ink dark:hover:bg-emerald-200 dark:disabled:bg-white/20 dark:disabled:text-white/45 sm:px-5">Salva</button>
                  <button disabled={saving} type="button" onClick={() => saveCard('approved', 'approved', true)} className="focus-ring min-h-11 rounded-full border border-moss/40 bg-mint/60 px-4 py-2.5 text-sm font-black text-ink transition hover:bg-mint disabled:cursor-not-allowed disabled:border-ink/10 disabled:bg-ink/5 disabled:text-ink/35 dark:border-emerald-300/45 dark:bg-emerald-400/15 dark:text-emerald-100 dark:hover:bg-emerald-400/25 dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-white/30 sm:px-5">Approva e prossima</button>
                  <button disabled={saving || !canPublish} type="button" onClick={() => saveCard('published', 'approved', true)} className="focus-ring min-h-11 rounded-full bg-moss px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-moss/20 disabled:text-ink/55 disabled:ring-1 disabled:ring-inset disabled:ring-moss/20 dark:bg-emerald-400 dark:text-[#07120f] dark:hover:bg-emerald-300 dark:disabled:bg-white/10 dark:disabled:text-white/55 sm:px-5">Pubblica e prossima</button>
                  <button disabled={saving || !nextCard} type="button" onClick={() => openCard(nextCard, { feedback: 'Prossima carta caricata.' })} className="focus-ring min-h-11 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink transition hover:bg-linen disabled:cursor-not-allowed disabled:border-ink/5 disabled:bg-ink/5 disabled:text-ink/30 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:disabled:border-white/15 dark:disabled:bg-white/[0.07] dark:disabled:text-white/50 sm:px-5">Prossima</button>
                </div>
              </div>
              <div aria-hidden="true" className="h-36 sm:h-24 lg:h-20" />

              {!canPublish ? (
                <p className="mt-3 text-xs font-bold leading-5 text-ink/55 dark:text-white/55">
                  Per pubblicare servono approvazione, almeno una risposta accettata, IPA americana, due esempi e una nota d'uso.
                </p>
              ) : null}
            </form>

            <div className="space-y-4">
              <aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e] xl:sticky xl:top-4 xl:z-20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-moss">Anteprima dal vivo</p>
                    <h2 className="mt-1 text-lg font-black text-ink dark:text-white">Vista studente</h2>
                  </div>
                  {previewRevealed ? (
                    <button
                      type="button"
                      onClick={() => setPreviewRevealed(false)}
                      className="focus-ring rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink transition hover:bg-linen"
                    >
                      Nascondi risposta
                    </button>
                  ) : null}
                </div>

                <p className="mt-1 text-xs font-semibold leading-5 text-ink/60 dark:text-white/55">
                  Si aggiorna mentre modifichi la carta e usa lo stesso componente del Trainer.
                </p>

                <div className="mt-3">
                  <SrsCard
                    card={previewCard}
                    dark={darkMode}
                    progress={null}
                    revealed={previewRevealed}
                    onReveal={() => setPreviewRevealed(true)}
                    onRate={() => {}}
                    sessionLabel="Anteprima carta"
                    targetLabel="Expression"
                  />
                </div>
              </aside>

              <aside className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16211e]">
                <h2 className="text-lg font-black text-ink dark:text-white">Carte in Supabase</h2>

                <div className="mt-4 grid gap-3">
                  <input
                    type="search"
                    className={inputClass}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cerca inglese, italiano o ID"
                  />

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-ink/45">Filtro revisione</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {reviewFilterOptions.map((option) => {
                        const active = reviewFilter === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setReviewFilter(option.value)}
                            className={`focus-ring min-h-10 rounded-xl border px-3 py-2 text-sm font-black transition ${
                              active
                                ? 'border-moss bg-moss text-white shadow-sm'
                                : 'border-ink/10 bg-paper text-ink/70 hover:border-moss/30 hover:bg-mint/35 hover:text-ink'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-moss/25 bg-mint/25 p-4 dark:border-emerald-300/25 dark:bg-emerald-400/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Pubblicazione batch</p>
                      <p className="mt-1 text-sm font-bold text-ink/70 dark:text-white/70">{publishableCards.length} expression card approvate e complete nei filtri attivi</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-ink shadow-sm dark:bg-white/10 dark:text-white">{selectedForPublish.length} selezionate</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={publishableCards.length === 0 || publishingBatch} onClick={toggleAllPublishable} className="focus-ring min-h-10 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink hover:bg-linen disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-ink/30 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:disabled:bg-white/5 dark:disabled:text-white/25">
                      {allPublishableSelected ? 'Deseleziona tutte visibili' : 'Seleziona tutte approvate'}
                    </button>
                    <button type="button" disabled={selectedForPublish.length === 0 || publishingBatch} onClick={publishSelectedCards} className="focus-ring min-h-10 rounded-full bg-moss px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-moss/25 disabled:text-ink/40 dark:bg-emerald-400 dark:text-[#07120f] dark:hover:bg-emerald-300 dark:disabled:bg-white/10 dark:disabled:text-white/55">
                      {publishingBatch ? 'Pubblicazione...' : `Pubblica selezionate (${selectedForPublish.length})`}
                    </button>
                  </div>
                </div>

                <div className="mt-4 max-h-[34rem] divide-y divide-ink/10 overflow-y-auto rounded-xl border border-ink/10 dark:divide-white/10 dark:border-white/10">
                  {loading ? <p className="p-4 text-sm font-bold text-ink/60">Caricamento...</p> : null}
                  {!loading && filteredCards.length === 0 ? <p className="p-4 text-sm font-bold text-ink/60">Nessuna carta trovata.</p> : null}

                  {filteredCards.map((card) => {
                    const publishable = publishableCards.some((item) => item.id === card.id);
                    return (
                      <div key={card.id} className="flex items-stretch transition hover:bg-linen/50 dark:hover:bg-white/5">
                        <label className="flex w-12 shrink-0 items-center justify-center border-r border-ink/10 dark:border-white/10">
                          <input
                            type="checkbox"
                            disabled={!publishable || publishingBatch}
                            checked={selectedForPublish.includes(card.id)}
                            onChange={() => togglePublishSelection(card.id)}
                            aria-label={`Seleziona ${card.canonical_text} per la pubblicazione`}
                            className="h-4 w-4 accent-emerald-600 disabled:opacity-25"
                          />
                        </label>
                        <button type="button" onClick={() => openCard(card)} className="focus-ring block min-w-0 flex-1 p-4 text-left">
                          <p className="font-black text-ink dark:text-white">{card.canonical_text}</p>
                          <p className="mt-1 text-sm font-semibold text-ink/60 dark:text-white/60">{card.italian_meaning}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-wide text-ink/45 dark:text-white/45">
                            <span>{card.level}</span><span>{card.status}</span><span>{card.review_status}</span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
