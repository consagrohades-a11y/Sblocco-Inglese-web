import React from 'react';
import { Plus } from 'lucide-react';
import { listStudioBlocksByCategory } from '../../../lib/exerciseStudioBlockRegistry.js';

const CATEGORY_LABELS = {
  theory: 'Teach',
  practice: 'Practice',
  production: 'Production',
  media: 'Media',
};

export default function StudioBlockPalette({ onAdd }) {
  const groups = listStudioBlocksByCategory();

  return (
    <div className="grid min-w-0 gap-4">
      {Object.entries(groups).map(([category, blocks]) => (
        <section key={category} className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">
              {CATEGORY_LABELS[category] || category}
            </p>
            <span className="shrink-0 text-[0.65rem] font-bold text-ink/30 dark:text-white/30">{blocks.length}</span>
          </div>
          <div className="grid min-w-0 gap-2">
            {blocks.map((block) => (
              <div key={block.type} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onAdd(block.type)}
                  className="focus-ring group flex w-full min-w-0 items-center gap-3 rounded-2xl border border-ink/10 bg-white px-3.5 py-3 text-left text-sm font-black leading-5 text-ink transition hover:border-orange-300 hover:bg-orange-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-orange-300/30 dark:hover:bg-orange-300/[0.07]"
                >
                  <span className="min-w-0 flex-1 whitespace-normal break-words">{block.label}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white dark:bg-orange-300/10 dark:text-orange-300">
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>

                {Array.isArray(block.presets) && block.presets.length ? (
                  <div className="ml-3 mt-2 grid gap-1.5 border-l border-orange-200 pl-3 dark:border-orange-300/20">
                    {block.presets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onAdd(block.type, preset.id)}
                        className="focus-ring rounded-xl border border-orange-200/80 bg-orange-50/60 px-3 py-2.5 text-left transition hover:border-orange-400 hover:bg-orange-50 dark:border-orange-300/15 dark:bg-orange-300/[0.04] dark:hover:border-orange-300/30"
                      >
                        <span className="block text-xs font-black text-orange-900 dark:text-orange-100">{preset.label}</span>
                        {preset.description ? (
                          <span className="mt-0.5 block text-[0.66rem] font-semibold leading-4 text-ink/45 dark:text-white/45">{preset.description}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
