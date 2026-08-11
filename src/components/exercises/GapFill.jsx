import React from 'react';
import InlineExerciseFeedback from './InlineExerciseFeedback';

export default function GapFill({ exercise, answers, setAnswer, disabled = false, attemptItemsById = {} }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(exercise.items || []).map((item) => (
        <label key={item.id} className="border-t border-ink/10 py-4 first:border-t-0 first:pt-0 dark:border-white/10">
          <span className="block text-sm font-black text-ink">{item.prompt}</span>
          {item.baseForm ? (
            <span className="mt-2 inline-flex rounded-full bg-butter px-2.5 py-1 text-xs font-black text-ink">
              base form: ({item.baseForm})
            </span>
          ) : null}
          <input
            className="focus-ring exercise-text-field mt-3 w-full px-4 py-3 text-sm font-semibold"
            name={item.id}
            value={answers[item.id] ?? ''}
            onChange={(event) => setAnswer(item.id, event.target.value)}
            disabled={disabled}
            autoComplete="off"
            placeholder="Scrivi la risposta"
          />
          <InlineExerciseFeedback item={attemptItemsById[item.id]} />
        </label>
      ))}
    </div>
  );
}
