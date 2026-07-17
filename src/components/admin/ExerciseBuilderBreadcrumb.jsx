import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  { key: 'import', label: '1. Importa', to: '/admin/content/exercises' },
  { key: 'review', label: '2. Revisiona', to: '/admin/content/exercises/review' },
  { key: 'library', label: '3. Libreria', to: '/admin/content/exercises/library' },
  { key: 'composer', label: '4. Composer', to: '/admin/content/exercises/composer' },
];

export default function ExerciseBuilderBreadcrumb({ current, className = '' }) {
  return (
    <nav aria-label="Percorso Exercise Builder" className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          {index > 0 ? <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink/35 dark:text-white/35" /> : null}
          {step.key === current ? (
            <span aria-current="step" className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white dark:bg-emerald-300 dark:text-surface-950">
              {step.label}
            </span>
          ) : (
            <Link
              to={step.to}
              className="focus-ring rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs font-bold text-ink/70 transition hover:border-moss hover:text-ink dark:border-white/15 dark:bg-white/[0.06] dark:text-white/70 dark:hover:border-emerald-300/40 dark:hover:text-white"
            >
              {step.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
