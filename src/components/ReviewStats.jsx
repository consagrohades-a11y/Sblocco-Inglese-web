import React from 'react';

function StatTile({ label, value, helper }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/95 px-4 py-3 shadow-sm">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-ink/50">{label}</p>
      <p className="mt-1 text-2xl font-black leading-none text-ink">{value}</p>
      <p className="mt-1 text-xs font-bold text-ink/55">{helper}</p>
    </div>
  );
}

export default function ReviewStats({
  dueToday,
  newAvailable,
  reviewedToday,
  sessionReviewed,
  sessionLimit,
}) {
  const progressPercent = sessionLimit > 0 ? Math.min(100, Math.round((sessionReviewed / sessionLimit) * 100)) : 0;

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Due today" value={dueToday} helper="da ripassare" />
        <StatTile label="New available" value={newAvailable} helper="oggi" />
        <StatTile label="Reviewed today" value={reviewedToday} helper="su questo browser" />
        <StatTile label="Session progress" value={`${sessionReviewed}/${sessionLimit}`} helper="card viste" />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}
