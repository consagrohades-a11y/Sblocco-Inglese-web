import React from 'react';

function rateLabel(value) {
  const rate = Number(value);
  return Number.isFinite(rate) ? `${Math.round(rate * 100)}%` : null;
}

function DiagnosticList({ items, admin = false }) {
  return (
    <ul className="mt-3 grid gap-2">
      {items.map((item) => (
        <li key={item.code || item.rule_key || item.message} className="flex gap-2 text-sm font-semibold leading-6 text-ink/75 dark:text-white/75">
          <span aria-hidden="true">•</span>
          <span>{item.message || item.code}{admin ? ` (${Number(item.errors || 0)})` : ''}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ExerciseDiagnosticSummary({ summary, admin = false }) {
  if (!summary?.has_diagnostics) return null;
  const main = summary.main || null;
  const secondary = Array.isArray(summary.secondary) ? summary.secondary : [];
  const precision = Array.isArray(summary.precision) ? summary.precision : [];
  const hasExtra = secondary.length > 0 || precision.length > 0;

  return (
    <div className="grid gap-4">
      {main ? (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-300/20 dark:bg-violet-400/[0.08] sm:p-6">
          <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">{admin ? 'Diagnosi principale' : 'Cosa rivedere'}</p>
          <h2 className="mt-3 text-xl font-black leading-7 text-ink dark:text-white">{main.message || 'È emersa una difficoltà da rivedere.'}</h2>
          {admin ? (
            <p className="mt-2 text-xs font-bold text-ink/60 dark:text-white/60">
              {main.code || main.rule_key || main.topic}
              {rateLabel(main.error_rate) ? ` · errore ${rateLabel(main.error_rate)}` : ''}
              {` · ${Number(main.errors || 0)} su ${Number(main.opportunities || 0)} opportunità`}
            </p>
          ) : null}
        </section>
      ) : null}

      {hasExtra ? (
        <section className="rounded-2xl border border-clay/15 bg-[#fffdf9] p-5 shadow-sm dark:border-white/10 dark:bg-[#211b18] sm:p-6">
          <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-[#f7a98d]">Extra</p>
          <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">Osservazioni secondarie utili per rendere le risposte più precise.</p>

          {secondary.length ? (
            <div className="mt-5 rounded-xl border border-violet-200/70 bg-violet-50/45 p-4 dark:border-violet-300/15 dark:bg-violet-400/[0.05]">
              <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Altri aspetti da tenere d’occhio</p>
              <DiagnosticList items={secondary} admin={admin} />
            </div>
          ) : null}

          {precision.length ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-300/20 dark:bg-emerald-400/[0.06]">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Precisione</p>
              <DiagnosticList items={precision} admin={admin} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
