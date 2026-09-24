import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { buildStudioActivityPulse } from '../../../lib/exerciseStudioRecipes.js';

export default function StudioActivityPulse({ document, onAdd }) {
  const pulse = buildStudioActivityPulse(document);

  if (!pulse.counts.total) return null;

  return (
    <section className="mt-4 rounded-2xl border border-ink/10 bg-white/80 p-3.5 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Activity pulse</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-ink/50 dark:text-white/50">A live check of the learning journey, not a technical validation.</p>
        </div>
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {pulse.stages.map((stage) => {
          const active = stage.count > 0;
          return (
            <div
              key={stage.key}
              className={`rounded-xl border px-2.5 py-2 text-center ${active
                ? 'border-orange-200 bg-orange-50/70 dark:border-orange-300/20 dark:bg-orange-300/[0.06]'
                : 'border-ink/8 bg-linen/40 dark:border-white/8 dark:bg-white/[0.025]'}`}
            >
              <span className={`block text-[0.65rem] font-black uppercase tracking-[0.08em] ${active ? 'text-orange-800 dark:text-orange-200' : 'text-ink/30 dark:text-white/30'}`}>{stage.label}</span>
              <span className={`mt-0.5 block text-lg font-black ${active ? 'text-ink dark:text-white' : 'text-ink/20 dark:text-white/20'}`}>{stage.count}</span>
            </div>
          );
        })}
      </div>

      {pulse.counts.media ? (
        <p className="mt-2 text-[0.68rem] font-bold text-ink/40 dark:text-white/40">+ {pulse.counts.media} media block{pulse.counts.media === 1 ? '' : 's'}</p>
      ) : null}

      {pulse.suggestion?.label ? (
        <div className="mt-3 border-t border-ink/8 pt-3 dark:border-white/8">
          <p className="text-xs font-semibold leading-5 text-ink/60 dark:text-white/60">{pulse.suggestion.label}</p>
          {pulse.suggestion.type ? (
            <button
              type="button"
              onClick={() => onAdd(pulse.suggestion.type)}
              className="focus-ring mt-2 inline-flex items-center gap-1.5 text-xs font-black text-orange-700 hover:text-orange-900 dark:text-orange-300 dark:hover:text-orange-100"
            >
              {pulse.suggestion.action}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
