import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SrsTrainer from './SrsTrainer.jsx';
import SEO from './SEO.jsx';
import TrainerLayout from './TrainerLayout.jsx';
import { getTrainerById } from '../data/trainerConfig.js';
import { loadGuidedSrsTrainer, recordGuidedSrsReview } from '../lib/guidedSrsContent.js';

export default function DatabaseSrsTrainerPage({ trainerId, seoTitle, seoDescription, title, subtitle }) {
  const [searchParams] = useSearchParams();
  const trainer = getTrainerById(trainerId);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    loadGuidedSrsTrainer(trainerId)
      .then((data) => { if (active) setResult(data); })
      .catch(() => { if (active) setError('Non è stato possibile caricare il Trainer. Verifica che la migrazione guided_srs_assignments sia stata applicata.'); });
    return () => { active = false; };
  }, [trainerId]);

  const liveTrainer = useMemo(() => result ? ({
    ...trainer,
    cardCount: result.cards.length,
    categories: Array.from(new Set(result.cards.map((card) => card.category))),
  }) : trainer, [result, trainer]);
  const requestedReturnTo = searchParams.get('returnTo') || '';
  const returnTo = requestedReturnTo.startsWith('/assignments/') ? requestedReturnTo : '';

  if (!result || error) {
    return (
      <>
        <SEO title={seoTitle} description={seoDescription} />
        <TrainerLayout>
          <div className="mx-auto max-w-4xl rounded-2xl border border-ink/10 bg-white p-7 shadow-soft dark:border-white/10 dark:bg-white/[0.06] sm:p-10">
            <span className="eyebrow">Trainer</span>
            <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-5xl">{error ? 'Trainer non disponibile' : 'Caricamento delle card...'}</h1>
            <p className="mt-4 text-base leading-7 text-ink/70 dark:text-white/65">{error || 'Sto preparando il tuo ripasso e recuperando i progressi salvati.'}</p>
          </div>
        </TrainerLayout>
      </>
    );
  }

  if (result.guided && result.cards.length === 0) {
    return (
      <>
        <SEO title={seoTitle} description={seoDescription} />
        <TrainerLayout>
          <div className="mx-auto max-w-4xl rounded-2xl border border-moss/20 bg-white p-7 text-center shadow-soft dark:border-emerald-300/20 dark:bg-white/[0.06] sm:p-10">
            <span className="eyebrow">Percorso guidato</span>
            <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-5xl">Le prossime card arriveranno qui</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink/70 dark:text-white/65">Questo Trainer mostra soltanto le parole e le espressioni scelte dalla tua insegnante. Al momento non ci sono card pubblicate per questa sezione.</p>
          </div>
        </TrainerLayout>
      </>
    );
  }

  return (
    <SrsTrainer
      cards={result.cards}
      trainer={liveTrainer}
      storageKey={trainer.storageKey}
      title={title}
      subtitle={subtitle}
      seoTitle={seoTitle}
      seoDescription={seoDescription}
      initialProgress={result.initialProgress}
      onReview={({ card, rating }) => recordGuidedSrsReview(card, rating)}
      scopeNotice={result.guided ? `Questo Trainer contiene ${result.cards.length} card assegnate dalla tua insegnante.` : ''}
      persistLocalProgress={!result.guided}
      allowProgressReset={!result.guided}
      returnTo={returnTo}
    />
  );
}
