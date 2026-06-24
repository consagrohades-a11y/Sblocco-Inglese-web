import React from 'react';
import { trustBadges } from '../data/content';

const badgeLabelOverrides = {
  'Pensato per italiani A2-B1/B2': 'Pensato per italiani con livello A2-C1',
};

export default function TrustBadges({ compact = false }) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
      {trustBadges.map(({ label, icon: Icon }) => {
        const displayLabel = badgeLabelOverrides[label] || label;

        return (
          <div
            key={label}
            className="flex min-h-16 items-center gap-3 rounded-lg border border-ink/10 bg-white px-3 py-3 shadow-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mint text-moss">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold leading-snug text-ink">{displayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
