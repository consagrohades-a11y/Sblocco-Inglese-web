import React from 'react';

function InlineCorrection({ feedback }) {
  if (!feedback) return null;

  return (
    <div className={`mt-2 rounded-lg border px-3 py-2 text-xs leading-5 ${
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

export default function GapFill({ exercise, answers, setAnswer, disabled = false, attemptItemsById = {} }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(exercise.items || []).map((item) => (
        <label key={item.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
          <span className="block text-sm font-black text-ink">{item.prompt}</span>
          {item.baseForm ? (
            <span className="mt-2 inline-flex rounded-full bg-butter px-2.5 py-1 text-xs font-black text-ink">
              base form: ({item.baseForm})
            </span>
          ) : null}
          <input
            className="focus-ring mt-3 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink"
            name={item.id}
            value={answers[item.id] ?? ''}
            onChange={(event) => setAnswer(item.id, event.target.value)}
            required
            disabled={disabled}
            autoComplete="off"
            placeholder="Type your answer"
          />
          <InlineCorrection feedback={attemptItemsById[item.id]} />
        </label>
      ))}
    </div>
  );
}
