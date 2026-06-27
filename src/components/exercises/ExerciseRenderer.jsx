import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { evaluateExerciseAttempt } from '../../engines/exerciseEngine';
import { saveExerciseAttempt } from '../../engines/progressEngine';
import MultipleChoice from './MultipleChoice';
import GapFill from './GapFill';
import DialogueGapFill from './DialogueGapFill';
import ExerciseResult from './ExerciseResult';

const renderers = {
  'multiple-choice': MultipleChoice,
  'gap-fill': GapFill,
  'dialogue-gap-fill': DialogueGapFill,
};

export default function ExerciseRenderer({ exercise, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [attempt, setAttempt] = useState(null);
  const Renderer = renderers[exercise?.type];

  const setAnswer = (itemId, value) => {
    setAnswers((current) => ({ ...current, [itemId]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextAttempt = evaluateExerciseAttempt(exercise, answers);
    saveExerciseAttempt(nextAttempt);
    setAttempt(nextAttempt);
    onComplete?.(nextAttempt);
  };

  const reset = () => {
    setAnswers({});
    setAttempt(null);
  };

  if (!exercise) {
    return <div className="rounded-xl border border-coral/30 bg-blush p-4 text-sm font-semibold text-ink">Exercise data is unavailable.</div>;
  }

  return (
    <article className="rounded-2xl border border-ink/10 bg-white/90 p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-moss">{exercise.purpose || 'Exercise'}</p>
        <h3 className="mt-2 text-xl font-black text-ink">{exercise.title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">{exercise.instructions}</p>
      </div>

      {attempt ? (
        <div className="mt-5">
          <ExerciseResult attempt={attempt} exercise={exercise} />
          <button type="button" onClick={reset} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-full bg-butter px-5 py-3 font-black text-ink">
            <RotateCcw className="h-4 w-4" /> Retry exercise
          </button>
        </div>
      ) : Renderer ? (
        <form className="mt-5" onSubmit={handleSubmit}>
          <Renderer exercise={exercise} answers={answers} setAnswer={setAnswer} />
          <button type="submit" className="focus-ring mt-5 rounded-full bg-moss px-5 py-3 font-black text-white shadow-lift">
            Check exercise
          </button>
        </form>
      ) : (
        <div className="mt-5 rounded-xl border border-coral/30 bg-blush p-4 text-sm font-semibold text-ink">
          Exercise type “{exercise.type || 'unknown'}” is not supported yet.
        </div>
      )}
    </article>
  );
}

