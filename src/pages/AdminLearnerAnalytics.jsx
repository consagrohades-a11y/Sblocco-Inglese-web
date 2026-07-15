import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  Brain,
  ChevronLeft,
  ClipboardList,
  RefreshCw,
  Target,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import { loadAdminLearnerAnalytics } from "../lib/adminAnalyticsApi.js";

const periodOptions = [
  { value: 7, label: "7 giorni" },
  { value: 30, label: "30 giorni" },
  { value: 90, label: "90 giorni" },
  { value: 3650, label: "Tutto" },
];

const assignmentLabels = {
  draft: "Bozza",
  published: "Pubblicata",
  completed: "Completata",
  archived: "Archiviata",
};

const outcomeLabels = {
  correct: "Corretta",
  nearly_correct: "Quasi corretta",
  incorrect: "Errata",
  skipped: "Saltata",
  passed: "Superato",
  not_passed: "Da riprovare",
  pending_review: "In revisione",
};

function number(value, digits = 0) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatDate(value, includeTime = false, fallback = "Mai") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function Metric({ icon: Icon, label, value, detail, tone = "emerald" }) {
  const tones = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-400/[0.08] dark:text-emerald-100",
    violet:
      "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-300/20 dark:bg-violet-400/[0.08] dark:text-violet-100",
    amber:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-300/20 dark:bg-amber-400/[0.08] dark:text-amber-100",
    coral:
      "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-300/20 dark:bg-orange-400/[0.08] dark:text-orange-100",
  };
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-60">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black">{value}</p>
          <p className="mt-1 text-xs font-bold opacity-60">{detail}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/70 shadow-sm dark:bg-black/15">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function PercentBar({ value, tone = "bg-emerald-500" }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="min-w-28">
      <div className="text-xs font-black">{number(safe, 1)}%</div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

