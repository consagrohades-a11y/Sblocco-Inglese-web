import React, { useEffect, useMemo, useState } from 'react';
import { loadLearnerDiagnostics } from '../../lib/exerciseDiagnosticsApi.js';

const statusLabels = {
  not_enough_data: 'Dati insufficienti',
  emerging_weakness: 'Debolezza emergente',
  weakness: 'Debolezza',
  improving: 'In miglioramento',
  stable: 'Stabile',
  mastered: 'Consolidato',
};

function statusClass(status) {
  if (status === 'weakness') return 'bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-200';
  if (status === 'emerging_weakness') return 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200';
  if (status === 'improving') return 'bg-cyan-100 text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-200';
  if (status === 'mastered') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200';
  return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/60';
}

export default function LearnerDiagnosticPanel({ learnerId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('learning');

  useEffect(() => {
    let active = true;
    loadLearnerDiagnostics(learnerId)
      .then((data) => { if (active) setItems(data); })
      .catch(() => { if (active) setError('Non è stato possibile caricare la diagnostica Exercise Builder.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [learnerId]);

  const visible = useMemo(() => items.filter((item) => item.category === filter), [items, filter]);
  const weaknesses = items.filter((item) => ['weakness', 'emerging_weakness'].includes(item.status)).length;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#16211e]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Diagnostica Exercise Builder</p><h2 className="mt-2 text-2xl font-black text-ink dark:text-white">{weaknesses} aree da monitorare</h2></div>
        <div className="flex rounded-full border border-ink/10 bg-linen/40 p-1 dark:border-white/10 dark:bg-white/[0.04]">
          <button type="button" onClick={() => setFilter('learning')} className={`rounded-full px-3 py-1.5 text-xs font-black ${filter === 'learning' ? 'bg-ink text-white dark:bg-emerald-300 dark:text-[#102019]' : 'text-ink/65 dark:text-white/65'}`}>Apprendimento</button>
          <button type="button" onClick={() => setFilter('precision')} className={`rounded-full px-3 py-1.5 text-xs font-black ${filter === 'precision' ? 'bg-ink text-white dark:bg-emerald-300 dark:text-[#102019]' : 'text-ink/65 dark:text-white/65'}`}>Precisione</button>
        </div>
      </div>

      {loading ? <p className="mt-5 text-sm font-bold text-ink/65 dark:text-white/65">Caricamento diagnostica...</p> : null}
      {error ? <p className="mt-5 text-sm font-bold text-red-700 dark:text-red-300">{error}</p> : null}
      {!loading && !error && visible.length === 0 ? <p className="mt-5 text-sm leading-6 text-ink/65 dark:text-white/65">Non ci sono ancora dati sufficienti in questa categoria.</p> : null}

      <div className="mt-5 divide-y divide-ink/10 border-y border-ink/10 dark:divide-white/10 dark:border-white/10">
        {visible.map((item) => {
          const rate = Math.round(Number(item.error_rate || 0) * 100);
          const recentRate = Math.round(Number(item.recent_error_rate || 0) * 100);
          return (
            <article key={item.code} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-sm font-black text-ink dark:text-white">{item.label}</p><p className="mt-1 text-xs font-bold text-ink/60 dark:text-white/60">{item.code} · {item.topic}{item.subtopic ? ` · ${item.subtopic}` : ''}</p></div>
                <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${statusClass(item.status)}`}>{statusLabels[item.status] || item.status}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-linen/40 p-3 dark:bg-white/[0.04]"><p className="text-lg font-black text-ink dark:text-white">{rate}%</p><p className="text-xs font-bold text-ink/60 dark:text-white/60">errore totale</p></div>
                <div className="rounded-lg bg-linen/40 p-3 dark:bg-white/[0.04]"><p className="text-lg font-black text-ink dark:text-white">{recentRate}%</p><p className="text-xs font-bold text-ink/60 dark:text-white/60">ultimi 90 giorni</p></div>
                <div className="rounded-lg bg-linen/40 p-3 dark:bg-white/[0.04]"><p className="text-lg font-black text-ink dark:text-white">{Number(item.total_errors || 0)} / {Number(item.total_opportunities || 0)}</p><p className="text-xs font-bold text-ink/60 dark:text-white/60">errori e opportunità</p></div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
