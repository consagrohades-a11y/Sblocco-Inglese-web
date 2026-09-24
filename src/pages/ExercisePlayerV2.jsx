import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Coffee,
  Save,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import ExerciseDiagnosticSummary from "../components/exercises/ExerciseDiagnosticSummary.jsx";
import ExerciseQuestionRenderer from "../components/exercises/ExerciseQuestionRenderer.jsx";
import {
  ExerciseActionBar,
  ExerciseActivity,
  ExerciseCanvas,
  ExerciseMilestone,
  ExerciseProgressHeader,
} from "../components/exercises/ExerciseExperience.jsx";
import { normalizeExerciseAnswerForSave } from "../lib/exerciseAnswerNormalization.js";
import { archiveLearnerReviewNotificationsForAttempt } from "../lib/learnerNotificationsApi.js";
import {
  completeExerciseSection,
  checkExerciseQuestion,
  openAssignedExercise,
  openExerciseAttempt,
  saveExerciseAnswer,
  submitExerciseAttempt,
} from "../lib/exercisePlayerApi.js";

function cloneWithAnswer(payload, sectionIndex, questionIndex, answer) {
  return {
    ...payload,
    sections: payload.sections.map((section, currentSection) =>
      currentSection !== sectionIndex
        ? section
        : {
            ...section,
            questions: section.questions.map((question, currentQuestion) =>
              currentQuestion !== questionIndex
                ? question
                : { ...question, answer },
            ),
          },
    ),
    attempt: {
      ...payload.attempt,
      current_section_index: sectionIndex,
      current_question_index: questionIndex,
    },
  };
}

function hasMeaningfulValue(value) {
  if (value === true) return true;
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === "object")
    return Object.values(value).some(hasMeaningfulValue);
  return Boolean(String(value).trim());
}

function answerMissingCount(answer, question) {
  const type = question?.type;
  if (type === "content_block") return 0;
  if (type === "audio_response") return answer?.file_id ? 0 : 1;

  if (type === "dialogue_roleplay") {
    if (!answer?.role_key) return 1;
    if (question?.content?.response_mode !== "audio_per_turn")
      return hasMeaningfulValue(answer?.turns) ? 0 : 1;

    const learnerTurns = (question.content.turns || []).filter(
      (turn) =>
        turn.speaker === answer.role_key &&
        turn.learner_response !== false &&
        turn.required !== false,
    );
    if (!learnerTurns.length) return 1;
    return learnerTurns.filter(
      (turn) => !answer?.turns?.[turn.key]?.file_id,
    ).length;
  }

  if (type === "reading_comprehension" || type === "listening_comprehension") {
    const items = question?.content?.items || [];
    if (!items.length) return hasMeaningfulValue(answer) ? 0 : 1;
    return items.filter((item) => !hasMeaningfulValue(answer?.[item.key])).length;
  }

  return hasMeaningfulValue(answer) ? 0 : 1;
}

function answerIsEmpty(answer, question) {
  const type = question?.type;

  if (type === "reading_comprehension" || type === "listening_comprehension") {
    const items = question?.content?.items || [];
    if (!items.length) return answerMissingCount(answer, question) > 0;
    return items.every((item) => !hasMeaningfulValue(answer?.[item.key]));
  }

  return answerMissingCount(answer, question) > 0;
}

function transcriptBeforeQuestion(payload, targetSectionIndex, targetQuestionIndex) {
  let transcript = '';
  const sections = payload?.sections || [];

  for (let sectionIndex = 0; sectionIndex <= targetSectionIndex; sectionIndex += 1) {
    const questions = sections[sectionIndex]?.questions || [];
    const lastIndex = sectionIndex === targetSectionIndex ? targetQuestionIndex - 1 : questions.length - 1;
    for (let questionIndex = 0; questionIndex <= lastIndex; questionIndex += 1) {
      const content = questions[questionIndex]?.question?.content;
      if (content?.presentation === 'media' && String(content?.media?.transcript || '').trim()) {
        transcript = content.media.transcript;
      }
    }
  }

  return transcript;
}

function getProgressMilestone(previousCount, completedCount, sectionTitle) {
  if (previousCount < 50 && completedCount >= 50) return { title: '50 attività completate', body: 'Hai costruito una pratica davvero solida. Fermati un momento e riconosci quanta strada hai fatto.' };
  if (previousCount < 25 && completedCount >= 25) return { title: '25 attività completate', body: 'Ottimo ritmo. Le strutture stanno diventando più familiari e più facili da usare.' };
  if (previousCount < 10 && completedCount >= 10) return { title: '10 attività completate', body: 'Bel lavoro. Hai già trasformato questa sessione in pratica concreta.' };
  if (previousCount < 5 && completedCount >= 5) return { title: '5 attività completate', body: 'Hai superato il primo traguardo. Continua così, un passo alla volta.' };
  return { title: `${sectionTitle || 'Sezione'} completata`, body: 'Hai completato questa parte. Continua quando sei pronta.' };
}

