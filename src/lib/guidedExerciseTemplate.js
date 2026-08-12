import { educationalContentBlockTemplate } from './educationalContentTemplate.js';
import { exerciseBuilderQuestionTemplates } from './exerciseBuilderTemplatesV2.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

function withCommonMetadata(question, overrides) {
  return {
    ...clone(question),
    instruction_language: 'it',
    level: 'A1',
    topic: 'adjectives',
    subtopic: 'position_and_form',
    difficulty: 'standard',
    foundation_links: [],
    diagnostics: { tested_codes: [], fallback_error_code: null },
    ...overrides,
  };
}

const teachingBlock = withCommonMetadata(educationalContentBlockTemplate.question, {
  client_key: 'question_adjectives_teaching',
  title: 'Adjectives: forma e posizione',
  prompt: 'Prima di iniziare',
  instructions: 'Leggi la spiegazione e osserva gli esempi prima di continuare.',
  primary_skill: 'grammar',
  learning_objective: 'Recognise where English adjectives go and keep the same adjective form with singular and plural nouns.',
  tags: ['content_block', 'educational', 'grammar', 'adjectives', 'structured'],
});

const recognitionQuestion = withCommonMetadata(exerciseBuilderQuestionTemplates.multiple_choice, {
  client_key: 'question_adjectives_recognition',
  title: 'Riconosci la posizione corretta',
  prompt: 'Which phrase is correct?',
  instructions: 'Scegli la frase naturale in inglese.',
  primary_skill: 'grammar',
  learning_objective: 'Recognise adjective position before a noun.',
  content: {
    options: [
      { key: 'a', text: 'an expensive phone', is_correct: true },
      { key: 'b', text: 'a phone expensive', is_correct: false },
      { key: 'c', text: 'an expensives phone', is_correct: false },
    ],
  },
  grading: { mode: 'automatic', weight: 1, nearly_correct_multiplier: 0.5 },
  feedback: { explanation: 'In inglese l’aggettivo viene normalmente prima del nome e non prende il plurale.' },
  tags: ['multiple_choice', 'automatic', 'adjectives', 'guided'],
});

const controlledGap = withCommonMetadata(exerciseBuilderQuestionTemplates.select_gap, {
  client_key: 'question_adjectives_after_be',
  title: 'Completa la frase',
  prompt: 'Choose the natural completion.',
  instructions: 'Scegli l’opzione corretta.',
  primary_skill: 'grammar',
  learning_objective: 'Use an adjective after be without changing its form.',
  content: {
    text_template: 'The room [[blank_1]].',
    blanks: [
      {
        key: 'blank_1',
        accepted_answers: ['is small'],
        options: ['is small', 'small is', 'is smalls'],
        points: 1,
        feedback: {},
        answer_error_mappings: [],
      },
    ],
  },
  grading: { mode: 'per_blank', weight: 1, nearly_correct_multiplier: 0.5 },
  feedback: { explanation: 'Dopo be l’aggettivo resta invariato: The room is small.' },
  tags: ['select_gap', 'automatic', 'adjectives', 'guided'],
});

const controlledProduction = withCommonMetadata(exerciseBuilderQuestionTemplates.word_order, {
  client_key: 'question_adjectives_word_order',
  title: 'Costruisci la frase',
  prompt: 'Put the words in the correct order.',
  instructions: 'Riordina tutte le parole.',
  primary_skill: 'word_order',
  learning_objective: 'Build a sentence with an adjective after look.',
  content: {
    tokens: ['tired', 'you', 'look'],
    correct_order: ['you', 'look', 'tired'],
    terminal_punctuation: '.',
  },
  grading: { mode: 'automatic', weight: 1, nearly_correct_multiplier: 0.5 },
  feedback: { explanation: 'Con look puoi usare direttamente l’aggettivo: You look tired.' },
  tags: ['word_order', 'automatic', 'adjectives', 'guided'],
});

export const structuredGuidedExerciseTemplate = {
  schema_version: 2,
  entity_type: 'exercise',
  exercise: {
    client_key: 'exercise_guided_adjectives',
    title: 'Adjectives: capire e usare',
    description: 'Una spiegazione strutturata seguita da pratica progressiva su forma e posizione degli aggettivi.',
    instructions: 'Studia la spiegazione, poi passa dal riconoscimento alla produzione controllata.',
    instruction_language: 'it',
    level: 'A1',
    topic: 'adjectives',
    estimated_minutes: 12,
    settings: {
      display_mode: 'one_at_a_time',
      feedback_timing: 'question_end',
      show_score: true,
      show_correct_answers: true,
      show_explanations: true,
      show_diagnostic_summary: true,
      allow_retry: true,
    },
    sections: [
      {
        client_key: 'section_adjectives_guided',
        title: 'Capire e provare',
        instructions: 'La prima attività insegna il punto. Le successive verificano gradualmente se sai riconoscerlo e usarlo.',
        selection_mode: 'fixed',
        feedback_timing: 'question_end',
        questions: [
          teachingBlock,
          recognitionQuestion,
          controlledGap,
          controlledProduction,
        ],
        question_refs: [],
        pool_rules: [],
      },
    ],
    tags: ['template', 'guided', 'structured-teaching', 'adjectives', 'explanation-first'],
    foundation_links: [],
  },
};
