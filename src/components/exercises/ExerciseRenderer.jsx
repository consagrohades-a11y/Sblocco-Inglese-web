import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildControlledAttempt } from '../../engines/attemptGenerator';
import { evaluateExerciseAttempt } from '../../engines/exerciseEngine';
import { saveExerciseAttempt } from '../../engines/progressEngine';
import MultipleChoice from './MultipleChoice';
import GapFill from './GapFill';
import DialogueGapFill from './DialogueGapFill';
import ExerciseResult from './ExerciseResult';
import {
  ExerciseActionBar,
  ExerciseActivity,
  ExerciseCanvas,
  ExercisePrompt,
} from './ExerciseExperience.jsx';

const renderers = {
  'multiple-choice': MultipleChoice,
  'gap-fill': GapFill,
  'dialogue-gap-fill': DialogueGapFill,
};

export default function ExerciseRenderer({
  exercise,
  onComplete,
  onContinue,
  continueLabel,
  isFinal = false,
  showHeader = true,
}) {
  const [answers, setAnswers] = useState({});
  const [attempt, setAttempt] = useState(null);
  const [attemptVersion, setAttemptVersion] = useState(0);
  const activeExercise = useMemo(() => {
    if (!exercise?.questionPool) return exercise;

    const controlledAttempt = buildControlledAttempt({
      questionPool: exercise.questionPool,
      questionCount: exercise.questionCount,
      selectionRules: exercise.selectionRules,
    });

    return { ...exercise, items: controlledAttempt.questions };
  }, [exercise, attemptVersion]);
  const Renderer = renderers[activeExercise?.type];
  const attemptItemsById = useMemo(() => (
    Object.fromEntries((attempt?.items || []).map((item) => [item.itemId, item]))
  ), [attempt]);

  const setAnswer = (itemId, value) => {
    setAnswers((current) => ({ ...current, [itemId]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextAttempt = evaluateExerciseAttempt(activeExercise, answers);
    saveExerciseAttempt(nextAttempt);
    setAttempt(nextAttempt);
    onComplete?.(nextAttempt);
  };

  const reset = () => {
    setAnswers({});
    setAttempt(null);
    setAttemptVersion((current) => current + 1);
  };

  if (!exercise) {
    return <div className="rounded-xl border border-coral/30 bg-blush p-4 text-sm font-semibold text-ink">L’esercizio non è disponibile.</div>;
  }

  const goodResult = attempt && attempt.percent >= 70;

  return (
    <ExerciseCanvas>
    <ExerciseActivity type={activeExercise.type}>
      {showHeader ? (
        <ExercisePrompt type={activeExercise.type} prompt={activeExercise.title} instructions={activeExercise.instructions} />
      ) : null}

      <dl className={`${showHeader ? 'mt-4' : ''} grid gap-2 rounded-xl bg-linen/70 p-4 text-sm sm:grid-cols-3`}>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-ink/65">Focus grammaticale</dt>
          <dd className="mt-1 font-black text-ink">{activeExercise.grammarFocus || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-ink/65">Skill focus</dt>
          <dd className="mt-1 font-black text-ink">{activeExercise.skillFocus || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-ink/65">Tipo di produzione</dt>
          <dd className="mt-1 font-black text-ink">{activeExercise.productionMode || activeExercise.purpose || '—'}</dd>
        </div>
      </dl>

      {Renderer ? (
        <form className="mt-5" onSubmit={handleSubmit}>
          <Renderer
            exercise={activeExercise}
            answers={answers}
            setAnswer={setAnswer}
            disabled={Boolean(attempt)}
            attemptItemsById={attemptItemsById}
          />
          {!attempt ? (
            <button type="submit" className="focus-ring exercise-primary-action mt-5">
              Controlla le risposte
            </button>
          ) : null}
        </form>
      ) : (
        <div className="mt-5 rounded-xl border border-coral/30 bg-blush p-4 text-sm font-semibold text-ink">
          Il tipo di esercizio “{activeExercise.type || 'sconosciuto'}” non è ancora supportato.
        </div>
      )}

      {attempt ? (
        <div className="mt-5 border-t border-ink/10 pt-5">
          <ExerciseResult attempt={attempt} exercise={activeExercise} isFinal={isFinal} />
          <ExerciseActionBar>
            {isFinal ? (
              <>
                <button type="button" onClick={reset} className="focus-ring exercise-primary-action">
                  <RotateCcw className="h-4 w-4" /> Allenati sugli errori
                </button>
                <Link to="/grammar/a1" className="focus-ring exercise-secondary-action">
                  Torna ad A1 English Foundations
                </Link>
              </>
            ) : goodResult ? (
              <button type="button" onClick={onContinue} className="focus-ring exercise-primary-action">
                {continueLabel}
              </button>
            ) : (
              <>
                <button type="button" onClick={reset} className="focus-ring exercise-primary-action">
                  <RotateCcw className="h-4 w-4" /> Riprova
                </button>
                <button type="button" onClick={onContinue} className="focus-ring exercise-secondary-action">
                  Continua comunque
                </button>
              </>
            )}
          </ExerciseActionBar>
        </div>
      ) : null}
    </ExerciseActivity>
    </ExerciseCanvas>
  );
}
