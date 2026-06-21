import React from 'react';
import { PlayCircle } from 'lucide-react';

export default function PlaceholderPanel({ label, tall = false }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg border border-dashed border-ink/20 bg-white/50 p-5 text-center ${
        tall ? 'min-h-60' : 'min-h-36'
      }`}
    >
      <div>
        <PlayCircle aria-hidden="true" className="mx-auto h-8 w-8 text-moss" />
        <p className="mt-3 text-sm font-black leading-6 text-ink/70">{label}</p>
      </div>
    </div>
  );
}
