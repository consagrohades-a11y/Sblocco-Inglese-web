import React from 'react';
import { Plus } from 'lucide-react';
import { listStudioBlocksByCategory } from '../../../lib/exerciseStudioBlockRegistry.js';

const CATEGORY_LABELS = {
  theory: 'Teach',
  practice: 'Practice',
  production: 'Production',
  media: 'Media',
};

const CATEGORY_DESCRIPTIONS = {
  theory: 'Explain, model and support.',
  practice: 'Automatically graded practice.',
  production: 'Learner-created responses.',
  media: 'Audio and video input.',
};

export default function StudioBlockPalette({ onAdd }) {
  const groups = listStudioBlocksByCategory();

  return (
    <div className="grid gap-5">
      {Object.entries(groups).map(([category, blocks]) => (
        <section key={category}>
          <div className="mb-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">
              {CATEGORY_LABELS[category] || category}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">
              {CATEGORY_DESCRIPTIONS[category] || ''}
            </p>
          </div>
          <div className="grid gap-1.5">
            {blocks.map((block) => (
              <button
                key={block.type}
                type="button"
                onClick={() => onAdd(block.type)}
                className="focus-ring flex w-full items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-left text-sm font-black text-ink transition hover:border-orange-300 hover:bg-orange-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-orange-300/30 dark:hover:bg-orange-300/[0.07]"
              >
                <span>{block.label}</span>
                <Plus className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
