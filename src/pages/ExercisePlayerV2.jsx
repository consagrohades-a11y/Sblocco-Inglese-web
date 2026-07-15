import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Coffee,
  Save,
  Sparkles,
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

function hasMeaningfulValue(value) {
  if (value === true) return true;
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === 'object') return Object.values(value).some(hasMeaningfulValue);
  return Boolean(String(value).trim());
}

function answerIsEmpty(answer, question) {
  const type = question?.type;
  if (type === 'content_block') return answer !== true;
  if (type === 'audio_response') return !answer?.file_id;
  if (type === 'dialogue_roleplay') return !answer?.role_key || !hasMeaningfulValue(answer?.turns);
  if (type === 'reading_comprehension') {
    const items = question?.content?.items || [];
    return !items.some((item) => hasMeaningfulValue(answer?.[item.key]));
  }
  return !hasMeaningfulValue(answer);
}

function Intro({ payload, assignmentId, onStart }) {
  const total = payload.sections.reduce((sum, section) => sum + section.questions.length, 0);
  const manual = payload.sections.reduce((sum, section) => sum + section.questions.filter((item) => ['written_response', 'dialogue_roleplay', 'audio_response'].includes(item.question.type)).length, 0);
  return <section className="section-shell py-10 dark:bg-[#171310] lg:py-14"><div className="mx-auto max-w-4xl"><Link to={`/assignments/${assignmentId}`} className="inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]"><ArrowLeft className="h-4 w-4" />Torna all’attività</Link><article className="mt-5 overflow-hidden rounded-3xl border border-clay/15 bg-[#fffdf9] shadow-soft dark:border-white/10 dark:bg-[#211b18]"><div className="relative p-7 sm:p-10"><div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blush blur-3xl dark:bg-coral/10" /><div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-coral/20 bg-blush px-3 py-1.5 text-xs font-black uppercase tracking-wide text-clay dark:bg-coral/10 dark:text-[#f7a98d]"><Coffee className="h-4 w-4" />Esercizio assegnato</span><h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-5xl">{payload.exercise.title}</h1>{payload.exercise.description ? <p className="mt-4 max-w-3xl text-base leading-7 text-ink/65 dark:text-white/65">{payload.exercise.description}</p> : null}<div className="mt-6 flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-linen px-3 py-2 dark:bg-white/10">{payload.exercise.level}</span><span className="rounded-full bg-linen px-3 py-2 dark:bg-white/10">{total} attività</span>{payload.exercise.estimated_minutes ? <span className="inline-flex items-center gap-2 rounded-full bg-butter/60 px-3 py-2 dark:bg-butter/10"><Clock3 className="h-4 w-4" />{payload.exercise.estimated_minutes} min</span> : null}{manual ? <span className="rounded-full bg-violet-100 px-3 py-2 text-violet-800 dark:bg-violet-300/10 dark:text-violet-200">{manual} da valutare dall’insegnante</span> : null}</div><div className="mt-7 rounded-2xl border border-coral/20 bg-blush/55 p-5 dark:bg-coral/[0.07]"><p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/75 dark:text-white/75">{payload.exercise.instructions || 'Completa tutte le sezioni. Le risposte vengono salvate automaticamente.'}</p><p className="mt-3 inline-flex items-center gap-2 text-xs font-black text-ink/50 dark:text-white/50"><Save className="h-4 w-4" />Autosave attivo</p></div><button type="button" onClick={onStart} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-black text-white hover:bg-clay dark:bg-[#ff8b6c] dark:text-[#21140f]"><BookOpenCheck className="h-4 w-4" />Inizia o riprendi</button></div></div></article></div></section>;
}

function FinalResult({ payload, assignmentId, resourceId }) {
  const attempt = payload.attempt;
  const settings = payload.exercise.settings || {};
  const summary = attempt.result_summary || {};
  const pending = Number(summary.pending_review || 0);
  const reviewed = ['reviewed', 'approved'].includes(attempt.review_status);
  return <section className="section-shell py-10 dark:bg-[#171310] lg:py-14"><div className="mx-auto max-w-4xl"><article className="rounded-3xl border border-clay/15 bg-[#fffdf9] p-7 shadow-soft dark:border-white/10 dark:bg-[#211b18] sm:p-10"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${pending ? 'bg-violet-100 text-violet-800 dark:bg-violet-300/10 dark:text-violet-200' : 'bg-blush text-clay dark:bg-coral/10 dark:text-[#f7a98d]'}`}>{pending ? <Clock3 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{pending ? 'Consegnato, valutazione in arrivo' : 'Esercizio completato'}</span><h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-5xl">{payload.exercise.title}</h1>{pending ? <div className="mt-7 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-300/20 dark:bg-violet-400/[0.07]"><p className="text-lg font-black text-violet-950 dark:text-violet-100">{pending} {pending === 1 ? 'produzione deve' : 'produzioni devono'} essere valutata dall’insegnante</p><p className="mt-2 text-sm font-semibold leading-6 text-violet-900/70 dark:text-violet-100/70">Il punteggio finale e le considerazioni appariranno nella tua area studente dopo la revisione.</p></div> : settings.show_score !== false && attempt.score !== null ? <div className="mt-7 rounded-2xl bg-coral p-6 text-white dark:bg-[#ff8b6c] dark:text-[#21140f]"><p className="text-xs font-black uppercase tracking-wide opacity-70">Risultato finale</p><p className="mt-2 text-5xl font-black">{Math.round(Number(attempt.score || 0))}%</p><p className="mt-2 text-sm font-bold opacity-80">{Number(attempt.earned_points || 0).toFixed(1)} / {Number(attempt.max_points || 0).toFixed(1)} punti</p></div> : null}{reviewed && attempt.teacher_note ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-300/20 dark:bg-emerald-400/[0.07]"><p className="text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Considerazioni dell’insegnante</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-emerald-950 dark:text-emerald-100">{attempt.teacher_note}</p></div> : null}{settings.show_diagnostic_summary !== false && !pending ? <div className="mt-6"><ExerciseDiagnosticSummary summary={summary.diagnostic_summary} /></div> : null}<div className="mt-8 flex flex-wrap gap-3"><Link to={`/assignments/${assignmentId}`} className="rounded-full bg-coral px-5 py-3 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-[#21140f]">Torna all’attività</Link>{settings.allow_retry !== false && !pending ? <Link to={`/exercises?assignmentId=${assignmentId}&resourceId=${resourceId}&newAttempt=1`} className="rounded-full border border-clay/20 bg-white px-5 py-3 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Nuovo tentativo</Link> : null}</div></article><div className="mt-6 grid gap-5">{payload.sections.map((section) => <section key={section.id} className="rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 dark:border-white/10 dark:bg-[#211b18] sm:p-7"><h2 className="text-xl font-black text-ink dark:text-white">{section.title}</h2><div className="mt-5 grid gap-5">{section.questions.map((item) => <article key={item.id} className="rounded-xl border border-ink/10 p-4 dark:border-white/10"><ExerciseQuestionRenderer item={item} answer={item.answer} onChange={() => {}} disabled showScore={settings.show_score !== false} showCorrectAnswers={settings.show_correct_answers !== false} showExplanations={settings.show_explanations !== false} attemptId={attempt.id} /></article>)}</div></section>)}</div></div></section>;
}

export default function ExercisePlayerV2() {
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
      if (!assignmentId || !resourceId) { setError('Collegamento esercizio incompleto.'); setLoading(false); return; }
      setLoading(true); setError('');
      try {
        const result = await openAssignedExercise({ assignmentId, resourceId, startNew });
        if (!active) return;
        setPayload(result);
        setShowIntro(result.attempt?.status !== 'submitted');
        if (startNew && result.attempt?.status === 'in_progress') window.history.replaceState(window.history.state, '', `/exercises?assignmentId=${encodeURIComponent(assignmentId)}&resourceId=${encodeURIComponent(resourceId)}`);
      } catch (loadError) { if (active) setError(loadError.message || 'Non è stato possibile aprire l’esercizio.'); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; saveTimers.current.forEach((timer) => window.clearTimeout(timer)); };
  }, [assignmentId, resourceId, startNew]);

  const sectionIndex = payload?.attempt?.current_section_index || 0;
  const questionIndex = payload?.attempt?.current_question_index || 0;
  const currentSection = payload?.sections?.[sectionIndex] || null;
  const currentQuestion = currentSection?.questions?.[questionIndex] || null;
  const displayMode = payload?.exercise?.settings?.display_mode || 'one_at_a_time';
  const totalQuestions = useMemo(() => payload?.sections?.reduce((sum, section) => sum + section.questions.length, 0) || 0, [payload]);
  const completedBefore = useMemo(() => {
    if (!payload) return 0;
    return payload.sections.reduce((sum, section, index) => sum + (index < sectionIndex ? section.questions.length : index === sectionIndex ? Math.min(questionIndex, section.questions.length) : 0), 0);
  }, [payload, sectionIndex, questionIndex]);

  async function persistAnswer(item, answer, nextSectionIndex, nextQuestionIndex) {
    setSaveStatus('Salvataggio...');
    const result = await saveExerciseAnswer({ attemptId: payload.attempt.id, attemptQuestionId: item.id, answer, currentSectionIndex: nextSectionIndex, currentQuestionIndex: nextQuestionIndex });
    setSaveStatus('Salvato');
    return result;
  }

  function changeAnswer(item, answer, sectionPosition, questionPosition) {
    setPayload((current) => cloneWithAnswer(current, sectionPosition, questionPosition, answer));
    setSaveStatus('Da salvare');
    const existing = saveTimers.current.get(item.id);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      persistAnswer(item, answer, sectionPosition, questionPosition).catch((saveError) => { setSaveStatus('Errore'); setError(saveError.message || 'Salvataggio non riuscito.'); });
      saveTimers.current.delete(item.id);
    }, item.question.type === 'audio_response' ? 50 : 600);
    saveTimers.current.set(item.id, timer);
  }

  async function flushSection(section) {
    for (let index = 0; index < section.questions.length; index += 1) {
      const item = section.questions[index];
      const timer = saveTimers.current.get(item.id);
      if (timer) { window.clearTimeout(timer); saveTimers.current.delete(item.id); }
      await persistAnswer(item, item.answer ?? null, sectionIndex, index);
    }
  }

  async function finishSection() {
    if (!currentSection || busy) return;
    const unanswered = currentSection.questions.filter((item) => answerIsEmpty(item.answer, item.question)).length;
    if (unanswered && !window.confirm(`Hai lasciato ${unanswered} ${unanswered === 1 ? 'attività' : 'attività'} senza risposta. Vuoi continuare?`)) return;
    setBusy(true); setError('');
    try { await flushSection(currentSection); setPayload(await completeExerciseSection({ attemptId: payload.attempt.id, sectionId: currentSection.id })); }
    catch (sectionError) { setError(sectionError.message || 'Non è stato possibile completare la sezione.'); }
    finally { setBusy(false); }
  }

  async function submit() {
    setBusy(true); setError('');
    try { setPayload(await submitExerciseAttempt(payload.attempt.id)); }
    catch (submitError) { setError(submitError.message || 'Non è stato possibile consegnare.'); }
    finally { setBusy(false); }
  }

  function moveToNextQuestion() {
    if (!currentQuestion) return;
    const nextIndex = questionIndex + 1;
    const answer = currentQuestion.question.type === 'content_block' ? true : currentQuestion.answer;
    setPayload((current) => cloneWithAnswer(current, sectionIndex, questionIndex, answer));
    persistAnswer(currentQuestion, answer, sectionIndex, Math.min(nextIndex, currentSection.questions.length - 1)).catch(() => {});
    if (nextIndex < currentSection.questions.length) setPayload((current) => ({ ...current, attempt: { ...current.attempt, current_question_index: nextIndex } }));
    else finishSection();
  }

  function continueAfterSection() {
    if (sectionIndex >= payload.sections.length - 1) submit();
    else setPayload((current) => ({ ...current, attempt: { ...current.attempt, current_section_index: sectionIndex + 1, current_question_index: 0 } }));
  }

  if (loading) return <div className="section-shell py-16 dark:bg-[#171310]"><div className="mx-auto max-w-3xl rounded-2xl border border-clay/15 bg-white p-8 text-center text-sm font-black dark:border-white/10 dark:bg-[#211b18]">Caricamento esercizio...</div></div>;
  if (error && !payload) return <div className="section-shell py-16 dark:bg-[#171310]"><div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-950"><h1 className="text-2xl font-black">Esercizio non disponibile</h1><p className="mt-3 text-sm">{error}</p></div></div>;
  if (!payload) return null;
  if (payload.attempt.status === 'submitted') return <><SEO title={`${payload.exercise.title} | Sblocco Inglese`} description="Risultato esercizio" /><FinalResult payload={payload} assignmentId={assignmentId} resourceId={resourceId} /></>;
  if (showIntro) return <><SEO title={`${payload.exercise.title} | Sblocco Inglese`} description="Introduzione esercizio" /><Intro payload={payload} assignmentId={assignmentId} onStart={() => setShowIntro(false)} /></>;

  const progress = totalQuestions ? Math.round((completedBefore / totalQuestions) * 100) : 0;
  const sectionCompleted = currentSection?.status === 'completed';
  return <><SEO title={`${payload.exercise.title} | Sblocco Inglese`} description="Completa esercizio" /><section className="section-shell py-7 dark:bg-[#171310] lg:py-10"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => setShowIntro(true)} className="inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]"><ArrowLeft className="h-4 w-4" />Panoramica</button><p className="inline-flex items-center gap-2 text-xs font-black text-ink/50 dark:text-white/50"><Save className="h-4 w-4" />{saveStatus || 'Autosave attivo'}</p></div>{error ? <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100"><CircleAlert className="mt-0.5 h-4 w-4" />{error}</div> : null}<header className="mt-5 rounded-3xl border border-clay/15 bg-[#fffdf9] p-6 shadow-soft dark:border-white/10 dark:bg-[#211b18] sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-coral dark:text-[#ff9678]"><Sparkles className="h-4 w-4" />Sezione {sectionIndex + 1} di {payload.sections.length}</span><h1 className="mt-2 text-3xl font-black text-ink dark:text-white">{currentSection.title}</h1>{currentSection.instructions ? <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">{currentSection.instructions}</p> : null}</div><span className="rounded-full bg-blush px-4 py-2 text-sm font-black text-clay dark:bg-coral/10 dark:text-[#f7a98d]">{progress}%</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"><div className="h-full rounded-full bg-coral transition-all" style={{ width: `${progress}%` }} /></div></header>{sectionCompleted ? <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-300/20 dark:bg-emerald-400/[0.07]"><p className="text-xl font-black text-emerald-950 dark:text-emerald-100">Sezione completata</p><button type="button" disabled={busy} onClick={continueAfterSection} className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white">{sectionIndex >= payload.sections.length - 1 ? 'Consegna esercizio' : 'Sezione successiva'}<ArrowRight className="h-4 w-4" /></button></section> : displayMode === 'all_questions' ? <section className="mt-5 grid gap-5">{currentSection.questions.map((item, index) => <article key={item.id} className="rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 shadow-sm dark:border-white/10 dark:bg-[#211b18] sm:p-7"><p className="mb-4 text-xs font-black uppercase tracking-wide text-coral dark:text-[#ff9678]">Attività {index + 1}</p><ExerciseQuestionRenderer item={item} answer={item.answer} onChange={(answer) => changeAnswer(item, answer, sectionIndex, index)} attemptId={payload.attempt.id} /></article>)}<button type="button" disabled={busy} onClick={finishSection} className="justify-self-end rounded-full bg-coral px-6 py-3 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-[#21140f]">{busy ? 'Salvataggio...' : 'Completa sezione'}</button></section> : currentQuestion ? <section className="mt-5 rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 shadow-sm dark:border-white/10 dark:bg-[#211b18] sm:p-8"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wide text-coral dark:text-[#ff9678]">Attività {questionIndex + 1} di {currentSection.questions.length}</p><span className="text-xs font-bold text-ink/40 dark:text-white/40">{currentQuestion.question.type}</span></div><div className="mt-5"><ExerciseQuestionRenderer item={currentQuestion} answer={currentQuestion.answer} onChange={(answer) => changeAnswer(currentQuestion, answer, sectionIndex, questionIndex)} attemptId={payload.attempt.id} /></div><div className="mt-7 flex justify-end"><button type="button" disabled={busy} onClick={moveToNextQuestion} className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-black text-white disabled:opacity-40 dark:bg-[#ff8b6c] dark:text-[#21140f]">{questionIndex >= currentSection.questions.length - 1 ? 'Completa sezione' : 'Prossima'}<ArrowRight className="h-4 w-4" /></button></div></section> : null}</div></section></>;
}
