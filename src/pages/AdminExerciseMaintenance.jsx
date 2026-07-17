import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ExternalLink, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import {
  deleteExerciseBuilderImportBatch,
  loadExerciseBuilderReviewQueue,
} from '../lib/exerciseBuilderApi.js';
import {
  deleteUnusedExerciseBuilderExercise,
  loadExerciseBuilderCatalogForAdmin,
  setExerciseBuilderCatalogStatus,
} from '../lib/exercisePlayerApi.js';

const statusLabels = {
  draft: 'Bozza',
  in_review: 'Da revisionare',
  approved: 'Approvato',
  published: 'Pubblicato',
  archived: 'Archiviato',
};

function formatDate(value) {
  if (!value) return 'Data non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export default function AdminExerciseMaintenance() {
  const [batches, setBatches] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [batchData, exerciseData] = await Promise.all([
        loadExerciseBuilderReviewQueue(),
        loadExerciseBuilderCatalogForAdmin(),
      ]);
      setBatches(batchData);
      setExercises(exerciseData);
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare gli elementi Exercise Builder.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredExercises = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return exercises;
    return exercises.filter((item) => [item.publicId, item.title, item.topic, item.status]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)));
  }, [exercises, search]);

  async function removeBatch(batch) {
    const promoted = (batch.items || []).filter((item) => item.promoted_entity_id).length;
    const message = promoted
      ? `Eliminare il batch “${batch.source_name}”? ${promoted} elementi sono già stati promossi e resteranno nel catalogo.`
      : `Eliminare definitivamente il batch “${batch.source_name}” e tutti i suoi elementi di staging?`;
    if (!window.confirm(message)) return;

    setBusyKey(`batch:${batch.id}`);
    setError('');
    setSuccess('');
    try {
      const result = await deleteExerciseBuilderImportBatch(batch.id);
      setSuccess(`Batch eliminato. ${result.deleted_items || 0} elementi di staging rimossi.`);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || 'Non è stato possibile eliminare il batch.');
    } finally {
      setBusyKey('');
    }
  }

  async function removeExercise(item) {
    if (!window.confirm(`Eliminare definitivamente ${item.publicId}, “${item.title}”? L’operazione sarà consentita solo se non è mai stato pubblicato, assegnato o tentato.`)) return;
    setBusyKey(`exercise:${item.id}`);
    setError('');
    setSuccess('');
    try {
      await deleteUnusedExerciseBuilderExercise(item.id);
      setSuccess(`${item.publicId} eliminato definitivamente.`);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || 'Questo esercizio ha uno storico. Archivialo invece di eliminarlo.');
    } finally {
      setBusyKey('');
    }
  }

  async function archiveExercise(item) {
    if (!window.confirm(`Archiviare ${item.publicId}? Non sarà più disponibile per nuove assegnazioni.`)) return;
    setBusyKey(`exercise:${item.id}`);
    setError('');
    setSuccess('');
    try {
      await setExerciseBuilderCatalogStatus('exercise', item.id, 'archived');
      setSuccess(`${item.publicId} archiviato.`);
      await load();
    } catch (archiveError) {
      setError(archiveError.message || 'Non è stato possibile archiviare l’esercizio.');
    } finally {
      setBusyKey('');
    }
  }

  return (
    <>
      <SEO title="Pulizia Exercise Builder | Sblocco Inglese" description="Elimina batch di importazione ed esercizi inutilizzati in sicurezza." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-surface-900 sm:p-8">
            <span className="eyebrow">Exercise Builder</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Pulizia e archivio</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Elimina i batch di staging che non servono più. Gli esercizi possono essere cancellati definitivamente soltanto prima di qualsiasi pubblicazione, assegnazione o tentativo.</p>
              </div>
              <button type="button" onClick={load} disabled={loading || Boolean(busyKey)} className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:text-white">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Aggiorna
              </button>
            </div>
          </header>

          {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-950 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}
          {success ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-950 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-100">{success}</div> : null}

          <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-wide text-moss dark:text-emerald-300">Batch di importazione</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{batches.length} batch</h2></div>
              <Link to="/admin/content/exercises/review" className="text-sm font-black text-moss underline dark:text-emerald-300">Apri coda di revisione</Link>
            </div>
            <div className="mt-5 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">
              {batches.map((batch) => {
                const promoted = (batch.items || []).filter((item) => item.promoted_entity_id).length;
                return <article key={batch.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-ink dark:text-white">{batch.source_name}</p><p className="mt-1 text-xs font-semibold text-ink/65 dark:text-white/65">{formatDate(batch.created_at)} · {batch.items?.length || 0} elementi · {promoted} promossi</p></div><button type="button" disabled={busyKey === `batch:${batch.id}`} onClick={() => removeBatch(batch)} className="inline-flex self-start items-center gap-2 rounded-full border border-red-200 px-3.5 py-2 text-xs font-black text-red-700 disabled:opacity-50 dark:border-red-300/25 dark:text-red-300">{busyKey === `batch:${batch.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Elimina batch</button></article>;
              })}
              {!loading && batches.length === 0 ? <p className="py-6 text-sm text-ink/65 dark:text-white/65">Nessun batch presente.</p> : null}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Esercizi</p><h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Cancellazione sicura</h2></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca ID, titolo, topic o stato" className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-moss dark:border-white/20 dark:bg-surface-800 dark:text-white md:max-w-sm" /></div>
            <div className="mt-5 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">
              {filteredExercises.map((item) => {
                const canDelete = !item.publishedAt && !['published'].includes(item.status);
                return <article key={item.id} className="grid gap-4 py-4 lg:grid-cols-[7rem_minmax(0,1fr)_8rem_auto] lg:items-center"><p className="text-sm font-black text-moss dark:text-emerald-300">{item.publicId}</p><div><p className="text-sm font-black text-ink dark:text-white">{item.title}</p><p className="mt-1 text-xs font-semibold text-ink/65 dark:text-white/65">{item.topic || 'Senza topic'} · {statusLabels[item.status] || item.status}</p></div><p className="text-xs font-black text-ink/65 dark:text-white/65">{item.level}</p><div className="flex flex-wrap gap-2 lg:justify-end"><Link to={`/admin/content/exercises/composer?exerciseId=${encodeURIComponent(item.id)}`} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-2 text-xs font-black text-ink dark:border-white/20 dark:text-white"><ExternalLink className="h-3.5 w-3.5" />Composer</Link>{item.status !== 'archived' ? <button type="button" disabled={busyKey === `exercise:${item.id}`} onClick={() => archiveExercise(item)} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-2 text-xs font-black text-ink disabled:opacity-50 dark:border-white/20 dark:text-white"><Archive className="h-3.5 w-3.5" />Archivia</button> : null}{canDelete ? <button type="button" disabled={busyKey === `exercise:${item.id}`} onClick={() => removeExercise(item)} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3.5 py-2 text-xs font-black text-red-700 disabled:opacity-50 dark:border-red-300/25 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" />Elimina</button> : null}</div></article>;
              })}
              {!loading && filteredExercises.length === 0 ? <p className="py-6 text-sm text-ink/65 dark:text-white/65">Nessun esercizio corrispondente.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