function Intro({ payload, assignmentId, onStart }) {
  const total = payload.sections.reduce(
    (sum, section) => sum + section.questions.length,
    0,
  );
  const manual = payload.sections.reduce(
    (sum, section) =>
      sum +
      section.questions.filter((item) =>
        ["written_response", "dialogue_roleplay", "audio_response"].includes(
          item.question.type,
        ),
      ).length,
    0,
  );
  return (
    <section className="learner-exercise-page section-shell py-10 lg:py-14">
      <ExerciseCanvas>
      <div className="mx-auto max-w-4xl">
        <Link
          to={`/assignments/${assignmentId}`}
          className="inline-flex items-center gap-2 text-sm font-black text-clay underline underline-offset-4 dark:text-[#f0a27d]"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna all’attività
        </Link>
        <article className="exercise-activity exercise-intro mt-5 overflow-hidden">
          <div className="p-7 sm:p-10">
            <p className="exercise-eyebrow text-[0.7rem] font-black uppercase tracking-[0.12em] text-clay dark:text-[#f0a27d]">
              <Coffee className="h-4 w-4" />
              Esercizio assegnato
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-ink dark:text-[#f3eee7] sm:text-5xl">
              {payload.exercise.title}
            </h1>
            {payload.exercise.description ? (
              <p className="mt-4 max-w-3xl text-base leading-7 text-ink/62 dark:text-white/60">
                {payload.exercise.description}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-y border-ink/10 py-3 text-xs font-bold text-ink/55 dark:border-white/10 dark:text-white/55">
              <span>{payload.exercise.level}</span>
              <span>{total} attività</span>
              {payload.exercise.estimated_minutes ? <span>~ {payload.exercise.estimated_minutes} min</span> : null}
              {manual ? <span>{manual} da valutare dall’insegnante</span> : null}
              {payload.attempt?.completion?.rule === "passed" && payload.attempt.completion.required_score != null ? (
                <span>Obiettivo {Math.round(Number(payload.attempt.completion.required_score))}%</span>
              ) : null}
            </div>

            <div className="mt-6 border-l-2 border-orange-400 pl-4">
              <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/72 dark:text-white/70">
                {payload.exercise.instructions || "Completa tutte le sezioni. Le risposte vengono salvate automaticamente."}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-ink/45 dark:text-white/45">
                <Save className="h-4 w-4" />
                Autosave attivo
              </p>
            </div>

            <button type="button" onClick={onStart} className="exercise-primary-action mt-7">
              <BookOpenCheck className="h-4 w-4" />
              Inizia o riprendi
            </button>
          </div>
        </article>
      </div>
      </ExerciseCanvas>
    </section>
  );
}

function ResultBreakdown({ summary }) {
  const chips = [
    ["correct", "corrette", "bg-emerald-100 text-emerald-900 dark:bg-emerald-300/10 dark:text-emerald-200"],
    ["nearly_correct", "quasi corrette", "bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100"],
    ["incorrect", "da rivedere", "bg-red-100 text-red-900 dark:bg-red-300/10 dark:text-red-100"],
    ["unanswered", "senza risposta", "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white/70"],
    ["pending_review", "in attesa di valutazione", "bg-sky-100 text-sky-900 dark:bg-sky-300/10 dark:text-sky-200"],
  ].filter(([key]) => key === "correct" || Number(summary?.[key] || 0) > 0);
  if (!chips.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map(([key, label, className]) => (
        <span
          key={key}
          className={`rounded-full px-3 py-1.5 text-xs font-black ${className}`}
        >
          {Number(summary?.[key] || 0)} {label}
        </span>
      ))}
    </div>
  );
}

function exerciseResultNeedsReview(result) {
  const status = String(result?.status || '');
  if (['incorrect', 'nearly_correct', 'unanswered'].includes(status)) return true;
  const max = Number(result?.max_points || 0);
  const earned = Number(result?.earned_points || 0);
  return max > 0 && earned < max;
}

function b2ReadingPartScores(payload) {
  const rows = [];
  (payload?.sections || []).forEach((section) => {
    (section.questions || []).forEach((item) => {
      const presentation = item?.question?.content?.presentation;
      if (!['b2_part5', 'b2_part6', 'b2_part7'].includes(presentation)) return;
      const result = item?.result || {};
      rows.push({
        id: item.id || presentation,
        label: presentation === 'b2_part5'
          ? 'Part 5 · Multiple choice'
          : presentation === 'b2_part6'
            ? 'Part 6 · Gapped text'
            : 'Part 7 · Multiple matching',
        shortLabel: presentation === 'b2_part5'
          ? 'Part 5'
          : presentation === 'b2_part6'
            ? 'Part 6'
            : 'Part 7',
        earned: Number(result.earned_points || 0),
        max: Number(result.max_points || 0),
      });
    });
  });
  return rows;
}

function FinalResult({ payload, assignmentId, resourceId, focusMistakesRequested = false }) {
  const attempt = payload.attempt;
  const settings = payload.exercise.settings || {};
  const summary = attempt.result_summary || {};
  const pending = Number(summary.pending_review || 0);
  const reviewPublished = attempt.review_status === "approved";
  const awaitingPublishedReview =
    pending > 0 || attempt.review_status === "reviewed";
  const hasAutoPoints = Number(attempt.max_points || 0) > 0;
  const completion = attempt.completion || {};
  const readingPartScores = b2ReadingPartScores(payload);
  const completionRule = completion.rule || "submitted";
  const scoreValue = attempt.score === null ? null : Number(attempt.score || 0);
  const goalScore =
    completionRule === "passed" && completion.required_score != null
      ? Number(completion.required_score)
      : null;
  const requiredAttempts =
    completionRule === "attempts" && completion.required_attempts != null
      ? Number(completion.required_attempts)
      : null;
  const scoreGoalMet =
    goalScore === null || (scoreValue !== null && scoreValue >= goalScore);
  const attemptsGoalMet =
    requiredAttempts === null ||
    Number(attempt.attempt_number || 0) >= requiredAttempts;
  const remainingAttempts =
    requiredAttempts === null
      ? 0
      : Math.max(0, requiredAttempts - Number(attempt.attempt_number || 0));
  const completionGoalMet =
    completionRule === "submitted" ||
    (completionRule === "passed" && scoreGoalMet) ||
    (completionRule === "attempts" && attemptsGoalMet);
  const needsMoreWork = !awaitingPublishedReview && !completionGoalMet;
  const mistakeCount = (payload.sections || []).reduce(
    (sum, section) => sum + (section.questions || []).filter((item) => exerciseResultNeedsReview(item.result)).length,
    0,
  );
  const [mistakeFocus, setMistakeFocus] = useState(Boolean(focusMistakesRequested && mistakeCount > 0));

  const resultBadgeLabel = awaitingPublishedReview
    ? "Consegnato, valutazione in arrivo"
    : completionRule === "passed" && !scoreGoalMet
      ? "Consegnato · obiettivo non raggiunto"
      : completionRule === "attempts" && !attemptsGoalMet
        ? `Tentativo ${attempt.attempt_number} completato`
        : "Esercizio completato";

  return (
    <section className="learner-exercise-page section-shell py-10 lg:py-14">
      <ExerciseCanvas>
      <div className="mx-auto max-w-4xl">
        <article className="exercise-activity p-7 sm:p-10">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              awaitingPublishedReview
                ? "bg-sky-100 text-sky-800 dark:bg-sky-300/10 dark:text-sky-200"
                : needsMoreWork
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100"
                  : "bg-blush text-clay dark:bg-coral/10 dark:text-[#f7a98d]"
            }`}
          >
            {awaitingPublishedReview ? (
              <Clock3 className="h-4 w-4" />
            ) : needsMoreWork ? (
              <CircleAlert className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {resultBadgeLabel}
          </span>
          <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-5xl">
            {payload.exercise.title}
          </h1>

          {!awaitingPublishedReview && completionRule === "passed" && !scoreGoalMet ? (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-300/20 dark:bg-amber-300/[0.07]">
              <p className="text-lg font-black text-amber-950 dark:text-amber-100">
                Hai completato il tentativo, ma non hai ancora raggiunto l’obiettivo
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-amber-900/75 dark:text-amber-100/70">
                Hai ottenuto {Math.round(scoreValue || 0)}%. Per completare questa attività serve almeno {Math.round(goalScore)}%.
                {settings.allow_retry !== false ? " Puoi riprovare quando vuoi." : ""}
              </p>
            </div>
          ) : null}

          {!awaitingPublishedReview && completionRule === "attempts" && !attemptsGoalMet ? (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-300/20 dark:bg-amber-300/[0.07]">
              <p className="text-lg font-black text-amber-950 dark:text-amber-100">
                Tentativo {attempt.attempt_number} completato
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-amber-900/75 dark:text-amber-100/70">
                Questa attività richiede {requiredAttempts} tentativi. Te ne {remainingAttempts === 1 ? "manca" : "mancano"} {remainingAttempts}.
              </p>
            </div>
          ) : null}

          {awaitingPublishedReview ? (
            <div className="mt-7 border-y border-sky-200 bg-sky-50 p-5 dark:border-sky-300/20 dark:bg-sky-400/[0.07]">
              <p className="text-lg font-black text-sky-950 dark:text-sky-100">
                La valutazione dell’insegnante non è ancora stata pubblicata
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-sky-900/70 dark:text-sky-100/70">
                {pending > 0
                  ? `${pending} ${pending === 1 ? "attività verrà valutata" : "attività verranno valutate"} dall’insegnante: il punteggio finale comprenderà anche ${pending === 1 ? "quella valutazione" : "quelle valutazioni"}.`
                  : "Riceverai una notifica nella tua area studente quando punteggio e considerazioni saranno pronti."}
              </p>
            </div>
          ) : settings.show_score !== false &&
            attempt.score !== null &&
            hasAutoPoints ? (
            <>
              <div className="mt-7 rounded-2xl bg-coral p-6 text-white dark:bg-[#ff8b6c] dark:text-surface-950">
                <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                  Risultato finale
                </p>
                <p className="mt-2 text-5xl font-black">
                  {Math.round(Number(attempt.score || 0))}%
                </p>
                <p className="mt-2 text-sm font-bold opacity-80">
                  {Number(attempt.earned_points || 0).toFixed(1)} /{" "}
                  {Number(attempt.max_points || 0).toFixed(1)} punti
                </p>
                {goalScore !== null ? (
                  <p className="mt-2 text-xs font-black uppercase tracking-wide opacity-80">
                    Obiettivo: {Math.round(goalScore)}%
                    {Number(attempt.score || 0) >= goalScore
                      ? " · raggiunto"
                      : ""}
                  </p>
                ) : null}
              </div>
              <ResultBreakdown summary={summary} />
              {readingPartScores.length ? (
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {readingPartScores.map((part) => {
                    const percent = part.max > 0 ? Math.round((part.earned / part.max) * 100) : 0;
                    return (
                      <div key={part.id} className="rounded-2xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">{part.shortLabel}</p>
                        <p className="mt-1 text-sm font-black text-ink dark:text-white">{part.label.split(' · ')[1]}</p>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <span className="text-2xl font-black text-ink dark:text-white">{part.earned.toFixed(0)}<span className="text-sm text-ink/35 dark:text-white/35">/{part.max.toFixed(0)}</span></span>
                          <span className="text-xs font-black text-ink/45 dark:text-white/45">{percent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <p className="mt-3 text-xs font-semibold leading-5 text-ink/60 dark:text-white/60">
                Il punteggio è la percentuale di punti ottenuti sul totale: ogni
                attività può valere più punti e le risposte quasi corrette
                valgono un punteggio parziale.
              </p>
            </>
          ) : settings.show_score !== false && attempt.score !== null ? (
            <div className="mt-7 rounded-2xl border border-clay/15 bg-blush/40 p-5 dark:border-white/10 dark:bg-coral/[0.07]">
              <p className="text-sm font-black text-ink dark:text-white">
                Questo esercizio non prevede un punteggio automatico.
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">
                Trovi comunque qui sotto il riepilogo delle tue risposte.
              </p>
            </div>
          ) : null}
          {reviewPublished && attempt.teacher_note ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-300/20 dark:bg-emerald-400/[0.07]">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Considerazioni dell’insegnante
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-emerald-950 dark:text-emerald-100">
                {attempt.teacher_note}
              </p>
            </div>
          ) : null}
          {settings.show_diagnostic_summary !== false &&
          !awaitingPublishedReview ? (
            <div className="mt-6">
              <ExerciseDiagnosticSummary summary={summary.diagnostic_summary} />
            </div>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={`/assignments/${assignmentId}`}
              className="rounded-full bg-coral px-5 py-3 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-surface-950"
            >
              Torna all’attività
            </Link>
            {settings.allow_retry !== false && !awaitingPublishedReview ? (
              <Link
                to={`/exercises?assignmentId=${assignmentId}&resourceId=${resourceId}&newAttempt=1`}
                className="rounded-full border border-clay/20 bg-white px-5 py-3 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white"
              >
                {completionRule === "passed" && !scoreGoalMet
                  ? "Riprova per raggiungere l’obiettivo"
                  : completionRule === "attempts" && !attemptsGoalMet
                    ? `Inizia tentativo ${Number(attempt.attempt_number || 0) + 1}`
                    : "Nuovo tentativo"}
              </Link>
            ) : null}
            {!awaitingPublishedReview && mistakeCount > 0 ? (
              <button
                type="button"
                onClick={() => setMistakeFocus((value) => !value)}
                className="rounded-full border border-orange-300 bg-orange-50 px-5 py-3 text-sm font-black text-orange-900 dark:border-orange-300/25 dark:bg-orange-300/[0.08] dark:text-orange-100"
              >
                {mistakeFocus ? 'Mostra tutto' : `Fix My Mistakes · ${mistakeCount}`}
              </button>
            ) : null}
            <Link
              to="/vocab-bank"
              className="rounded-full border border-clay/20 bg-white px-5 py-3 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white"
            >
              Word & Chunk Bank
            </Link>
          </div>
        </article>
        {mistakeFocus ? (
          <div className="mt-6 rounded-[1.75rem] border border-orange-200 bg-[#fff8ef] p-5 dark:border-orange-300/15 dark:bg-orange-300/[0.05]">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Fix My Mistakes</p>
            <h2 className="mt-1 text-xl font-black text-ink dark:text-white">Solo ciò che merita un secondo sguardo.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">Hai già completato l’esercizio: nascondo le attività completamente corrette e tengo davanti a te quelle con almeno un inciampo.</p>
          </div>
        ) : null}
        <div className="mt-6 grid gap-5">
          {payload.sections.map((section, sectionIndex) => {
            const feedbackHidden = section.feedback_timing === "hidden";
            const visibleQuestions = (section.questions || [])
              .map((item, originalIndex) => ({ item, originalIndex }))
              .filter(({ item }) => !mistakeFocus || exerciseResultNeedsReview(item.result));
            if (mistakeFocus && !visibleQuestions.length) return null;
            return (
              <section
                key={section.id}
                className="rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 dark:border-white/10 dark:bg-surface-900 sm:p-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-ink dark:text-white">
                    {section.title}
                  </h2>
                  {!awaitingPublishedReview &&
                  !feedbackHidden &&
                  settings.show_score !== false &&
                  Number(section.max_points || 0) > 0 ? (
                    <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black text-ink/70 dark:bg-white/10 dark:text-white/70">
                      {Number(section.earned_points || 0).toFixed(1)} /{" "}
                      {Number(section.max_points || 0).toFixed(1)} punti
                    </span>
                  ) : null}
                </div>
                {feedbackHidden ? (
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">
                    Le correzioni di questa sezione non vengono mostrate:
                    riceverai indicazioni direttamente dall’insegnante.
                  </p>
                ) : null}
                <div className="mt-5 grid gap-5">
                  {visibleQuestions.map(({ item, originalIndex }, index) => (
                    <ExerciseActivity
                      key={item.id}
                      type={activityDisplayType(item.question)}
                      index={index + 1}
                      total={visibleQuestions.length}
                    >
                      <ExerciseQuestionRenderer
                        item={item}
                        answer={item.answer}
                        onChange={() => {}}
                        disabled
                        showScore={
                          !awaitingPublishedReview &&
                          !feedbackHidden &&
                          settings.show_score !== false
                        }
                        showCorrectAnswers={
                          !awaitingPublishedReview &&
                          !feedbackHidden &&
                          settings.show_correct_answers !== false
                        }
                        showExplanations={
                          !awaitingPublishedReview &&
                          !feedbackHidden &&
                          settings.show_explanations !== false
                        }
                        attemptId={attempt.id}
                        referencedTranscript={transcriptBeforeQuestion(payload, sectionIndex, originalIndex)}
                      />
                    </ExerciseActivity>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      </ExerciseCanvas>
    </section>
  );
}

function activityDisplayType(question) {
  if (question?.content?.presentation === 'choice_set') return 'multiple_choice_set';
  if (question?.content?.presentation === 'open_answer_set') return 'open_answer_set';
  return question?.type;
}

export default function ExercisePlayerV2() {
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignmentId") || "";
  const resourceId = searchParams.get("resourceId") || "";
  const requestedAttemptId = searchParams.get("attemptId") || "";
  const startNew = searchParams.get("newAttempt") === "1";
  const [payload, setPayload] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const saveTimers = useRef(new Map());
  const submitInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!requestedAttemptId && (!assignmentId || !resourceId)) {
        setError("Collegamento esercizio incompleto.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const result = requestedAttemptId
          ? await openExerciseAttempt(requestedAttemptId)
          : await openAssignedExercise({ assignmentId, resourceId, startNew });
        if (!active) return;
        setPayload(result);
        setShowIntro(result.attempt?.status !== "submitted");
        if (result.attempt?.status === "submitted" && result.attempt?.review_status === "approved") {
          archiveLearnerReviewNotificationsForAttempt(result.attempt.id).catch(() => {
            // Result viewing must not be blocked by notification housekeeping.
          });
        }
        if (startNew && result.attempt?.status === "in_progress")
          window.history.replaceState(
            window.history.state,
            "",
            `/exercises?assignmentId=${encodeURIComponent(assignmentId)}&resourceId=${encodeURIComponent(resourceId)}`,
          );
      } catch (loadError) {
        if (active)
          setError(
            loadError.message || "Non è stato possibile aprire l’esercizio.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
      saveTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [assignmentId, resourceId, requestedAttemptId, startNew]);

  const sectionIndex = payload?.attempt?.current_section_index || 0;
  const questionIndex = payload?.attempt?.current_question_index || 0;
  const currentSection = payload?.sections?.[sectionIndex] || null;
  const currentQuestion = currentSection?.questions?.[questionIndex] || null;
  const displayMode =
    currentSection?.feedback_timing === "question_end"
      ? "one_at_a_time"
      : payload?.exercise?.settings?.display_mode || "one_at_a_time";
  const totalQuestions = useMemo(
    () =>
      payload?.sections?.reduce(
        (sum, section) => sum + section.questions.length,
        0,
      ) || 0,
    [payload],
  );
  const completedBefore = useMemo(() => {
    if (!payload) return 0;
    return payload.sections.reduce(
      (sum, section, index) =>
        sum +
        (index < sectionIndex
          ? section.questions.length
          : index === sectionIndex
            ? Math.min(questionIndex, section.questions.length)
            : 0),
      0,
    );
  }, [payload, sectionIndex, questionIndex]);

  async function persistAnswer(
    item,
    answer,
    nextSectionIndex,
    nextQuestionIndex,
  ) {
    const normalizedAnswer = normalizeExerciseAnswerForSave(
      answer,
      item.question,
    );
    setSaveStatus("Salvataggio...");
    const result = await saveExerciseAnswer({
      attemptId: payload.attempt.id,
      attemptQuestionId: item.id,
      answer: normalizedAnswer,
      currentSectionIndex: nextSectionIndex,
      currentQuestionIndex: nextQuestionIndex,
    });
    setSaveStatus("Salvato");
    return result;
  }

  function changeAnswer(item, answer, sectionPosition, questionPosition) {
    const normalizedAnswer = normalizeExerciseAnswerForSave(
      answer,
      item.question,
    );
    setPayload((current) =>
      cloneWithAnswer(
        current,
        sectionPosition,
        questionPosition,
        normalizedAnswer,
      ),
    );
    setSaveStatus("Da salvare");
    const existing = saveTimers.current.get(item.id);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(
      () => {
        persistAnswer(
          item,
          normalizedAnswer,
          sectionPosition,
          questionPosition,
        ).catch((saveError) => {
          setSaveStatus("Errore");
          setError(saveError.message || "Salvataggio non riuscito.");
        });
        saveTimers.current.delete(item.id);
      },
      item.question.type === "audio_response" ||
        item.question.content?.response_mode === "audio_per_turn"
        ? 50
        : 600,
    );
    saveTimers.current.set(item.id, timer);
  }

  async function flushSection(section) {
    for (let index = 0; index < section.questions.length; index += 1) {
      const item = section.questions[index];
      const timer = saveTimers.current.get(item.id);
      if (timer) {
        window.clearTimeout(timer);
        saveTimers.current.delete(item.id);
      }
      const answer =
        item.question.type === "content_block"
          ? true
          : normalizeExerciseAnswerForSave(item.answer ?? null, item.question);
      await persistAnswer(item, answer, sectionIndex, index);
    }
  }

  async function finishSection() {
    if (!currentSection || busy) return;
    const unanswered = currentSection.questions.reduce(
      (sum, item) => sum + answerMissingCount(item.answer, item.question),
      0,
    );
    if (
      unanswered &&
      !window.confirm(
        `Hai lasciato ${unanswered} ${unanswered === 1 ? "risposta" : "risposte"} in bianco. Vuoi continuare comunque?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await flushSection(currentSection);
      setPayload(
        await completeExerciseSection({
          attemptId: payload.attempt.id,
          sectionId: currentSection.id,
        }),
      );
    } catch (sectionError) {
      setError(
        sectionError.message || "Non è stato possibile completare la sezione.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (submitInFlight.current || busy || !payload?.attempt?.id) return;
    submitInFlight.current = true;
    setBusy(true);
    setError("");
    try {
      setPayload(await submitExerciseAttempt(payload.attempt.id));
    } catch (submitError) {
      setError(submitError.message || "Non è stato possibile consegnare.");
    } finally {
      submitInFlight.current = false;
      setBusy(false);
    }
  }

  function advanceQuestion() {
    const nextIndex = questionIndex + 1;
    if (nextIndex < currentSection.questions.length)
      setPayload((current) => ({
        ...current,
        attempt: { ...current.attempt, current_question_index: nextIndex },
      }));
    else finishSection();
  }

  function moveToPreviousQuestion() {
    if (
      questionIndex <= 0 ||
      currentSection?.feedback_timing === "question_end"
    )
      return;
    setPayload((current) => ({
      ...current,
      attempt: {
        ...current.attempt,
        current_question_index: questionIndex - 1,
      },
    }));
  }

  async function moveToNextQuestion() {
    if (!currentQuestion) return;
    const nextIndex = questionIndex + 1;
    const answer =
      currentQuestion.question.type === "content_block"
        ? true
        : normalizeExerciseAnswerForSave(
            currentQuestion.answer,
            currentQuestion.question,
          );
    setPayload((current) =>
      cloneWithAnswer(current, sectionIndex, questionIndex, answer),
    );
    if (
      currentSection.feedback_timing !== "question_end" ||
      currentQuestion.question.type === "content_block" ||
      currentQuestion.result
    ) {
      persistAnswer(
        currentQuestion,
        answer,
        sectionIndex,
        Math.min(nextIndex, currentSection.questions.length - 1),
      ).catch(() => {});
      advanceQuestion();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await persistAnswer(currentQuestion, answer, sectionIndex, questionIndex);
      setPayload(
        await checkExerciseQuestion({
          attemptId: payload.attempt.id,
          attemptQuestionId: currentQuestion.id,
        }),
      );
    } catch (questionError) {
      setError(
        questionError.message ||
          "Non è stato possibile controllare la risposta.",
      );
    } finally {
      setBusy(false);
    }
  }

  function continueAfterSection() {
    if (sectionIndex >= payload.sections.length - 1) submit();
    else
      setPayload((current) => ({
        ...current,
        attempt: {
          ...current.attempt,
          current_section_index: sectionIndex + 1,
          current_question_index: 0,
        },
      }));
  }

  if (loading)
    return (
      <div className="section-shell py-16 dark:bg-surface-950">
        <div className="mx-auto max-w-3xl rounded-2xl border border-clay/15 bg-white p-8 text-center text-sm font-black dark:border-white/10 dark:bg-surface-900">
          Caricamento esercizio...
        </div>
      </div>
    );
  if (error && !payload)
    return (
      <div className="section-shell py-16 dark:bg-surface-950">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-950">
          <h1 className="text-2xl font-black">Esercizio non disponibile</h1>
          <p className="mt-3 text-sm">{error}</p>
        </div>
      </div>
    );
  if (!payload) return null;
  if (payload.attempt.status === "submitted")
    return (
      <>
        <SEO
          title={`${payload.exercise.title} | Sblocco Inglese`}
          description="Risultato esercizio"
        />
        <FinalResult
          payload={payload}
          assignmentId={assignmentId}
          resourceId={resourceId}
          focusMistakesRequested={searchParams.get("focus") === "mistakes"}
        />
      </>
    );
  if (showIntro)
    return (
      <>
        <SEO
          title={`${payload.exercise.title} | Sblocco Inglese`}
          description="Introduzione esercizio"
        />
        <Intro
          payload={payload}
          assignmentId={assignmentId}
          onStart={() => setShowIntro(false)}
        />
      </>
    );

  const progress = totalQuestions
    ? Math.round((completedBefore / totalQuestions) * 100)
    : 0;
  const sectionCompleted = currentSection?.status === "completed";
  const exerciseSettings = payload?.exercise?.settings || {};
  const sectionRecapVisible =
    sectionCompleted &&
    currentSection?.feedback_timing === "section_end" &&
    (currentSection?.questions || []).some((item) => item.result);
  const completedThroughSection = payload.sections.reduce(
    (sum, section, index) => sum + (index <= sectionIndex ? section.questions.length : 0),
    0,
  );
  const completedBeforeSection = completedThroughSection - (currentSection?.questions.length || 0);
  const milestone = getProgressMilestone(completedBeforeSection, completedThroughSection, currentSection?.title);
  const currentQuestionAnswered =
    currentQuestion?.question.type === "content_block" ||
    !answerIsEmpty(currentQuestion?.answer, currentQuestion?.question) ||
    Boolean(currentQuestion?.result);
  return (
    <>
      <SEO
        title={`${payload.exercise.title} | Sblocco Inglese`}
        description="Completa esercizio"
      />
      <section className="learner-exercise-page section-shell py-7 lg:py-10">
        <ExerciseCanvas>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowIntro(true)}
              className="inline-flex items-center gap-2 text-sm font-black text-clay underline underline-offset-4 dark:text-[#f0a27d]"
            >
              <ArrowLeft className="h-4 w-4" />
              Panoramica
            </button>
            <p className="inline-flex items-center gap-2 text-xs font-black text-ink/65 dark:text-white/65">
              <Save className="h-4 w-4" />
              {saveStatus || "Autosave attivo"}
            </p>
          </div>
          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">
              <CircleAlert className="mt-0.5 h-4 w-4" />
              {error}
            </div>
          ) : null}
          <div className="mt-5">
            <ExerciseProgressHeader
              title={currentSection.title}
              instructions={currentSection.instructions}
              progress={progress}
              sectionIndex={sectionIndex + 1}
              sectionTotal={payload.sections.length}
            />
          </div>
          {sectionCompleted ? (
            <>
              <div className="mt-5">
              <ExerciseMilestone
                title={milestone.title}
                body={sectionRecapVisible
                  ? "Qui sotto trovi le tue risposte con le correzioni di questa sezione."
                  : milestone.body}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={continueAfterSection}
                  className="exercise-primary-action"
                >
                  {sectionIndex >= payload.sections.length - 1
                    ? "Consegna esercizio"
                    : "Sezione successiva"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </ExerciseMilestone>
              </div>
              {sectionRecapVisible ? (
                <div className="mt-5 grid gap-5">
                  {currentSection.questions.map((item, index) => (
                    <ExerciseActivity
                      key={item.id}
                      type={activityDisplayType(item.question)}
                      index={index + 1}
                      total={currentSection.questions.length}
                    >
                      <ExerciseQuestionRenderer
                        item={item}
                        answer={item.answer}
                        onChange={() => {}}
                        disabled
                        showScore={exerciseSettings.show_score !== false}
                        showCorrectAnswers={
                          exerciseSettings.show_correct_answers !== false
                        }
                        showExplanations={
                          exerciseSettings.show_explanations !== false
                        }
                        attemptId={payload.attempt.id}
                        referencedTranscript={transcriptBeforeQuestion(payload, sectionIndex, index)}
                      />
                    </ExerciseActivity>
                  ))}
                </div>
              ) : null}
            </>
          ) : displayMode === "all_questions" ? (
            <section className="mt-5 grid gap-5">
              {currentSection.questions.map((item, index) => (
                <ExerciseActivity
                  key={item.id}
                  type={activityDisplayType(item.question)}
                  index={index + 1}
                  total={currentSection.questions.length}
                >
                  <ExerciseQuestionRenderer
                    item={item}
                    answer={item.answer}
                    onChange={(answer) =>
                      changeAnswer(item, answer, sectionIndex, index)
                    }
                    attemptId={payload.attempt.id}
                    referencedTranscript={transcriptBeforeQuestion(payload, sectionIndex, index)}
                  />
                </ExerciseActivity>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={finishSection}
                className="exercise-primary-action justify-self-end"
              >
                {busy ? "Salvataggio..." : "Completa sezione"}
              </button>
            </section>
          ) : currentQuestion ? (
            <ExerciseActivity
              className="mt-5"
              type={activityDisplayType(currentQuestion.question)}
              index={questionIndex + 1}
              total={currentSection.questions.length}
            >
              <div>
                <ExerciseQuestionRenderer
                  item={currentQuestion}
                  answer={currentQuestion.answer}
                  onChange={(answer) =>
                    changeAnswer(
                      currentQuestion,
                      answer,
                      sectionIndex,
                      questionIndex,
                    )
                  }
                  attemptId={payload.attempt.id}
                  disabled={Boolean(currentQuestion.result)}
                  showScore={Boolean(currentQuestion.result)}
                  showCorrectAnswers={
                    Boolean(currentQuestion.result) &&
                    payload.exercise.settings?.show_correct_answers !== false
                  }
                  showExplanations={
                    Boolean(currentQuestion.result) &&
                    payload.exercise.settings?.show_explanations !== false
                  }
                  referencedTranscript={transcriptBeforeQuestion(payload, sectionIndex, questionIndex)}
                />
              </div>
              <ExerciseActionBar hint={!currentQuestionAnswered ? "Seleziona o inserisci una risposta per continuare." : null}>
                  {questionIndex > 0 &&
                  currentSection.feedback_timing !== "question_end" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={moveToPreviousQuestion}
                      className="exercise-secondary-action"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Precedente
                    </button>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    disabled={busy || !currentQuestionAnswered}
                    onClick={moveToNextQuestion}
                    className="exercise-primary-action"
                  >
                    {busy
                      ? "Controllo..."
                      : currentSection.feedback_timing === "question_end" &&
                          !currentQuestion.result &&
                          currentQuestion.question.type !== "content_block"
                        ? "Controlla risposta"
                        : questionIndex >= currentSection.questions.length - 1
                          ? "Completa sezione"
                          : "Prossima"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
              </ExerciseActionBar>
            </ExerciseActivity>
          ) : null}
        </div>
        </ExerciseCanvas>
      </section>
    </>
  );
}
