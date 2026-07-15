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
    category: card.category || card.primary_context || 'Travel',
    expression: card.canonical_text,
    pronunciation: [card.pronunciation_ipa_us, card.pronunciation_learner_us].filter(Boolean).join(' · ') || 'Pronuncia non disponibile',
    italian: card.italian_meaning,
    collocations: (card.collocations || []).join(' · '),
    example1: card.example_1 || 'Example missing.',
    example2: card.example_2 || 'Example missing.',
    note: card.usage_note || card.english_explanation || 'Nota non disponibile.',
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
    publishedCards.forEach((card) => merged.set(card.id, card));
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
      subtitle="Frasi pratiche per prenotazioni, aeroporti, hotel, trasporti, ristoranti, problemi ed emergenze in viaggio."
      seoTitle="Travel Expression Trainer | Sblocco Inglese"
      seoDescription="Espressioni inglesi per viaggiare con più sicurezza, incluse le Travel card pubblicate dal pannello admin."
    />
  );
}
