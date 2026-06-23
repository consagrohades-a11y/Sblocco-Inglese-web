import React from 'react';
import { Clock3 } from 'lucide-react';
import SEO from '../components/SEO';
import TrainerLayout from '../components/TrainerLayout';
import { getTrainerById } from '../data/trainerConfig';

export default function GeneralExpressionTrainer() {
  const trainer = getTrainerById('general-expression');

  return (
    <>
      <SEO
        title="General Expression Trainer | Sblocco Inglese"
        description="Coming soon: everyday English expressions for opinions, reactions, travel, clarification and natural conversation."
      />
      <TrainerLayout>
        <div className="mx-auto max-w-3xl rounded-lg border border-ink/10 bg-white p-6 text-center shadow-soft sm:p-8">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-lg bg-linen text-clay">
            <Clock3 aria-hidden="true" className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-black text-ink">{trainer.title}</h1>
          <p className="mt-4 text-base font-semibold leading-7 text-ink/70">
            This trainer will help you practise everyday English expressions for opinions, reactions, travel,
            clarification, social situations and natural conversation.
          </p>
          <p className="mt-5 inline-flex rounded-full bg-linen px-4 py-2 text-sm font-black text-clay">
            Coming soon
          </p>
        </div>
      </TrainerLayout>
    </>
  );
}
