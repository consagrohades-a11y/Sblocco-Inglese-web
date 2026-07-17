import React from 'react';
import { useState } from 'react';

export default function ProcessSteps({ steps, title = 'Processo' }) {
  const [active, setActive] = useState(0);
  const activeStep = steps[active];
  const progress = ((active + 1) / steps.length) * 100;

  return (
    <div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-linen" aria-label={title}>
        <div className="h-full rounded-full bg-moss transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = active === index;
          return (
            <button
              key={step.title}
              type="button"
              onClick={() => setActive(index)}
              className={`focus-ring min-h-60 rounded-lg border p-5 text-left transition hover:-translate-y-1 ${
                isActive
                  ? 'border-moss/30 bg-white shadow-soft'
                  : 'border-ink/10 bg-white/70 hover:border-moss/25 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint text-sm font-black text-moss">
                  {index + 1}
                </span>
                {Icon ? <Icon aria-hidden="true" className="h-5 w-5 text-moss" /> : null}
              </div>
              <h3 className="mt-5 text-lg font-black text-ink">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/70">{step.text}</p>
            </button>
          );
        })}
      </div>
      {activeStep?.detail || activeStep?.focus ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-moss/20 bg-white shadow-soft">
          <div className="h-1 scanline" />
          <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-moss">Quando selezioni questo step</p>
              <h3 className="mt-3 text-2xl font-black leading-tight text-ink">
                {activeStep.detailTitle || activeStep.title}
              </h3>
              {activeStep.detail ? (
                <p className="mt-3 text-sm font-semibold leading-6 text-ink/70 sm:text-base sm:leading-7">
                  {activeStep.detail}
                </p>
              ) : null}
            </div>
            {activeStep.focus ? (
              <div className="rounded-lg border border-ink/10 bg-mint/50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-moss">Perché conta</p>
                <p className="mt-2 text-sm font-black leading-6 text-ink">{activeStep.focus}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
