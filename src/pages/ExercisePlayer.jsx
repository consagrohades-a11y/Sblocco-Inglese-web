import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Coffee,
  Layers3,
  ListChecks,
  Play,
  RotateCcw,
  Save,
  Star,
  Sun,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import ExerciseDiagnosticSummary from '../components/exercises/ExerciseDiagnosticSummary.jsx';
import ExerciseQuestionRenderer from '../components/exercises/ExerciseQuestionRenderer.jsx';
import {
  completeExerciseSection,
  openAssignedExercise,
  saveExerciseAnswer,
  submitExerciseAttempt,
} from '../lib/exercisePlayerApi.js';

function cloneWithAnswer(payload, sectionIndex, questionIndex, answer) {
  return {
    ...payload,
    sections: payload.sections.map((section, currentSection) => currentSection !== sectionIndex ? section : {
      ...section,
      questions: section.questions.map((question, currentQuestion) => currentQuestion !== questionIndex ? question : { ...question, answer }),
    }),
    attempt: {
      ...payload.attempt,
      current_section_index: sectionIndex,
      current_question_index: questionIndex,
    },
  };
}

function answerIsEmpty(answer, type) {
  if (type === 'content_block') return answer !== true;
  if (answer === null || answer === undefined || answer === '') return true;
  if (Array.isArray(answer)) return answer.length === 0;
  if (typeof answer === 'object') return Object.values(answer).every((value) => !String(value || '').trim());
  return !String(answer).trim();
}

function feedbackLabel(value) {
  if (value === 'section_end') return 'Feedback alla fine della sezione';
  if (value === 'exercise_end') return 'Resoconto alla fine';
  return 'Feedback non mostrato';
}

