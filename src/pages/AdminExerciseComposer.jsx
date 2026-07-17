import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import ExerciseBuilderBreadcrumb from "../components/admin/ExerciseBuilderBreadcrumb.jsx";
import ExerciseQuestionRenderer from "../components/exercises/ExerciseQuestionRenderer.jsx";
import {
  loadExercisePools,
  loadExerciseQuestionBank,
} from "../lib/exerciseBankApi.js";
import {
  loadExerciseComposerCatalog,
  loadExerciseComposerContentPreviews,
  loadExerciseComposerDetail,
  saveExerciseComposerVersion,
  setExerciseComposerStatus,
} from "../lib/exerciseComposerApi.js";

const EMPTY_EXERCISE = {
  id: null,
  publicId: "",
  title: "",
  description: "",
  instructions: "",
  instructionLanguage: "it",
  level: "A1",
  topic: "",
  estimatedMinutes: "",
  status: "draft",
  versionNumber: null,
  settings: {
    display_mode: "one_at_a_time",
    show_score: true,
    show_correct_answers: true,
    show_explanations: true,
    show_diagnostic_summary: true,
    allow_retry: true,
  },
};

function newSection(index = 0) {
  return {
    clientId: crypto.randomUUID(),
    title: `Sezione ${index + 1}`,
    instructions: "",
    selectionMode: "fixed",
    feedbackTiming: "section_end",
    settings: {},
    fixedQuestions: [],
    poolRules: [],
  };
}

const statusLabels = {
  draft: "Bozza",
  in_review: "Da revisionare",
  approved: "Approvato",
  published: "Pubblicato",
  archived: "Archiviato",
};
const fieldClass =
  "mt-2 min-w-0 w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/30 dark:border-white/20 dark:bg-surface-800 dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15";

const questionTypeLabels = {
  multiple_choice: "Scelta multipla",
  multiple_select: "Scelta multipla con più risposte",
  dialogue_choice: "Scelta nel dialogo",
  gap_fill: "Testo con spazi",
  select_gap: "Spazi con opzioni",
  translation: "Traduzione",
  error_correction: "Correzione",
  word_order: "Ordine delle parole",
  content_block: "Spiegazione",
  written_response: "Risposta scritta",
  dialogue_roleplay: "Role-play",
  audio_response: "Risposta audio",
  reading_comprehension: "Lettura e comprensione",
};

function statusClass(status) {
  if (status === "published")
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200";
  if (status === "approved")
    return "bg-cyan-100 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-200";
  if (status === "archived")
    return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/60";
  if (status === "in_review")
    return "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200";
  return "bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200";
}

function readableQuestionText(question, fallback) {
  const candidates = [
    question?.title,
    question?.prompt,
    question?.content?.passage_title,
    question?.content?.title,
    question?.content?.body,
    question?.instructions,
  ];
  const value = candidates.find(
    (item) => typeof item === "string" && /[\p{L}\p{N}]/u.test(item),
  );
  if (!value) return fallback;
  const compact = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return compact.length > 170 ? `${compact.slice(0, 167)}…` : compact;
}

function visualEditorHref(questionId, returnTo) {
  const params = new URLSearchParams({ questionId });
  if (returnTo) params.set("returnTo", returnTo);
  return `/admin/content/exercises/questions/edit?${params.toString()}`;
}

