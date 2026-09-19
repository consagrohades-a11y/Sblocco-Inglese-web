import React, { useEffect, useMemo, useState } from 'react';
import { FileJson2, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import StudioQuickAssignPanel from '../components/admin/exercise-studio/StudioQuickAssignPanel.jsx';
import {
  archiveStudioDraft,
  listStudioDrafts,
} from '../lib/exerciseStudioDraftApi.js';

const STATUS_OPTIONS = [
  ['all', 'All'],
  ['draft', 'Drafts'],
  ['published', 'Published'],
  ['archived', 'Archived'],
];

function statusClass(status) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200';
  if (status === 'archived') return 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/60';
  return 'bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100';
}

function originLabel(origin) {
  if (origin === 'ai_import') return 'AI / JSON import';
  if (origin === 'duplicate') return 'Duplicated';
  return 'Manual';
}

function updatedLabel(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function AdminExerciseBuilderLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [assignItem, setAssignItem] = useState(null);
  const [archivingId, setArchivingId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setItems(await listStudioDrafts());
    } catch (nextError) {
      setError(nextError.message || 'Could not load the Learning Studio library.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return items.filter((item) => {
      if (status !== 'all' && item.status !== status) return false;
      if (!needle) return true;
      const haystack = [
        item.internal_title,
        item.learner_title,
        item.topic,
        item.level,
        item.activity_type,
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return haystack.includes(needle);
    });
  }, [items, search, status]);

  const counts = useMemo(() => ({
    all: items.length,
    draft: items.filter((item) => item.status === 'draft').length,
    published: items.filter((item) => item.status === 'published').length,
    archived: items.filter((item) => item.status === 'archived').length,
  }), [items]);

  async function archive(item) {
    if (archivingId) return;
    setArchivingId(item.id);
    setError('');
    try {
      await archiveStudioDraft(item.id);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: 'archived' } : row));
      setNotice(`${item.internal_title || 'Activity'} archived.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not archive this activity.');
    } finally {
      setArchivingId('');
    }
  }

  return (
    <>
      <SEO
        title="Learning Studio Library | Sblocco Inglese"
        description="Search, edit, publish and assign Sblocco learning activities."
      />

      <section className="min-h-screen bg-[#f7f3eb] py-8 dark:bg-surface-950 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <header className="overflow-hidden rounded-[2rem] border border-ink/10 bg-[#fbf8f1] shadow-sm dark:border-white/10 dark:bg-white/[0.025]">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">Sblocco Learning Studio</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-ink dark:text-white sm:text-5xl">Your learning library</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">
                  Manual activities and AI imports become the same editable Studio document. Draft freely; only published content has to be technically complete.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to="/admin/content/exercises/studio?import=1" className="focus-ring inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-4 py-2.5 text-xs font-black text-orange-900 dark:border-orange-300/30 dark:bg-orange-300/[0.07] dark:text-orange-100">
                  <FileJson2 className="h-4 w-4" /> Import JSON
                </Link>
                <Link to="/admin/content/exercises/studio" className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-black text-white shadow-sm dark:bg-orange-400 dark:text-surface-950">
                  <Plus className="h-4 w-4" /> New activity
                </Link>
              </div>
            </div>

            <div className="border-t border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.025] sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-0 flex-1 lg:max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 dark:text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, topic, level..."
                    className="focus-ring w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatus(value)}
                      className={`focus-ring rounded-full px-3 py-2 text-xs font-black transition ${
                        status === value
                          ? 'bg-ink text-white dark:bg-orange-400 dark:text-surface-950'
                          : 'bg-linen text-ink/60 hover:text-ink dark:bg-white/[0.06] dark:text-white/60 dark:hover:text-white'
                      }`}
                    >
                      {label} · {counts[value]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}
          {notice ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">{notice}</div> : null}

          {loading ? (
            <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/55 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">Loading Studio library...</div>
          ) : null}

          {!loading && filtered.length === 0 ? (
            <div className="mt-6 grid min-h-72 place-items-center rounded-[2rem] border border-dashed border-ink/15 bg-white/60 p-8 text-center dark:border-white/15 dark:bg-white/[0.025]">
              <div className="max-w-md">
                <h2 className="text-2xl font-black text-ink dark:text-white">{items.length ? 'Nothing matches this filter.' : 'The library is clean and empty.'}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink/55 dark:text-white/55">
                  {items.length ? 'Try another search or status.' : 'Create the first curated activity manually or import a lesson generated with the Sblocco AI authoring kit.'}
                </p>
                {!items.length ? (
                  <Link to="/admin/content/exercises/studio" className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white">
                    <Plus className="h-4 w-4" /> Create first activity
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && filtered.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <article key={item.id} className="flex min-h-64 flex-col rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide ${statusClass(item.status)}`}>{item.status}</span>
                    <span className="rounded-full bg-linen px-2.5 py-1 text-[0.65rem] font-black text-ink/55 dark:bg-white/[0.06] dark:text-white/55">{item.level}</span>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[0.65rem] font-black text-orange-800 dark:bg-orange-300/[0.07] dark:text-orange-100">{originLabel(item.origin)}</span>
                  </div>

                  <div className="mt-4 min-w-0 flex-1">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">{item.activity_type?.replaceAll('_', ' ') || 'activity'}</p>
                    <h2 className="mt-1 text-xl font-black leading-tight text-ink dark:text-white">{item.internal_title || 'Untitled activity'}</h2>
                    {item.learner_title ? <p className="mt-2 text-sm font-bold text-ink/65 dark:text-white/65">{item.learner_title}</p> : null}
                    <p className="mt-3 text-xs font-semibold text-ink/45 dark:text-white/45">{item.topic || 'Topic not set'}{item.updated_at ? ` · Updated ${updatedLabel(item.updated_at)}` : ''}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/10 pt-4 dark:border-white/10">
                    <Link to={`/admin/content/exercises/studio?draft=${item.id}`} className="focus-ring rounded-full bg-ink px-3.5 py-2 text-xs font-black text-white dark:bg-orange-400 dark:text-surface-950">Edit</Link>
                    <Link to={`/admin/content/exercises/studio?draft=${item.id}`} target="_blank" rel="noreferrer" className="focus-ring rounded-full border border-ink/10 px-3.5 py-2 text-xs font-black text-ink dark:border-white/10 dark:text-white">Preview</Link>
                    {item.status === 'published' && item.exercise_id ? (
                      <button type="button" onClick={() => setAssignItem(item)} className="focus-ring rounded-full border border-orange-300 bg-orange-50 px-3.5 py-2 text-xs font-black text-orange-900 dark:border-orange-300/30 dark:bg-orange-300/[0.07] dark:text-orange-100">Assign</button>
                    ) : null}
                    {item.status !== 'archived' ? (
                      <button type="button" disabled={archivingId === item.id} onClick={() => archive(item)} className="focus-ring ml-auto rounded-full px-3 py-2 text-xs font-black text-red-700 disabled:opacity-30 dark:text-red-200">Archive</button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {assignItem?.exercise_id ? (
        <StudioQuickAssignPanel
          exerciseId={assignItem.exercise_id}
          activityTitle={assignItem.learner_title || assignItem.internal_title || 'Sblocco activity'}
          onClose={() => setAssignItem(null)}
          onAssigned={({ learner }) => {
            setNotice(`Assigned ${assignItem.internal_title || 'activity'} to ${learner?.display_name || learner?.email || 'learner'}.`);
          }}
        />
      ) : null}
    </>
  );
}
