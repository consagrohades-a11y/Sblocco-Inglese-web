import React from 'react';
import SrsTrainer from '../components/SrsTrainer';
import { generalExpressionCards } from '../data/generalExpressionCards';
import { getTrainerById } from '../data/trainerConfig';

export default function GeneralExpressionTrainer() {
  const trainer = getTrainerById('general-expression');

  return (
    <SrsTrainer
      cards={generalExpressionCards}
      trainer={trainer}
      storageKey={trainer.storageKey}
      seoTitle="General Expression Trainer | Sblocco Inglese"
      seoDescription="Practice everyday English expressions for opinions, reactions, travel, clarification and natural conversation."
    />
  );
}
