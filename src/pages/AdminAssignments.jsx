import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  FilePenLine,
  Filter,
  Search,
  Send,
  UserRound,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient.js';
import { loadAssignmentGroupLinks } from '../lib/learnerGroupsApi.js';

const statusLabels = {
  draft: 'Bozza',
  published: 'Attiva',
  completed: 'Completata',
  archived: 'Archiviata',
};

const statusClasses = {
  draft: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-100',
  completed: 'border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100',
  archived: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/60',
};

const resourceTypeLabels = {
  grammar_unit: 'Grammatica',
  trainer: 'Trainer',
  practice_session: 'Pratica mirata',
  custom_exercise: 'Esercizio',
};

function formatDate(value, fallback = 'Nessuna') {
  if (!value) return fallback;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function isOverdue(assignment) {
  return Boolean(
    assignment.deadline_at
      && new Date(assignment.deadline_at) < new Date()
      && !['completed', 'archived'].includes(assignment.status),
  );
}

function AssignmentCard({ assignment, busy, onStatusChange }) {
  const overdue = isOverdue(assignment);
  const resources = (assignment.resource_types || []).map((type) => resourceTypeLabels[type] || type);
  if (Number(assignment.study_item_count || 0) > 0) resources.push(`${assignment.study_item_count} card SRS`);

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusClasses[assignment.status] || statusClasses.draft}`}>
              {statusLabels[assignment.status] || assignment.status}
            </span>
            {overdue ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-800 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">
                <CircleAlert className="h-3.5 w-3.5" />Scaduta
              </span>
            ) : null}
            {!assignment.has_content ? (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-800 dark:border-violet-300/25 dark:bg-violet-300/10 dark:text-violet-100">
                Senza contenuti
              </span>
            ) : null}
            {assignment.group_name ? <Link to={`/admin/groups/${assignment.group_id}`} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-800 dark:border-violet-300/25 dark:bg-violet-300/10 dark:text-violet-100">{assignment.group_name}</Link> : null}
          </div>

          <h2 className="mt-3 text-xl font-black text-ink dark:text-white">{assignment.title}</h2>
          <Link
            to={`/admin/learners/${assignment.learner_id}`}
            className="mt-2 inline-flex items-center gap-2 text-sm font-black text-moss underline dark:text-emerald-300"
          >
            <UserRound className="h-4 w-4" />
            {assignment.learner_name}
            {assignment.learner_email ? <span className="font-semibold text-ink/60 no-underline dark:text-white/60">{assignment.learner_email}</span> : null}
          </Link>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-ink/60 dark:text-white/60">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-linen px-3 py-1.5 dark:bg-white/10">
              <CalendarClock className="h-3.5 w-3.5" />Scadenza: {formatDate(assignment.deadline_at)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-linen px-3 py-1.5 dark:bg-white/10">
              <Clock3 className="h-3.5 w-3.5" />{assignment.estimated_minutes ? `${assignment.estimated_minutes} min` : 'Tempo non indicato'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-linen px-3 py-1.5 dark:bg-white/10">
              <ClipboardList className="h-3.5 w-3.5" />{Number(assignment.resource_count || 0)} risorse
            </span>
            {Number(assignment.exercise_attempt_count || 0) > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eee8f8] px-3 py-1.5 text-[#745b91] dark:bg-violet-300/10 dark:text-violet-200">
                <BookOpenCheck className="h-3.5 w-3.5" />
                {assignment.submitted_attempt_count}/{assignment.exercise_attempt_count} tentativi inviati
                {assignment.latest_score !== null ? ` · ultimo ${Math.round(Number(assignment.latest_score))}%` : ''}
              </span>
            ) : null}
          </div>

          {resources.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {resources.map((resource) => (
                <span key={resource} className="rounded-full border border-ink/10 px-2.5 py-1 text-[0.7rem] font-black text-ink/65 dark:border-white/10 dark:text-white/65">
                  {resource}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:w-64 xl:grid-cols-1">
          <Link
            to={`/admin/learners/${assignment.learner_id}/assignments/${assignment.id}/content`}
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white transition hover:bg-moss dark:bg-emerald-300 dark:text-surface-950"
          >
            <FilePenLine className="h-4 w-4" />Apri e modifica
          </Link>

          {assignment.status !== 'published' ? (
            <button
              type="button"
              disabled={busy || !assignment.has_content}
              onClick={() => onStatusChange(assignment, 'published')}
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-300/30 dark:bg-emerald-300/10 dark:text-emerald-100"
            >
              <Send className="h-3.5 w-3.5" />Pubblica
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatusChange(assignment, 'draft')}
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900 disabled:opacity-40 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100"
            >
              Riporta in bozza
            </button>
          )}

          {assignment.status !== 'completed' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatusChange(assignment, 'completed')}
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-900 disabled:opacity-40 dark:border-cyan-300/30 dark:bg-cyan-300/10 dark:text-cyan-100"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />Segna completata
            </button>
          ) : null}

          {assignment.status !== 'archived' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatusChange(assignment, 'archived')}
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/60"
            >
              <Archive className="h-3.5 w-3.5" />Archivia
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function AdminAssignments() {
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [contentFilter, setContentFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState(searchParams.get('group') || 'all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadAssignments() {
    setLoading(true);
    setError('');
    const [{ data, error: queryError }, groupLinks] = await Promise.all([
      supabase.rpc('admin_list_assignments_overview'),
      loadAssignmentGroupLinks().catch(() => []),
    ]);
    if (queryError) {
      setAssignments([]);
      setError(`Non è stato possibile caricare le assegnazioni${queryError.message ? `: ${queryError.message}` : '.'}`);
    } else {
      const links = new Map(groupLinks.map((link) => [link.assignment_id, link]));
      setAssignments((data || []).map((assignment) => ({ ...assignment, ...(links.get(assignment.id) || {}) })));
    }
    setLoading(false);
  }

  useEffect(() => { loadAssignments(); }, []);

  const counts = useMemo(() => assignments.reduce((result, assignment) => ({
    ...result,
    [assignment.status]: (result[assignment.status] || 0) + 1,
    overdue: result.overdue + (isOverdue(assignment) ? 1 : 0),
  }), { draft: 0, published: 0, completed: 0, archived: 0, overdue: 0 }), [assignments]);
  const groups = useMemo(() => Array.from(new Map(assignments.filter((assignment) => assignment.group_id).map((assignment) => [assignment.group_id, assignment.group_name])).entries()), [assignments]);

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assignments.filter((assignment) => {
      if (statusFilter === 'active' && !['published', 'draft'].includes(assignment.status)) return false;
      if (statusFilter === 'overdue' && !isOverdue(assignment)) return false;
      if (!['all', 'active', 'overdue'].includes(statusFilter) && assignment.status !== statusFilter) return false;
      if (contentFilter === 'with_content' && !assignment.has_content) return false;
      if (contentFilter === 'without_content' && assignment.has_content) return false;
      if (contentFilter === 'exercise' && !(assignment.resource_types || []).includes('custom_exercise')) return false;
      if (contentFilter === 'practice' && !(assignment.resource_types || []).includes('practice_session')) return false;
      if (groupFilter !== 'all' && assignment.group_id !== groupFilter) return false;
      if (!term) return true;
      return [assignment.title, assignment.learner_name, assignment.learner_email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [assignments, search, statusFilter, contentFilter, groupFilter]);

  async function changeStatus(assignment, nextStatus) {
    setBusyId(assignment.id);
    setError('');
    setSuccess('');
    const { error: updateError } = await supabase.rpc('admin_set_assignment_overview_status', {
      p_assignment_id: assignment.id,
      p_next_status: nextStatus,
    });
    if (updateError) {
      setError(updateError.message || 'Non è stato possibile aggiornare lo stato.');
    } else {
      setSuccess(`${assignment.title}: ${statusLabels[nextStatus]}.`);
      await loadAssignments();
    }
    setBusyId(null);
  }

  return (
    <>
      <SEO title="Assegnazioni | Admin | Sblocco Inglese" description="Gestisci tutte le assegnazioni da una sola pagina." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-surface-900 sm:p-8">
            <span className="eyebrow">Studenti</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Assegnazioni</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">
                  Controlla tutte le attività, apri direttamente l’editor e modifica lo stato senza passare dal profilo di ogni studente.
                </p>
              </div>
              <Link to="/admin/learners" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white hover:bg-moss dark:bg-emerald-300 dark:text-surface-950">
                Scegli uno studente<ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </header>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['published', 'Attive', counts.published],
              ['draft', 'Bozze', counts.draft],
              ['overdue', 'Scadute', counts.overdue],
              ['completed', 'Completate', counts.completed],
              ['archived', 'Archiviate', counts.archived],
            ].map(([value, label, count]) => (
              <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`rounded-xl border p-4 text-left transition ${statusFilter === value ? 'border-moss bg-mint/45 dark:border-emerald-300/35 dark:bg-emerald-300/10' : 'border-ink/10 bg-white hover:border-moss/30 dark:border-white/10 dark:bg-surface-900'}`}>
                <p className="text-2xl font-black text-ink dark:text-white">{count}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink/60 dark:text-white/60">{label}</p>
              </button>
            ))}
          </div>

          <section className="mt-5 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_15rem_14rem_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink/35 dark:text-white/35" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca studente, email o assegnazione" className="w-full rounded-xl border border-ink/15 bg-white py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-moss dark:border-white/20 dark:bg-surface-800 dark:text-white" />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm font-black outline-none focus:border-moss dark:border-white/20 dark:bg-surface-800 dark:text-white">
                <option value="all">Tutti gli stati</option>
                <option value="active">Attive e bozze</option>
                <option value="published">Attive</option>
                <option value="draft">Bozze</option>
                <option value="overdue">Scadute</option>
                <option value="completed">Completate</option>
                <option value="archived">Archiviate</option>
              </select>
              <select value={contentFilter} onChange={(event) => setContentFilter(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm font-black outline-none focus:border-moss dark:border-white/20 dark:bg-surface-800 dark:text-white">
                <option value="all">Tutti i contenuti</option>
                <option value="with_content">Con contenuti</option>
                <option value="without_content">Senza contenuti</option>
                <option value="exercise">Con esercizio</option>
                <option value="practice">Con pratica mirata</option>
              </select>
              <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm font-black outline-none focus:border-moss dark:border-white/20 dark:bg-surface-800 dark:text-white"><option value="all">Tutti i gruppi</option>{groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
              <button type="button" onClick={() => { setSearch(''); setStatusFilter('active'); setContentFilter('all'); setGroupFilter('all'); }} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink/15 px-4 text-sm font-black text-ink dark:border-white/20 dark:text-white">
                <Filter className="h-4 w-4" />Azzera
              </button>
            </div>
          </section>

          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}
          {success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}

          <div className="mt-5 grid gap-4">
            {loading ? <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/60 dark:border-white/10 dark:bg-surface-900 dark:text-white/60">Caricamento assegnazioni...</div> : null}
            {!loading && filteredAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} busy={busyId === assignment.id} onStatusChange={changeStatus} />
            ))}
            {!loading && filteredAssignments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-center dark:border-white/15 dark:bg-surface-900">
                <ClipboardList className="mx-auto h-10 w-10 text-ink/30 dark:text-white/30" />
                <p className="mt-3 text-sm font-black text-ink dark:text-white">Nessuna assegnazione corrisponde ai filtri.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