function QuestionComposerCard({
  question,
  fallbackLabel,
  returnTo,
  index,
  pinned = false,
  currentQuestion = null,
  onUseCurrent = null,
  onMoveUp = null,
  onMoveDown = null,
  onRemove = null,
}) {
  const title = readableQuestionText(question, fallbackLabel);
  const questionId = question?.questionId || question?.id;
  const usedVersionId = question?.questionVersionId || question?.versionId;
  const currentVersionId = currentQuestion?.versionId || question?.currentVersionId;
  const hasNewerVersion = Boolean(
    currentVersionId && usedVersionId && currentVersionId !== usedVersionId,
  );
  const previewItem = question
    ? {
        id: `composer-preview-${usedVersionId || questionId}`,
        question: {
          type: question.question_type,
          prompt: question.prompt,
          instructions: question.instructions,
          content: question.content || {},
        },
        result: null,
      }
    : null;

  return (
    <article className="rounded-xl border border-ink/10 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
      <div className="flex items-start gap-3">
        {Number.isFinite(index) ? (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-xs font-black text-moss dark:bg-emerald-300/15 dark:text-emerald-200">
            {index + 1}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[0.65rem] font-black">
            <span className="text-moss dark:text-emerald-300">
              {question?.publicId || fallbackLabel}
            </span>
            <span className="text-ink/30 dark:text-white/30">·</span>
            <span className="text-ink/55 dark:text-white/55">
              {questionTypeLabels[question?.question_type] ||
                question?.question_type ||
                "Tipologia non disponibile"}
            </span>
            {question?.version_number ? (
              <span className="rounded-full bg-linen px-2 py-0.5 text-ink/55 dark:bg-white/10 dark:text-white/55">
                v{question.version_number}
              </span>
            ) : null}
            {pinned ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-800 dark:bg-violet-300/15 dark:text-violet-200">
                Sempre presente
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm font-bold leading-5 text-ink dark:text-white">
            {title}
          </p>
          {hasNewerVersion ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-amber-800 dark:text-amber-200">
              Questa composizione usa una versione precedente della domanda.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {previewItem ? (
              <details className="group w-full rounded-lg border border-ink/10 bg-linen/20 dark:border-white/10 dark:bg-black/10">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs font-black text-ink marker:hidden dark:text-white">
                  <span className="group-open:hidden">Mostra anteprima studente</span>
                  <span className="hidden group-open:inline">Nascondi anteprima</span>
                </summary>
                <div className="border-t border-ink/10 p-3 dark:border-white/10">
                  <ExerciseQuestionRenderer
                    item={previewItem}
                    answer={null}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              </details>
            ) : (
              <p className="w-full rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
                Anteprima non disponibile. L’identificativo salvato resta invariato.
              </p>
            )}
            {questionId ? (
              <Link
                to={visualEditorHref(questionId, returnTo)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-ink px-3 py-1.5 text-[0.7rem] font-black text-white dark:bg-emerald-300 dark:text-[#102019]"
              >
                Modifica visivamente ↗
              </Link>
            ) : null}
            {hasNewerVersion && onUseCurrent ? (
              <button
                type="button"
                onClick={onUseCurrent}
                className="rounded-full bg-amber-100 px-3 py-1.5 text-[0.7rem] font-black text-amber-950 dark:bg-amber-300/15 dark:text-amber-100"
              >
                Usa la versione più recente
              </button>
            ) : null}
            {onMoveUp ? (
              <button type="button" onClick={onMoveUp} className="text-[0.7rem] font-black underline">
                Su
              </button>
            ) : null}
            {onMoveDown ? (
              <button type="button" onClick={onMoveDown} className="text-[0.7rem] font-black underline">
                Giù
              </button>
            ) : null}
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                className="ml-auto text-[0.7rem] font-black text-red-700 underline dark:text-red-300"
              >
                Rimuovi
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function mapDetail(detail) {
  return {
    exercise: {
      id: detail.id,
      publicId: detail.public_id,
      title: detail.title || "",
      description: detail.description || "",
      instructions: detail.instructions || "",
      instructionLanguage: detail.instruction_language || "it",
      level: detail.level || "A1",
      topic: detail.topic || "",
      estimatedMinutes: detail.estimated_minutes || "",
      status: detail.status || "draft",
      versionNumber: detail.version_number,
      settings: { ...EMPTY_EXERCISE.settings, ...(detail.settings || {}) },
    },
    sections: (detail.sections || []).map((section, index) => ({
      clientId: section.id || crypto.randomUUID(),
      title: section.title || `Sezione ${index + 1}`,
      instructions: section.instructions || "",
      selectionMode: section.selection_mode || "fixed",
      feedbackTiming: section.feedback_timing || "section_end",
      settings: section.settings || {},
      fixedQuestions: (section.fixed_questions || []).map((item) => ({
        questionId: item.question_id,
        questionVersionId: item.question_version_id,
      })),
      poolRules: (section.pool_rules || []).map((rule) => ({
        poolId: rule.pool_id,
        poolVersionId: rule.pool_version_id,
        questionCount: rule.question_count || 1,
        selectionStrategy: rule.selection_strategy || "balanced",
        filters: rule.filters || {},
        distributionRules: rule.distribution_rules || {},
      })),
    })),
  };
}

function sectionQuestionCount(section, poolMap) {
  const fixed = section.fixedQuestions.length;
  const random = section.poolRules.reduce(
    (sum, rule) =>
      sum +
      Math.min(
        Number(rule.questionCount) || 0,
        poolMap.get(rule.poolId)?.questionCount ||
          Number(rule.questionCount) ||
          0,
      ),
    0,
  );
  return fixed + random;
}

export default function AdminExerciseComposer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [pools, setPools] = useState([]);
  const [exercise, setExercise] = useState({
    ...EMPTY_EXERCISE,
    settings: { ...EMPTY_EXERCISE.settings },
  });
  const [sections, setSections] = useState([newSection(0)]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionType, setQuestionType] = useState("all");
  const [questionLevel, setQuestionLevel] = useState("all");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [contentPreviews, setContentPreviews] = useState({ questions: [], pools: [] });
  const [contentPreviewError, setContentPreviewError] = useState("");
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0);
  const [refreshingContent, setRefreshingContent] = useState(false);

  async function loadBase() {
    setLoading(true);
    setError("");
    const [exerciseResult, questionResult, poolResult] =
      await Promise.allSettled([
        loadExerciseComposerCatalog(),
        loadExerciseQuestionBank(),
        loadExercisePools(),
      ]);
    const problems = [];
    if (exerciseResult.status === "fulfilled") {
      setCatalog(exerciseResult.value);
    } else {
      setCatalog([]);
      problems.push(
        `catalogo esercizi: ${exerciseResult.reason?.message || "errore sconosciuto"}`,
      );
    }
    if (questionResult.status === "fulfilled") {
      setQuestions(
        questionResult.value.filter((item) => item.status !== "archived"),
      );
    } else {
      setQuestions([]);
      problems.push(
        `banca domande: ${questionResult.reason?.message || "errore sconosciuto"}`,
      );
    }
    if (poolResult.status === "fulfilled") {
      setPools(poolResult.value.filter((item) => item.status !== "archived"));
    } else {
      setPools([]);
      problems.push(
        `pool: ${poolResult.reason?.message || "errore sconosciuto"}`,
      );
    }
    if (problems.length) {
      setError(`Caricamento parziale del Composer — ${problems.join(" · ")}`);
    }
    setLoading(false);
    return exerciseResult.status === "fulfilled" ? exerciseResult.value : [];
  }

  useEffect(() => {
    let active = true;
    async function initialise() {
      const exerciseData = await loadBase();
      if (!active) return;
      const requestedId = searchParams.get("exerciseId");
      if (
        searchParams.get("new") === "1" ||
        (!requestedId && !exerciseData.length)
      ) {
        createNew();
      } else {
        const target = requestedId || exerciseData[0]?.id;
        if (target) await openExercise(target);
      }
    }
    initialise();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openExercise(exerciseId) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const detail = await loadExerciseComposerDetail(exerciseId);
      if (!detail) throw new Error("Esercizio non trovato.");
      const mapped = mapDetail(detail);
      const safeSections = mapped.sections.length
        ? mapped.sections
        : [newSection(0)];
      setExercise(mapped.exercise);
      setSections(safeSections);
      setSelectedSectionId(safeSections[0].clientId);
      setSearchParams({ exerciseId });
    } catch (loadError) {
      setError(
        loadError.message || "Non è stato possibile aprire l’esercizio.",
      );
    } finally {
      setLoading(false);
    }
  }

  function createNew() {
    const first = newSection(0);
    setExercise({
      ...EMPTY_EXERCISE,
      settings: { ...EMPTY_EXERCISE.settings },
    });
    setSections([first]);
    setSelectedSectionId(first.clientId);
    setSearchParams({ new: "1" });
    setSuccess("Nuovo esercizio pronto. Configura le sezioni e salva.");
    setError("");
  }

  const selectedSectionIndex = Math.max(
    0,
    sections.findIndex((section) => section.clientId === selectedSectionId),
  );
  const selectedSection = sections[selectedSectionIndex] || sections[0];
  const poolMap = useMemo(
    () => new Map(pools.map((pool) => [pool.id, pool])),
    [pools],
  );
  const questionMap = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );
  const referencedQuestionVersionIds = useMemo(
    () => [
      ...new Set(
        sections.flatMap((section) =>
          section.fixedQuestions.map((item) => item.questionVersionId),
        ),
      ),
    ].filter(Boolean),
    [sections],
  );
  const referencedPoolVersionIds = useMemo(
    () => [
      ...new Set(
        sections.flatMap((section) =>
          section.poolRules.map((rule) => rule.poolVersionId),
        ),
      ),
    ].filter(Boolean),
    [sections],
  );
  const contentReferenceKey = `${referencedQuestionVersionIds.slice().sort().join(",")}|${referencedPoolVersionIds.slice().sort().join(",")}`;
  useEffect(() => {
    let active = true;
    if (!referencedQuestionVersionIds.length && !referencedPoolVersionIds.length) {
      setContentPreviews({ questions: [], pools: [] });
      setContentPreviewError("");
      return () => {
        active = false;
      };
    }
    setContentPreviewError("");
    loadExerciseComposerContentPreviews({
      questionVersionIds: referencedQuestionVersionIds,
      poolVersionIds: referencedPoolVersionIds,
    })
      .then((result) => {
        if (active) setContentPreviews(result);
      })
      .catch((previewError) => {
        if (active) {
          setContentPreviewError(
            previewError.message || "Non è stato possibile caricare le anteprime.",
          );
        }
      });
    return () => {
      active = false;
    };
    // The serialized key avoids reloading previews when only section copy changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentReferenceKey, previewRefreshToken]);
  const questionPreviewMap = useMemo(
    () =>
      new Map(
        contentPreviews.questions.map((question) => [
          question.questionVersionId,
          question,
        ]),
      ),
    [contentPreviews.questions],
  );
  const poolPreviewMap = useMemo(
    () =>
      new Map(
        contentPreviews.pools.map((pool) => [pool.poolVersionId, pool]),
      ),
    [contentPreviews.pools],
  );
  const questionTypes = useMemo(
    () =>
      [
        ...new Set(questions.map((item) => item.question_type).filter(Boolean)),
      ].sort(),
    [questions],
  );
  const questionLevels = useMemo(
    () =>
      [...new Set(questions.map((item) => item.level).filter(Boolean))].sort(),
    [questions],
  );
  const fixedSet = new Set(
    selectedSection?.fixedQuestions.map((item) => item.questionId) || [],
  );
  const filteredQuestions = useMemo(() => {
    const term = questionSearch.trim().toLowerCase();
    return questions.filter((item) => {
      if (questionType !== "all" && item.question_type !== questionType)
        return false;
      if (questionLevel !== "all" && item.level !== questionLevel) return false;
      if (!term) return true;
      return [
        item.publicId,
        item.title,
        item.prompt,
        item.topic,
        item.subtopic,
        ...(item.tags || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [questions, questionSearch, questionType, questionLevel]);
  const filteredCatalog = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();
    if (!term) return catalog;
    return catalog.filter((item) =>
      [item.publicId, item.title, item.topic, item.level, statusLabels[item.status]]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [catalog, catalogSearch]);
  const totalQuestions = sections.reduce(
    (sum, section) => sum + sectionQuestionCount(section, poolMap),
    0,
  );
  const composerReturnTo = exercise.id
    ? `/admin/content/exercises/composer?exerciseId=${exercise.id}`
    : "/admin/content/exercises/composer?new=1";

  function updateSelectedSection(patch) {
    setSections((current) =>
      current.map((section, index) =>
        index === selectedSectionIndex ? { ...section, ...patch } : section,
      ),
    );
  }
  function updateFeedbackTiming(value) {
    updateSelectedSection({ feedbackTiming: value });
    if (
      value === "question_end" &&
      exercise.settings.display_mode !== "one_at_a_time"
    ) {
      setExercise((current) => ({
        ...current,
        settings: { ...current.settings, display_mode: "one_at_a_time" },
      }));
      setSuccess(
        "Per mostrare la soluzione dopo ogni domanda, la visualizzazione è stata impostata su una domanda alla volta.",
      );
    }
  }
  function addSection() {
    const section = newSection(sections.length);
    setSections((current) => [...current, section]);
    setSelectedSectionId(section.clientId);
  }
  function removeSection(index) {
    if (sections.length === 1) return;
    const next = sections.filter((_, currentIndex) => currentIndex !== index);
    setSections(next);
    setSelectedSectionId(next[Math.min(index, next.length - 1)].clientId);
  }
  function moveSection(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  }
  function toggleFixedQuestion(question) {
    const current = selectedSection.fixedQuestions;
    const exists = current.some((item) => item.questionId === question.id);
    updateSelectedSection({
      fixedQuestions: exists
        ? current.filter((item) => item.questionId !== question.id)
        : [
            ...current,
            { questionId: question.id, questionVersionId: question.versionId },
          ],
      selectionMode:
        exists && current.length === 1 && !selectedSection.poolRules.length
          ? "fixed"
          : selectedSection.poolRules.length
            ? "mixed"
            : "fixed",
    });
  }
  function moveFixed(questionId, direction) {
    const current = [...selectedSection.fixedQuestions];
    const index = current.findIndex((item) => item.questionId === questionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target], current[index]];
    updateSelectedSection({ fixedQuestions: current });
  }
  function useCurrentFixedQuestion(questionId) {
    const currentQuestion = questionMap.get(questionId);
    if (!currentQuestion?.versionId) return;
    updateSelectedSection({
      fixedQuestions: selectedSection.fixedQuestions.map((item) =>
        item.questionId === questionId
          ? { ...item, questionVersionId: currentQuestion.versionId }
          : item,
      ),
    });
    setSuccess(
      `${currentQuestion.publicId}: verrà usata la versione più recente al prossimo salvataggio dell’esercizio.`,
    );
  }
  function addPoolRule() {
    const pool = poolMap.get(selectedPoolId);
    if (
      !pool ||
      selectedSection.poolRules.some((rule) => rule.poolId === pool.id)
    )
      return;
    const rule = {
      poolId: pool.id,
      poolVersionId: pool.versionId,
      questionCount: Math.max(1, Math.min(5, pool.questionCount || 1)),
      selectionStrategy:
        pool.selection_defaults?.selection_strategy || "balanced",
      filters: {},
      distributionRules: {},
    };
    updateSelectedSection({
      poolRules: [...selectedSection.poolRules, rule],
      selectionMode: selectedSection.fixedQuestions.length ? "mixed" : "pool",
    });
    setSelectedPoolId("");
  }
  function updatePoolRule(index, patch) {
    updateSelectedSection({
      poolRules: selectedSection.poolRules.map((rule, currentIndex) =>
        currentIndex === index ? { ...rule, ...patch } : rule,
      ),
    });
  }
  function removePoolRule(index) {
    const nextRules = selectedSection.poolRules.filter(
      (_, currentIndex) => currentIndex !== index,
    );
    updateSelectedSection({
      poolRules: nextRules,
      selectionMode: nextRules.length
        ? selectedSection.fixedQuestions.length
          ? "mixed"
          : "pool"
        : "fixed",
    });
  }
  function useCurrentPoolVersion(index) {
    const rule = selectedSection.poolRules[index];
    const currentPool = poolMap.get(rule?.poolId);
    if (!currentPool?.versionId) return;
    updatePoolRule(index, {
      poolVersionId: currentPool.versionId,
      questionCount: Math.max(
        1,
        Math.min(
          Number(rule.questionCount) || 1,
          Number(currentPool.questionCount) || 1,
        ),
      ),
    });
    setSuccess(
      `${currentPool.publicId}: la versione corrente del pool verrà usata al prossimo salvataggio dell’esercizio.`,
    );
  }

  async function refreshVisualContent() {
    setRefreshingContent(true);
    setError("");
    try {
      await loadBase();
      setPreviewRefreshToken((value) => value + 1);
      setSuccess(
        "Domande e pool aggiornati. Le versioni già usate restano bloccate finché non scegli di sostituirle.",
      );
    } finally {
      setRefreshingContent(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await saveExerciseComposerVersion({
        exerciseId: exercise.id,
        exercise,
        sections,
      });
      setSuccess(
        `${result.public_id}, versione ${result.version_number}, salvata con ${result.section_count} sezioni.`,
      );
      await loadBase();
      await openExercise(result.id);
    } catch (saveError) {
      setError(
        saveError.message || "Non è stato possibile salvare l’esercizio.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function changeStatus(status) {
    if (!exercise.id) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await setExerciseComposerStatus(exercise.id, status);
      setSuccess(`${exercise.publicId}: ${statusLabels[status]}.`);
      await loadBase();
      await openExercise(exercise.id);
    } catch (statusError) {
      setError(
        statusError.message || "Non è stato possibile aggiornare lo stato.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SEO
        title="Exercise Composer | Sblocco Inglese"
        description="Componi esercizi versionati con sezioni, domande e pool."
      />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-[1600px]">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-surface-900 sm:p-8">
            <ExerciseBuilderBreadcrumb current="composer" className="mb-4" />
            <span className="eyebrow">Exercise Builder</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">
                  Exercise Composer
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">
                  Costruisci struttura e contenuti visivamente, senza modificare
                  JSON. Ogni salvataggio crea una nuova versione e lascia intatte
                  le assegnazioni precedenti.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin/content/exercises/questions"
                  className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white"
                >
                  Question Bank
                </Link>
                <Link
                  to="/admin/content/exercises/pools"
                  className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white"
                >
                  Pool Builder
                </Link>
                <button
                  type="button"
                  onClick={createNew}
                  className="rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-surface-950"
                >
                  Nuovo esercizio
                </button>
              </div>
            </div>
          </header>
          {error ? (
            <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:border-red-300 dark:bg-red-300/10 dark:text-red-100">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">
              {success}
            </div>
          ) : null}

          <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[17rem_minmax(0,1fr)_24rem]">
            <aside className="order-2 min-w-0 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-surface-900 xl:order-1 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">
                  Esercizi
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-ink/60 dark:text-white/60">
                    {catalog.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadBase()}
                    disabled={loading}
                    className="rounded-lg border border-ink/15 px-2.5 py-1 text-[0.65rem] font-black text-ink disabled:opacity-40 dark:border-white/20 dark:text-white"
                  >
                    {loading ? "..." : "Aggiorna"}
                  </button>
                </div>
              </div>
              <input
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Cerca per ID, titolo, topic..."
                aria-label="Cerca nel catalogo esercizi"
                className="mt-3 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-surface-800 dark:text-white"
              />
              <div className="mt-3 grid gap-2">
                {filteredCatalog.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openExercise(item.id)}
                    className={`rounded-xl border p-3 text-left transition ${exercise.id === item.id ? "border-moss bg-mint/25 dark:border-emerald-300/35 dark:bg-emerald-400/10" : "border-ink/10 hover:bg-linen/40 dark:border-white/10 dark:hover:bg-white/[0.06]"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-moss dark:text-emerald-300">
                        {item.publicId}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[0.6rem] font-black ${statusClass(item.status)}`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-black text-ink dark:text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs font-bold text-ink/60 dark:text-white/60">
                      v{item.version_number} · {item.level} · {item.topic}
                    </p>
                  </button>
                ))}
                {!catalog.length && !loading ? (
                  <div className="rounded-xl border border-dashed border-ink/15 p-4 text-sm leading-6 text-ink/60 dark:border-white/15 dark:text-white/60">
                    <p className="font-black text-ink dark:text-white">
                      Nessun esercizio in catalogo.
                    </p>
                    <p className="mt-2">
                      Se hai appena promosso un import, premi Aggiorna qui
                      sopra. Altrimenti parti da{" "}
                      <Link
                        to="/admin/content/exercises"
                        className="font-black text-moss underline dark:text-emerald-300"
                      >
                        Importa JSON
                      </Link>{" "}
                      o dalla{" "}
                      <Link
                        to="/admin/content/exercises/review"
                        className="font-black text-moss underline dark:text-emerald-300"
                      >
                        Coda di revisione
                      </Link>
                      .
                    </p>
                  </div>
                ) : null}
                {catalog.length && !filteredCatalog.length ? (
                  <p className="py-4 text-sm font-semibold text-ink/60 dark:text-white/60">
                    Nessun esercizio corrisponde alla ricerca.
                  </p>
                ) : null}
              </div>
            </aside>

            <main className="order-1 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:order-2">
              <section className="min-w-0 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">
                      {exercise.publicId || "Nuovo esercizio"}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">
                      Impostazioni generali
                    </h2>
                  </div>
                  {exercise.id ? (
                    <span
                      className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${statusClass(exercise.status)}`}
                    >
                      {statusLabels[exercise.status]} · v
                      {exercise.versionNumber}
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">
                    Titolo
                    <input
                      value={exercise.title}
                      onChange={(event) =>
                        setExercise({ ...exercise, title: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">
                    Descrizione
                    <textarea
                      rows={2}
                      value={exercise.description}
                      onChange={(event) =>
                        setExercise({
                          ...exercise,
                          description: event.target.value,
                        })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">
                    Istruzioni allo studente
                    <textarea
                      rows={3}
                      value={exercise.instructions}
                      onChange={(event) =>
                        setExercise({
                          ...exercise,
                          instructions: event.target.value,
                        })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black text-ink/60 dark:text-white/60">
                    Livello
                    <select
                      value={exercise.level}
                      onChange={(event) =>
                        setExercise({ ...exercise, level: event.target.value })
                      }
                      className={fieldClass}
                    >
                      {[
                        "A0",
                        "A1",
                        "A1+",
                        "A2",
                        "B1",
                        "B1+",
                        "B2",
                        "C1",
                        "C2",
                        "Mixed",
                      ].map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-black text-ink/60 dark:text-white/60">
                    Topic
                    <input
                      value={exercise.topic}
                      onChange={(event) =>
                        setExercise({ ...exercise, topic: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black text-ink/60 dark:text-white/60">
                    Durata stimata
                    <input
                      type="number"
                      min="1"
                      value={exercise.estimatedMinutes}
                      onChange={(event) =>
                        setExercise({
                          ...exercise,
                          estimatedMinutes: event.target.value,
                        })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black text-ink/60 dark:text-white/60">
                    Visualizzazione
                    <select
                      value={exercise.settings.display_mode}
                      onChange={(event) =>
                        setExercise({
                          ...exercise,
                          settings: {
                            ...exercise.settings,
                            display_mode: event.target.value,
                          },
                        })
                      }
                      className={fieldClass}
                    >
                      <option value="one_at_a_time">
                        Una domanda alla volta
                      </option>
                      <option value="all_questions">Tutte le domande</option>
                    </select>
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap gap-4 text-xs font-black text-ink/65 dark:text-white/65">
                  {[
                    ["show_score", "Punteggio"],
                    ["show_correct_answers", "Soluzioni"],
                    ["show_explanations", "Spiegazioni"],
                    ["show_diagnostic_summary", "Diagnosi"],
                    ["allow_retry", "Nuovi tentativi"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exercise.settings[key] !== false}
                        onChange={(event) =>
                          setExercise({
                            ...exercise,
                            settings: {
                              ...exercise.settings,
                              [key]: event.target.checked,
                            },
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-[0.7rem] font-semibold leading-5 text-ink/60 dark:text-white/60">
                  Punteggio = percentuale di punti ottenuti sul totale (le
                  attività corrette a mano entrano nel punteggio dopo la
                  valutazione dell’insegnante). Soluzioni e Spiegazioni
                  controllano cosa vede lo studente nelle correzioni; Diagnosi
                  mostra il riepilogo degli errori; Nuovi tentativi permette di
                  ripetere l’esercizio.
                </p>
              </section>

              <section className="min-w-0 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-7">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                      Struttura
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">
                      {sections.length} sezioni · circa {totalQuestions} domande
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={addSection}
                    className="rounded-full bg-violet-700 px-4 py-2 text-xs font-black text-white"
                  >
                    Aggiungi sezione
                  </button>
                </div>
                <div className="mt-5 grid gap-3">
                  {sections.map((section, index) => (
                    <article
                      key={section.clientId}
                      className={`rounded-xl border p-4 transition ${selectedSectionId === section.clientId ? "border-violet-400 bg-violet-50/60 dark:border-violet-300/35 dark:bg-violet-400/[0.08]" : "border-ink/10 dark:border-white/10"}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSectionId(section.clientId)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-violet-700 dark:text-violet-300">
                              Sezione {index + 1}
                            </p>
                            <p className="mt-1 text-base font-black text-ink dark:text-white">
                              {section.title || `Sezione ${index + 1}`}
                            </p>
                            <p className="mt-1 text-xs font-bold text-ink/60 dark:text-white/60">
                              {section.selectionMode} ·{" "}
                              {sectionQuestionCount(section, poolMap)} domande ·
                              feedback {section.feedbackTiming}
                            </p>
                          </div>
                          <span className="text-xs font-black text-ink/60 dark:text-white/60">
                            Apri
                          </span>
                        </div>
                      </button>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveSection(index, -1)}
                          className="rounded-md border border-ink/15 px-2 py-1 text-xs font-black disabled:opacity-30 dark:border-white/20"
                        >
                          Su
                        </button>
                        <button
                          type="button"
                          disabled={index === sections.length - 1}
                          onClick={() => moveSection(index, 1)}
                          className="rounded-md border border-ink/15 px-2 py-1 text-xs font-black disabled:opacity-30 dark:border-white/20"
                        >
                          Giù
                        </button>
                        <button
                          type="button"
                          disabled={sections.length === 1}
                          onClick={() => removeSection(index)}
                          className="ml-auto text-xs font-black text-red-700 underline disabled:opacity-30 dark:text-red-300"
                        >
                          Elimina
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {selectedSection ? (
                <section className="min-w-0 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-7">
                  <p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">
                    Configura sezione {selectedSectionIndex + 1}
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-black text-ink/60 dark:text-white/60">
                      Titolo
                      <input
                        value={selectedSection.title}
                        onChange={(event) =>
                          updateSelectedSection({ title: event.target.value })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-xs font-black text-ink/60 dark:text-white/60">
                      Feedback
                      <select
                        value={selectedSection.feedbackTiming}
                        onChange={(event) =>
                          updateFeedbackTiming(event.target.value)
                        }
                        className={fieldClass}
                      >
                        <option value="question_end">Dopo ogni domanda</option>
                        <option value="section_end">A fine sezione</option>
                        <option value="exercise_end">A fine esercizio</option>
                        <option value="hidden">Nascosto</option>
                      </select>
                      <span className="mt-2 block text-[0.7rem] font-semibold leading-5 text-ink/60 dark:text-white/60">
                        “Dopo ogni domanda”: correzione immediata, una domanda
                        alla volta. “A fine sezione”: riepilogo con correzioni
                        al termine della sezione. “A fine esercizio”: correzioni
                        solo nel risultato finale. “Nascosto”: lo studente non
                        vede mai le correzioni.
                      </span>
                    </label>
                    <label className="text-xs font-black text-ink/60 dark:text-white/60 sm:col-span-2">
                      Istruzioni
                      <textarea
                        rows={2}
                        value={selectedSection.instructions}
                        onChange={(event) =>
                          updateSelectedSection({
                            instructions: event.target.value,
                          })
                        }
                        className={fieldClass}
                      />
                    </label>
                  </div>
                  {contentPreviewError ? (
                    <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
                      Le associazioni restano modificabili, ma alcune anteprime non sono disponibili: {contentPreviewError}
                    </div>
                  ) : null}
                  <div className="mt-6 grid gap-8">
                    <div>
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">
                            Domande fisse
                          </p>
                          <h3 className="mt-1 text-lg font-black text-ink dark:text-white">
                            {selectedSection.fixedQuestions.length}
                          </h3>
                        </div>
                        <button
                          type="button"
                          disabled={refreshingContent}
                          onClick={refreshVisualContent}
                          className="rounded-full border border-ink/15 px-3 py-1.5 text-[0.7rem] font-black text-ink disabled:opacity-40 dark:border-white/20 dark:text-white"
                        >
                          {refreshingContent ? "Aggiornamento…" : "Aggiorna contenuti"}
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(8rem,1fr)_7rem_10rem]">
                        <input
                          value={questionSearch}
                          onChange={(event) =>
                            setQuestionSearch(event.target.value)
                          }
                          className={`${fieldClass} mt-0`}
                          placeholder="Cerca"
                        />
                        <select
                          value={questionLevel}
                          onChange={(event) =>
                            setQuestionLevel(event.target.value)
                          }
                          className={`${fieldClass} mt-0`}
                        >
                          <option value="all">Livelli</option>
                          {questionLevels.map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                        <select
                          value={questionType}
                          onChange={(event) =>
                            setQuestionType(event.target.value)
                          }
                          className={`${fieldClass} mt-0`}
                        >
                          <option value="all">Tipi</option>
                          {questionTypes.map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-3 max-h-80 divide-y divide-ink/10 overflow-y-auto border-y border-ink/10 dark:divide-white/10 dark:border-white/10">
                        {filteredQuestions.map((question) => (
                          <div
                            key={question.id}
                            className={`flex items-start gap-3 py-3 ${fixedSet.has(question.id) ? "bg-mint/20 dark:bg-emerald-400/[0.06]" : ""}`}
                          >
                            <input
                              type="checkbox"
                              aria-label={`${fixedSet.has(question.id) ? "Rimuovi" : "Aggiungi"} ${question.publicId}`}
                              checked={fixedSet.has(question.id)}
                              onChange={() => toggleFixedQuestion(question)}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-moss dark:text-emerald-300">
                                {question.publicId} · {question.question_type}
                              </p>
                              <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-ink dark:text-white">
                                {readableQuestionText(
                                  question,
                                  `${question.publicId}: contenuto da verificare`,
                                )}
                              </p>
                            </div>
                            <Link
                              to={visualEditorHref(question.id, composerReturnTo)}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-[0.65rem] font-black text-violet-700 underline dark:text-violet-300"
                            >
                              Modifica ↗
                            </Link>
                          </div>
                        ))}
                      </div>
                      {selectedSection.fixedQuestions.length ? (
                        <div className="mt-4 grid gap-2">
                          {selectedSection.fixedQuestions.map((item, index) => {
                            const currentQuestion = questionMap.get(item.questionId);
                            const exactQuestion = questionPreviewMap.get(
                              item.questionVersionId,
                            );
                            const question = exactQuestion ||
                              (currentQuestion
                                ? {
                                    ...currentQuestion,
                                    questionId: currentQuestion.id,
                                    questionVersionId: currentQuestion.versionId,
                                  }
                                : null);
                            return (
                              <QuestionComposerCard
                                key={item.questionId}
                                question={question}
                                currentQuestion={currentQuestion}
                                fallbackLabel={`Domanda ${index + 1}`}
                                returnTo={composerReturnTo}
                                index={index}
                                onUseCurrent={
                                  currentQuestion?.versionId &&
                                  currentQuestion.versionId !== item.questionVersionId
                                    ? () => useCurrentFixedQuestion(item.questionId)
                                    : null
                                }
                                onMoveUp={
                                  index > 0
                                    ? () => moveFixed(item.questionId, -1)
                                    : null
                                }
                                onMoveDown={
                                  index < selectedSection.fixedQuestions.length - 1
                                    ? () => moveFixed(item.questionId, 1)
                                    : null
                                }
                                onRemove={() => toggleFixedQuestion({ id: item.questionId })}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        Estrazione da pool
                      </p>
                      <h3 className="mt-1 text-lg font-black text-ink dark:text-white">
                        {selectedSection.poolRules.length} regole
                      </h3>
                      <div className="mt-3 flex gap-2">
                        <select
                          value={selectedPoolId}
                          onChange={(event) =>
                            setSelectedPoolId(event.target.value)
                          }
                          className={`${fieldClass} mt-0 flex-1`}
                        >
                          <option value="">Scegli pool...</option>
                          {pools
                            .filter(
                              (item) =>
                                !selectedSection.poolRules.some(
                                  (rule) => rule.poolId === item.id,
                                ),
                            )
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.publicId} · {item.title || item.name} (
                                {item.questionCount})
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedPoolId}
                          onClick={addPoolRule}
                          className="rounded-xl bg-violet-700 px-4 py-2 text-xs font-black text-white disabled:opacity-35"
                        >
                          Aggiungi
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {selectedSection.poolRules.map((rule, index) => {
                          const poolItem = poolMap.get(rule.poolId);
                          const lockedPool = poolPreviewMap.get(
                            rule.poolVersionId,
                          );
                          const poolQuestionCount =
                            lockedPool?.questions?.length ??
                            poolItem?.questionCount ??
                            0;
                          const hasNewerPoolVersion = Boolean(
                            poolItem?.versionId &&
                              poolItem.versionId !== rule.poolVersionId,
                          );
                          return (
                            <article
                              key={`${rule.poolId}-${index}`}
                              className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-300/20 dark:bg-violet-400/[0.06]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-violet-700 dark:text-violet-300">
                                    {lockedPool?.publicId || poolItem?.publicId || `Pool ${index + 1}`}
                                  </p>
                                  <p className="mt-1 text-sm font-black text-ink dark:text-white">
                                    {lockedPool?.title ||
                                      lockedPool?.name ||
                                      poolItem?.title ||
                                      poolItem?.name ||
                                      "Pool senza titolo"}
                                  </p>
                                  <p className="mt-1 text-xs font-bold text-ink/60 dark:text-white/60">
                                    Versione usata v{lockedPool?.version_number || "?"} ·{" "}
                                    {poolQuestionCount} domande disponibili
                                  </p>
                                  {hasNewerPoolVersion ? (
                                    <p className="mt-2 text-xs font-semibold leading-5 text-amber-800 dark:text-amber-200">
                                      Il pool ha una versione più recente. L’esercizio resta sulla versione usata finché non la sostituisci.
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                  <Link
                                    to={`/admin/content/exercises/pools?poolId=${encodeURIComponent(rule.poolId)}&returnTo=${encodeURIComponent(composerReturnTo)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-black text-violet-700 underline dark:text-violet-300"
                                  >
                                    Gestisci pool ↗
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => removePoolRule(index)}
                                    className="text-xs font-black text-red-700 underline dark:text-red-300"
                                  >
                                    Rimuovi
                                  </button>
                                </div>
                              </div>
                              {hasNewerPoolVersion ? (
                                <button
                                  type="button"
                                  onClick={() => useCurrentPoolVersion(index)}
                                  className="mt-3 rounded-full bg-amber-100 px-3 py-1.5 text-[0.7rem] font-black text-amber-950 dark:bg-amber-300/15 dark:text-amber-100"
                                >
                                  Usa la versione corrente v{poolItem?.version_number}
                                </button>
                              ) : null}
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <label className="text-xs font-black text-ink/60 dark:text-white/60">
                                  Quante domande
                                  <input
                                    type="number"
                                    min="1"
                                    max={poolQuestionCount || 1}
                                    value={rule.questionCount}
                                    onChange={(event) =>
                                      updatePoolRule(index, {
                                        questionCount: Math.max(
                                          1,
                                          Number(event.target.value) || 1,
                                        ),
                                      })
                                    }
                                    className={fieldClass}
                                  />
                                </label>
                                <label className="text-xs font-black text-ink/60 dark:text-white/60">
                                  Strategia
                                  <select
                                    value={rule.selectionStrategy}
                                    onChange={(event) =>
                                      updatePoolRule(index, {
                                        selectionStrategy: event.target.value,
                                      })
                                    }
                                    className={fieldClass}
                                  >
                                    <option value="balanced">Bilanciata</option>
                                    <option value="unseen_first">
                                      Prima mai viste
                                    </option>
                                    <option value="avoid_recent">
                                      Evita recenti
                                    </option>
                                    <option value="random">Casuale</option>
                                  </select>
                                </label>
                              </div>
                              <details className="group mt-4 rounded-xl border border-violet-200 bg-white/70 dark:border-violet-300/15 dark:bg-black/10">
                                <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black text-violet-800 marker:hidden dark:text-violet-200">
                                  <span className="group-open:hidden">
                                    Visualizza e correggi le {poolQuestionCount} domande del pool
                                  </span>
                                  <span className="hidden group-open:inline">
                                    Nascondi le domande del pool
                                  </span>
                                </summary>
                                <div className="max-h-[34rem] space-y-3 overflow-y-auto border-t border-violet-200 p-3 dark:border-violet-300/15">
                                  {lockedPool?.questions?.map((membership, questionIndex) => {
                                    const currentQuestion = questionMap.get(
                                      membership.question_id,
                                    );
                                    return (
                                      <QuestionComposerCard
                                        key={`${membership.question_id}-${membership.question_version_id || questionIndex}`}
                                        question={membership.question}
                                        currentQuestion={currentQuestion}
                                        fallbackLabel={`Domanda pool ${questionIndex + 1}`}
                                        returnTo={composerReturnTo}
                                        index={questionIndex}
                                        pinned={Boolean(membership.pinned)}
                                      />
                                    );
                                  })}
                                  {!lockedPool?.questions?.length ? (
                                    <p className="rounded-lg border border-dashed border-ink/15 p-3 text-sm font-semibold text-ink/55 dark:border-white/15 dark:text-white/55">
                                      Nessuna anteprima disponibile per questa versione. La regola salvata non viene modificata.
                                    </p>
                                  ) : null}
                                  <p className="rounded-lg bg-violet-50 p-3 text-xs font-semibold leading-5 text-violet-950 dark:bg-violet-300/10 dark:text-violet-100">
                                    Modificare una domanda crea una nuova versione. Per usarla qui, salva una nuova versione nel Pool Builder, torna al Composer, premi “Aggiorna contenuti” e scegli “Usa la versione corrente”.
                                  </p>
                                </div>
                              </details>
                            </article>
                          );
                        })}
                        {!selectedSection.poolRules.length ? (
                          <p className="rounded-xl border border-dashed border-ink/15 p-4 text-sm text-ink/65 dark:border-white/15 dark:text-white/65">
                            Nessuna pool collegata.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
            </main>

            <aside className="order-3 min-w-0 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
              <p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">
                Anteprima struttura
              </p>
              <h2 className="mt-1 text-xl font-black text-ink dark:text-white">
                {exercise.title || "Esercizio senza titolo"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">
                {exercise.description ||
                  "Aggiungi una descrizione per riconoscerlo nella libreria."}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-linen/40 p-3 dark:bg-white/[0.04]">
                  <p className="text-2xl font-black text-ink dark:text-white">
                    {sections.length}
                  </p>
                  <p className="text-xs font-bold text-ink/60 dark:text-white/60">
                    sezioni
                  </p>
                </div>
                <div className="rounded-xl bg-linen/40 p-3 dark:bg-white/[0.04]">
                  <p className="text-2xl font-black text-ink dark:text-white">
                    {totalQuestions}
                  </p>
                  <p className="text-xs font-bold text-ink/60 dark:text-white/60">
                    domande stimate
                  </p>
                </div>
              </div>
              <div className="mt-5 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">
                {sections.map((section, index) => (
                  <div key={section.clientId} className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-ink dark:text-white">
                        {index + 1}. {section.title}
                      </p>
                      <span className="rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black text-ink/65 dark:bg-white/10 dark:text-white/65">
                        {sectionQuestionCount(section, poolMap)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">
                      {section.fixedQuestions.length} fisse ·{" "}
                      {section.poolRules.length} pool · {section.feedbackTiming}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewAnswers({});
                    setPreviewOpen(true);
                  }}
                  className="rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white"
                >
                  Anteprima studente
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-40 dark:bg-emerald-300 dark:text-surface-950"
                >
                  {saving
                    ? "Salvataggio..."
                    : exercise.id
                      ? "Salva nuova versione"
                      : "Crea esercizio"}
                </button>
                {exercise.id &&
                !["approved", "published"].includes(exercise.status) ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => changeStatus("approved")}
                    className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-black dark:border-white/20"
                  >
                    Approva
                  </button>
                ) : null}
                {exercise.id && exercise.status !== "published" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => changeStatus("published")}
                    className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-black text-white"
                  >
                    Pubblica
                  </button>
                ) : null}
                {exercise.id && exercise.status !== "archived" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => changeStatus("archived")}
                    className="mt-1 text-xs font-black text-red-700 underline dark:text-red-300"
                  >
                    Archivia
                  </button>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </section>
      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Anteprima studente"
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-ink/10 bg-paper shadow-xl dark:border-white/10 dark:bg-surface-950">
            <div className="flex items-start justify-between gap-3 border-b border-ink/10 p-5 dark:border-white/10">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">
                  Anteprima studente
                </p>
                <h2 className="mt-1 text-xl font-black text-ink dark:text-white">
                  {exercise.title || "Esercizio senza titolo"}
                </h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/60 dark:text-white/60">
                  Anteprima interattiva senza correzione. Mostra le domande
                  fisse così come le vede lo studente; le domande dei pool
                  vengono estratte solo durante il tentativo reale.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="focus-ring shrink-0 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-black text-ink dark:border-white/20 dark:text-white"
              >
                Chiudi
              </button>
            </div>
            <div className="grid gap-5 p-5">
              {sections.map((section, index) => (
                <section
                  key={section.clientId}
                  className="rounded-xl border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-surface-900 sm:p-5"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-coral">
                    Sezione {index + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-ink dark:text-white">
                    {section.title}
                  </h3>
                  {section.instructions ? (
                    <p className="mt-1 text-sm leading-6 text-ink/65 dark:text-white/65">
                      {section.instructions}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-4">
                    {section.fixedQuestions.map((fixedItem, questionIndex) => {
                      const bankQuestion = questionMap.get(fixedItem.questionId);
                      if (!bankQuestion) {
                        return (
                          <p
                            key={fixedItem.questionId}
                            className="rounded-lg border border-dashed border-ink/15 p-3 text-xs font-semibold text-ink/60 dark:border-white/15 dark:text-white/60"
                          >
                            Domanda non trovata nella banca (forse archiviata).
                          </p>
                        );
                      }
                      const previewItem = {
                        id: fixedItem.questionId,
                        question: {
                          type: bankQuestion.question_type,
                          title: bankQuestion.title,
                          prompt: bankQuestion.prompt,
                          instructions: bankQuestion.instructions,
                          content: bankQuestion.content || {},
                          feedback: bankQuestion.feedback || {},
                        },
                      };
                      return (
                        <article
                          key={fixedItem.questionId}
                          className="rounded-lg border border-ink/10 p-4 dark:border-white/10"
                        >
                          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/60 dark:text-white/60">
                            Attività {questionIndex + 1}
                          </p>
                          <ExerciseQuestionRenderer
                            item={previewItem}
                            answer={previewAnswers[fixedItem.questionId]}
                            onChange={(value) =>
                              setPreviewAnswers((current) => ({
                                ...current,
                                [fixedItem.questionId]: value,
                              }))
                            }
                            attemptId={null}
                          />
                        </article>
                      );
                    })}
                    {section.poolRules.map((rule) => {
                      const poolItem = poolMap.get(rule.poolId);
                      return (
                        <p
                          key={rule.poolId}
                          className="rounded-lg border border-dashed border-violet-300/60 bg-violet-50/50 p-3 text-xs font-semibold text-violet-900 dark:border-violet-300/25 dark:bg-violet-400/[0.06] dark:text-violet-200"
                        >
                          + {rule.questionCount} domande estratte dal pool{" "}
                          {poolItem?.publicId} · {poolItem?.title || poolItem?.name}
                        </p>
                      );
                    })}
                    {!section.fixedQuestions.length &&
                    !section.poolRules.length ? (
                      <p className="text-sm font-semibold text-ink/60 dark:text-white/60">
                        Sezione vuota.
                      </p>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
