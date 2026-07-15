import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, CircleAlert, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import TrainerLayout from '../components/TrainerLayout';
import { createPracticeSession, evaluateAnswer, EXERCISE_MODES } from '../lib/exerciseEngine.js';
import { loadPublishedPracticeCards, PRACTICE_TRAINERS, recordPracticeAttempt } from '../lib/practiceContent.js';
import { supabase } from '../lib/supabaseClient.js';

const resultStyles = {
  correct: 'border-moss/35 bg-mint/70 text-ink dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-100',
  nearly_correct: 'border-amber-400/50 bg-butter text-ink dark:border-amber-300/35 dark:bg-amber-300/10 dark:text-amber-100',
  incorrect: 'border-coral/40 bg-blush text-ink dark:border-rose-300/35 dark:bg-rose-300/10 dark:text-rose-100',
};

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right, 'it'));
}

function configuredDeckIds(config) {
  const values = Array.isArray(config?.deck_ids) ? config.deck_ids : config?.deck_id ? [config.deck_id] : [];
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function PracticeSelect({ label, value, onChange, options, disabled = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    function closeMenu(event) {
      if (event.key === 'Escape' || (event.type === 'mousedown' && !rootRef.current?.contains(event.target))) setOpen(false);
    }
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeMenu);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeMenu);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative grid gap-2">
      <span className="text-sm font-black text-ink dark:text-white">{label}</span>
      <button type="button" disabled={disabled} onClick={() => setOpen((current) => !current)} className="focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-ink/15 bg-white px-4 py-3 text-left text-sm font-black text-ink transition hover:border-moss disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/20 dark:bg-[#17231f] dark:text-white dark:hover:border-emerald-300" aria-haspopup="listbox" aria-expanded={open}>
        <span className="truncate">{selected?.label}</span><ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled ? (
        <div role="listbox" className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-lg border border-ink/15 bg-white p-1.5 shadow-soft dark:border-white/15 dark:bg-[#17231f]">
          {options.map((option) => {
            const active = option.value === value;
            return <button key={option.value} type="button" role="option" aria-selected={active} onClick={() => { onChange(option.value); setOpen(false); }} className={`focus-ring flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm font-black transition ${active ? 'bg-mint text-ink dark:bg-emerald-400/15 dark:text-white' : 'text-ink/75 hover:bg-linen dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white'}`}><span>{option.label}</span>{active ? <Check className="h-4 w-4 shrink-0 text-moss dark:text-mint" /> : null}</button>;
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function PracticeHub() {
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const resourceId = searchParams.get('resourceId');
  const assignmentConfigRef = useRef(null);
  const [assignmentContext, setAssignmentContext] = useState(null);
  const [assignmentError, setAssignmentError] = useState('');
  const [trainerId, setTrainerId] = useState('word');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [level, setLevel] = useState('all');
  const [deck, setDeck] = useState('all');
  const [assignedDeckIds, setAssignedDeckIds] = useState([]);
  const [category, setCategory] = useState('all');
  const [batch, setBatch] = useState('all');
  const [questionCount, setQuestionCount] = useState(10);
  const [modes, setModes] = useState(['italian_to_english', 'english_to_italian', 'multiple_choice']);
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [results, setResults] = useState([]);
  const questionStartedAt = useRef(Date.now());

  useEffect(() => {
    if (!assignmentId || !resourceId) return undefined;
    let active = true;
    setAssignmentError('');
    supabase.rpc('get_assignment_practice_session', { p_assignment_id: assignmentId, p_resource_id: resourceId }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        setAssignmentError('Questa sessione assegnata non è disponibile.');
        return;
      }
      const config = data.practice_config || {};
      assignmentConfigRef.current = config;
      setAssignmentContext(data);
      setTrainerId(config.trainer_id || 'word');
      setLevel(config.level || 'all');
      setDeck(config.deck_id || 'all');
      setAssignedDeckIds(configuredDeckIds(config));
      setCategory(config.category || 'all');
      setBatch(config.batch || 'all');
      setQuestionCount(config.question_count || 10);
      setModes(config.modes?.length ? config.modes : ['italian_to_english']);
    });
    return () => { active = false; };
  }, [assignmentId, resourceId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    setCards([]);
    const lockedConfig = assignmentConfigRef.current?.trainer_id === trainerId ? assignmentConfigRef.current : null;
    setLevel(lockedConfig?.level || 'all');
    setDeck(lockedConfig?.deck_id || 'all');
    setAssignedDeckIds(configuredDeckIds(lockedConfig));
    setCategory(lockedConfig?.category || 'all');
    setBatch(lockedConfig?.batch || 'all');
    loadPublishedPracticeCards(trainerId)
      .then((data) => { if (active) setCards(data); })
      .catch((error) => { if (active) setLoadError(error.message || 'Impossibile caricare le card.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [trainerId]);

  const locked = Boolean(assignmentContext);
  const levels = useMemo(() => uniqueSorted(cards.map((card) => card.level)), [cards]);
  const decks = useMemo(() => {
    const byId = new Map();
    cards.flatMap((card) => card.decks || []).forEach((item) => byId.set(item.id, item));
    return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title, 'it'));
  }, [cards]);
  const activeDeckIds = useMemo(() => locked ? assignedDeckIds : deck === 'all' ? [] : [deck], [locked, assignedDeckIds, deck]);
  const activeDeckSet = useMemo(() => new Set(activeDeckIds), [activeDeckIds]);
  const assignedDecks = useMemo(() => decks.filter((item) => activeDeckSet.has(item.id)), [decks, activeDeckSet]);
  const categories = useMemo(() => uniqueSorted(cards
    .filter((card) => level === 'all' || card.level === level)
    .filter((card) => !activeDeckIds.length || (card.decks || []).some((item) => activeDeckSet.has(item.id)))
    .map((card) => card.category)), [cards, level, activeDeckIds.length, activeDeckSet]);
  const batches = useMemo(() => uniqueSorted(cards.map((card) => card.batch)), [cards]);
  const filteredCards = useMemo(() => cards.filter((card) =>
    (level === 'all' || card.level === level)
    && (!activeDeckIds.length || (card.decks || []).some((item) => activeDeckSet.has(item.id)))
    && (category === 'all' || card.category === category)
    && (batch === 'all' || card.batch === batch)), [cards, level, activeDeckIds.length, activeDeckSet, category, batch]);
  const availableQuestions = useMemo(() => createPracticeSession(filteredCards, modes, 50).length, [filteredCards, modes]);
  const assignmentConfigurationMismatch = locked && questionCount > availableQuestions;
  const current = session?.[index];
  const finished = session && index >= session.length;

  function toggleMode(mode) {
    setModes((currentModes) => currentModes.includes(mode) ? currentModes.filter((value) => value !== mode) : [...currentModes, mode]);
  }

  function startSession() {
    if (assignmentConfigurationMismatch) return;
    const questions = createPracticeSession(filteredCards, modes, questionCount);
    if (!questions.length) return;
    setSession(questions);
    setIndex(0);
    setResponse('');
    setFeedback(null);
    setSaveError('');
    setResults([]);
    questionStartedAt.current = Date.now();
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!response.trim() || feedback || !current) return;
    const evaluation = evaluateAnswer(response, current.acceptedAnswers);
    setFeedback(evaluation);
    setResults((currentResults) => [...currentResults, evaluation.result]);
    setSaveError('');
    try {
      await recordPracticeAttempt(current, response, evaluation, Date.now() - questionStartedAt.current, { assignmentId, resourceId });
    } catch (error) {
      setSaveError(error.message || 'Risposta valutata, ma il salvataggio non è riuscito.');
    }
  }

  function nextQuestion() {
    setIndex((value) => value + 1);
    setResponse('');
    setFeedback(null);
    setSaveError('');
    questionStartedAt.current = Date.now();
  }

  function resetSession() {
    setSession(null);
    setIndex(0);
    setResponse('');
    setFeedback(null);
    setResults([]);
  }

  const summary = useMemo(() => results.reduce((counts, result) => ({ ...counts, [result]: counts[result] + 1 }), { correct: 0, nearly_correct: 0, incorrect: 0 }), [results]);
  const questionOptions = useMemo(() => Array.from(new Set([5, 10, 15, 20, questionCount])).sort((a, b) => a - b), [questionCount]);

  return (
    <>
      <SEO title="Pratica | Sblocco Inglese" description="Esercizi generati dalle card pubblicate nei Trainer." />
      <TrainerLayout showNav={!locked}>
        <div className="mx-auto max-w-5xl">
          <div className="relative mb-5 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-moss/15 bg-gradient-to-br from-white via-white to-mint/35 p-5 shadow-sm dark:border-white/10 dark:from-[#16211e] dark:via-[#16211e] dark:to-[#17352c] sm:p-6">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-moss via-coral to-[#ffc457]" />
            <div><span className="inline-flex items-center gap-2 rounded-full border border-moss/15 bg-mint/55 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-moss dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-mint"><Sparkles className="h-4 w-4" />Pratica sincronizzata</span><h1 className="mt-3 text-3xl font-black text-ink dark:text-white sm:text-4xl">Esercizi dalle tue card</h1>{session && !finished ? <p className="mt-2 text-sm font-semibold text-ink/60 dark:text-white/60">Completa una domanda alla volta. Il risultato viene salvato automaticamente.</p> : null}</div>
            {locked ? <Link to={`/assignments/${assignmentId}`} className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink/12 bg-white/85 px-4 py-2.5 text-sm font-black text-ink shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white"><ArrowLeft className="h-4 w-4 text-moss dark:text-mint" />Torna all’attività</Link> : session ? <button type="button" onClick={resetSession} className="focus-ring inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white"><ArrowLeft className="h-4 w-4" />Cambia sessione</button> : null}
          </div>

          {assignmentError ? <p className="mb-5 flex items-center gap-2 rounded-lg border border-coral/30 bg-blush p-4 text-sm font-bold text-ink"><CircleAlert className="h-4 w-4" />{assignmentError}</p> : null}
          {locked && !session ? <div className="mb-5 rounded-xl border border-moss/25 bg-mint/35 p-4 dark:border-emerald-300/25 dark:bg-emerald-400/10"><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-mint">Attività assegnata</p><p className="mt-1 font-black text-ink dark:text-white">{assignmentContext.assignment_title}</p><p className="mt-1 text-sm text-ink/65 dark:text-white/65">I filtri e i deck sono stati scelti dall’insegnante.</p></div> : null}

          {!session ? (
            <section className="rounded-xl border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <PracticeSelect label="Trainer" value={trainerId} onChange={setTrainerId} disabled={locked} options={Object.values(PRACTICE_TRAINERS).map((trainer) => ({ value: trainer.id, label: trainer.label }))} />
                <PracticeSelect label="Livello" value={level} onChange={(value) => { setLevel(value); setCategory('all'); }} disabled={locked} options={[{ value: 'all', label: 'Tutti i livelli' }, ...levels.map((value) => ({ value, label: value }))]} />
                {locked ? <div className="grid gap-2"><span className="text-sm font-black text-ink dark:text-white">Deck inclusi</span><div className="min-h-12 rounded-lg border border-ink/15 bg-linen/45 px-4 py-3 text-sm font-black text-ink dark:border-white/20 dark:bg-white/[0.06] dark:text-white">{assignedDecks.length ? assignedDecks.map((item) => item.title).join(' · ') : activeDeckIds.length ? `${activeDeckIds.length} deck assegnati` : 'Tutti i deck compatibili'}</div></div> : <PracticeSelect label="Deck" value={deck} onChange={(value) => { setDeck(value); setCategory('all'); }} disabled={!decks.length} options={[{ value: 'all', label: decks.length ? 'Tutti i deck' : 'Nessun deck disponibile' }, ...decks.map((item) => ({ value: item.id, label: item.title }))]} />}
                <PracticeSelect label="Categoria" value={category} onChange={setCategory} disabled={locked} options={[{ value: 'all', label: 'Tutte le categorie' }, ...categories.map((value) => ({ value, label: value }))]} />
                <PracticeSelect label="Batch" value={batch} onChange={setBatch} disabled={locked || !batches.length} options={[{ value: 'all', label: batches.length ? 'Tutti i batch' : 'Nessun batch nelle card' }, ...batches.map((value) => ({ value, label: value }))]} />
              </div>

              <fieldset className="mt-6"><legend className="text-sm font-black text-ink dark:text-white">Tipi di esercizio</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{EXERCISE_MODES.map((mode) => <label key={mode.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${locked ? 'cursor-not-allowed' : 'cursor-pointer'} ${modes.includes(mode.id) ? 'border-moss bg-mint/60 text-ink dark:border-emerald-400 dark:bg-emerald-400/10 dark:text-white' : 'border-ink/10 text-ink/70 dark:border-white/15 dark:text-white/70'}`}><input type="checkbox" checked={modes.includes(mode.id)} disabled={locked} onChange={() => toggleMode(mode.id)} className="h-4 w-4 accent-moss" />{mode.label}</label>)}</div></fieldset>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-ink/10 pt-5 dark:border-white/10">
                <div className="w-44"><PracticeSelect label="Numero di domande" value={String(questionCount)} onChange={(value) => setQuestionCount(Number(value))} disabled={locked} options={questionOptions.map((value) => ({ value: String(value), label: String(value) }))} /></div>
                <div className="text-right"><p className="mb-2 text-xs font-bold text-ink/55 dark:text-white/55">{loading ? 'Caricamento...' : `${filteredCards.length} card uniche e ${availableQuestions} domande disponibili`}</p><button type="button" onClick={startSession} disabled={loading || Boolean(loadError) || !filteredCards.length || !modes.length || assignmentConfigurationMismatch} className="focus-ring rounded-full bg-ink px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-ink/25 disabled:text-ink/45 dark:bg-mint dark:text-ink dark:hover:bg-white dark:disabled:bg-white/15 dark:disabled:text-white/35">{loading ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}Inizia</button></div>
              </div>
              {loadError ? <p className="mt-4 flex items-center gap-2 rounded-lg border border-coral/30 bg-blush p-3 text-sm font-bold text-ink dark:border-rose-300/30 dark:bg-rose-300/10 dark:text-rose-100"><CircleAlert className="h-4 w-4 shrink-0" />{loadError}</p> : null}
              {!loading && !loadError && assignmentConfigurationMismatch ? <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />Questa assegnazione richiede {questionCount} domande, ma la selezione ne può generare solo {availableQuestions}. L’insegnante deve riaprire e salvare l’assegnazione.</p> : null}
            </section>
          ) : finished ? (
            <section className="rounded-xl border border-ink/10 bg-white p-6 text-center shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-9"><CheckCircle2 className="mx-auto h-12 w-12 text-moss dark:text-mint" /><h2 className="mt-4 text-3xl font-black text-ink dark:text-white">Sessione completata</h2><p className="mt-2 text-ink/65 dark:text-white/65">I risultati sono stati salvati sul tuo account.</p><div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3">{[[summary.correct, 'Corrette'], [summary.nearly_correct, 'Quasi'], [summary.incorrect, 'Sbagliate']].map(([value, label]) => <div key={label} className="rounded-lg bg-paper p-4 dark:bg-white/10"><p className="text-2xl font-black text-ink dark:text-white">{value}</p><p className="text-xs font-bold text-ink/55 dark:text-white/55">{label}</p></div>)}</div>{locked ? <Link to={`/assignments/${assignmentId}`} className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-black text-white dark:bg-mint dark:text-ink"><CheckCircle2 className="h-4 w-4" />Torna all’attività</Link> : <button type="button" onClick={resetSession} className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-black text-white dark:bg-mint dark:text-ink"><RotateCcw className="h-4 w-4" />Nuova sessione</button>}</section>
          ) : (
            <section className="relative overflow-hidden rounded-2xl border border-moss/15 bg-gradient-to-br from-white via-white to-[#fffaf0] p-5 shadow-soft dark:border-white/10 dark:from-[#14201c] dark:via-[#14201c] dark:to-[#292019] sm:p-8">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-moss via-coral to-[#ffc457]" />
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.1em]"><span className="inline-flex items-center gap-2 rounded-full border border-coral/15 bg-[#fff1df] px-3 py-1.5 text-[#9a3f29] dark:border-coral/25 dark:bg-coral/15 dark:text-[#ffc7b0]"><Sparkles className="h-3.5 w-3.5" />{current.instruction}</span><span className="rounded-full border border-moss/15 bg-mint/55 px-3 py-1.5 text-moss dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-mint">Domanda {index + 1} di {session.length}</span></div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-moss via-coral to-[#ffc457] transition-all" style={{ width: `${((index + 1) / session.length) * 100}%` }} /></div>
              <div className="mt-7 rounded-2xl border border-ink/[0.06] bg-mint/20 px-5 py-7 text-center dark:border-white/[0.06] dark:bg-white/[0.045] sm:px-7"><p className="text-2xl font-black leading-tight text-ink dark:text-white sm:text-4xl">{current.prompt}</p></div>
              <form onSubmit={submitAnswer} className="mt-5">
                {current.options ? <div className="grid gap-3 sm:grid-cols-2">{current.options.map((option) => <button key={option} type="button" disabled={Boolean(feedback)} onClick={() => setResponse(option)} className={`focus-ring rounded-lg border px-4 py-4 text-left text-sm font-black transition ${response === option ? 'border-moss bg-mint text-ink dark:border-emerald-400 dark:bg-emerald-400/15 dark:text-white' : 'border-ink/10 bg-paper text-ink hover:border-moss dark:border-white/15 dark:bg-white/[0.06] dark:text-white'}`}>{option}</button>)}</div> : <label className="grid gap-2"><span className="text-xs font-black uppercase tracking-[0.08em] text-ink/50 dark:text-white/50">La tua risposta</span><input autoFocus value={response} onChange={(event) => setResponse(event.target.value)} disabled={Boolean(feedback)} placeholder="Scrivi la risposta..." className="focus-ring w-full rounded-xl border-2 border-moss/20 bg-white px-5 py-4 text-lg font-bold text-ink shadow-inner placeholder:text-ink/35 transition focus:border-moss dark:border-emerald-300/20 dark:bg-[#17231f] dark:text-white dark:placeholder:text-white/35 dark:focus:border-emerald-300/55" /></label>}
                {feedback ? <div className={`mt-5 rounded-lg border p-4 ${resultStyles[feedback.result]}`}><p className="text-lg font-black">{feedback.label}</p><p className="mt-1 text-sm font-semibold">Risposta: <strong>{current.correctAnswer}</strong></p>{current.explanation ? <p className="mt-2 text-sm leading-6 opacity-75">{current.explanation}</p> : null}</div> : null}
                {saveError ? <p className="mt-3 text-sm font-bold text-coral dark:text-rose-300">{saveError}</p> : null}
                <div className="mt-5 flex items-center justify-between gap-4"><p className="hidden text-xs font-semibold text-ink/45 dark:text-white/45 sm:block">Rispondi, poi controlla prima di continuare.</p>{feedback ? <button type="button" onClick={nextQuestion} className="focus-ring ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-moss to-[#15977c] px-6 py-3 text-sm font-black text-white shadow-lift transition hover:-translate-y-0.5 hover:brightness-110">Prossima<ArrowLeft className="h-4 w-4 rotate-180" /></button> : <button type="submit" disabled={!response.trim()} className="focus-ring ml-auto rounded-full bg-gradient-to-r from-moss to-[#15977c] px-7 py-3 text-sm font-black text-white shadow-lift transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:from-ink/20 disabled:to-ink/20 disabled:text-ink/40 disabled:shadow-none dark:disabled:from-white/10 dark:disabled:to-white/10 dark:disabled:text-white/30">Controlla risposta</button>}</div>
              </form>
            </section>
          )}
          <p className="mt-5 text-center text-xs font-semibold text-ink/50 dark:text-white/50">Vengono usate solo card pubblicate. <Link to="/account" className="font-black underline">Vedi il tuo account</Link></p>
        </div>
      </TrainerLayout>
    </>
  );
}
