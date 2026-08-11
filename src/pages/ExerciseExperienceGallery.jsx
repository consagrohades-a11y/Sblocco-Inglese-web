import React, { useMemo, useState } from 'react';
import SEO from '../components/SEO.jsx';
import ExerciseQuestionRenderer from '../components/exercises/ExerciseQuestionRenderer.jsx';
import {
  ExerciseActivity,
  ExerciseCanvas,
  ExerciseProgressHeader,
} from '../components/exercises/ExerciseExperience.jsx';
import { EXERCISE_BUILDER_QUESTION_TYPES } from '../lib/exerciseBuilderSchemaV2.js';
import { exerciseBuilderTemplates } from '../lib/exerciseBuilderTemplatesV2.js';

export default function ExerciseExperienceGallery() {
  const questions = useMemo(() => EXERCISE_BUILDER_QUESTION_TYPES.map((type) => ({
    type,
    question: exerciseBuilderTemplates[type]?.question,
  })).filter((entry) => entry.question), []);
  const [answers, setAnswers] = useState({});

  return (
    <section className="section-shell py-8 dark:bg-surface-950 lg:py-12">
      <SEO title="Exercise experience preview | Sblocco Inglese" description="Development-only visual coverage for the shared learner exercise renderer." />
      <ExerciseCanvas>
        <div className="mx-auto max-w-5xl">
          <ExerciseProgressHeader
            eyebrow="Anteprima di sviluppo"
            title="Tutte le attività, un solo sistema"
            instructions="Questa pagina usa i template ufficiali dell’Exercise Builder. Serve a controllare che ogni tipologia erediti automaticamente il design condiviso."
            progress={62}
          />
          <div className="mt-8 grid gap-6">
            {questions.map(({ type, question }, index) => (
              <ExerciseActivity key={type} type={type} index={index + 1} total={questions.length}>
                <ExerciseQuestionRenderer
                  item={{ id: `preview-${type}`, question }}
                  answer={answers[type]}
                  onChange={(answer) => setAnswers((current) => ({ ...current, [type]: answer }))}
                />
              </ExerciseActivity>
            ))}
          </div>
        </div>
      </ExerciseCanvas>
    </section>
  );
}
