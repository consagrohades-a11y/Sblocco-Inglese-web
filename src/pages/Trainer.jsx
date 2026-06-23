import React from 'react';
import SrsTrainer from '../components/SrsTrainer';
import { srsCards } from '../data/srsCards';
import { getTrainerById } from '../data/trainerConfig';

export default function Trainer() {
  const trainer = getTrainerById('business-expression');

  return (
    <SrsTrainer
      cards={srsCards}
      trainer={trainer}
      storageKey={trainer.storageKey}
      title="Business Expression Trainer"
      subtitle="Review the English phrases you actually need for interviews, work, meetings and real conversations."
      seoTitle="Business Expression Trainer | Sblocco Inglese"
      seoDescription="Review the English phrases you actually need for interviews, work, meetings and real conversations."
    />
  );
}
