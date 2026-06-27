import React from 'react';
import SrsTrainer from '../components/SrsTrainer';
import { hospitalityExpressionCards } from '../data/hospitalityExpressionCards';
import { getTrainerById } from '../data/trainerConfig';

export default function HospitalityExpressionTrainer() {
  const trainer = getTrainerById('hospitality-expression');

  return (
    <SrsTrainer
      cards={hospitalityExpressionCards}
      trainer={trainer}
      storageKey={trainer.storageKey}
      seoTitle="Hospitality Expression Trainer | Sblocco Inglese"
      seoDescription="Practice 150 natural English expressions for hotels, restaurants, guest service, reservations and hospitality problem-solving."
    />
  );
}
