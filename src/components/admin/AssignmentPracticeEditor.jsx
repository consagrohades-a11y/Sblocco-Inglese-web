import React, { useEffect, useMemo, useState } from 'react';
import { createPracticeSession, EXERCISE_MODES } from '../../lib/exerciseEngine.js';
import { loadPublishedPracticeCards, PRACTICE_TRAINERS } from '../../lib/practiceContent.js';

export const DEFAULT_ASSIGNMENT_PRACTICE = {
  trainer_id: 'word',
  deck_id: null,
  level: null,
  category: null,
  batch: null,
  question_count: 10,
  modes: ['italian_to_english', 'english_to_italian', 'multiple_choice'],
};

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'it'));
}

export default function AssignmentPracticeEditor({
  enabled,
  onEnabledChange,
  config,
  onChange,
  onAvailabilityChange,
}) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    loadPublishedPracticeCards(config.trainer_id)
      .then((items) => { if (active) setCards(items); })
      .catch(() => { if (active) setError('Non è stato possibile caricare i contenuti pubblicati.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled, config.trainer_id]);

  const decks = useMemo(() => {
    const values = new Map();
    cards.flatMap((card) => card.decks || []).forEach((deck) => values.set(deck.id, deck));
    return Array.from(values.values()).sort((a, b) => a.title.localeCompare(b.title, 'it'));
  }, [cards]);
  const levels = useMemo(() => unique(cards.map((card) => card.level)), [cards]);
  const categories = useMemo(() => unique(cards.filter((card) => !config.level || card.level === config.level).map((card) => card.category)), [cards, config.level]);
  const batches = useMemo(() => unique(cards.map((card) => card.batch)), [cards]);
  const availableCards = useMemo(() => cards.filter((card) =>
    (!config.level || card.level === config.level)
    && (!config.deck_id || (card.decks || []).some((deck) => deck.id === config.deck_id))
    && (!config.category || card.category === config.category)
    && (!config.batch || card.batch === config.batch)), [cards, config]);
  const availableQuestions = useMemo(() => createPracticeSession(availableCards, config.modes, 50).length, [availableCards, config.modes]);
  const questionOptions = useMemo(() => Array.from(new Set([5, 10, 15, 20, availableQuestions]
    .filter((value) => value > 0 && value <= availableQuestions))).sort((a, b) => a - b), [availableQuestions]);

  const fieldClass = 'w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white';
  const update = (key, value) => onChange({ ...config, [key]: value });

  useEffect(() => {
    onAvailabilityChange?.({ cards: availableCards.length, questions: availableQuestions });
    if (enabled && !loading && availableQuestions > 0 && config.question_count > availableQuestions) {
      update('question_count', availableQuestions);
    }
  }, [enabled, loading, availableCards.length, availableQuestions, config.question_count]);

  function toggleMode(mode) {
    update('modes', config.modes.includes(mode) ? config.modes.filter((value) => value !== mode) : [...config.modes, mode]);
  }

  return (
    <section className="rounded-2xl border border-moss/25 bg-mint/15 p-5 shadow-sm dark:border-emerald-300/20 dark:bg-emerald-400/[0.06] sm:p-6">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} className="mt-1 h-4 w-4 accent-moss" />
        <span><span className="block text-lg font-black text-ink dark:text-white">Pratica mirata</span><span className="mt-1 block text-sm text-ink/65 dark:text-white/60">Lo studente apre una sessione già filtrata e i risultati restano collegati a questa assegnazione.</span></span>
      </label>

      {enabled ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label><span className="text-xs font-black uppercase text-ink/60 dark:text-white/60">Trainer</span><select value={config.trainer_id} onChange={(event) => onChange({ ...DEFAULT_ASSIGNMENT_PRACTICE, trainer_id: event.target.value })} className={fieldClass}>{Object.values(PRACTICE_TRAINERS).map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.label}</option>)}</select></label>
          <label><span className="text-xs font-black uppercase text-ink/60 dark:text-white/60">Deck</span><select value={config.deck_id || ''} onChange={(event) => update('deck_id', event.target.value || null)} className={fieldClass}><option value="">Tutti i deck</option>{decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.title}</option>)}</select></label>
          <label><span className="text-xs font-black uppercase text-ink/60 dark:text-white/60">Livello</span><select value={config.level || ''} onChange={(event) => onChange({ ...config, level: event.target.value || null, category: null })} className={fieldClass}><option value="">Tutti i livelli</option>{levels.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="text-xs font-black uppercase text-ink/60 dark:text-white/60">Categoria</span><select value={config.category || ''} onChange={(event) => update('category', event.target.value || null)} className={fieldClass}><option value="">Tutte le categorie</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="text-xs font-black uppercase text-ink/60 dark:text-white/60">Batch</span><select value={config.batch || ''} onChange={(event) => update('batch', event.target.value || null)} className={fieldClass}><option value="">Tutti i batch</option>{batches.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="text-xs font-black uppercase text-ink/60 dark:text-white/60">Numero di domande</span><select value={config.question_count} onChange={(event) => update('question_count', Number(event.target.value))} className={fieldClass}>{questionOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <fieldset className="sm:col-span-2 lg:col-span-3"><legend className="text-xs font-black uppercase text-ink/60 dark:text-white/60">Tipi di esercizio</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{EXERCISE_MODES.map((mode) => <label key={mode.id} className={`flex cursor-pointer gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold ${config.modes.includes(mode.id) ? 'border-moss bg-white/70 dark:border-emerald-300/40 dark:bg-white/10 dark:text-white' : 'border-ink/10 text-ink/60 dark:border-white/10 dark:text-white/60'}`}><input type="checkbox" checked={config.modes.includes(mode.id)} onChange={() => toggleMode(mode.id)} className="accent-moss" />{mode.label}</label>)}</div></fieldset>
          <p className="sm:col-span-2 lg:col-span-3 text-sm font-bold text-ink/60 dark:text-white/60">{loading ? 'Caricamento card pubblicate...' : error || `${availableCards.length} card pubblicate compatibili e ${availableQuestions} domande disponibili con questi filtri.`}</p>
        </div>
      ) : null}
    </section>
  );
}
