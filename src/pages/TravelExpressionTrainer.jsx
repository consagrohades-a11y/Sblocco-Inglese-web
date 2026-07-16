import React, { useEffect, useMemo, useState } from 'react';
import SrsTrainer from '../components/SrsTrainer.jsx';
import { getTrainerById } from '../data/trainerConfig.js';
import { travelExpressionCards } from '../data/travelExpressionCards.js';
import { supabase } from '../lib/supabaseClient.js';

function toTrainerCard(card) {
  return {
    id: card.public_id,
    databaseId: card.id,
    type: 'Expression',
    level: card.level,
    category: card.topic || card.primary_context || 'Travel',
    expression: card.canonical_text,
    pronunciation: [card.pronunciation_ipa_us, card.pronunciation_learner_us].filter(Boolean).join(' · '),
    pronunciationIpa: card.pronunciation_ipa_us || '',
    pronunciationLearner: card.pronunciation_learner_us || '',
    italian: card.italian_meaning,
    communicativeFunction: card.communicative_function || '',
    collocations: (card.collocations || []).join(' · '),
    example1: card.example_1 || '',
    example2: card.example_2 || '',
    note: card.usage_note || card.english_explanation || '',
  };
}

function mergeWithStarter(starter, published) {
  if (!starter) {
    return {
      ...published,
      pronunciation: published.pronunciation || 'Pronuncia da aggiungere',
      example1: published.example1 || 'Add a complete contextual example.',
      example2: published.example2 || 'Add a second contextual example.',
      note: published.note || 'Add a specific usage note.',
    };
  }

  return {
    ...starter,
    ...published,
    pronunciation: published.pronunciation || starter.pronunciation,
    pronunciationIpa: published.pronunciationIpa || starter.pronunciationIpa,
    pronunciationLearner: published.pronunciationLearner || starter.pronunciationLearner,
    communicativeFunction: published.communicativeFunction || starter.communicativeFunction,
    collocations: published.collocations || starter.collocations,
    example1: published.example1 || starter.example1,
    example2: published.example2 || starter.example2,
    note: published.note || starter.note,
  };
}

export default function TravelExpressionTrainer() {
  const trainer = getTrainerById('travel-expression');
  const [publishedCards, setPublishedCards] = useState([]);

  useEffect(() => {
    let active = true;
    supabase.rpc('list_published_expression_cards', { p_domain: 'travel' })
      .then(({ data, error }) => {
        if (!active || error) return;
        setPublishedCards((data || []).map(toTrainerCard));
      });
    return () => { active = false; };
  }, []);

  const cards = useMemo(() => {
    const merged = new Map(travelExpressionCards.map((card) => [card.id, card]));
    publishedCards.forEach((card) => merged.set(card.id, mergeWithStarter(merged.get(card.id), card)));
    return Array.from(merged.values());
  }, [publishedCards]);

  const liveTrainer = useMemo(() => ({
    ...trainer,
    cardCount: cards.length,
    categories: Array.from(new Set(cards.map((card) => card.category))),
  }), [cards, trainer]);

  return (
    <SrsTrainer
      cards={cards}
      trainer={liveTrainer}
      storageKey={trainer.storageKey}
      title="Travel Expression Trainer"
      subtitle="Frasi pratiche con pronuncia americana, esempi reali e indicazioni d’uso per ogni situazione di viaggio."
      seoTitle="Travel Expression Trainer | Sblocco Inglese"
      seoDescription="Espressioni inglesi per viaggiare con pronuncia americana, esempi contestualizzati e ripasso SRS."
    />
  );
}
