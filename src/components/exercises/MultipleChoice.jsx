import React from 'react';
import InlineExerciseFeedback from './InlineExerciseFeedback';

export default function MultipleChoice({ exercise, answers, setAnswer, disabled = false, attemptItemsById = {} }) {
  return (
    <div className="grid gap-4">
      {(exercise.items || []).map((item, index) => (
        <fieldset key={item.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
          <legend className="px-2 text-xs font-bold uppercase tracking-wide text-moss">
            Domanda {index + 1}
          </legend>
          <p className="mt-2 text-sm font-black leading-6 text-ink">{item.prompt}</p>
          {item.sentence ? (
            <p className="mt-2 text-base font-black leading-7 text-ink">{item.sentence}</p>
          ) : null}
          <div className="mt-3 grid gap-2">
            {(item.options || []).map((option, optionIndex) => (
              <label
                key={`${item.id}-${optionIndex}`}
                className="flex cursor-pointer gap-3 rounded-lg border border-ink/10 bg-linen/40 p-3 text-sm font-semibold text-ink hover:bg-mint/30"
              >
                <input
                  type="radio"
                  name={item.id}
                  value={optionIndex}
                  checked={String(answers[item.id] ?? '') === String(optionIndex)}
                  onChange={(event) => setAnswer(item.id, event.target.value)}
                  disabled={disabled}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          <InlineExerciseFeedback item={attemptItemsById[item.id]} />
        </fieldset>
      ))}
    </div>
  );
}
