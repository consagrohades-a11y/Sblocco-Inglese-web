import React from 'react';

export default function MultipleChoice({ exercise, answers, setAnswer, disabled = false }) {
  return (
    <div className="grid gap-4">
      {(exercise.items || []).map((item, index) => (
        <fieldset key={item.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
          <legend className="px-2 text-xs font-black uppercase tracking-wide text-moss">
            Question {index + 1}
          </legend>
          <p className="mt-2 text-sm font-black leading-6 text-ink">{item.prompt}</p>
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
                  required
                  disabled={disabled}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

