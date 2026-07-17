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
  Sparkles,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import ExerciseDiagnosticSummary from "../components/exercises/ExerciseDiagnosticSummary.jsx";
import ExerciseQuestionRenderer from "../components/exercises/ExerciseQuestionRenderer.jsx";
import { normalizeExerciseAnswerForSave } from "../lib/exerciseAnswerNormalization.js";
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

function answerIsEmpty(answer, question) {
  const type = question?.type;
  if (type === "content_block") return false;
  if (type === "audio_response") return !answer?.file_id;
  if (type === "dialogue_roleplay") {
    if (!answer?.role_key) return true;
    if (question?.content?.response_mode !== "audio_per_turn")
      return !hasMeaningfulValue(answer?.turns);
    const learnerTurns = (question.content.turns || []).filter(
      (turn) =>
        turn.speaker === answer.role_key && turn.learner_response !== false,
    );
    if (!learnerTurns.length) return true;
    return learnerTurns.some(
      (turn) => turn.required !== false && !answer?.turns?.[turn.key]?.file_id,
    );
  }
  if (type === "reading_comprehension") {
    const items = question?.content?.items || [];
    return !items.some((item) => hasMeaningfulValue(answer?.[item.key]));
  }
  return !hasMeaningfulValue(answer);
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
    <section className="section-shell py-10 dark:bg-surface-950 lg:py-14">
      <div className="mx-auto max-w-4xl">
        <Link
          to={`/assignments/${assignmentId}`}
          className="inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna all’attività
        </Link>
        <article className="mt-5 overflow-hidden rounded-3xl border border-clay/15 bg-[#fffdf9] shadow-soft dark:border-white/10 dark:bg-surface-900">
          <div className="relative p-7 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blush blur-3xl dark:bg-coral/10" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-coral/20 bg-blush px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-clay dark:bg-coral/10 dark:text-[#f7a98d]">
                <Coffee className="h-4 w-4" />
                Esercizio assegnato
              </span>
              <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-5xl">
                {payload.exercise.title}
              </h1>
              {payload.exercise.description ? (
                <p className="mt-4 max-w-3xl text-base leading-7 text-ink/65 dark:text-white/65">
                  {payload.exercise.description}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-linen px-3 py-2 dark:bg-white/10">
                  {payload.exercise.level}
                </span>
                <span className="rounded-full bg-linen px-3 py-2 dark:bg-white/10">
                  {total} attività
                </span>
                {payload.exercise.estimated_minutes ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-butter/60 px-3 py-2 dark:bg-butter/10">
                    <Clock3 className="h-4 w-4" />
                    {payload.exercise.estimated_minutes} min
                  </span>
                ) : null}
                {manual ? (
                  <span className="rounded-full bg-violet-100 px-3 py-2 text-violet-800 dark:bg-violet-300/10 dark:text-violet-200">
                    {manual} da valutare dall’insegnante
                  </span>
                ) : null}
              </div>
              <div className="mt-7 rounded-2xl border border-coral/20 bg-blush/55 p-5 dark:bg-coral/[0.07]">
                <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/75 dark:text-white/75">
                  {payload.exercise.instructions ||
                    "Completa tutte le sezioni. Le risposte vengono salvate automaticamente."}
                </p>
                <p className="mt-3 inline-flex items-center gap-2 text-xs font-black text-ink/65 dark:text-white/65">
                  <Save className="h-4 w-4" />
                  Autosave attivo
                </p>
              </div>
              <button
                type="button"
                onClick={onStart}
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-black text-white hover:bg-clay dark:bg-[#ff8b6c] dark:text-surface-950"
              >
                <BookOpenCheck className="h-4 w-4" />
                Inizia o riprendi
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function ResultBreakdown({ summary }) {
  const chips = [
    ["correct", "corrette", "bg-emerald-100 text-emerald-900 dark:bg-emerald-300/10 dark:text-emerald-200"],
    ["nearly_correct", "quasi corrette", "bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100"],
    ["incorrect", "da rivedere", "bg-red-100 text-red-900 dark:bg-red-300/10 dark:text-red-100"],
    ["unanswered", "senza risposta", "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white/70"],
    ["pending_review", "in attesa di valutazione", "bg-violet-100 text-violet-900 dark:bg-violet-300/10 dark:text-violet-200"],
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

function FinalResult({ payload, assignmentId, resourceId }) {
  const attempt = payload.attempt;
  const settings = payload.exercise.settings || {};
  const summary = attempt.result_summary || {};
  const pending = Number(summary.pending_review || 0);
  const reviewPublished = attempt.review_status === "approved";
  const awaitingPublishedReview =
    pending > 0 || attempt.review_status === "reviewed";
  const hasAutoPoints = Number(attempt.max_points || 0) > 0;

  return (
    <section className="section-shell py-10 dark:bg-surface-950 lg:py-14">
      <div className="mx-auto max-w-4xl">
        <article className="rounded-3xl border border-clay/15 bg-[#fffdf9] p-7 shadow-soft dark:border-white/10 dark:bg-surface-900 sm:p-10">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${awaitingPublishedReview ? "bg-violet-100 text-violet-800 dark:bg-violet-300/10 dark:text-violet-200" : "bg-blush text-clay dark:bg-coral/10 dark:text-[#f7a98d]"}`}
          >
            {awaitingPublishedReview ? (
              <Clock3 className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {awaitingPublishedReview
              ? "Consegnato, valutazione in arrivo"
              : "Esercizio completato"}
          </span>
          <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-5xl">
            {payload.exercise.title}
          </h1>
          {awaitingPublishedReview ? (
            <div className="mt-7 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-300/20 dark:bg-violet-400/[0.07]">
              <p className="text-lg font-black text-violet-950 dark:text-violet-100">
                La valutazione dell’insegnante non è ancora stata pubblicata
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-violet-900/70 dark:text-violet-100/70">
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
              </div>
              <ResultBreakdown summary={summary} />
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
                Nuovo tentativo
              </Link>
            ) : null}
          </div>
        </article>
        <div className="mt-6 grid gap-5">
          {payload.sections.map((section) => {
            const feedbackHidden = section.feedback_timing === "hidden";
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
                  {section.questions.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-ink/10 p-4 dark:border-white/10"
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
                      />
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
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
    const unanswered = currentSection.questions.filter((item) =>
      answerIsEmpty(item.answer, item.question),
    ).length;
    if (
      unanswered &&
      !window.confirm(
        `Hai lasciato ${unanswered} ${unanswered === 1 ? "attività" : "attività"} senza risposta. Vuoi continuare?`,
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
    setBusy(true);
    setError("");
    try {
      setPayload(await submitExerciseAttempt(payload.attempt.id));
    } catch (submitError) {
      setError(submitError.message || "Non è stato possibile consegnare.");
    } finally {
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
      <section className="section-shell py-7 dark:bg-surface-950 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowIntro(true)}
              className="inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]"
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
          <header className="mt-5 rounded-3xl border border-clay/15 bg-[#fffdf9] p-6 shadow-soft dark:border-white/10 dark:bg-surface-900 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-coral dark:text-[#ff9678]">
                  <Sparkles className="h-4 w-4" />
                  Sezione {sectionIndex + 1} di {payload.sections.length}
                </span>
                <h1 className="mt-2 text-3xl font-black text-ink dark:text-white">
                  {currentSection.title}
                </h1>
                {currentSection.instructions ? (
                  <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">
                    {currentSection.instructions}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-blush px-4 py-2 text-sm font-black text-clay dark:bg-coral/10 dark:text-[#f7a98d]">
                {progress}%
              </span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-coral transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </header>
          {sectionCompleted ? (
            <>
              <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-300/20 dark:bg-emerald-400/[0.07]">
                <p className="text-xl font-black text-emerald-950 dark:text-emerald-100">
                  Sezione completata
                </p>
                {sectionRecapVisible ? (
                  <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900/70 dark:text-emerald-100/70">
                    Qui sotto trovi le tue risposte con le correzioni di questa
                    sezione.
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={continueAfterSection}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white"
                >
                  {sectionIndex >= payload.sections.length - 1
                    ? "Consegna esercizio"
                    : "Sezione successiva"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </section>
              {sectionRecapVisible ? (
                <div className="mt-5 grid gap-5">
                  {currentSection.questions.map((item, index) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-7"
                    >
                      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-coral dark:text-[#ff9678]">
                        Attività {index + 1}
                      </p>
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
                      />
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : displayMode === "all_questions" ? (
            <section className="mt-5 grid gap-5">
              {currentSection.questions.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-7"
                >
                  <p className="mb-4 text-xs font-bold uppercase tracking-wide text-coral dark:text-[#ff9678]">
                    Attività {index + 1}
                  </p>
                  <ExerciseQuestionRenderer
                    item={item}
                    answer={item.answer}
                    onChange={(answer) =>
                      changeAnswer(item, answer, sectionIndex, index)
                    }
                    attemptId={payload.attempt.id}
                  />
                </article>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={finishSection}
                className="justify-self-end rounded-full bg-coral px-6 py-3 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-surface-950"
              >
                {busy ? "Salvataggio..." : "Completa sezione"}
              </button>
            </section>
          ) : currentQuestion ? (
            <section className="mt-5 rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-coral dark:text-[#ff9678]">
                  Attività {questionIndex + 1} di{" "}
                  {currentSection.questions.length}
                </p>
                <span className="text-xs font-bold text-ink/60 dark:text-white/60">
                  {currentQuestion.question.type}
                </span>
              </div>
              <div className="mt-5">
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
                />
              </div>
              <div className="mt-7 flex flex-col gap-3">
                {!currentQuestionAnswered ? (
                  <p className="text-right text-xs font-bold text-ink/65 dark:text-white/65">
                    Seleziona o inserisci una risposta per continuare.
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {questionIndex > 0 &&
                  currentSection.feedback_timing !== "question_end" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={moveToPreviousQuestion}
                      className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black text-ink disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Precedente
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    disabled={busy || !currentQuestionAnswered}
                    onClick={moveToNextQuestion}
                    className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#ff8b6c] dark:text-surface-950"
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
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </>
  );
}
