import React from 'react';

function InlineCorrection({ feedback }) {
  if (!feedback) return null;

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-5 ${
      feedback.correct ? 'border-moss/20 bg-mint/25 text-ink/70' : 'border-coral/25 bg-blush/70 text-ink/75'
    }`}>
      <p className="font-black text-ink">
        {feedback.correct ? 'Correct.' : <>Correction: <span className="text-coral">{String(feedback.correctAnswer || '—')}</span></>}
      </p>
      {feedback.feedback ? <p className="mt-1">{feedback.feedback}</p> : null}
      {feedback.explanation ? <p className="mt-1"><strong className="text-ink">Why:</strong> {feedback.explanation}</p> : null}
    </div>
  );
}

export default function MultipleChoice({ exercise, answers, setAnswer, disabled = false, attemptItemsById = {} }) {
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
          <InlineCorrection feedback={attemptItemsById[item.id]} />
        </fieldset>
      ))}
    </div>
  );
}
