import React from 'react';
import { ExerciseFeedbackPanel } from './ExerciseExperience.jsx';

const displayAnswer = (answer) => String(answer || '—');

export default function InlineExerciseFeedback({ item }) {
  if (!item) return null;

  const isUnit8 = item.exerciseUnit === 'present-simple-normal-verbs';

  if (item.correct) {
    const tolerated = isUnit8 && item.answerStatus === 'tolerated';
    return (
      <ExerciseFeedbackPanel status={tolerated ? 'nearly_correct' : 'correct'} title={tolerated ? 'Quasi corretta' : 'Corretta'}>
        {tolerated ? <p>Controlla la forma della parola.</p> : null}
      </ExerciseFeedbackPanel>
    );
  }

  const hasAnswer = item.answerStatus !== 'empty'
    && String(item.userAnswer || '').trim().length > 0;

  return (
    <ExerciseFeedbackPanel status={hasAnswer ? 'incorrect' : 'unanswered'} title={hasAnswer ? (isUnit8 ? 'Da correggere' : 'Non ancora') : 'Manca la risposta'}>
      {hasAnswer ? <p><strong className="text-ink">La tua risposta:</strong> {displayAnswer(item.userAnswer)}</p> : null}
      <p><strong className="text-ink">Risposta corretta:</strong> {displayAnswer(item.correctAnswer)}</p>
      {item.feedback ? <p className="mt-1">{item.feedback}</p> : null}
      {item.explanation ? <p className="mt-1">{item.explanation}</p> : null}
    </ExerciseFeedbackPanel>
  );
}
