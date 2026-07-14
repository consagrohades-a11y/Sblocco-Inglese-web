import React from 'react';

function rateLabel(value) {
  const rate = Number(value);
  return Number.isFinite(rate) ? `${Math.round(rate * 100)}%` : null;
}

export default function ExerciseDiagnosticSummary({ summary, admin = false }) {
  if (!summary?.has_diagnostics) return null;
  const main = summary.main || null;
  const secondary = Array.isArray(summary.secondary) ? summary.secondary : [];
  const precision = Array.isArray(summary.precision) ? summary.precision : [];

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-300/20 dark:bg-violet-400/[0.08] sm:p-6">
      <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">{admin ? 'Interpretazione diagnostica' : 'Cosa rivedere'}</p>
      {main ? (
        <div className="mt-3">
          <h2 className="text-xl font-black leading-7 text-ink dark:text-white">{main.message || 'È emersa una difficoltà da rivedere.'}</h2>
          {admin ? <p className="mt-2 text-xs font-bold text-ink/45 dark:text-white/45">{main.code || main.rule_key || main.topic}{rateLabel(main.error_rate) ? ` · errore ${rateLabel(main.error_rate)}` : ''} · {Number(main.errors || 0)} su {Number(main.opportunities || 0)} opportunità</p> : null}
        </div>
      ) : null}

      {secondary.length ? (
        <div className="mt-5 border-t border-violet-200/70 pt-4 dark:border-violet-300/15">
          <p className="text-xs font-black uppercase tracking-wide text-ink/45 dark:text-white/45">In particolare</p>
          <ul className="mt-3 grid gap-2">
            {secondary.slice(0, 2).map((item) => <li key={item.code} className="text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">• {item.message || item.code}</li>)}
          </ul>
        </div>
      ) : null}

      {precision.length ? (
        <div className="mt-5 rounded-xl border border-ink/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
          <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-emerald-300">Precisione</p>
          <ul className="mt-3 grid gap-2">
            {precision.map((item) => <li key={item.code} className="text-sm font-semibold leading-6 text-ink/70 dark:text-white/70">• {item.message || item.code}{admin ? ` (${Number(item.errors || 0)})` : ''}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
