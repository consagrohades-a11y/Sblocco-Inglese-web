import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { loadExerciseBuilderCatalogForAdmin, setExerciseBuilderCatalogStatus } from '../lib/exercisePlayerApi.js';

const statusLabels = {
  draft: 'Bozza',
  in_review: 'Da revisionare',
  approved: 'Approvato',
  published: 'Pubblicato',
  archived: 'Archiviato',
};

function statusClass(status) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200';
  if (status === 'approved') return 'bg-cyan-100 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-200';
  if (status === 'archived') return 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/60';
  if (status === 'in_review') return 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200';
  return 'bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200';
}

export default function AdminExerciseBuilderLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setItems(await loadExerciseBuilderCatalogForAdmin());
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare la libreria.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(item, status) {
    setBusyId(item.id);
    setError('');
    setSuccess('');
    try {
      await setExerciseBuilderCatalogStatus('exercise', item.id, status);
      setSuccess(status === 'published' ? `${item.publicId} è ora assegnabile.` : `${item.publicId} aggiornato: ${statusLabels[status]}.`);
      await load();
    } catch (statusError) {
      setError(statusError.message || 'Non è stato possibile aggiornare lo stato.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <>
      <SEO title="Libreria Exercise Builder | Sblocco Inglese" description="Approva, pubblica e archivia gli esercizi personalizzati." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-surface-900 sm:p-8">
            <span className="eyebrow">Exercise Builder</span>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div><h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">Libreria esercizi</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65 dark:text-white/65">Gli esercizi importati entrano come bozze. Pubblicandone uno vengono approvate anche le versioni di domande e pool che utilizza, senza creare legami con English Foundations.</p></div>
              <div className="flex flex-wrap gap-2"><Link to="/admin/content/exercises" className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-black text-ink dark:border-white/20 dark:bg-white/10 dark:text-white">Importa JSON</Link><Link to="/admin/content/exercises/review" className="rounded-full bg-ink px-4 py-2.5 text-sm font-black text-white dark:bg-emerald-300 dark:text-surface-950">Revisioni</Link></div>
            </div>
          </header>

          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950">{error}</div> : null}
          {success ? <div className="mt-5 border-l-4 border-moss bg-mint/30 p-4 text-sm font-bold text-ink dark:bg-emerald-400/10 dark:text-emerald-100">{success}</div> : null}
          {loading ? <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/60 dark:border-white/10 dark:bg-surface-900 dark:text-white/60">Caricamento libreria...</div> : null}

          {!loading ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-surface-900">
              <div className="hidden grid-cols-[7rem_minmax(0,1.4fr)_8rem_9rem_minmax(18rem,1fr)] gap-4 border-b border-ink/10 bg-linen/45 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink/65 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 lg:grid">
                <span>ID</span><span>Esercizio</span><span>Livello</span><span>Stato</span><span>Azioni</span>
              </div>
              {items.length === 0 ? <p className="p-7 text-sm leading-6 text-ink/60 dark:text-white/60">La libreria è vuota. Importa e promuovi un esercizio dalla coda di revisione.</p> : null}
              <div className="divide-y divide-ink/10 dark:divide-white/10">
                {items.map((item) => (
                  <article key={item.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[7rem_minmax(0,1.4fr)_8rem_9rem_minmax(18rem,1fr)] lg:items-center">
                    <p className="text-sm font-black text-moss dark:text-emerald-300">{item.publicId}</p>
                    <div><h2 className="text-base font-black text-ink dark:text-white">{item.title}</h2><p className="mt-1 text-sm leading-5 text-ink/65 dark:text-white/65">{item.description || item.topic}</p><p className="mt-1 text-xs font-bold text-ink/60 dark:text-white/60">Versione {String(item.versionId || '').slice(0, 8)} · {item.estimated_minutes ? `${item.estimated_minutes} min` : 'durata non indicata'}</p></div>
                    <p className="text-sm font-black text-ink/70 dark:text-white/70">{item.level}</p>
                    <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${statusClass(item.status)}`}>{statusLabels[item.status] || item.status}</span>
                    <div className="flex flex-wrap gap-2">
                      {item.status !== 'approved' && item.status !== 'published' ? <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item, 'approved')} className="rounded-full border border-ink/15 bg-white px-3.5 py-2 text-xs font-black text-ink disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:text-white">Approva</button> : null}
                      {item.status !== 'published' ? <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item, 'published')} className="rounded-full bg-ink px-3.5 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-emerald-300 dark:text-surface-950">Pubblica</button> : null}
                      {item.status === 'published' ? <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item, 'approved')} className="rounded-full border border-ink/15 bg-white px-3.5 py-2 text-xs font-black text-ink disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:text-white">Ritira</button> : null}
                      {item.status !== 'archived' ? <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item, 'archived')} className="rounded-full px-3.5 py-2 text-xs font-black text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-300/10">Archivia</button> : <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item, 'draft')} className="rounded-full border border-ink/15 bg-white px-3.5 py-2 text-xs font-black text-ink disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:text-white">Ripristina bozza</button>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
