import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import SrsCard from '../components/SrsCard';
import { supabase } from '../lib/supabaseClient.js';

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

const reviewFilterOptions = [
  { value: 'all', label: 'Tutte' },
  { value: 'pending', label: 'Da revisionare' },
  { value: 'approved', label: 'Approvate' },
  { value: 'rejected', label: 'Rifiutate' },
];

const splitLines = (value) => String(value || '')
  .split('\n')
  .map((item) => item.trim())
  .filter(Boolean);

const joinLines = (value) => (Array.isArray(value) ? value.join('\n') : '');

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-ink/50">
        {label}{required ? ' *' : ''}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass = 'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-mint/40';

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

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesReview = reviewFilter === 'all' || card.review_status === reviewFilter;
      const matchesQuery = !normalized || [card.canonical_text, card.italian_meaning, card.public_id, card.topic]
        .some((value) => String(value || '').toLowerCase().includes(normalized));

      return matchesReview && matchesQuery;
    });
  }, [cards, query, reviewFilter]);

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

  function openCard(card) {
    setSelected({
      ...emptyCard,
      ...card,
      accepted_answers: card.accepted_answers ?? [],
      collocations: card.collocations ?? [],
      tags: card.tags ?? [],
    });
    setPreviewRevealed(false);
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  async function saveCard(nextStatus = selected.status, nextReviewStatus = selected.review_status) {
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
      setSelected((current) => ({
        ...current,
        id: data,
        status: nextStatus,
        review_status: nextReviewStatus,
      }));
      setMessage(nextStatus === 'published'
        ? 'Carta pubblicata.'
        : nextReviewStatus === 'approved'
          ? 'Carta approvata.'
          : 'Bozza salvata.');
      await loadCards();
    }

    setSaving(false);
  }

  const canPublish = selected.review_status === 'approved'
    && selected.accepted_answers.length > 0
    && selected.example_1.trim()
    && selected.example_2.trim()
    && selected.usage_note.trim()
    && selected.pronunciation_ipa_us.trim();

  return (
    <>
      <SEO
        title="Contenuti Trainer | Pannello admin | Sblocco Inglese"
        description="Crea, revisiona e pubblica le carte Trainer."
      />

      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-[96rem]">
          <div className="flex flex-col gap-5 rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="eyebrow">Contenuti Trainer</span>
              <h1 className="mt-4 text-3xl font-black text-ink sm:text-4xl">Espressioni General</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70">
                Le nuove carte vengono salvate direttamente in Supabase come bozze. Solo le carte complete e approvate possono essere pubblicate.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={newCard}
                className="focus-ring min-h-11 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss"
              >
                Nuova carta
              </button>
              <Link
                to="/admin"
                className="focus-ring inline-flex min-h-11 items-center rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black text-ink transition hover:bg-linen"
              >
                Pannello admin
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(23rem,0.85fr)]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveCard();
              }}
              className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-moss">
                    {selected.id ? 'Modifica carta' : 'Nuova bozza'}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-ink">
                    {selected.canonical_text || 'Carta senza titolo'}
                  </h2>
                </div>
                <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black text-ink">
                  {selected.status} · {selected.review_status}
                </span>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
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

              <div className="mt-5 grid gap-5">
                <Field label="Spiegazione d'uso" required>
                  <textarea rows="3" className={inputClass} value={selected.english_explanation} onChange={(event) => updateField('english_explanation', event.target.value)} />
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Pronuncia IPA americana">
                    <input className={inputClass} value={selected.pronunciation_ipa_us} onChange={(event) => updateField('pronunciation_ipa_us', event.target.value)} placeholder="/aɪm ɑn maɪ weɪ/" />
                  </Field>
                  <Field label="Pronuncia facilitata americana">
                    <input className={inputClass} value={selected.pronunciation_learner_us} onChange={(event) => updateField('pronunciation_learner_us', event.target.value)} />
                  </Field>
                </div>

                <Field label="Risposte accettate, una per riga">
                  <textarea rows="3" className={inputClass} value={joinLines(selected.accepted_answers)} onChange={(event) => updateField('accepted_answers', splitLines(event.target.value))} />
                </Field>
                <Field label="Esempio 1">
                  <textarea rows="2" className={inputClass} value={selected.example_1} onChange={(event) => updateField('example_1', event.target.value)} />
                </Field>
                <Field label="Esempio 2">
                  <textarea rows="2" className={inputClass} value={selected.example_2} onChange={(event) => updateField('example_2', event.target.value)} />
                </Field>
                <Field label="Nota d'uso">
                  <textarea rows="3" className={inputClass} value={selected.usage_note} onChange={(event) => updateField('usage_note', event.target.value)} />
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Collocazioni, una per riga">
                    <textarea rows="3" className={inputClass} value={joinLines(selected.collocations)} onChange={(event) => updateField('collocations', splitLines(event.target.value))} />
                  </Field>
                  <Field label="Tag, uno per riga">
                    <textarea rows="3" className={inputClass} value={joinLines(selected.tags)} onChange={(event) => updateField('tags', splitLines(event.target.value))} />
                  </Field>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
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
                  <textarea rows="3" className={inputClass} value={selected.review_notes || ''} onChange={(event) => updateField('review_notes', event.target.value)} />
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

              <div className="mt-6 flex flex-wrap gap-3">
                <button disabled={saving} type="submit" className="focus-ring min-h-11 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">
                  Salva bozza
                </button>
                <button disabled={saving} type="button" onClick={() => saveCard('approved', 'approved')} className="focus-ring min-h-11 rounded-full border border-moss/30 bg-mint/40 px-5 py-2.5 text-sm font-black text-ink disabled:opacity-50">
                  Approva
                </button>
                <button disabled={saving || !canPublish} type="button" onClick={() => saveCard('published', 'approved')} className="focus-ring min-h-11 rounded-full bg-moss px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
                  Pubblica
                </button>
              </div>

              {!canPublish ? (
                <p className="mt-3 text-xs font-bold leading-5 text-ink/50">
                  Per pubblicare servono approvazione, almeno una risposta accettata, IPA americana, due esempi e una nota d'uso.
                </p>
              ) : null}
            </form>

            <div className="space-y-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
              <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-moss">Anteprima dal vivo</p>
                    <h2 className="mt-1 text-xl font-black text-ink">Vista studente</h2>
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

                <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">
                  Si aggiorna mentre modifichi la carta e usa lo stesso componente del Trainer.
                </p>

                <div className="mt-4">
                  <SrsCard
                    card={previewCard}
                    progress={null}
                    revealed={previewRevealed}
                    onReveal={() => setPreviewRevealed(true)}
                    onRate={() => {}}
                    sessionLabel="Anteprima carta"
                    targetLabel="Expression"
                  />
                </div>
              </aside>

              <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-ink">Carte in Supabase</h2>

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

                <div className="mt-4 max-h-[34rem] divide-y divide-ink/10 overflow-y-auto rounded-xl border border-ink/10">
                  {loading ? <p className="p-4 text-sm font-bold text-ink/60">Caricamento...</p> : null}
                  {!loading && filteredCards.length === 0 ? <p className="p-4 text-sm font-bold text-ink/60">Nessuna carta trovata.</p> : null}

                  {filteredCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => openCard(card)}
                      className="focus-ring block w-full p-4 text-left transition hover:bg-linen/50"
                    >
                      <p className="font-black text-ink">{card.canonical_text}</p>
                      <p className="mt-1 text-sm font-semibold text-ink/60">{card.italian_meaning}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-wide text-ink/45">
                        <span>{card.level}</span>
                        <span>{card.status}</span>
                        <span>{card.review_status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
