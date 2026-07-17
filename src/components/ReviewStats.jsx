import React from 'react';

function StatTile({ label, value, helper, dark = false }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 shadow-sm sm:px-4 sm:py-3 ${
      dark ? 'border-white/10 bg-white/[0.08]' : 'border-ink/10 bg-white/95'
    }`}>
      <p className={`text-[0.68rem] font-black uppercase tracking-[0.08em] ${dark ? 'text-white/65' : 'text-ink/65'}`}>{label}</p>
      <p className={`mt-1 text-xl font-black leading-none sm:text-2xl ${dark ? 'text-white' : 'text-ink'}`}>{value}</p>
      <p className={`mt-1 text-xs font-bold ${dark ? 'text-white/65' : 'text-ink/65'}`}>{helper}</p>
    </div>
  );
}

export default function ReviewStats({
  totalCards,
  filteredCards,
  reviewedToday,
  sessionReviewed,
  sessionLimit,
  guided = false,
  dark = false,
  compact = false,
}) {
  const progressPercent = sessionLimit > 0 ? Math.min(100, Math.round((sessionReviewed / sessionLimit) * 100)) : 0;

  return (
    <div className="grid gap-3">
      <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${compact ? '' : 'lg:grid-cols-4'}`}>
        <StatTile dark={dark} label={guided ? 'Card assegnate' : 'Card disponibili'} value={totalCards} helper="in questo Trainer" />
        <StatTile dark={dark} label="Con questi filtri" value={filteredCards} helper="card visibili" />
        <StatTile dark={dark} label="Sessione attuale" value={sessionLimit} helper="massimo 10 card" />
        <StatTile dark={dark} label="Ripassate oggi" value={reviewedToday} helper={`${sessionReviewed} in questa sessione`} />
      </div>
      <div className={`h-2 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-white'}`}>
        <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}
