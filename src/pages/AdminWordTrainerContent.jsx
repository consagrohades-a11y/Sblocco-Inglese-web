import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import SrsCard from '../components/SrsCard';
import { supabase } from '../lib/supabaseClient.js';

const emptyCard = {
  id: '',
  public_id: '',
  lemma: '',
  sense_label: '',
  italian_meaning: '',
  english_definition: '',
  part_of_speech: 'noun',
  level: 'A0',
  primary_domain: 'general',
  topic: '',
  priority: 'essential',
  countability: '',
  plural_form: '',
  base_form: '',
  past_form: '',
  past_participle: '',
  third_person_form: '',
  ing_form: '',
  register: 'neutral',
  usage_channel: 'both',
  common_collocations: [],
  common_mistakes: '',
  accepted_answers: [],
  pronunciation_ipa_us: '',
  pronunciation_learner_us: '',
  example_1: '',
  example_2: '',
  usage_note: '',
  tags: [],
  status: 'draft',
  review_status: 'pending',
  review_decision: '',
  review_notes: '',
};

const levels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1'];
const reviewFilters = [
  ['all', 'Tutte'],
  ['pending', 'Da revisionare'],
  ['approved', 'Approvate'],
  ['rejected', 'Rifiutate'],
];

const inputClass = 'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-mint/40';
const splitLines = (value) => String(value || '').split(/\r?\n|\s*\|\s*/).map((item) => item.trim()).filter(Boolean);
const joinLines = (value) => Array.isArray(value) ? value.join('\n') : '';

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-ink/50">{label}{required ? ' *' : ''}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default function AdminWordTrainerContent() {
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
    const { data, error: rpcError } = await supabase.rpc('admin_list_word_cards');
    if (rpcError) {
      setCards([]);
      setError('Impossibile caricare le word card. Applica la migrazione word_trainer_content in Supabase.');
    } else {
      setCards(data || []);
      setError('');
    }
    setLoading(false);
  }

  useEffect(() => { loadCards(); }, []);

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesReview = reviewFilter === 'all' || card.review_status === reviewFilter;
      const matchesText = !normalized || [card.public_id, card.lemma, card.italian_meaning, card.topic]
        .some((value) => String(value || '').toLowerCase().includes(normalized));
      return matchesReview && matchesText;
    });
  }, [cards, query, reviewFilter]);

  const selectedQueueIndex = useMemo(
    () => filteredCards.findIndex((card) => card.id === selected.id),
    [filteredCards, selected.id],
  );
  const nextCard = selectedQueueIndex >= 0
    ? filteredCards[selectedQueueIndex + 1] ?? null
    : filteredCards[0] ?? null;
  const queueLabel = selectedQueueIndex >= 0
    ? `${selectedQueueIndex + 1} di ${filteredCards.length}`
    : `${filteredCards.length} nella coda`;

  const previewCard = useMemo(() => ({
    id: selected.public_id || 'word-preview',
    type: 'word',
    level: selected.level,
    category: selected.topic || 'Categoria',
    word: selected.lemma || 'English word',
    partOfSpeech: selected.part_of_speech,
    pronunciation: [selected.pronunciation_ipa_us, selected.pronunciation_learner_us].filter(Boolean).join('  ·  ') || 'American pronunciation',
    italian: selected.italian_meaning || 'Significato italiano',
    collocations: selected.common_collocations.join(' · '),
    example1: selected.example_1 || 'Your first example will appear here.',
    example2: selected.example_2 || 'Your second example will appear here.',
    note: selected.usage_note || selected.common_mistakes || selected.english_definition || 'Usage note',
  }), [selected]);

  function updateField(field, value) {
    setSelected((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function openCard(card, options = {}) {
    setSelected({
      ...emptyCard,
      ...card,
      common_collocations: card.common_collocations || [],
      accepted_answers: card.accepted_answers || [],
      tags: card.tags || [],
    });
    setPreviewRevealed(false);
    setMessage(options.feedback || '');
    setError('');
    if (options.scroll !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function newCard() {
    const highest = cards.reduce((max, card) => {
      const match = String(card.public_id || '').match(/^word-(\d{4})$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    setSelected({ ...emptyCard, public_id: `word-${String(highest + 1).padStart(4, '0')}` });
    setPreviewRevealed(false);
    setError('');
    setMessage('');
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
    };

    const { data, error: rpcError } = await supabase.rpc('admin_save_word_card', { p_card: payload });
    if (rpcError) {
      setError(rpcError.message || 'Salvataggio non riuscito.');
    } else {
      const successMessage = nextStatus === 'published' ? 'Word card pubblicata.' : nextReviewStatus === 'approved' ? 'Word card approvata.' : 'Bozza salvata.';
      await loadCards();
      if (nextCardBeforeSave) {
        openCard(nextCardBeforeSave, { feedback: `${successMessage} Prossima word card caricata.` });
      } else {
        setSelected((current) => ({ ...current, id: data, status: nextStatus, review_status: nextReviewStatus }));
        setMessage(advanceToNext ? `${successMessage} Hai completato l'ultima word card della coda.` : successMessage);
      }
    }
    setSaving(false);
  }

  const canPublish = selected.review_status === 'approved'
    && selected.accepted_answers.length > 0
    && selected.pronunciation_ipa_us.trim()
    && selected.example_1.trim()
    && selected.example_2.trim()
    && selected.usage_note.trim();

  return (
    <>
      <SEO title="Word Trainer content | Pannello admin | Sblocco Inglese" description="Crea, revisiona e pubblica le word card." />
      <section className="section-shell py-10 lg:py-14">
        <div className="mx-auto max-w-[96rem]">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
            <span className="eyebrow">Contenuti Word Trainer</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-ink sm:text-4xl">Word card A0-C1</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70">Solo le card complete, approvate e pubblicate diventano visibili nel Word Trainer.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={newCard} className="focus-ring min-h-11 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white hover:bg-moss">Nuova word card</button>
                <Link to="/admin/content/words/import" className="focus-ring inline-flex min-h-11 items-center rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black text-ink hover:bg-linen">Importa batch</Link>
                <Link to="/admin" className="focus-ring inline-flex min-h-11 items-center rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black text-ink hover:bg-linen">Pannello admin</Link>
              </div>
            </div>
          </header>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(23rem,0.85fr)]">
            <form onSubmit={(event) => { event.preventDefault(); saveCard(); }} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-moss">{selected.id ? 'Modifica word card' : 'Nuova bozza'}</p>
                  <h2 className="mt-1 text-2xl font-black text-ink">{selected.lemma || 'Word card senza titolo'}</h2>
                </div>
                <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black text-ink">{selected.status} · {selected.review_status}</span>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="ID pubblico" required><input className={inputClass} value={selected.public_id} onChange={(e) => updateField('public_id', e.target.value)} /></Field>
                <Field label="Livello" required><select className={inputClass} value={selected.level} onChange={(e) => updateField('level', e.target.value)}>{levels.map((level) => <option key={level}>{level}</option>)}</select></Field>
                <Field label="Parola inglese" required><input className={inputClass} value={selected.lemma} onChange={(e) => updateField('lemma', e.target.value)} /></Field>
                <Field label="Significato italiano" required><input className={inputClass} value={selected.italian_meaning} onChange={(e) => updateField('italian_meaning', e.target.value)} /></Field>
                <Field label="Categoria" required><input className={inputClass} value={selected.topic} onChange={(e) => updateField('topic', e.target.value)} placeholder="People & identity" /></Field>
                <Field label="Parte del discorso" required><input className={inputClass} value={selected.part_of_speech} onChange={(e) => updateField('part_of_speech', e.target.value)} /></Field>
                <Field label="Etichetta del significato"><input className={inputClass} value={selected.sense_label || ''} onChange={(e) => updateField('sense_label', e.target.value)} /></Field>
                <Field label="Numerabilità"><select className={inputClass} value={selected.countability || ''} onChange={(e) => updateField('countability', e.target.value)}><option value="">Non applicabile</option><option value="countable">Countable</option><option value="uncountable">Uncountable</option><option value="both">Both</option></select></Field>
                <Field label="Plurale"><input className={inputClass} value={selected.plural_form || ''} onChange={(e) => updateField('plural_form', e.target.value)} /></Field>
                <Field label="Registro"><select className={inputClass} value={selected.register} onChange={(e) => updateField('register', e.target.value)}><option value="informal">Informale</option><option value="neutral">Neutro</option><option value="professional">Professionale</option><option value="formal">Formale</option></select></Field>
              </div>

              <div className="mt-5 grid gap-5">
                <Field label="Definizione inglese" required><textarea rows="3" className={inputClass} value={selected.english_definition} onChange={(e) => updateField('english_definition', e.target.value)} /></Field>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="IPA americana"><input className={inputClass} value={selected.pronunciation_ipa_us || ''} onChange={(e) => updateField('pronunciation_ipa_us', e.target.value)} /></Field>
                  <Field label="Pronuncia facilitata americana"><input className={inputClass} value={selected.pronunciation_learner_us || ''} onChange={(e) => updateField('pronunciation_learner_us', e.target.value)} /></Field>
                </div>
                <Field label="Risposte accettate, una per riga"><textarea rows="3" className={inputClass} value={joinLines(selected.accepted_answers)} onChange={(e) => updateField('accepted_answers', splitLines(e.target.value))} /></Field>
                <Field label="Esempio 1"><textarea rows="2" className={inputClass} value={selected.example_1 || ''} onChange={(e) => updateField('example_1', e.target.value)} /></Field>
                <Field label="Esempio 2"><textarea rows="2" className={inputClass} value={selected.example_2 || ''} onChange={(e) => updateField('example_2', e.target.value)} /></Field>
                <Field label="Collocazioni, una per riga"><textarea rows="3" className={inputClass} value={joinLines(selected.common_collocations)} onChange={(e) => updateField('common_collocations', splitLines(e.target.value))} /></Field>
                <Field label="Nota d'uso"><textarea rows="3" className={inputClass} value={selected.usage_note || ''} onChange={(e) => updateField('usage_note', e.target.value)} /></Field>
                <Field label="Errore comune"><textarea rows="3" className={inputClass} value={selected.common_mistakes || ''} onChange={(e) => updateField('common_mistakes', e.target.value)} /></Field>
                <Field label="Tag, uno per riga"><textarea rows="3" className={inputClass} value={joinLines(selected.tags)} onChange={(e) => updateField('tags', splitLines(e.target.value))} /></Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Decisione revisione"><select className={inputClass} value={selected.review_decision || ''} onChange={(e) => updateField('review_decision', e.target.value)}><option value="">Da decidere</option><option value="approve">Approva</option><option value="approve_after_edit">Approva dopo modifica</option><option value="rewrite">Riscrivi</option><option value="merge">Unisci</option><option value="reclassify">Riclassifica</option><option value="reject">Rifiuta</option></select></Field>
                  <Field label="Stato contenuto"><select className={inputClass} value={selected.status} onChange={(e) => updateField('status', e.target.value)}><option value="draft">Bozza</option><option value="review_needed">Da revisionare</option><option value="approved">Approvata</option><option value="published">Pubblicata</option><option value="archived">Archiviata</option></select></Field>
                </div>
                <Field label="Note di revisione"><textarea rows="3" className={inputClass} value={selected.review_notes || ''} onChange={(e) => updateField('review_notes', e.target.value)} /></Field>
              </div>

              {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</div> : null}
              {message ? <div className="mt-5 rounded-xl border border-moss/20 bg-mint/30 p-4 text-sm font-bold text-ink">{message}</div> : null}

              <div className="sticky bottom-3 z-30 mt-6 rounded-2xl border border-ink/15 bg-white/95 p-3 shadow-[0_18px_55px_rgba(24,34,31,0.22)] backdrop-blur-xl dark:border-white/15 dark:bg-[#16211e]/95 dark:shadow-[0_18px_55px_rgba(0,0,0,0.45)] sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-wide text-ink/55 dark:text-white/65">Coda di revisione · {queueLabel}</p>
                  {saving ? <span className="text-xs font-black text-moss dark:text-emerald-300">Salvataggio...</span> : null}
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button disabled={saving} type="submit" className="focus-ring min-h-11 rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-ink/45 disabled:text-white/75 dark:bg-white dark:text-ink dark:hover:bg-emerald-200 dark:disabled:bg-white/20 dark:disabled:text-white/45 sm:px-5">Salva</button>
                  <button disabled={saving} type="button" onClick={() => saveCard('approved', 'approved', true)} className="focus-ring min-h-11 rounded-full border border-moss/40 bg-mint/60 px-4 py-2.5 text-sm font-black text-ink transition hover:bg-mint disabled:cursor-not-allowed disabled:border-ink/10 disabled:bg-ink/5 disabled:text-ink/35 dark:border-emerald-300/45 dark:bg-emerald-400/15 dark:text-emerald-100 dark:hover:bg-emerald-400/25 dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-white/30 sm:px-5">Approva e prossima</button>
                  <button disabled={saving || !canPublish} type="button" onClick={() => saveCard('published', 'approved', true)} className="focus-ring min-h-11 rounded-full bg-moss px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-moss/25 disabled:text-ink/40 dark:bg-emerald-400 dark:text-[#07120f] dark:hover:bg-emerald-300 dark:disabled:bg-emerald-400/15 dark:disabled:text-white/30 sm:px-5">Pubblica e prossima</button>
                  <button disabled={saving || !nextCard} type="button" onClick={() => openCard(nextCard, { feedback: 'Prossima word card caricata.' })} className="focus-ring min-h-11 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink transition hover:bg-linen disabled:cursor-not-allowed disabled:border-ink/5 disabled:bg-ink/5 disabled:text-ink/30 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:disabled:border-white/5 dark:disabled:bg-white/5 dark:disabled:text-white/25 sm:px-5">Prossima</button>
                </div>
              </div>

              {!canPublish ? <p className="mt-3 text-xs font-bold leading-5 text-ink/50">Per pubblicare servono approvazione, risposta accettata, IPA americana, due esempi e nota d'uso.</p> : null}
            </form>

            <div className="space-y-6">
              <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:z-20 dark:border-white/10 dark:bg-[#16211e]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-xs font-black uppercase tracking-wide text-moss">Anteprima dal vivo</p><h2 className="mt-1 text-xl font-black text-ink">Vista studente</h2></div>
                  {previewRevealed ? <button type="button" onClick={() => setPreviewRevealed(false)} className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-xs font-black text-ink hover:bg-linen">Nascondi risposta</button> : null}
                </div>
                <div className="mt-4"><SrsCard card={previewCard} progress={null} revealed={previewRevealed} onReveal={() => setPreviewRevealed(true)} onRate={() => {}} sessionLabel="Anteprima word card" targetLabel="Word" /></div>
              </aside>

              <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-ink">Word card in Supabase</h2>
                <input type="search" className={`${inputClass} mt-4`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca parola, italiano, categoria o ID" />
                <div className="mt-3 grid grid-cols-2 gap-2">{reviewFilters.map(([value, label]) => <button key={value} type="button" onClick={() => setReviewFilter(value)} className={`focus-ring min-h-10 rounded-xl border px-3 py-2 text-sm font-black ${reviewFilter === value ? 'border-moss bg-moss text-white' : 'border-ink/10 bg-paper text-ink/70'}`}>{label}</button>)}</div>
                <div className="mt-4 max-h-[34rem] divide-y divide-ink/10 overflow-y-auto rounded-xl border border-ink/10">
                  {loading ? <p className="p-4 text-sm font-bold text-ink/60">Caricamento...</p> : null}
                  {!loading && filteredCards.length === 0 ? <p className="p-4 text-sm font-bold text-ink/60">Nessuna word card trovata.</p> : null}
                  {filteredCards.map((card) => <button key={card.id} type="button" onClick={() => openCard(card)} className="focus-ring block w-full p-4 text-left hover:bg-linen/50"><p className="font-black text-ink">{card.lemma}</p><p className="mt-1 text-sm font-semibold text-ink/60">{card.italian_meaning}</p><div className="mt-2 flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-wide text-ink/45"><span>{card.public_id}</span><span>{card.level}</span><span>{card.status}</span><span>{card.review_status}</span></div></button>)}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