function ActivityChart({ rows }) {
  const visible = rows.slice(-30);
  const maximum = Math.max(
    1,
    ...visible.map(
      (row) =>
        Number(row.srs_reviews || 0) + Number(row.exercise_attempts || 0),
    ),
  );
  return (
    <div className="mt-6 overflow-x-auto pb-2">
      <div
        className="flex min-w-[720px] items-end gap-2"
        style={{ height: 190 }}
      >
        {visible.map((row, index) => {
          const reviews = Number(row.srs_reviews || 0);
          const attempts = Number(row.exercise_attempts || 0);
          const total = reviews + attempts;
          const height = Math.max(
            total ? 8 : 2,
            Math.round((total / maximum) * 150),
          );
          const label = new Intl.DateTimeFormat("it-IT", {
            day: "2-digit",
            month: "short",
          }).format(new Date(`${row.date}T12:00:00`));
          return (
            <div
              key={row.date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              title={`${label}: ${reviews} ripassi, ${attempts} esercizi`}
            >
              <div
                className="flex w-full max-w-7 flex-col justify-end overflow-hidden rounded-t-md bg-ink/5 dark:bg-white/5"
                style={{ height }}
              >
                <div
                  className="bg-violet-500"
                  style={{ height: total ? `${(attempts / total) * 100}%` : 0 }}
                />
                <div
                  className="bg-emerald-500"
                  style={{ height: total ? `${(reviews / total) * 100}%` : 0 }}
                />
              </div>
              {index % Math.max(1, Math.floor(visible.length / 7)) === 0 ||
              index === visible.length - 1 ? (
                <span className="whitespace-nowrap text-[0.6rem] font-black text-ink/40 dark:text-white/40">
                  {label}
                </span>
              ) : (
                <span className="h-3" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminLearnerAnalytics() {
  const { learnerId } = useParams();
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await loadAdminLearnerAnalytics(learnerId, period));
    } catch (loadError) {
      setError(
        loadError.message ||
          "Non è stato possibile caricare le analisi dello studente.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [learnerId, period]);

  const profile = data?.profile || {};
  const overview = data?.overview || {};
  const pageTitle = profile.learner_name || "Analisi studente";

  return (
    <>
      <SEO
        title={`${pageTitle} | Analisi | Sblocco Inglese`}
        description="Analisi didattica del singolo studente."
      />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-[1400px]">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
            <Link
              to="/admin/analytics"
              className="inline-flex items-center gap-2 text-xs font-black text-moss underline dark:text-emerald-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Torna alle analisi
            </Link>
            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="eyebrow">Dettaglio studente</span>
                <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">
                  {pageTitle}
                </h1>
                <p className="mt-2 text-sm font-semibold text-ink/55 dark:text-white/55">
                  {profile.learner_email || "Caricamento profilo..."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/admin/learners/${learnerId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2.5 text-sm font-black dark:border-white/20"
                >
                  <UserRound className="h-4 w-4" />
                  Profilo
                </Link>
                <select
                  value={period}
                  onChange={(event) => setPeriod(Number(event.target.value))}
                  className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black dark:border-white/20 dark:bg-white/10 dark:text-white"
                >
                  {periodOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={loading}
                  onClick={load}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white disabled:opacity-40 dark:bg-emerald-300 dark:text-[#102019]"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Aggiorna
                </button>
              </div>
            </div>
          </header>

          {error ? (
            <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold leading-6 text-red-950">
              {error}
              <p className="mt-2 font-semibold">
                Verifica di aver applicato la migrazione{" "}
                <code>20260715160000_admin_learning_analytics.sql</code>.
              </p>
            </div>
          ) : null}
          {loading && !data ? (
            <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/60 dark:border-white/10 dark:bg-[#16211e] dark:text-white/60">
              Calcolo delle metriche in corso...
            </div>
          ) : null}

          {data ? (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  icon={Brain}
                  label="Ripassi SRS"
                  value={number(overview.srs_reviews)}
                  detail={`${number(overview.srs_success_rate, 1)}% corretti o quasi`}
                />
                <Metric
                  icon={BookOpenCheck}
                  label="Esercizi inviati"
                  value={number(overview.exercise_attempts)}
                  detail={
                    overview.average_exercise_score === null
                      ? "Nessun punteggio"
                      : `${number(overview.average_exercise_score, 1)}% media`
                  }
                  tone="violet"
                />
                <Metric
                  icon={Target}
                  label="Card da seguire"
                  value={number(overview.struggling_cards)}
                  detail={`${number(overview.due_cards)} dovute su ${number(overview.introduced_cards)}`}
                  tone="coral"
                />
                <Metric
                  icon={AlertTriangle}
                  label="Azioni aperte"
                  value={number(
                    Number(overview.overdue_assignments || 0) +
                      Number(overview.pending_reviews || 0),
                  )}
                  detail={`${number(overview.overdue_assignments)} scadute · ${number(overview.pending_reviews)} revisioni`}
                  tone="amber"
                />
              </div>

              <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">
                      Andamento
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      Attività giornaliera
                    </h2>
                  </div>
                  <div className="flex gap-4 text-xs font-black text-ink/55 dark:text-white/55">
                    <span className="inline-flex items-center gap-2">
                      <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      SRS
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <i className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                      Esercizi
                    </span>
                  </div>
                </div>
                <ActivityChart rows={data.daily_activity || []} />
              </section>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
                  <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    SRS
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Card più difficili
                  </h2>
                  <div className="mt-5 divide-y divide-ink/10 dark:divide-white/10">
                    {(data.difficult_cards || []).map((card) => (
                      <article
                        key={card.id}
                        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div>
                          <p className="text-xs font-black text-moss dark:text-emerald-300">
                            {card.public_id} · {card.level} · {card.item_type}
                          </p>
                          <h3 className="mt-1 font-black">
                            {card.display_target}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
                            {number(card.review_count)} ripassi ·{" "}
                            {number(card.incorrect_count)} errori ·{" "}
                            {number(card.nearly_correct_count)} quasi
                          </p>
                        </div>
                        <PercentBar
                          value={card.difficulty_rate}
                          tone="bg-amber-500"
                        />
                      </article>
                    ))}
                    {!(data.difficult_cards || []).length ? (
                      <p className="py-6 text-sm font-bold text-ink/50 dark:text-white/50">
                        Nessun ripasso nel periodo.
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
                  <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    Exercise Builder
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Prestazioni esercizi
                  </h2>
                  <div className="mt-5 divide-y divide-ink/10 dark:divide-white/10">
                    {(data.exercises || []).map((exercise) => (
                      <article
                        key={exercise.exercise_id}
                        className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div>
                          <p className="text-xs font-black text-violet-700 dark:text-violet-300">
                            {exercise.exercise_public_id || "Exercise Builder"}
                          </p>
                          <h3 className="mt-1 font-black">
                            {exercise.exercise_title || "Esercizio"}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
                            {number(exercise.attempt_count)} invii · media{" "}
                            {number(exercise.average_score, 1)}% ·{" "}
                            {number(exercise.pending_reviews)} revisioni
                          </p>
                        </div>
                        <PercentBar
                          value={exercise.pass_rate}
                          tone="bg-violet-500"
                        />
                      </article>
                    ))}
                    {!(data.exercises || []).length ? (
                      <p className="py-6 text-sm font-bold text-ink/50 dark:text-white/50">
                        Nessun esercizio inviato nel periodo.
                      </p>
                    ) : null}
                  </div>
                </section>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#16211e]">
                  <div className="border-b border-ink/10 p-5 dark:border-white/10 sm:p-7">
                    <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">
                      Assegnazioni
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      Stato del percorso
                    </h2>
                  </div>
                  <div className="divide-y divide-ink/10 dark:divide-white/10">
                    {(data.assignments || []).map((assignment) => {
                      const overdue =
                        assignment.status === "published" &&
                        assignment.deadline_at &&
                        new Date(assignment.deadline_at) < new Date();
                      return (
                        <article key={assignment.id} className="p-5 sm:px-7">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="font-black">{assignment.title}</h3>
                              <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
                                {assignment.deadline_at
                                  ? `Scadenza ${formatDate(assignment.deadline_at, true)}`
                                  : "Nessuna scadenza"}{" "}
                                · {number(assignment.attempt_count)} tentativi
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10">
                                {assignmentLabels[assignment.status] ||
                                  assignment.status}
                              </span>
                              {overdue ? (
                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-800 dark:bg-red-400/15 dark:text-red-200">
                                  Scaduta
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-4">
                            <span className="text-xs font-bold text-ink/55 dark:text-white/55">
                              Ultimo punteggio:{" "}
                              {assignment.latest_score === null
                                ? "-"
                                : `${number(assignment.latest_score, 1)}%`}
                            </span>
                            {Number(assignment.collection_progress) > 0 ? (
                              <div className="w-32">
                                <PercentBar
                                  value={assignment.collection_progress}
                                  tone="bg-cyan-500"
                                />
                              </div>
                            ) : null}
                            <Link
                              to={`/admin/learners/${learnerId}/assignments/${assignment.id}/content`}
                              className="ml-auto text-xs font-black text-moss underline dark:text-emerald-300"
                            >
                              Apri
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                    {!(data.assignments || []).length ? (
                      <p className="p-7 text-sm font-bold text-ink/50 dark:text-white/50">
                        Nessuna assegnazione disponibile.
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                        Diagnostica
                      </p>
                      <h2 className="mt-1 text-xl font-black">
                        Errori ricorrenti
                      </h2>
                    </div>
                    <Activity className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div className="mt-5 grid gap-3">
                    {(data.diagnostics || []).map((item) => (
                      <article
                        key={item.diagnostic_code}
                        className="rounded-xl border border-ink/10 p-4 dark:border-white/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-cyan-700 dark:text-cyan-300">
                              {item.diagnostic_code}
                            </p>
                            <h3 className="mt-1 font-black">{item.label}</h3>
                            <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
                              {item.primary_skill} ·{" "}
                              {number(item.error_count, 1)} errori
                            </p>
                          </div>
                          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-300/10 dark:text-cyan-200">
                            {number(item.error_rate, 1)}%
                          </span>
                        </div>
                      </article>
                    ))}
                    {!(data.diagnostics || []).length ? (
                      <p className="text-sm font-bold text-ink/50 dark:text-white/50">
                        Nessuna diagnostica nel periodo.
                      </p>
                    ) : null}
                  </div>
                </section>
              </div>

              <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">
                      Cronologia
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      Attività recente
                    </h2>
                  </div>
                  <ClipboardList className="h-6 w-6 text-moss dark:text-emerald-300" />
                </div>
                <div className="mt-5 divide-y divide-ink/10 dark:divide-white/10">
                  {(data.recent_activity || []).map((item) => (
                    <article
                      key={`${item.activity_type}-${item.reference_id}`}
                      className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-ink/40 dark:text-white/40">
                          {item.activity_type === "srs_review"
                            ? "Ripasso SRS"
                            : "Esercizio"}
                        </p>
                        <h3 className="mt-1 font-black">{item.title}</h3>
                        <p className="mt-1 text-xs font-semibold text-ink/45 dark:text-white/45">
                          {formatDate(item.created_at, true)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-linen px-2.5 py-1 text-xs font-black dark:bg-white/10">
                          {outcomeLabels[item.outcome] || item.outcome}
                        </span>
                        {item.score !== null ? (
                          <strong className="text-sm">
                            {number(item.score, 1)}%
                          </strong>
                        ) : null}
                      </div>
                    </article>
                  ))}
                  {!(data.recent_activity || []).length ? (
                    <p className="py-6 text-sm font-bold text-ink/50 dark:text-white/50">
                      Nessuna attività nel periodo.
                    </p>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
