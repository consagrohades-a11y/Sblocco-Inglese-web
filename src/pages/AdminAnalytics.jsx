import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  Brain,
  Download,
  RefreshCw,
  Search,
  Target,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { loadAdminLearningAnalytics } from "../lib/adminAnalyticsApi.js";
import { loadLearnerGroups } from "../lib/learnerGroupsApi.js";

const periodOptions = [
  { value: 7, label: "7 giorni" },
  { value: 30, label: "30 giorni" },
  { value: 90, label: "90 giorni" },
  { value: 3650, label: "Tutto" },
];

const statusLabels = {
  active: "Attivo",
  suspended: "Sospeso",
  deleted: "Eliminato",
};

function number(value, digits = 0) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatDate(value, fallback = "Mai") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
          const date = new Date(`${row.date}T12:00:00`);
          const label = new Intl.DateTimeFormat("it-IT", {
            day: "2-digit",
            month: "short",
          }).format(date);
          return (
            <div
              key={row.date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              title={`${label}: ${reviews} ripassi, ${attempts} esercizi, ${row.active_learners || 0} studenti`}
            >
              <div
                className="flex w-full max-w-7 flex-col justify-end overflow-hidden rounded-t-md bg-ink/5 dark:bg-white/5"
                style={{ height }}
              >
                <div
                  className="bg-violet-500"
                  style={{
                    height: total
                      ? `${Math.max(0, (attempts / total) * 100)}%`
                      : 0,
                  }}
                />
                <div
                  className="bg-emerald-500"
                  style={{
                    height: total
                      ? `${Math.max(0, (reviews / total) * 100)}%`
                      : 0,
                  }}
                />
              </div>
              {index % Math.max(1, Math.floor(visible.length / 7)) === 0 ||
              index === visible.length - 1 ? (
                <span className="whitespace-nowrap text-[0.6rem] font-black text-ink/60 dark:text-white/60">
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

function PercentBar({ value, tone = "bg-emerald-500" }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="min-w-28">
      <div className="flex items-center justify-between gap-2 text-xs font-black">
        <span>{number(safe, 1)}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

function downloadLearnersCsv(learners) {
  const columns = [
    ["Studente", "learner_name"],
    ["Email", "learner_email"],
    ["Stato", "status"],
    ["Ripassi SRS", "srs_reviews"],
    ["Successo SRS %", "srs_success_rate"],
    ["Card in difficoltà", "struggling_cards"],
    ["Assegnazioni aperte", "open_assignments"],
    ["Assegnazioni scadute", "overdue_assignments"],
    ["Tentativi esercizi", "exercise_attempts"],
    ["Punteggio medio", "average_score"],
    ["Revisioni in attesa", "pending_reviews"],
    ["Ultima attività", "last_activity"],
  ];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    columns.map(([label]) => escape(label)).join(","),
    ...learners.map((row) =>
      columns.map(([, key]) => escape(row[key])).join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `analisi-studenti-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [analytics, loadedGroups] = await Promise.all([
        loadAdminLearningAnalytics(period),
        loadLearnerGroups().catch(() => []),
      ]);
      setData(analytics);
      setGroups(loadedGroups);
    } catch (loadError) {
      setError(
        loadError.message || "Non è stato possibile caricare le analisi.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [period]);

  const learners = useMemo(() => {
    const term = query.trim().toLowerCase();
    const selectedGroup = groups.find((group) => group.id === groupId);
    return (data?.learners || []).filter((learner) => {
      if (groupId !== "all" && !(selectedGroup?.member_ids || []).includes(learner.id)) return false;
      if (status !== "all" && learner.status !== status) return false;
      if (
        attentionOnly &&
        !Number(learner.overdue_assignments || 0) &&
        !Number(learner.pending_reviews || 0) &&
        !Number(learner.struggling_cards || 0)
      )
        return false;
      if (!term) return true;
      return [learner.learner_name, learner.learner_email].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [attentionOnly, data?.learners, groupId, groups, query, status]);

  const overview = data?.overview || {};

  return (
    <>
      <SEO
        title="Analisi studenti | Admin | Sblocco Inglese"
        description="Attività, progressi SRS, esercizi e segnali di attenzione degli studenti."
      />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-[1500px]">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="eyebrow">Analisi</span>
                <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">
                  Attività e risultati
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">
                  Una vista operativa su assegnazioni, ripassi SRS, Exercise
                  Builder e segnali che richiedono attenzione.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={period}
                  onChange={(event) => setPeriod(Number(event.target.value))}
                  className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white"
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
                  icon={UsersRound}
                  label="Studenti attivi"
                  value={`${number(overview.active_learners)} / ${number(overview.learner_count)}`}
                  detail="con attività nel periodo"
                />
                <Metric
                  icon={Brain}
                  label="Ripassi SRS"
                  value={number(overview.srs_reviews)}
                  detail={`${number(overview.srs_success_rate, 1)}% corretti o quasi`}
                  tone="violet"
                />
                <Metric
                  icon={BookOpenCheck}
                  label="Esercizi inviati"
                  value={number(overview.exercise_attempts)}
                  detail={`${number(overview.average_exercise_score, 1)}% punteggio medio`}
                  tone="coral"
                />
                <Metric
                  icon={AlertTriangle}
                  label="Da seguire"
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
                      Attività giornaliera
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">
                      Ripassi ed esercizi
                    </h2>
                  </div>
                  <div className="flex gap-4 text-xs font-black text-ink/65 dark:text-white/65">
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

              <section className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#16211e]">
                <div className="border-b border-ink/10 p-5 dark:border-white/10 sm:p-7">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">
                        Studenti
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">
                        Segnali operativi
                      </h2>
                      <p className="mt-2 text-sm text-ink/65 dark:text-white/65">
                        Ordine prioritario: scadenze, revisioni, ultima
                        attività.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadLearnersCsv(learners)}
                        className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-xs font-black dark:border-white/20"
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_12rem_14rem_auto]">
                    <label className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink/35 dark:text-white/35" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Cerca nome o email"
                        className="w-full rounded-xl border border-ink/15 bg-white py-3 pl-10 pr-4 text-sm font-semibold dark:border-white/20 dark:bg-[#101a17] dark:text-white"
                      />
                    </label>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-black dark:border-white/20 dark:bg-[#101a17] dark:text-white"
                    >
                      <option value="all">Tutti gli stati</option>
                      <option value="active">Attivi</option>
                      <option value="suspended">Sospesi</option>
                      <option value="deleted">Eliminati</option>
                    </select>
                    <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-black dark:border-white/20 dark:bg-[#101a17] dark:text-white"><option value="all">Tutti i gruppi</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
                    <label className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
                      <input
                        type="checkbox"
                        checked={attentionOnly}
                        onChange={(event) =>
                          setAttentionOnly(event.target.checked)
                        }
                      />
                      Solo da seguire
                    </label>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead className="bg-linen/60 text-xs font-black uppercase tracking-wide text-ink/60 dark:bg-white/[0.035] dark:text-white/60">
                      <tr>
                        <th className="px-5 py-3">Studente</th>
                        <th className="px-4 py-3">SRS</th>
                        <th className="px-4 py-3">Card</th>
                        <th className="px-4 py-3">Assegnazioni</th>
                        <th className="px-4 py-3">Esercizi</th>
                        <th className="px-4 py-3">Collection</th>
                        <th className="px-4 py-3">Ultima attività</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10 dark:divide-white/10">
                      {learners.map((learner) => (
                        <tr
                          key={learner.id}
                          className="align-top hover:bg-linen/30 dark:hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4">
                        <Link
                          to={`/admin/analytics/learners/${learner.id}`}
                              className="font-black text-ink underline dark:text-white"
                            >
                              {learner.learner_name}
                            </Link>
                            <p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">
                              {learner.learner_email}
                            </p>
                            <span className="mt-2 inline-flex rounded-full bg-linen px-2 py-1 text-[0.65rem] font-black dark:bg-white/10">
                              {statusLabels[learner.status] || learner.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-black">
                              {number(learner.srs_reviews)} ripassi
                            </p>
                            <div className="mt-2">
                              <PercentBar value={learner.srs_success_rate} />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-black">
                              {number(learner.introduced_cards)} viste
                            </p>
                            <p
                              className={`mt-1 text-xs font-bold ${Number(learner.struggling_cards) ? "text-amber-700 dark:text-amber-300" : "text-ink/60 dark:text-white/60"}`}
                            >
                              {number(learner.due_cards)} dovute ·{" "}
                              {number(learner.struggling_cards)} difficili
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-black">
                              {number(learner.open_assignments)} aperte
                            </p>
                            <p
                              className={`mt-1 text-xs font-bold ${Number(learner.overdue_assignments) ? "text-red-700 dark:text-red-300" : "text-ink/60 dark:text-white/60"}`}
                            >
                              {number(learner.overdue_assignments)} scadute ·{" "}
                              {number(learner.completed_assignments)} completate
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-black">
                              {number(learner.exercise_attempts)} invii
                            </p>
                            <p
                              className={`mt-1 text-xs font-bold ${Number(learner.pending_reviews) ? "text-violet-700 dark:text-violet-300" : "text-ink/60 dark:text-white/60"}`}
                            >
                              {learner.average_score === null
                                ? "Nessun punteggio"
                                : `Media ${number(learner.average_score, 1)}%`}{" "}
                              · {number(learner.pending_reviews)} da revisionare
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-black">
                              {number(learner.collection_paths)} percorsi
                            </p>
                            <div className="mt-2">
                              <PercentBar
                                value={learner.collection_progress}
                                tone="bg-cyan-500"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4 font-bold text-ink/60 dark:text-white/60">
                            {formatDate(learner.last_activity)}
                          </td>
                        </tr>
                      ))}
                      {!learners.length ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-5 py-8 text-center font-bold text-ink/65 dark:text-white/65"
                          >
                            Nessuno studente corrisponde ai filtri.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        SRS
                      </p>
                      <h2 className="mt-1 text-xl font-black">
                        Card più difficili
                      </h2>
                    </div>
                    <Target className="h-6 w-6 text-amber-600" />
                  </div>
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
                          <h3 className="mt-1 font-black text-ink dark:text-white">
                            {card.display_target}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">
                            {number(card.review_count)} ripassi ·{" "}
                            {number(card.learner_count)} studenti ·{" "}
                            {number(card.incorrect_count)} errori
                          </p>
                        </div>
                        <PercentBar
                          value={card.difficulty_rate}
                          tone="bg-amber-500"
                        />
                      </article>
                    ))}
                    {!(data.difficult_cards || []).length ? (
                      <p className="py-6 text-sm font-bold text-ink/65 dark:text-white/65">
                        Servono almeno due ripassi per individuare una card
                        difficile.
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        Exercise Builder
                      </p>
                      <h2 className="mt-1 text-xl font-black">
                        Prestazioni esercizi
                      </h2>
                    </div>
                    <Link
                      to="/admin/content/exercises/results"
                      className="text-xs font-black text-violet-700 underline dark:text-violet-300"
                    >
                      Apri risultati
                    </Link>
                  </div>
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
                          <h3 className="mt-1 font-black text-ink dark:text-white">
                            {exercise.exercise_title || "Esercizio"}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">
                            {number(exercise.attempt_count)} invii ·{" "}
                            {number(exercise.learner_count)} studenti · media{" "}
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
                      <p className="py-6 text-sm font-bold text-ink/65 dark:text-white/65">
                        Nessun esercizio inviato nel periodo.
                      </p>
                    ) : null}
                  </div>
                </section>
              </div>

              <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-7">
                <div className="flex items-end justify-between gap-4">
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
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                          <h3 className="mt-1 font-black text-ink dark:text-white">
                            {item.label}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-ink/60 dark:text-white/60">
                            {item.primary_skill} · {number(item.learner_count)}{" "}
                            studenti · {number(item.error_count, 1)} errori
                          </p>
                        </div>
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-300/10 dark:text-cyan-200">
                          {number(item.error_rate, 1)}%
                        </span>
                      </div>
                    </article>
                  ))}
                  {!(data.diagnostics || []).length ? (
                    <p className="text-sm font-bold text-ink/65 dark:text-white/65">
                      Nessuna diagnostica disponibile nel periodo.
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
