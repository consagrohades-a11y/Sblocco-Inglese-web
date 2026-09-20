import React from 'react';
import { FileText } from 'lucide-react';

export default function TranscriptReferencePanel({ transcript, title = 'Transcript' }) {
  if (!transcript) return null;
  return (
    <details className="mb-4 overflow-hidden rounded-2xl border border-orange-200/80 bg-orange-50/45 dark:border-orange-300/15 dark:bg-orange-300/[0.04]">
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-black text-orange-900 dark:text-orange-100">
        <FileText className="h-4 w-4" aria-hidden="true" />
        {title}
        <span className="ml-auto text-[0.68rem] font-bold text-orange-800/55 dark:text-orange-100/45">Open / close</span>
      </summary>
      <div className="max-h-80 overflow-y-auto overscroll-contain border-t border-orange-200/70 px-4 py-3 [scrollbar-width:thin] dark:border-orange-300/10">
        <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-ink/80 dark:text-white/80">{transcript}</p>
      </div>
    </details>
  );
}
