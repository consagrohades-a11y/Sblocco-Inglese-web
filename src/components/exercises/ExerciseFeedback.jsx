import React from 'react';
import { ExerciseFeedbackPanel } from './ExerciseExperience.jsx';

export default function ExerciseFeedback({ item }) {
  return (
    <ExerciseFeedbackPanel status={item.correct ? 'correct' : 'incorrect'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
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
    </ExerciseFeedbackPanel>
  );
}