function ExerciseIntro({ payload, assignmentId, onStart }) {
  const attempt = payload.attempt;
  const totalQuestions = payload.sections.reduce((sum, section) => sum + section.questions.length, 0);
  const hasProgress = attempt.current_section_index > 0
    || attempt.current_question_index > 0
    || payload.sections.some((section) => section.status === 'completed')
    || payload.sections.some((section) => section.questions.some((item) => !answerIsEmpty(item.answer, item.question.type)));
  const estimatedMinutes = payload.exercise.estimated_minutes || payload.exercise.estimatedMinutes;

  return (
    <section className="section-shell py-10 dark:bg-[#171310] lg:py-14">
      <div className="mx-auto max-w-4xl">
        <Link to={`/assignments/${assignmentId}`} className="inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]">
          <ArrowLeft className="h-4 w-4" />Torna all’attività
        </Link>

        <article className="mt-5 overflow-hidden rounded-3xl border border-clay/15 bg-[#fffdf9] shadow-soft dark:border-white/10 dark:bg-[#211b18]">
          <div className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-blush blur-3xl dark:bg-coral/10" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-butter/80 blur-3xl dark:bg-butter/5" />
            <Sun className="pointer-events-none absolute right-8 top-7 h-11 w-11 rotate-12 text-coral/50 dark:text-coral/35" strokeWidth={1.7} />
            <Star className="pointer-events-none absolute right-24 top-24 h-6 w-6 -rotate-12 fill-butter text-clay/65 dark:fill-clay/20 dark:text-[#f7a98d]" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-coral/25 bg-blush px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-clay dark:border-coral/25 dark:bg-coral/10 dark:text-[#f7a98d]">
                <Coffee className="h-3.5 w-3.5" />Esercizio assegnato
              </span>
              <h1 className="mt-4 text-3xl font-black leading-tight text-ink dark:text-white sm:text-5xl">{payload.exercise.title}</h1>
              {payload.exercise.description ? <p className="mt-4 max-w-3xl text-base leading-7 text-ink/65 dark:text-white/65">{payload.exercise.description}</p> : null}

              <div className="mt-6 flex flex-wrap gap-2 text-xs font-black text-ink/65 dark:text-white/70">
                <span className="inline-flex items-center gap-2 rounded-full border border-coral/15 bg-blush px-3 py-2 dark:border-coral/20 dark:bg-coral/10"><BookOpenCheck className="h-4 w-4 text-coral dark:text-[#ff9678]" />{payload.exercise.level}</span>
                {estimatedMinutes ? <span className="inline-flex items-center gap-2 rounded-full border border-clay/15 bg-butter/60 px-3 py-2 dark:border-butter/10 dark:bg-butter/10"><CalendarDays className="h-4 w-4 text-clay dark:text-[#ffd98a]" />Circa {estimatedMinutes} min</span> : null}
                <span className="inline-flex items-center gap-2 rounded-full border border-coral/15 bg-[#fde9dc] px-3 py-2 dark:border-coral/20 dark:bg-coral/10"><Layers3 className="h-4 w-4 text-coral dark:text-[#ff9678]" />{payload.sections.length} {payload.sections.length === 1 ? 'sezione' : 'sezioni'}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-clay/15 bg-linen px-3 py-2 dark:border-white/10 dark:bg-white/10"><ListChecks className="h-4 w-4 text-clay dark:text-[#f7a98d]" />{totalQuestions} attività</span>
              </div>

              <section className="mt-8 rounded-2xl border border-coral/20 bg-blush/65 p-5 dark:border-coral/20 dark:bg-coral/[0.08] sm:p-6">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-clay dark:text-[#f7a98d]"><Coffee className="h-4 w-4" />Prima di iniziare</p>
                <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-ink/75 dark:text-white/75">{payload.exercise.instructions || 'Completa le sezioni con calma. Le risposte vengono salvate automaticamente.'}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-black text-ink/55 dark:text-white/60"><Save className="h-4 w-4 text-coral dark:text-[#ff9678]" />Autosave attivo. Puoi chiudere e riprendere più tardi.</div>
              </section>

              <section className="mt-8">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-coral dark:text-[#ff9678]"><Sun className="h-4 w-4" />Cosa farai</p>
                <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">Le sezioni dell’esercizio</h2>
                <div className="mt-5 grid gap-3">
                  {payload.sections.map((section, index) => (
                    <article key={section.id} className="flex flex-col gap-3 rounded-2xl border border-clay/15 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index % 2 === 0 ? 'bg-blush text-coral dark:bg-coral/10 dark:text-[#ff9678]' : 'bg-butter text-clay dark:bg-butter/10 dark:text-[#ffd98a]'}`}><BookOpenCheck className="h-5 w-5" /></span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-[#f7a98d]">Sezione {index + 1}</p>
                          <h3 className="mt-1 text-lg font-black text-ink dark:text-white">{section.title}</h3>
                          {section.instructions ? <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">{section.instructions}</p> : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-sm font-black text-ink dark:text-white">{section.questions.length} {section.questions.length === 1 ? 'domanda' : 'domande'}</p>
                        <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">{feedbackLabel(section.feedback_timing)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-clay/10 bg-linen/35 p-5 dark:border-white/10 dark:bg-white/[0.035] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <p className="text-sm font-semibold text-ink/55 dark:text-white/55">{hasProgress ? 'Hai già iniziato questo tentativo. Riprenderai dal punto salvato.' : 'Il tentativo inizierà quando premi il pulsante.'}</p>
            <button type="button" onClick={onStart} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-black text-white transition hover:bg-clay dark:bg-[#ff8b6c] dark:text-[#21140f] dark:hover:bg-[#f7a98d]">
              {hasProgress ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}{hasProgress ? 'Riprendi esercizio' : 'Inizia esercizio'}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function SectionScore({ section, showScore = true }) {
  if (section.status !== 'completed') return null;
  const earned = Number(section.earned_points || 0);
  const maximum = Number(section.max_points || 0);
  const percentage = maximum > 0 ? Math.round((earned / maximum) * 100) : 100;
  return (
    <div className="rounded-2xl border border-coral/20 bg-blush/65 p-5 dark:border-coral/20 dark:bg-coral/[0.08]">
      <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-clay dark:text-[#f7a98d]"><Star className="h-4 w-4 fill-butter text-clay" />Sezione completata</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        {showScore ? <div><p className="text-3xl font-black text-coral dark:text-[#ff9678]">{percentage}%</p><p className="mt-1 text-sm font-semibold text-ink/60 dark:text-white/60">{earned.toFixed(1)} / {maximum.toFixed(1)} punti</p></div> : <p className="text-lg font-black text-ink dark:text-white">Le risposte sono state salvate.</p>}
        <p className="max-w-md text-sm leading-6 text-ink/65 dark:text-white/65">Il feedback visibile dipende dalle impostazioni scelte per questa sezione.</p>
      </div>
    </div>
  );
}

function FinalResult({ payload, assignmentId, resourceId }) {
  const attempt = payload.attempt;
  const settings = payload.exercise.settings || {};
  const summary = attempt.result_summary || {};
  const canShowBreakdown = settings.show_score !== false && payload.sections.some((section) => section.feedback_timing !== 'hidden');
  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-3xl border border-clay/15 bg-[#fffdf9] p-7 shadow-soft dark:border-white/10 dark:bg-[#211b18] sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-coral/25 bg-blush px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-clay dark:border-coral/25 dark:bg-coral/10 dark:text-[#f7a98d]"><Star className="h-3.5 w-3.5 fill-butter" />Esercizio completato</span>
        <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-5xl">{payload.exercise.title}</h1>
        {settings.show_score !== false ? (
          <div className="mt-8 rounded-2xl bg-coral p-6 text-white dark:bg-[#ff8b6c] dark:text-[#21140f]">
            <p className="text-sm font-black uppercase tracking-wide opacity-75">Risultato</p>
            <p className="mt-2 text-5xl font-black">{Math.round(Number(attempt.score || 0))}%</p>
            <p className="mt-2 text-sm font-bold opacity-80">{Number(attempt.earned_points || 0).toFixed(1)} / {Number(attempt.max_points || 0).toFixed(1)} punti</p>
          </div>
        ) : <p className="mt-7 rounded-xl border border-coral/20 bg-blush/60 p-5 text-sm font-bold text-ink dark:border-coral/20 dark:bg-coral/[0.08] dark:text-white">La consegna è stata registrata. Il punteggio non è visibile per questa attività.</p>}
        {canShowBreakdown ? <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[['Corrette', summary.correct || 0], ['Quasi corrette', summary.nearly_correct || 0], ['Da rivedere', summary.incorrect || 0], ['Non risposte', summary.unanswered || 0]].map(([label, value], index) => (
            <div key={label} className={`rounded-xl border p-4 dark:border-white/10 ${index % 2 === 0 ? 'border-coral/15 bg-blush/45 dark:bg-coral/[0.06]' : 'border-clay/15 bg-butter/35 dark:bg-butter/[0.04]'}`}><p className="text-2xl font-black text-ink dark:text-white">{value}</p><p className="mt-1 text-xs font-bold text-ink/55 dark:text-white/55">{label}</p></div>
          ))}
        </div> : null}
        {settings.show_diagnostic_summary !== false ? <div className="mt-6"><ExerciseDiagnosticSummary summary={summary.diagnostic_summary} /></div> : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={`/assignments/${assignmentId}`} className="focus-ring rounded-full bg-coral px-5 py-3 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-[#21140f]">Torna all’attività</Link>
          {settings.allow_retry !== false ? <Link to={`/exercises?assignmentId=${assignmentId}&resourceId=${resourceId}&newAttempt=1`} className="focus-ring rounded-full border border-clay/20 bg-white px-5 py-3 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Riprova con un nuovo tentativo</Link> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        {payload.sections.map((section) => (
          <section key={section.id} className="rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 dark:border-white/10 dark:bg-[#211b18] sm:p-7">
            <h2 className="text-xl font-black text-ink dark:text-white">{section.title}</h2>
            <div className="mt-5 grid gap-4">
              {section.questions.map((item) => <ExerciseQuestionRenderer key={item.id} item={item} answer={item.answer} onChange={() => {}} disabled showScore={settings.show_score !== false} showCorrectAnswers={settings.show_correct_answers !== false} showExplanations={settings.show_explanations !== false} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function ExercisePlayer() {
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId') || '';
  const resourceId = searchParams.get('resourceId') || '';
  const startNew = searchParams.get('newAttempt') === '1';
  const [payload, setPayload] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const saveTimers = useRef(new Map());

  useEffect(() => {
    let active = true;
    async function load() {
      if (!assignmentId || !resourceId) {
        setError('Collegamento esercizio incompleto.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const result = await openAssignedExercise({ assignmentId, resourceId, startNew });
        if (active) {
          setPayload(result);
          setShowIntro(result.attempt?.status !== 'submitted');
          if (startNew && result.attempt?.status === 'in_progress') {
            window.history.replaceState(window.history.state, '', `/exercises?assignmentId=${encodeURIComponent(assignmentId)}&resourceId=${encodeURIComponent(resourceId)}`);
          }
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Non è stato possibile aprire l’esercizio.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
      saveTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [assignmentId, resourceId, startNew]);

  const sectionIndex = payload?.attempt?.current_section_index || 0;
  const questionIndex = payload?.attempt?.current_question_index || 0;
  const currentSection = payload?.sections?.[sectionIndex] || payload?.sections?.[0] || null;
  const displayMode = payload?.exercise?.settings?.display_mode || 'one_at_a_time';
  const totalQuestions = useMemo(() => payload?.sections?.reduce((sum, section) => sum + section.questions.length, 0) || 0, [payload]);
  const completedQuestions = useMemo(() => {
    if (!payload) return 0;
    let count = 0;
    payload.sections.forEach((section, sIndex) => {
      if (sIndex < sectionIndex) count += section.questions.length;
      else if (sIndex === sectionIndex) count += Math.min(questionIndex, section.questions.length);
    });
    return count;
  }, [payload, sectionIndex, questionIndex]);

  async function persistAnswer(item, answer, nextSectionIndex, nextQuestionIndex) {
    setSaveStatus('Salvataggio...');
    try {
      await saveExerciseAnswer({
        attemptId: payload.attempt.id,
        attemptQuestionId: item.id,
        answer,
        currentSectionIndex: nextSectionIndex,
        currentQuestionIndex: nextQuestionIndex,
      });
      setSaveStatus('Salvato');
    } catch (saveError) {
      setSaveStatus('Errore di salvataggio');
      setError(saveError.message || 'Non è stato possibile salvare la risposta.');
      throw saveError;
    }
  }

  function changeAnswer(item, answer, currentSectionPosition, currentQuestionPosition) {
    setPayload((current) => cloneWithAnswer(current, currentSectionPosition, currentQuestionPosition, answer));
    setSaveStatus('Da salvare');
    const existing = saveTimers.current.get(item.id);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      persistAnswer(item, answer, currentSectionPosition, currentQuestionPosition).catch(() => {});
      saveTimers.current.delete(item.id);
    }, 550);
    saveTimers.current.set(item.id, timer);
  }

  async function flushSection(section, currentSectionPosition) {
    for (let index = 0; index < section.questions.length; index += 1) {
      const item = section.questions[index];
      const timer = saveTimers.current.get(item.id);
      if (timer) {
        window.clearTimeout(timer);
        saveTimers.current.delete(item.id);
      }
      await persistAnswer(item, item.answer ?? null, currentSectionPosition, index);
    }
  }

  async function completeSection() {
    if (!currentSection || busy) return;
    const unanswered = currentSection.questions.filter((item) => answerIsEmpty(item.answer, item.question.type)).length;
    if (unanswered > 0 && !window.confirm(`Hai lasciato ${unanswered} ${unanswered === 1 ? 'domanda' : 'domande'} senza risposta. Vuoi completare comunque la sezione?`)) return;
    setBusy(true);
    setError('');
    try {
      await flushSection(currentSection, sectionIndex);
      const result = await completeExerciseSection({ attemptId: payload.attempt.id, sectionId: currentSection.id });
      setPayload(result);
    } catch (sectionError) {
      setError(sectionError.message || 'Non è stato possibile completare la sezione.');
    } finally {
      setBusy(false);
    }
  }

  async function submitAttempt() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await submitExerciseAttempt(payload.attempt.id);
      setPayload(result);
    } catch (submitError) {
      setError(submitError.message || 'Non è stato possibile consegnare l’esercizio.');
    } finally {
      setBusy(false);
    }
  }

  function continueAfterSection() {
    if (sectionIndex >= payload.sections.length - 1) {
      submitAttempt();
      return;
    }
    setPayload((current) => ({
      ...current,
      attempt: { ...current.attempt, current_section_index: sectionIndex + 1, current_question_index: 0 },
    }));
  }

  if (loading) return <div className="section-shell py-16 dark:bg-[#171310]"><div className="mx-auto max-w-3xl rounded-2xl border border-clay/15 bg-[#fffdf9] p-8 text-center text-sm font-black dark:border-white/10 dark:bg-[#211b18]">Caricamento esercizio...</div></div>;
  if (error && !payload) return <div className="section-shell py-16 dark:bg-[#171310]"><div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-950"><h1 className="text-2xl font-black">Esercizio non disponibile</h1><p className="mt-3 text-sm leading-6">{error}</p><Link to={`/assignments/${assignmentId}`} className="mt-5 inline-flex font-black underline">Torna all’attività</Link></div></div>;
  if (!payload) return null;
  if (payload.attempt.status === 'submitted') return <><SEO title={`${payload.exercise.title} | Sblocco Inglese`} description="Risultato dell’esercizio assegnato." /><section className="section-shell py-10 dark:bg-[#171310] lg:py-14"><FinalResult payload={payload} assignmentId={assignmentId} resourceId={resourceId} /></section></>;
  if (showIntro) return <><SEO title={`${payload.exercise.title} | Sblocco Inglese`} description="Introduzione all’esercizio assegnato." /><ExerciseIntro payload={payload} assignmentId={assignmentId} onStart={() => setShowIntro(false)} /></>;

  const progress = totalQuestions ? Math.round((completedQuestions / totalQuestions) * 100) : 0;
  const sectionCompleted = currentSection?.status === 'completed';
  const settings = payload.exercise.settings || {};

  return (
    <>
      <SEO title={`${payload.exercise.title} | Sblocco Inglese`} description="Completa il tuo esercizio assegnato." />
      <section className="section-shell py-7 dark:bg-[#171310] lg:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setShowIntro(true)} className="inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]"><ArrowLeft className="h-4 w-4" />Panoramica esercizio</button>
            <p className={`inline-flex items-center gap-2 text-xs font-black ${saveStatus === 'Errore di salvataggio' ? 'text-red-700' : 'text-ink/50 dark:text-white/50'}`}><Save className="h-3.5 w-3.5 text-coral dark:text-[#ff9678]" />{saveStatus || 'Autosave attivo'}</p>
          </div>

          <header className="mt-5 overflow-hidden rounded-3xl border border-clay/15 bg-[#fffdf9] shadow-soft dark:border-white/10 dark:bg-[#211b18]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div><span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-coral dark:text-[#ff9678]"><BookOpenCheck className="h-4 w-4" />{payload.exercise.public_id} · {payload.exercise.level}</span><h1 className="mt-3 text-3xl font-black leading-tight text-ink dark:text-white sm:text-4xl">{payload.exercise.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">{payload.exercise.instructions}</p></div>
                <div className="shrink-0 rounded-full border border-coral/15 bg-blush px-4 py-2 text-sm font-black text-clay dark:border-coral/20 dark:bg-coral/10 dark:text-[#f7a98d]">Sezione {sectionIndex + 1} di {payload.sections.length}</div>
              </div>
            </div>
            <div className="border-t border-clay/10 bg-linen/35 px-6 py-4 dark:border-white/10 dark:bg-white/[0.035] sm:px-8">
              <div className="flex items-center justify-between gap-4 text-xs font-black text-ink/50 dark:text-white/50"><span>{completedQuestions} di {totalQuestions} completate</span><span>{progress}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-clay/10 dark:bg-white/10"><div className="h-full rounded-full bg-coral transition-all dark:bg-[#ff8b6c]" style={{ width: `${progress}%` }} /></div>
            </div>
          </header>

          {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-950 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}

          <section className="mt-6">
            <div className="mb-4 rounded-2xl border border-coral/20 bg-blush/55 p-5 dark:border-coral/20 dark:bg-coral/[0.08]">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-clay dark:text-[#f7a98d]"><Star className="h-4 w-4 fill-butter text-clay" />Sezione {sectionIndex + 1}</p>
              <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{currentSection.title}</h2>
              {currentSection.instructions ? <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">{currentSection.instructions}</p> : null}
            </div>

            {sectionCompleted ? (
              <div className="grid gap-5">
                <SectionScore section={currentSection} showScore={settings.show_score !== false} />
                {currentSection.feedback_timing === 'section_end' ? currentSection.questions.map((item) => <ExerciseQuestionRenderer key={item.id} item={item} answer={item.answer} onChange={() => {}} disabled showScore={settings.show_score !== false} showCorrectAnswers={settings.show_correct_answers !== false} showExplanations={settings.show_explanations !== false} />) : null}
                <button type="button" disabled={busy} onClick={continueAfterSection} className="justify-self-end rounded-full bg-coral px-6 py-3 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-[#21140f]">{sectionIndex >= payload.sections.length - 1 ? (busy ? 'Consegna...' : 'Concludi esercizio') : 'Continua'}</button>
              </div>
            ) : displayMode === 'all_questions' ? (
              <div className="grid gap-5">
                {currentSection.questions.map((item, index) => <ExerciseQuestionRenderer key={item.id} item={item} answer={item.answer} onChange={(answer) => changeAnswer(item, answer, sectionIndex, index)} />)}
                <button type="button" disabled={busy} onClick={completeSection} className="justify-self-end rounded-full bg-coral px-6 py-3 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-[#21140f]">{busy ? 'Salvataggio...' : 'Completa sezione'}</button>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs font-black text-ink/50 dark:text-white/50"><span>Domanda {questionIndex + 1} di {currentSection.questions.length}</span><span className="rounded-full border border-clay/10 bg-butter/45 px-3 py-1.5 text-clay dark:border-white/10 dark:bg-butter/[0.06] dark:text-[#ffd98a]">{currentSection.questions[questionIndex]?.question?.type?.replaceAll('_', ' ')}</span></div>
                <ExerciseQuestionRenderer
                  item={currentSection.questions[questionIndex]}
                  answer={currentSection.questions[questionIndex]?.answer}
                  onChange={(answer) => changeAnswer(currentSection.questions[questionIndex], answer, sectionIndex, questionIndex)}
                />
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <button type="button" disabled={questionIndex === 0 || busy} onClick={() => setPayload((current) => ({ ...current, attempt: { ...current.attempt, current_question_index: Math.max(0, questionIndex - 1) } }))} className="rounded-full border border-clay/20 bg-white px-5 py-2.5 text-sm font-black text-ink disabled:opacity-35 dark:border-white/20 dark:bg-white/10 dark:text-white">Indietro</button>
                  {questionIndex < currentSection.questions.length - 1 ? <button type="button" disabled={busy} onClick={() => setPayload((current) => ({ ...current, attempt: { ...current.attempt, current_question_index: questionIndex + 1 } }))} className="rounded-full bg-coral px-6 py-2.5 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-[#21140f]">Continua</button> : <button type="button" disabled={busy} onClick={completeSection} className="rounded-full bg-coral px-6 py-2.5 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-[#21140f]">{busy ? 'Salvataggio...' : 'Completa sezione'}</button>}
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}
