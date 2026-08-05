import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPracticeSession } from '../src/lib/exerciseEngine.js';

const cards = [
  { id: '1', publicId: 'WORD-1', trainerId: 'word', italian: 'mela', english: 'apple', acceptedEnglish: ['apple'] },
  { id: '2', publicId: 'WORD-2', trainerId: 'word', italian: 'pera', english: 'pear', acceptedEnglish: ['pear'] },
  { id: '3', publicId: 'WORD-3', trainerId: 'word', italian: 'pesca', english: 'peach', acceptedEnglish: ['peach'] },
  { id: '4', publicId: 'WORD-4', trainerId: 'word', italian: 'prugna', english: 'plum', acceptedEnglish: ['plum'] },
];

const questions = createPracticeSession(cards, ['italian_to_english_multiple_choice'], 10);
if (questions.length !== cards.length) {
  throw new Error('Italian-to-English multiple choice did not create one question per card.');
}

questions.forEach((question) => {
  const source = cards.find((card) => card.id === question.learningItemId);
  if (question.prompt !== source?.italian || question.correctAnswer !== source?.english) {
    throw new Error('Italian-to-English multiple choice uses the wrong prompt or answer direction.');
  }
  if (!question.options?.includes(source.english) || question.options.some((option) => !cards.some((card) => card.english === option))) {
    throw new Error('Italian-to-English multiple-choice options are not English card values.');
  }
});

const compatibilityMigration = readFileSync(
  'supabase/migrations/20260805170000_allow_italian_to_english_multiple_choice.sql',
  'utf8',
);
assert.match(compatibilityMigration, /admin_replace_assignment_resources/);
assert.match(compatibilityMigration, /admin_replace_assignment_study_scope/);
assert.match(compatibilityMigration, /assignment_study_settings_exercise_modes_allowed_check/);
assert.ok(
  compatibilityMigration.match(/italian_to_english_multiple_choice/g)?.length >= 4,
  'Database compatibility migration must allow the new mode in every validation layer.',
);

console.log('Targeted Practice engine validation passed.');
