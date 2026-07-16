export const EXERCISE_BUILDER_TEMPLATE_VERSION = 2;

const clone = (value) => JSON.parse(JSON.stringify(value));
const automatic = (weight = 1) => ({ mode: 'automatic', weight, nearly_correct_multiplier: 0.5 });
const diagnostics = (tested, fallback) => ({ tested_codes: tested, fallback_error_code: fallback });
const common = {
  instruction_language: 'it',
  difficulty: 'standard',
  feedback: {},
  foundation_links: [],
};
const q = (type, fields) => ({
  ...common,
  client_key: `question_${type}`,
  type,
  tags: [type, fields.grading?.mode === 'manual_review' ? 'manual-review' : 'automatic'],
  ...fields,
});
const rubric = (items) => items.map(([key, label, max_points, description = '']) => ({ key, label, description, max_points }));

const questions = {
  multiple_choice: q('multiple_choice', {
    title: 'Multiple choice', prompt: 'There is not _____ milk in the fridge.', instructions: 'Scegli una risposta.',
    level: 'A1', topic: 'quantifiers', primary_skill: 'grammar', learning_objective: 'Choose the correct quantifier.',
    content: { options: [
      { key: 'many', text: 'many', is_correct: false, error_code: 'QUANTIFIER_MUCH_MANY' },
      { key: 'much', text: 'much', is_correct: true },
      { key: 'few', text: 'a few', is_correct: false, error_code: 'COUNTABILITY' },
    ] }, grading: automatic(), feedback: { explanation: 'Milk is uncountable, so use much.' },
    diagnostics: diagnostics(['QUANTIFIER_MUCH_MANY', 'COUNTABILITY'], 'QUANTIFIER_GENERAL'),
  }),
  multiple_select: q('multiple_select', {
    title: 'Multiple select', prompt: 'Which sentences are correct?', instructions: 'Seleziona tutte le risposte corrette.',
    level: 'A2', topic: 'present_perfect', primary_skill: 'grammar', learning_objective: 'Recognise correct present perfect forms.',
    content: { options: [
      { key: 'a', text: 'I have already finished.', is_correct: true },
      { key: 'b', text: 'She has never visited Rome.', is_correct: true },
      { key: 'c', text: 'We have went home.', is_correct: false, error_code: 'PAST_PARTICIPLE_FORM' },
    ] }, grading: automatic(), diagnostics: diagnostics(['PRESENT_PERFECT_FORM'], 'PRESENT_PERFECT_GENERAL'),
  }),
  gap_fill: q('gap_fill', {
    title: 'Open gap fill', prompt: 'Complete the sentence.', instructions: 'Scrivi la parola mancante.',
    level: 'A1', topic: 'present_simple', primary_skill: 'grammar', learning_objective: 'Use the third-person singular form.',
    content: { text_template: 'She [[blank_1]] to work every day.', blanks: [{ key: 'blank_1', accepted_answers: ['goes'], points: 1, feedback: {}, answer_error_mappings: [{ answer: 'go', error_code: 'PRESENT_SIMPLE_THIRD_PERSON' }] }] },
    grading: { mode: 'per_blank', weight: 1, nearly_correct_multiplier: 0.5 }, diagnostics: diagnostics(['PRESENT_SIMPLE_THIRD_PERSON'], 'PRESENT_SIMPLE_GENERAL'),
  }),
  select_gap: q('select_gap', {
    title: 'Select gap', prompt: 'Complete the sentence.', instructions: 'Scegli dal menu.',
    level: 'A1', topic: 'present_simple', primary_skill: 'grammar', learning_objective: 'Choose the correct verb form.',
    content: { text_template: 'I [[blank_1]] coffee every morning.', blanks: [{ key: 'blank_1', accepted_answers: ['drink'], options: ['drink', 'drinks', 'drinking'], points: 1, feedback: {}, answer_error_mappings: [] }] },
    grading: { mode: 'per_blank', weight: 1, nearly_correct_multiplier: 0.5 }, diagnostics: diagnostics(['PRESENT_SIMPLE_FORM'], 'PRESENT_SIMPLE_GENERAL'),
  }),
  translation: q('translation', {
    title: 'Translation', prompt: 'Traduci: Sto aspettando una risposta.', instructions: 'Scrivi una traduzione naturale.',
    level: 'A2', topic: 'present_continuous', primary_skill: 'grammar', learning_objective: 'Translate an action in progress.',
    content: { accepted_answers: ["I'm waiting for an answer.", 'I am waiting for an answer.'] }, grading: automatic(),
    diagnostics: diagnostics(['PRESENT_CONTINUOUS_FORM'], 'TRANSLATION_GENERAL'),
  }),
  error_correction: q('error_correction', {
    title: 'Error correction', prompt: 'Correct: He do not like coffee.', instructions: 'Riscrivi la frase corretta.',
    level: 'A1', topic: 'present_simple', primary_skill: 'grammar', learning_objective: 'Correct a third-person negative.',
    content: { accepted_answers: ["He doesn't like coffee.", 'He does not like coffee.'] }, grading: automatic(),
    diagnostics: diagnostics(['PRESENT_SIMPLE_NEGATIVE'], 'ERROR_CORRECTION_GENERAL'),
  }),
  word_order: q('word_order', {
    title: 'Word order', prompt: 'Put the words in order.', instructions: 'Riordina tutte le parole.',
    level: 'A1', topic: 'questions', primary_skill: 'word_order', learning_objective: 'Build a present simple question.',
    content: { tokens: ['do', 'you', 'where', 'live'], correct_order: ['where', 'do', 'you', 'live'], terminal_punctuation: '?' }, grading: automatic(),
    diagnostics: diagnostics(['QUESTION_WORD_ORDER'], 'WORD_ORDER_GENERAL'),
  }),
  content_block: q('content_block', {
    title: 'Instruction block', prompt: 'Before you begin', instructions: 'Leggi prima di continuare.',
    level: 'B1', topic: 'integrated_skills', primary_skill: 'reading', learning_objective: 'Read shared instructions.',
    content: { body: 'Use this block for instructions, grammar notes, examples or shared context.' }, grading: automatic(), diagnostics: diagnostics([], null),
  }),
  dialogue_choice: q('dialogue_choice', {
    title: 'Dialogue choice', prompt: 'Choose the most natural reply.', instructions: 'Leggi il dialogo e scegli.',
    level: 'A2', topic: 'everyday_conversation', primary_skill: 'functional_language', learning_objective: 'Choose an appropriate response.',
    content: {
      scenario: 'Two colleagues are arranging lunch.', response_prompt: 'What should Alex say next?',
      turns: [{ key: 'turn_1', speaker: 'Sam', text: 'Are you free at one?' }, { key: 'turn_2', speaker: 'Alex', text: 'I have a meeting until half past one.' }],
      options: [{ key: 'a', text: 'Could we meet at two instead?', is_correct: true }, { key: 'b', text: 'I ate yesterday.', is_correct: false, error_code: 'FUNCTIONAL_LANGUAGE_CONTEXT' }],
    }, grading: automatic(), diagnostics: diagnostics(['FUNCTIONAL_LANGUAGE_RESPONSE'], 'FUNCTIONAL_LANGUAGE_CONTEXT'),
  }),
  written_response: q('written_response', {
    title: 'Written production', prompt: 'Write an email explaining why you missed a meeting and propose a new time.', instructions: 'Rispetta tutti i punti.',
    level: 'B1', topic: 'professional_communication', primary_skill: 'writing', learning_objective: 'Write a clear professional email.',
    content: {
      context: 'You missed a project meeting.', min_words: 80, max_words: 140,
      required_points: ['Apologise', 'Explain briefly', 'Propose a new time'], model_answer: '',
      rubric: rubric([['task', 'Consegna', 4], ['accuracy', 'Accuratezza', 3], ['range', 'Lessico e registro', 3]]),
    }, grading: { mode: 'manual_review', weight: 10 }, diagnostics: diagnostics(['WRITING_TASK_ACHIEVEMENT'], 'WRITING_GENERAL'),
  }),
  dialogue_roleplay: q('dialogue_roleplay', {
    title: 'Dialogue production', prompt: 'Complete the conversation as the character you choose.', instructions: 'Scegli il personaggio e produci le sue battute.',
    level: 'B1', topic: 'hospitality_complaints', primary_skill: 'interaction', learning_objective: 'Respond to a complaint and negotiate a solution.',
    content: {
      scenario: 'A guest reports a noisy room.', response_mode: 'written',
      characters: [
        { key: 'guest', name: 'Guest', description: 'Explain the problem.', selectable: true },
        { key: 'receptionist', name: 'Receptionist', description: 'Offer a solution.', selectable: true },
      ],
      turns: [
        { key: 'turn_1', speaker: 'guest', prompt: 'Explain the problem.', learner_response: true },
        { key: 'turn_2', speaker: 'receptionist', prompt: 'Ask a question.', learner_response: true },
        { key: 'turn_3', speaker: 'guest', prompt: 'Clarify your request.', learner_response: true },
        { key: 'turn_4', speaker: 'receptionist', prompt: 'Offer a solution.', learner_response: true },
      ], model_responses: {}, rubric: rubric([['interaction', 'Gestione del dialogo', 4], ['language', 'Funzioni comunicative', 3], ['accuracy', 'Accuratezza', 3]]),
    }, grading: { mode: 'manual_review', weight: 10 }, diagnostics: diagnostics(['INTERACTION_RESPONSE'], 'INTERACTION_GENERAL'),
  }),
  audio_response: q('audio_response', {
    title: 'Audio response', prompt: 'Record a short answer about a memorable trip.', instructions: 'Riascolta prima di consegnare.',
    level: 'B1', topic: 'past_experiences', primary_skill: 'speaking', learning_objective: 'Describe a past experience clearly.',
    content: {
      context: 'Say where you went, what happened and why it was memorable.', min_seconds: 30, max_seconds: 90, allow_rerecord: true, model_transcript: '',
      rubric: rubric([['task', 'Contenuto', 3], ['fluency', 'Fluidità', 3], ['accuracy', 'Accuratezza', 2], ['pronunciation', 'Pronuncia', 2]]),
    }, grading: { mode: 'manual_review', weight: 10 }, diagnostics: diagnostics(['SPEAKING_PAST_EXPERIENCE'], 'SPEAKING_GENERAL'),
  }),
  reading_comprehension: q('reading_comprehension', {
    title: 'Reading comprehension', prompt: 'Read the text and answer all questions.', instructions: 'Leggi prima per il senso generale.',
    level: 'B1', topic: 'workplace_reading', primary_skill: 'reading', learning_objective: 'Identify main ideas and details.',
    content: {
      title: 'A new hybrid work policy', source_note: 'Original teaching text.',
      passage: 'Employees may work remotely for up to two days each week. Teams must agree on shared office days. New employees will work in the office during their first month.',
      items: [
        { key: 'item_1', type: 'multiple_choice', prompt: 'What is the text about?', points: 1, options: [{ key: 'a', text: 'A work policy.', is_correct: true }, { key: 'b', text: 'A holiday.', is_correct: false }] },
        { key: 'item_2', type: 'true_false', prompt: 'Employees can work remotely every day.', points: 1, options: [{ key: 'true', text: 'Vero', is_correct: false }, { key: 'false', text: 'Falso', is_correct: true }] },
        { key: 'item_3', type: 'short_answer', prompt: 'How long must new employees work in the office?', points: 1, accepted_answers: ['one month', 'their first month'] },
      ],
    }, grading: { mode: 'per_item', weight: 1, nearly_correct_multiplier: 0.5 }, diagnostics: diagnostics(['READING_MAIN_IDEA', 'READING_DETAIL'], 'READING_GENERAL'),
  }),
};

