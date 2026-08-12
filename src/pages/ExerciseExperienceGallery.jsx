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
import { educationalContentQaFixtures } from '../lib/educationalContentQaFixtures.js';

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
            instructions="Questa pagina usa i template ufficiali dell’Exercise Builder e fixture di stress per il contenuto educativo. Serve a controllare che ogni tipologia erediti automaticamente il design condiviso."
            progress={62}
          />

          <section className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/55 dark:text-white/55">Question renderer</p>
            <div className="mt-3 grid gap-6">
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
          </section>

          <section className="mt-12">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/55 dark:text-white/55">Structured content stress cases</p>
            <div className="mt-3 grid gap-6">
              {educationalContentQaFixtures.map((fixture, index) => (
                <ExerciseActivity
                  key={fixture.key}
                  type="content_block"
                  index={index + 1}
                  total={educationalContentQaFixtures.length}
                >
                  <div className="mb-4 border-b border-ink/10 pb-3 dark:border-white/10">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-ink/55 dark:text-white/55">QA fixture</p>
                    <p className="mt-1 text-sm font-black text-ink dark:text-white">{fixture.label}</p>
                  </div>
                  <ExerciseQuestionRenderer
                    item={{
                      id: `preview-structured-${fixture.key}`,
                      question: {
                        type: 'content_block',
                        prompt: 'Contenuto educativo strutturato',
                        instructions: 'Fixture di sviluppo.',
                        content: fixture.content,
                      },
                    }}
                    answer={null}
                    onChange={() => {}}
                  />
                </ExerciseActivity>
              ))}
            </div>
          </section>
        </div>
      </ExerciseCanvas>
    </section>
  );
}
