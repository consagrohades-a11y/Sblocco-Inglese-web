import React from 'react';

const displayAnswer = (answer) => String(answer || '—');

export default function InlineExerciseFeedback({ item }) {
  if (!item) return null;

  if (item.correct) {
    const tolerated = item.answerStatus === 'tolerated';
    return (
      <div className={`mt-2 rounded-lg border px-3 py-2 text-xs font-black text-ink ${
        tolerated ? 'border-coral/20 bg-butter/70' : 'border-moss/20 bg-mint/25'
      }`}>
        {tolerated ? 'Quasi. Controlla la forma della parola.' : 'Corretto.'}
      </div>
    );
  }

  const hasAnswer = item.answerStatus !== 'empty'
    && String(item.userAnswer || '').trim().length > 0;

  return (
    <div className="mt-2 rounded-lg border border-coral/25 bg-blush/70 px-3 py-2 text-xs leading-5 text-ink/75">
      <p className="font-black text-ink">{hasAnswer ? 'Sbagliato.' : 'Manca la risposta.'}</p>
      {hasAnswer ? <p><strong className="text-ink">La tua risposta:</strong> {displayAnswer(item.userAnswer)}</p> : null}
      <p><strong className="text-ink">Risposta corretta:</strong> {displayAnswer(item.correctAnswer)}</p>
      {item.feedback ? <p className="mt-1">{item.feedback}</p> : null}
      {item.explanation ? <p className="mt-1">{item.explanation}</p> : null}
    </div>
  );
}