const audioPerTurnRoleplay = q('dialogue_roleplay', {
  client_key: 'question_dialogue_roleplay_audio_per_turn',
  title: 'Recommend a wine',
  prompt: 'Respond to the customer as the sommelier.',
  instructions: 'Record one answer for each of your turns.',
  instruction_language: 'en',
  level: 'B1',
  topic: 'wine_service',
  primary_skill: 'interaction',
  learning_objective: 'Recommend a wine and justify the choice in a realistic customer conversation.',
  content: {
    scenario: 'A customer needs a wine for a dinner with grilled fish.',
    response_mode: 'audio_per_turn',
    characters: [
      { key: 'customer', name: 'Customer', description: 'Asks for a suitable wine.', selectable: false },
      { key: 'sommelier', name: 'Sommelier', description: 'Recommends and explains the pairing.', selectable: true },
    ],
    turns: [
      { key: 'turn_1', speaker: 'customer', text: "Good evening. I'm looking for a wine for a dinner party.", learner_response: false },
      {
        key: 'turn_2', speaker: 'sommelier', prompt: 'Open the interaction and ask what food will be served.', learner_response: true, required: true,
        direction: 'Sound welcoming and professional.', objective: 'Greet the customer and ask about the food.', hint: 'Think about a natural opening question.', retry_hint: 'Try using: What will you be serving?',
        constraints: {
          min_seconds: 6, max_seconds: 25,
          required_points: ['Greet the customer', 'Ask about the food'],
          recommended_language: ["Good evening. How can I help?"],
          required_language: ['What will you be serving?'],
          avoid_language: [],
        },
      },
      { key: 'turn_3', speaker: 'customer', text: "We're having grilled fish, but one guest doesn't like very dry wines.", learner_response: false },
      {
        key: 'turn_4', speaker: 'sommelier', prompt: 'Recommend one wine and explain the pairing.', learner_response: true, required: true,
        direction: 'Give a clear recommendation without sounding overly technical.', context: 'The guest prefers a wine that is not extremely dry.', objective: 'Recommend a suitable wine and justify the pairing.', hint: 'Mention the style or origin of the wine.', retry_hint: 'Make the connection between the fish and your recommendation explicit.',
        constraints: {
          min_seconds: 10, max_seconds: 35,
          required_points: ['Recommend one wine', 'Explain the pairing', 'Mention origin or style'],
          recommended_language: ["I'd recommend", 'It pairs well with'],
          required_language: [],
          avoid_language: ['It is good', 'Very tasty'],
        },
      },
    ],
    rubric: rubric([
      ['interaction', 'Interaction', 4, "Responds naturally to the customer's information."],
      ['functional_language', 'Professional language', 3, 'Uses suitable recommendation and pairing language.'],
      ['fluency', 'Fluency', 3, 'Speaks clearly with manageable hesitation.'],
    ]),
    model_responses: {},
  },
  grading: { mode: 'manual_review', weight: 10 },
  diagnostics: diagnostics(['INTERACTION_RESPONSE'], 'INTERACTION_GENERAL'),
  tags: ['sommelier', 'hospitality', 'audio-roleplay', 'manual-review'],
});

