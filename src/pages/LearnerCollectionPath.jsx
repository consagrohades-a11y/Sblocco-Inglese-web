import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Clock3, Play, Route } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { loadAssignedCollectionPath } from '../lib/exerciseCollectionsApi.js';

function itemStatus(item) {
  if (item.completed) return { label: 'Completata', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200', icon: CheckCircle2 };
  if (item.review_status === 'reviewed' || Number(item.pending_review || 0) > 0) return { label: 'In valutazione', className: 'bg-violet-100 text-violet-800 dark:bg-violet-300/10 dark:text-violet-200', icon: Clock3 };
  if (item.attempt_id) return { label: 'Da riprendere', className: 'bg-amber-100 text-amber-800 dark:bg-amber-300/10 dark:text-amber-200', icon: Play };
  return { label: 'Da iniziare', className: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/60', icon: Circle };
}

export default function LearnerCollectionPath() {
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId') || '';
  const resourceId = searchParams.get('resourceId') || '';
  const [path, setPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAssignedCollectionPath({ assignmentId, resourceId })
      .then((data) => { if (active) setPath(data); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Non è stato possibile caricare questo percorso.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assignmentId, resourceId]);

  const progress = path?.progress || {};
  const percent = Math.round(Number(progress.progress_percent || 0));
  const returnTo = `/collections?assignmentId=${encodeURIComponent(assignmentId)}&resourceId=${encodeURIComponent(resourceId)}`;

  return (
    <><SEO title={`${path?.title || 'Percorso'} | Sblocco Inglese`} description="Il tuo percorso di esercizi assegnato." /><section className="section-shell py-10 dark:bg-surface-950 lg:py-14"><div className="mx-auto max-w-4xl">
      <Link to={`/assignments/${assignmentId}`} className="inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]"><ArrowLeft className="h-4 w-4" />Torna all’attività</Link>
      {loading ? <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold dark:border-white/10 dark:bg-surface-900">Caricamento percorso...</div> : null}
      {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-900 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}
      {!loading && path ? <>
        <header className="mt-5 overflow-hidden rounded-3xl border border-clay/15 bg-[#fffdf9] shadow-soft dark:border-white/10 dark:bg-surface-900">
          <div className="p-7 sm:p-10"><span className="inline-flex items-center gap-2 rounded-full bg-blush px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-clay dark:bg-coral/10 dark:text-[#f7a98d]"><Route className="h-4 w-4" />Percorso Collection · versione {path.config?.version_number}</span><h1 className="mt-5 text-3xl font-black text-ink dark:text-white sm:text-5xl">{path.title}</h1>{path.description ? <p className="mt-4 max-w-3xl text-base leading-7 text-ink/65 dark:text-white/65">{path.description}</p> : null}<div className="mt-7"><div className="flex items-center justify-between gap-4 text-sm font-black"><span>{progress.completed_items || 0} di {progress.total_items || path.items?.length || 0} tappe</span><span>{percent}%</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-linen dark:bg-white/10"><div className="h-full rounded-full bg-coral transition-all" style={{ width: `${percent}%` }} /></div><p className="mt-3 text-xs font-semibold text-ink/65 dark:text-white/65">{path.config?.completion_rule === 'percentage' ? `Il percorso si completa al ${path.config.required_percent}%.` : 'Completa tutte le tappe nell’ordine che preferisci.'}</p></div></div>
        </header>
        <div className="mt-6 grid gap-4">
          {(path.items || []).map((item, index) => {
            const status = itemStatus(item);
            const StatusIcon = status.icon;
            const destination = `/exercises?assignmentId=${encodeURIComponent(assignmentId)}&resourceId=${encodeURIComponent(item.resource_id)}&returnTo=${encodeURIComponent(returnTo)}`;
            return <article key={item.resource_id} className="rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-butter text-lg font-black text-clay dark:bg-butter/10 dark:text-[#ffd98a]">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${status.className}`}><StatusIcon className="h-3.5 w-3.5" />{status.label}</span>{item.score !== null && item.score !== undefined ? <span className="text-xs font-black text-ink/65 dark:text-white/65">{Math.round(Number(item.score))}%</span> : null}</div><h2 className="mt-2 text-xl font-black text-ink dark:text-white">{item.title}</h2>{item.description ? <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">{item.description}</p> : null}</div><Link to={destination} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-black text-white dark:bg-[#ff8b6c] dark:text-surface-950">{item.attempt_id ? 'Apri' : 'Inizia'}</Link></div></article>;
          })}
        </div>
      </> : null}
    </div></section></>
  );
}
