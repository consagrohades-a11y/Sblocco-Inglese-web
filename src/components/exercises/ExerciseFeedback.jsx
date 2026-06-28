import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function ExerciseFeedback({ item }) {
  const Icon = item.correct ? CheckCircle2 : XCircle;

  return (
    <article className={`rounded-lg border p-3 text-sm ${
      item.correct ? 'border-moss/20 bg-mint/30' : 'border-coral/25 bg-blush/70'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-black text-ink">
          <Icon className={`h-4 w-4 shrink-0 ${item.correct ? 'text-moss' : 'text-coral'}`} />
          <span>{item.correct ? 'Correct' : 'Needs correction'}</span>
        </p>
        <p className="rounded-full bg-white/70 px-2 py-1 text-xs font-black text-ink/65">
          Your: {String(item.userAnswer || '—')} · Correct: {String(item.correctAnswer || '—')}
        </p>
      </div>
      {(item.feedback || item.explanation) ? (
        <div className="mt-2 grid gap-1 text-xs leading-5 text-ink/70">
          {item.feedback ? <p><strong className="text-ink">Feedback:</strong> {item.feedback}</p> : null}
          {item.explanation ? <p><strong className="text-ink">Why:</strong> {item.explanation}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
