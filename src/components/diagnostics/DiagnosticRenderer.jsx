import React, { useMemo, useState } from 'react';
import ExerciseRenderer from '../exercises/ExerciseRenderer';
import DiagnosticResult from './DiagnosticResult';
import { buildDiagnosticProfile } from '../../engines/diagnosticEngine';
import { buildRecommendations } from '../../engines/recommendationEngine';

export default function DiagnosticRenderer({ diagnostic }) {
  const [responses, setResponses] = useState({});
  const [attemptsByExercise, setAttemptsByExercise] = useState({});

  const attempts = useMemo(() => Object.values(attemptsByExercise), [attemptsByExercise]);
  const result = useMemo(() => {
    if (!attempts.length) return null;
    const profile = buildDiagnosticProfile(attempts);
    const correct = attempts.reduce((sum, attempt) => sum + attempt.correct, 0);
    const total = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
    const percent = total ? Math.round((correct / total) * 100) : 0;
    const estimatedLevel = percent >= 75
      ? 'Early estimate: A1/A2 transition signal'
      : 'Early estimate: A1 foundations need attention';

    return {
      ...profile,
      estimatedLevel,
      selfReport: responses,
      recommendations: buildRecommendations(profile),
    };
  }, [attempts, responses]);

  if (!diagnostic) {
    return <DiagnosticResult result={null} />;
  }

  return (
    <div className="grid gap-6">
      <header className="rounded-[2rem] border border-ink/10 bg-white/85 p-6 shadow-soft">
        <p className="text-xs font-black uppercase tracking-wider text-moss">Diagnostic skeleton</p>
        <h1 className="mt-3 text-4xl font-black text-ink">{diagnostic.title}</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-ink/70">{diagnostic.description}</p>
      </header>

      {(diagnostic.sections || []).map((section) => (
        <section key={section.id} className="rounded-2xl border border-ink/10 bg-linen/65 p-5">
          <h2 className="text-xl font-black text-ink">{section.title}</h2>
          {section.description ? <p className="mt-2 text-sm leading-6 text-ink/70">{section.description}</p> : null}

          {section.question ? (
            <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">{section.title}</legend>
              {section.question.options.map((option) => (
                <label key={option} className="flex cursor-pointer gap-3 rounded-xl border border-ink/10 bg-white p-3 text-sm font-semibold text-ink shadow-sm">
                  <input
                    type="radio"
                    name={section.question.id}
                    value={option}
                    checked={responses[section.question.id] === option}
                    onChange={(event) => setResponses((current) => ({
                      ...current,
                      [section.question.id]: event.target.value,
                    }))}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
          ) : null}

          {section.exercises?.length ? (
            <div className="mt-4 grid gap-4">
              {section.exercises.map((exercise) => (
                <ExerciseRenderer
                  key={exercise.id}
                  exercise={exercise}
                  onComplete={(attempt) => setAttemptsByExercise((current) => ({
                    ...current,
                    [exercise.id]: attempt,
                  }))}
                />
              ))}
            </div>
          ) : null}
        </section>
      ))}

      <DiagnosticResult result={result} />
    </div>
  );
}

