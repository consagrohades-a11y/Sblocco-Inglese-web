import React from 'react';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { situations } from '../data/content';

export default function SituationTabs() {
  const [active, setActive] = useState(0);
  const current = situations[active];

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft sm:p-6">
      <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Situazioni simulabili">
        {situations.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={active === index}
            onClick={() => setActive(index)}
            className={`focus-ring rounded-lg px-4 py-3 text-left text-sm font-black transition ${
              active === index ? 'bg-moss text-white shadow-lift' : 'bg-paper text-ink hover:bg-mint'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-paper p-5">
        <h3 className="text-xl font-black text-ink">{current.title}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {current.items.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-lg bg-white px-4 py-3">
              <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
              <span className="text-sm font-semibold leading-6 text-ink/75">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
