import React from 'react';
import InlineExerciseFeedback from './InlineExerciseFeedback';
import { ExerciseChoice } from './ExerciseExperience.jsx';

export default function MultipleChoice({ exercise, answers, setAnswer, disabled = false, attemptItemsById = {} }) {
  return (
    <div className="grid gap-4">
      {(exercise.items || []).map((item, index) => (
        <fieldset key={item.id} className="border-t border-ink/10 pt-4 first:border-t-0 first:pt-0 dark:border-white/10">
          <legend className="px-2 text-xs font-bold uppercase tracking-wide text-moss">
            Domanda {index + 1}
          </legend>
          <p className="mt-2 text-sm font-black leading-6 text-ink">{item.prompt}</p>
          {item.sentence ? (
            <p className="mt-2 text-base font-black leading-7 text-ink">{item.sentence}</p>
          ) : null}
          <div className="exercise-choice-grid is-two-column mt-3">
            {(item.options || []).map((option, optionIndex) => (
              <ExerciseChoice
                key={`${item.id}-${optionIndex}`}
                selected={String(answers[item.id] ?? '') === String(optionIndex)}
                disabled={disabled}
                onClick={() => setAnswer(item.id, String(optionIndex))}
              >
                <span>{option}</span>
              </ExerciseChoice>
            ))}
          </div>
          <InlineExerciseFeedback item={attemptItemsById[item.id]} />
        </fieldset>
      ))}
    </div>
  );
}
