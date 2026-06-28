import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function ExerciseFeedback({ item }) {
  const Icon = item.correct ? CheckCircle2 : XCircle;

  return (
    <article className={`rounded-xl border p-4 text-sm leading-6 ${
      item.correct ? 'border-moss/25 bg-mint/45' : 'border-coral/30 bg-blush'
    }`}>
      <p className="flex items-start gap-2 font-black text-ink">
        <Icon className={`mt-1 h-4 w-4 shrink-0 ${item.correct ? 'text-moss' : 'text-coral'}`} />
        <span>{item.correct ? 'Correct' : 'Needs correction'}</span>
      </p>
      <p className="mt-2 text-ink/75"><strong>Your answer:</strong> {String(item.userAnswer || '—')}</p>
      <p className="mt-1 text-ink/75"><strong>Correct answer:</strong> {String(item.correctAnswer || '—')}</p>
      {item.feedback ? <p className="mt-1 text-ink/75"><strong>Feedback:</strong> {item.feedback}</p> : null}
      {item.explanation ? <p className="mt-1 text-ink/70"><strong>Why:</strong> {item.explanation}</p> : null}
    </article>
  );
}

