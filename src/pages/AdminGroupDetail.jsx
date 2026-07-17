import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import {
  createEmptyGroupAssignmentBatch,
  loadLearnerGroup,
  replaceLearnerGroupMembers,
  saveLearnerGroup,
} from "../lib/learnerGroupsApi.js";

const fieldClass =
  "mt-2 min-w-0 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-[#101a17] dark:text-white";
const statuses = {
  draft: "Bozza",
  active: "Attivo",
  completed: "Completato",
  archived: "Archiviato",
};
const types = {
  cohort: "Cohort",
  company: "Azienda",
  class: "Classe",
  private_segment: "Segmento privato",
  other: "Altro",
};

function dateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export default function AdminGroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [batch, setBatch] = useState({
    title: "",
    learnerNote: "",
    adminNote: "",
    required: true,
    deadline: "",
    estimatedMinutes: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [memberQuery, setMemberQuery] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const next = await loadLearnerGroup(groupId);
      setDetail(next);
      setForm({
        name: next.group.name || "",
        slug: next.group.slug || "",
        description: next.group.description || "",
        status: next.group.status || "draft",
        group_type: next.group.group_type || "cohort",
        starts_at: dateInput(next.group.starts_at),
        ends_at: dateInput(next.group.ends_at),
      });
      setSelectedMembers(
        (next.members || [])
          .filter((member) => member.membership_status === "active")
          .map((member) => member.learner_id),
      );
    } catch (loadError) {
      setError(loadError.message || "Impossibile caricare il gruppo.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [groupId]);

  const learners = useMemo(
    () =>
      (detail?.available_learners || []).filter((learner) => {
        const term = memberQuery.trim().toLowerCase();
        return (
          !term ||
          [learner.display_name, learner.email].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(term),
          )
        );
      }),
    [detail?.available_learners, memberQuery],
  );
  const activeMemberCount = (detail?.members || []).filter(
    (member) =>
      member.membership_status === "active" &&
      member.profile_status === "active",
  ).length;

  function toggleMember(id) {
    setSelectedMembers((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function saveMetadata() {
    setBusy("metadata");
    setError("");
    setSuccess("");
    try {
      await saveLearnerGroup(groupId, form);
      setSuccess("Dati del gruppo aggiornati.");
      await refresh();
    } catch (saveError) {
      setError(saveError.message || "Impossibile salvare il gruppo.");
    } finally {
      setBusy("");
    }
  }

  async function saveMembers() {
    setBusy("members");
    setError("");
    setSuccess("");
    try {
      const count = await replaceLearnerGroupMembers(groupId, selectedMembers);
      setSuccess(`${count} membri attivi salvati.`);
      await refresh();
    } catch (saveError) {
      setError(saveError.message || "Impossibile salvare i membri.");
    } finally {
      setBusy("");
    }
  }

  async function createBatch() {
    if (!batch.title.trim()) {
      setError("Inserisci il titolo dell’assegnazione.");
      return;
    }
    setBusy("batch");
    setError("");
    setSuccess("");
    try {
      const result = await createEmptyGroupAssignmentBatch({
        groupId,
        title: batch.title.trim(),
        learnerNote: batch.learnerNote.trim(),
        adminNote: batch.adminNote.trim(),
        required: batch.required,
        deadlineAt: batch.deadline
          ? new Date(batch.deadline).toISOString()
          : null,
        estimatedMinutes: batch.estimatedMinutes
          ? Number(batch.estimatedMinutes)
          : null,
      });
      navigate(
        `/admin/learners/${result.editor_learner_id}/assignments/${result.editor_assignment_id}`,
      );
    } catch (saveError) {
      setError(saveError.message || "Impossibile creare il batch.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <SEO
        title="Dettaglio gruppo | Admin | Sblocco Inglese"
        description="Membri, attività e avanzamento del gruppo."
      />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="eyebrow">
                  {detail?.group?.public_id || "Gruppo"}
                </span>
                <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                  {detail?.group?.name || "Caricamento..."}
                </h1>
                <p className="mt-3 text-sm text-ink/60 dark:text-white/60">
                  Membri, assegnazioni individuali e feedback restano separati
                  per ogni studente.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin/groups"
                  className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-black dark:border-white/20"
                >
                  Tutti i gruppi
                </Link>
                <Link
                  to={`/admin/assignments?group=${groupId}`}
                  className="rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-[#102019]"
                >
                  Assegnazioni gruppo
                </Link>
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
          {loading || !form ? (
            <p className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold dark:border-white/10 dark:bg-[#16211e]">
              Caricamento...
            </p>
          ) : (
            <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
              <section className="min-w-0 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e]">
                <p className="text-xs font-black uppercase tracking-wide text-moss">
                  Identità
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-black">
                    Nome
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black">
                    Slug
                    <input
                      value={form.slug}
                      onChange={(event) =>
                        setForm({ ...form, slug: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black">
                    Tipo
                    <select
                      value={form.group_type}
                      onChange={(event) =>
                        setForm({ ...form, group_type: event.target.value })
                      }
                      className={fieldClass}
                    >
                      {Object.entries(types).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-black">
                    Stato
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                      className={fieldClass}
                    >
                      {Object.entries(statuses).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-black">
                    Inizio
                    <input
                      type="date"
                      value={form.starts_at}
                      onChange={(event) =>
                        setForm({ ...form, starts_at: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black">
                    Fine
                    <input
                      type="date"
                      value={form.ends_at}
                      onChange={(event) =>
                        setForm({ ...form, ends_at: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black sm:col-span-2">
                    Descrizione
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={busy === "metadata"}
                  onClick={saveMetadata}
                  className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white disabled:opacity-50 dark:bg-emerald-300 dark:text-[#102019]"
                >
                  Salva gruppo
                </button>
              </section>
              <section className="min-w-0 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#16211e]">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-moss">
                      Membri
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {selectedMembers.length} attivi
                    </h2>
                  </div>
                  <button
                    type="button"
                    disabled={busy === "members"}
                    onClick={saveMembers}
                    className="rounded-full bg-moss px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                  >
                    Salva membri
                  </button>
                </div>
                <input
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Cerca studente"
                  className={fieldClass}
                />
                <div className="mt-3 max-h-80 divide-y divide-ink/10 overflow-y-auto rounded-xl border border-ink/10 dark:divide-white/10 dark:border-white/10">
                  {learners.map((learner) => (
                    <label
                      key={learner.id}
                      className="flex items-center gap-3 p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(learner.id)}
                        onChange={() => toggleMember(learner.id)}
                      />
                      <span>
                        <span className="block font-black">
                          {learner.display_name || "Nome non impostato"}
                        </span>
                        <span className="text-xs font-semibold text-ink/60 dark:text-white/60">
                          {learner.email}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
              <section className="min-w-0 rounded-2xl border border-violet-200 bg-violet-50/40 p-5 xl:col-span-2 dark:border-violet-300/20 dark:bg-violet-400/[0.05]">
                <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">
                  Nuova assegnazione di gruppo
                </p>
                <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">
                  Crea il batch e configura una sola assegnazione nel composer.
                  Al salvataggio, contenuti e impostazioni vengono sincronizzati
                  sulle assegnazioni individuali di tutti i membri.
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <label className="text-xs font-black">
                    Titolo
                    <input
                      value={batch.title}
                      onChange={(event) =>
                        setBatch({ ...batch, title: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black">
                    Scadenza
                    <input
                      type="datetime-local"
                      value={batch.deadline}
                      onChange={(event) =>
                        setBatch({ ...batch, deadline: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black">
                    Minuti stimati
                    <input
                      type="number"
                      min="1"
                      value={batch.estimatedMinutes}
                      onChange={(event) =>
                        setBatch({
                          ...batch,
                          estimatedMinutes: event.target.value,
                        })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <div className="grid gap-2 pt-6 text-xs font-black">
                    <label>
                      <input
                        type="checkbox"
                        checked={batch.required}
                        onChange={(event) =>
                          setBatch({ ...batch, required: event.target.checked })
                        }
                      />{" "}
                      Obbligatoria
                    </label>
                  </div>
                  <label className="text-xs font-black lg:col-span-2">
                    Messaggio studente
                    <textarea
                      rows={3}
                      value={batch.learnerNote}
                      onChange={(event) =>
                        setBatch({ ...batch, learnerNote: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs font-black">
                    Nota admin
                    <textarea
                      rows={3}
                      value={batch.adminNote}
                      onChange={(event) =>
                        setBatch({ ...batch, adminNote: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={busy === "batch" || !activeMemberCount}
                  onClick={createBatch}
                  className="mt-5 rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
                >
                  {busy === "batch"
                    ? "Creazione..."
                    : `Crea e configura per ${activeMemberCount} studenti`}
                </button>
              </section>
              <section className="min-w-0 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm xl:col-span-2 dark:border-white/10 dark:bg-[#16211e]">
                <p className="text-xs font-black uppercase tracking-wide text-moss">
                  Batch e avanzamento
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(detail.batches || []).map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-ink/10 p-4 dark:border-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-linen px-2 py-1 text-xs font-black dark:bg-white/10">
                          {statuses[item.status] || item.status}
                        </span>
                        <span className="text-xs font-bold text-ink/60 dark:text-white/60">
                          {item.completed_count}/{item.assignment_count}
                        </span>
                      </div>
                      <h3 className="mt-3 font-black">{item.title}</h3>
                      <p className="mt-2 text-xs font-semibold text-ink/65 dark:text-white/65">
                        {item.deadline_at
                          ? `Scadenza ${new Date(item.deadline_at).toLocaleString("it-IT")}`
                          : "Nessuna scadenza"}
                      </p>
                    </article>
                  ))}
                  {!(detail.batches || []).length ? (
                    <p className="text-sm font-bold text-ink/65 dark:text-white/65">
                      Nessun batch creato.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
