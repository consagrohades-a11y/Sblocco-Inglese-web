import React from 'react';
import SrsTrainer from '../components/SrsTrainer';
import { wordTrainerCards } from '../data/wordTrainerCards';
import { getTrainerById } from '../data/trainerConfig';

export default function WordTrainer() {
  const trainer = getTrainerById('word-trainer');

  return (
    <SrsTrainer
      cards={wordTrainerCards}
      trainer={trainer}
      storageKey={trainer.storageKey}
      seoTitle="Word Trainer | Sblocco Inglese"
      seoDescription="Learn useful English words with pronunciation, Italian meaning, examples, collocations and review timing."
    />
  );
}