const order = [
  'multiple_choice', 'multiple_select', 'gap_fill', 'select_gap', 'translation', 'error_correction', 'word_order',
  'content_block', 'dialogue_choice', 'reading_comprehension', 'written_response', 'dialogue_roleplay', 'audio_response',
];
const manualTypes = new Set(['written_response', 'dialogue_roleplay', 'audio_response']);
const automaticQuestions = order.filter((type) => !manualTypes.has(type)).map((type) => clone(questions[type]));
const manualQuestions = order.filter((type) => manualTypes.has(type)).map((type) => clone(questions[type]));

export const exerciseBuilderQuestionTemplates = Object.fromEntries(order.map((type) => [type, clone(questions[type])]));

const pool = {
  client_key: 'pool_integrated_review', name: 'Integrated review pool',
  description: 'Every supported automatic and manual question structure.', level: 'Mixed', topic: 'integrated_skills',
  primary_skill: 'grammar', tags: ['template', 'all-types'], foundation_links: [],
  questions: order.map((type) => clone(questions[type])), question_refs: [],
};
const settings = {
  display_mode: 'one_at_a_time', feedback_timing: 'section_end', show_score: true,
  show_correct_answers: true, show_explanations: true, show_diagnostic_summary: true, allow_retry: true,
};
const section = (client_key, title, instructions, feedback_timing, list, refs = false) => ({
  client_key, title, instructions, selection_mode: 'fixed', feedback_timing,
  questions: refs ? [] : list.map(clone), question_refs: refs ? list.map((item) => item.client_key) : [], pool_rules: [],
});
const exercise = {
  client_key: 'exercise_integrated_skills', title: 'Integrated skills practice',
  description: 'A complete example containing all supported question types.',
  instructions: 'Complete every section. Manual productions remain pending until teacher feedback is published.',
  instruction_language: 'it', level: 'Mixed', topic: 'integrated_skills', estimated_minutes: 45, settings,
  sections: [
    section('section_automatic', 'Automatic questions', 'Complete the automatically graded activities.', 'section_end', automaticQuestions),
    section('section_manual', 'Teacher-reviewed production', 'Submit every production for review.', 'exercise_end', manualQuestions),
  ], tags: ['template', 'integrated'], foundation_links: [],
};
const bundlePool = { ...clone(pool), questions: [], question_refs: order.map((type) => questions[type].client_key) };
const bundleExercise = {
  ...clone(exercise),
  sections: [
    section('section_automatic', 'Automatic questions', 'Complete the automatically graded activities.', 'section_end', automaticQuestions, true),
    section('section_manual', 'Teacher-reviewed production', 'Submit every production for review.', 'exercise_end', manualQuestions, true),
  ],
};

