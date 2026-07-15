import React from 'react';
import SrsTrainer from '../components/SrsTrainer.jsx';
import { getTrainerById } from '../data/trainerConfig.js';
import { travelExpressionCards } from '../data/travelExpressionCards.js';

export default function TravelExpressionTrainer() {
  const trainer = getTrainerById('travel-expression');

  return (
    <SrsTrainer
      cards={travelExpressionCards}
      trainer={trainer}
      storageKey={trainer.storageKey}
      title="Travel Expression Trainer"
      subtitle="Frasi pratiche per prenotazioni, aeroporti, hotel, trasporti, ristoranti, problemi ed emergenze in viaggio."
      seoTitle="Travel Expression Trainer | Sblocco Inglese"
      seoDescription="100 espressioni inglesi per viaggiare con più sicurezza, organizzate per situazione e ripassate con SRS."
    />
  );
}
