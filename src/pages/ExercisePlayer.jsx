import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
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

function SectionScore({ section, showScore = true }) {
  if (section.status !== 'completed') return null;
  const earned = Number(section.earned_points || 0);
  const maximum = Number(section.max_points || 0);
  const percentage = maximum > 0 ? Math.round((earned / maximum) * 100) : 100;
  return (
    <div className="rounded-2xl border border-moss/20 bg-mint/25 p-5 dark:border-emerald-300/25 dark:bg-emerald-400/10">
      <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Sezione completata</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        {showScore ? <div><p className="text-3xl font-black text-ink dark:text-white">{percentage}%</p><p className="mt-1 text-sm font-semibold text-ink/60 dark:text-white/60">{earned.toFixed(1)} / {maximum.toFixed(1)} punti</p></div> : <p className="text-lg font-black text-ink dark:text-white">Le risposte sono state salvate.</p>}
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
      <div className="rounded-3xl border border-ink/10 bg-white p-7 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-10">
        <span className="eyebrow">Esercizio completato</span>
        <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-5xl">{payload.exercise.title}</h1>
        {settings.show_score !== false ? (
          <div className="mt-8 rounded-2xl bg-ink p-6 text-white dark:bg-emerald-300 dark:text-[#102019]">
            <p className="text-sm font-black uppercase tracking-wide opacity-70">Risultato</p>
            <p className="mt-2 text-5xl font-black">{Math.round(Number(attempt.score || 0))}%</p>
            <p className="mt-2 text-sm font-bold opacity-75">{Number(attempt.earned_points || 0).toFixed(1)} / {Number(attempt.max_points || 0).toFixed(1)} punti</p>
          </div>
        ) : <p className="mt-7 rounded-xl border border-moss/20 bg-mint/20 p-5 text-sm font-bold text-ink dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-white">La consegna è stata registrata. Il punteggio non è visibile per questa attività.</p>}
        {canShowBreakdown ? <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[['Corrette', summary.correct || 0], ['Quasi corrette', summary.nearly_correct || 0], ['Da rivedere', summary.incorrect || 0], ['Non risposte', summary.unanswered || 0]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-ink/10 bg-linen/40 p-4 dark:border-white/10 dark:bg-white/[0.05]"><p className="text-2xl font-black text-ink dark:text-white">{value}</p><p className="mt-1 text-xs font-bold text-ink/55 dark:text-white/55">{label}</p></div>
          ))}
        </div> : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={`/assignments/${assignmentId}`} className="focus-ring rounded-full bg-ink px-5 py-3 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">Torna all’attività</Link>
          {settings.allow_retry !== false ? <Link to={`/exercises?assignmentId=${assignmentId}&resourceId=${resourceId}&newAttempt=1`} className="focus-ring rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Riprova con un nuovo tentativo</Link> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        {payload.sections.map((section) => (
          <section key={section.id} className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#16211e] sm:p-7">
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

  if (loading) return <div className="section-shell py-16"><div className="mx-auto max-w-3xl rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm font-black dark:border-white/10 dark:bg-[#16211e]">Caricamento esercizio...</div></div>;
  if (error && !payload) return <div className="section-shell py-16"><div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-950"><h1 className="text-2xl font-black">Esercizio non disponibile</h1><p className="mt-3 text-sm leading-6">{error}</p><Link to={`/assignments/${assignmentId}`} className="mt-5 inline-flex font-black underline">Torna all’attività</Link></div></div>;
  if (!payload) return null;
  if (payload.attempt.status === 'submitted') return <><SEO title={`${payload.exercise.title} | Sblocco Inglese`} description="Risultato dell’esercizio assegnato." /><section className="section-shell py-10 lg:py-14"><FinalResult payload={payload} assignmentId={assignmentId} resourceId={resourceId} /></section></>;

  const progress = totalQuestions ? Math.round((completedQuestions / totalQuestions) * 100) : 0;
  const sectionCompleted = currentSection?.status === 'completed';
  const settings = payload.exercise.settings || {};

  return (
    <>
      <SEO title={`${payload.exercise.title} | Sblocco Inglese`} description="Completa il tuo esercizio assegnato." />
      <section className="section-shell py-7 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to={`/assignments/${assignmentId}`} className="text-sm font-black text-moss underline dark:text-emerald-300">Torna all’attività</Link>
            <p className={`text-xs font-black ${saveStatus === 'Errore di salvataggio' ? 'text-red-700' : 'text-ink/50 dark:text-white/50'}`}>{saveStatus || 'Autosave attivo'}</p>
          </div>

          <header className="mt-5 rounded-3xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div><span className="eyebrow">{payload.exercise.public_id} · {payload.exercise.level}</span><h1 className="mt-3 text-3xl font-black leading-tight text-ink dark:text-white sm:text-4xl">{payload.exercise.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">{payload.exercise.instructions}</p></div>
              <div className="shrink-0 text-sm font-black text-ink/55 dark:text-white/55">Sezione {sectionIndex + 1} di {payload.sections.length}</div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10"><div className="h-full rounded-full bg-moss transition-all dark:bg-emerald-300" style={{ width: `${progress}%` }} /></div>
          </header>

          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}

          <section className="mt-6">
            <div className="mb-4"><p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Sezione {sectionIndex + 1}</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{currentSection.title}</h2>{currentSection.instructions ? <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">{currentSection.instructions}</p> : null}</div>

            {sectionCompleted ? (
              <div className="grid gap-5">
                <SectionScore section={currentSection} showScore={settings.show_score !== false} />
                {currentSection.feedback_timing === 'section_end' ? currentSection.questions.map((item) => <ExerciseQuestionRenderer key={item.id} item={item} answer={item.answer} onChange={() => {}} disabled showScore={settings.show_score !== false} showCorrectAnswers={settings.show_correct_answers !== false} showExplanations={settings.show_explanations !== false} />) : null}
                <button type="button" disabled={busy} onClick={continueAfterSection} className="justify-self-end rounded-full bg-ink px-6 py-3 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">{sectionIndex >= payload.sections.length - 1 ? (busy ? 'Consegna...' : 'Concludi esercizio') : 'Continua'}</button>
              </div>
            ) : displayMode === 'all_questions' ? (
              <div className="grid gap-5">
                {currentSection.questions.map((item, index) => <ExerciseQuestionRenderer key={item.id} item={item} answer={item.answer} onChange={(answer) => changeAnswer(item, answer, sectionIndex, index)} />)}
                <button type="button" disabled={busy} onClick={completeSection} className="justify-self-end rounded-full bg-ink px-6 py-3 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">{busy ? 'Salvataggio...' : 'Completa sezione'}</button>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3 text-xs font-black text-ink/50 dark:text-white/50"><span>Domanda {questionIndex + 1} di {currentSection.questions.length}</span><span>{currentSection.questions[questionIndex]?.question?.type?.replaceAll('_', ' ')}</span></div>
                <ExerciseQuestionRenderer
                  item={currentSection.questions[questionIndex]}
                  answer={currentSection.questions[questionIndex]?.answer}
                  onChange={(answer) => changeAnswer(currentSection.questions[questionIndex], answer, sectionIndex, questionIndex)}
                />
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <button type="button" disabled={questionIndex === 0 || busy} onClick={() => setPayload((current) => ({ ...current, attempt: { ...current.attempt, current_question_index: Math.max(0, questionIndex - 1) } }))} className="rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink disabled:opacity-35 dark:border-white/20 dark:bg-white/10 dark:text-white">Indietro</button>
                  {questionIndex < currentSection.questions.length - 1 ? <button type="button" disabled={busy} onClick={() => setPayload((current) => ({ ...current, attempt: { ...current.attempt, current_question_index: questionIndex + 1 } }))} className="rounded-full bg-ink px-6 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">Continua</button> : <button type="button" disabled={busy} onClick={completeSection} className="rounded-full bg-ink px-6 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]">{busy ? 'Salvataggio...' : 'Completa sezione'}</button>}
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}