export const exerciseBuilderTemplates = {
  question: { schema_version: 2, entity_type: 'question', question: clone(questions.multiple_choice) },
  ...Object.fromEntries(order.map((type) => [type, { schema_version: 2, entity_type: 'question', question: clone(questions[type]) }])),
  dialogue_roleplay_audio_per_turn: { schema_version: 2, entity_type: 'question', question: clone(audioPerTurnRoleplay) },
  question_pool: { schema_version: 2, entity_type: 'question_pool', pool },
  exercise: { schema_version: 2, entity_type: 'exercise', exercise },
  bundle: {
    schema_version: 2, entity_type: 'bundle', questions: order.map((type) => clone(questions[type])),
    pools: [bundlePool], exercises: [bundleExercise],
  },
};

export const exerciseBuilderTemplateManifest = [
  { key: 'question', entityType: 'question', label: 'Domanda base', fileName: 'exercise-builder-question-template.json' },
  ...order.map((type) => ({ key: type, entityType: 'question', label: type, fileName: `exercise-builder-question-${type}-template.json` })),
  { key: 'dialogue_roleplay_audio_per_turn', entityType: 'question', label: 'dialogue_roleplay · audio per turn', fileName: 'exercise-builder-question-dialogue-roleplay-audio-per-turn-template.json' },
  { key: 'question_pool', entityType: 'question_pool', label: 'Pool con tutti i tipi', fileName: 'exercise-builder-question-pool-template.json' },
  { key: 'exercise', entityType: 'exercise', label: 'Esercizio completo', fileName: 'exercise-builder-exercise-template.json' },
  { key: 'bundle', entityType: 'bundle', label: 'Bundle completo', fileName: 'exercise-builder-bundle-template.json' },
];

export function stringifyExerciseBuilderTemplate(type = 'bundle') {
  return JSON.stringify(exerciseBuilderTemplates[type] || exerciseBuilderTemplates.bundle, null, 2);
}
