import assert from 'node:assert/strict';
import {
  STUDIO_BLOCK_REGISTRY,
  STUDIO_BLOCK_TYPES,
} from '../src/lib/exerciseStudioBlockRegistry.js';
import {
  EXERCISE_STUDIO_SCHEMA_VERSION,
  normalizeStudioDocument,
} from '../src/lib/exerciseStudioDocument.js';
import {
  compileStudioDocument,
  preflightStudioDocument,
} from '../src/lib/exerciseStudioCompiler.js';

const requiredTypes = [
  'explanation',
  'rule',
  'examples',
  'do_dont',
  'contrast',
  'vocabulary',
  'language_bank',
  'dialogue',
  'tip',
  'pronunciation',
  'recap',
  'media',
  'multiple_choice',
  'gap_fill',
  'word_order',
  'written_response',
];

for (const type of requiredTypes) {
  assert.ok(STUDIO_BLOCK_TYPES.includes(type), 'Missing Studio block type: ' + type);
  const definition = STUDIO_BLOCK_REGISTRY[type];
  assert.ok(definition, 'Missing registry definition: ' + type);
  for (const method of ['createDefault', 'normalize', 'validate', 'compile']) {
    assert.equal(typeof definition[method], 'function', type + ' must implement ' + method + '().');
  }
  assert.ok(definition.capabilities?.learnerRenderer, type + ' must declare its learner renderer.');
}

const raw = {
  schema_version: EXERCISE_STUDIO_SCHEMA_VERSION,
  kind: 'learning_activity',
  internal_title: 'A2 — Present Perfect — Life Experiences',
  learner_title: 'Talking about your experiences',
  level: 'A2',
  topic: 'present_perfect',
  activity_type: 'mini_course',
  tags: ['a2', 'present-perfect'],
  blocks: [
    {
      type: 'explanation',
      title: 'When do we use it?',
      body: 'Use the present perfect to connect a past experience to now when the exact finished time is not important.',
    },
    {
      type: 'do_dont',
      title: 'Finished time changes the tense',
      wrong: 'I have visited London last year.',
      correct: 'I visited London last year.',
      why: 'Use the past simple with a finished past-time expression such as last year.',
    },
    {
      type: 'multiple_choice',
      prompt: 'Have you ever ___ to Scotland?',
      learning_objective: 'Choose the correct past participle after have.',
      options: [
        { text: 'been', is_correct: true },
        { text: 'went', is_correct: false },
        { text: 'go', is_correct: false },
      ],
      feedback: { explanation: 'After have, use the past participle: been.' },
    },
    {
      type: 'word_order',
      prompt: 'Build the question.',
      chunks: ['Where', 'have', 'you', 'been'],
      terminal_punctuation: '?',
      learning_objective: 'Build a present perfect experience question.',
    },
    {
      type: 'media',
      title: 'Listen first',
      source_type: 'audio',
      url: 'https://example.com/audio.mp3',
      transcript_visibility: 'after_submit',
    },
    {
      type: 'written_response',
      prompt: 'Write about one place you have visited and say when you went there.',
      min_words: 40,
      max_words: 90,
      required_points: ['Name the place', 'Describe the experience', 'Say when you went'],
      learning_objective: 'Write about a life experience and distinguish experience from finished past time.',
    },
  ],
};

const normalized = normalizeStudioDocument(raw);
assert.ok(normalized.document.id, 'Studio must generate an activity ID.');
assert.ok(normalized.document.internal_code, 'Studio must generate an internal code.');
assert.ok(normalized.document.slug, 'Studio must generate a slug.');
assert.equal(normalized.document.blocks.length, raw.blocks.length);
normalized.document.blocks.forEach((block, index) => {
  assert.ok(block.id, 'Studio must generate block IDs.');
  assert.equal(block.sequence_index, index + 1, 'Studio must own sequence indexes.');
});

const repairCodes = new Set(normalized.repairs.map((repair) => repair.code));
assert.ok(repairCodes.has('generated_activity_id'));
assert.ok(repairCodes.has('generated_internal_code'));
assert.ok(repairCodes.has('generated_slug'));
assert.ok(repairCodes.has('generated_block_id'));
assert.ok(repairCodes.has('reindexed_block'));

const preflight = preflightStudioDocument(raw);
assert.equal(preflight.valid, true, preflight.errors.map((item) => item.message).join('\n'));
assert.ok(preflight.runtime, 'Valid Studio documents must compile to a runtime exercise.');
assert.equal(preflight.runtime.entity_type, 'exercise');
assert.equal(preflight.runtime.exercise.sections.length, 1);

const questionTypes = preflight.runtime.exercise.sections[0].questions.map((question) => question.type);
assert.deepEqual(questionTypes, [
  'content_block',
  'content_block',
  'multiple_choice',
  'word_order',
  'content_block',
  'written_response',
]);

const mediaQuestion = preflight.runtime.exercise.sections[0].questions[4];
assert.equal(mediaQuestion.content.presentation, 'media');
assert.equal(mediaQuestion.content.media.source_type, 'audio');
assert.equal(mediaQuestion.content.media.url, 'https://example.com/audio.mp3');

const wordOrderQuestion = preflight.runtime.exercise.sections[0].questions[3];
assert.equal(wordOrderQuestion.content.shuffle_strategy, 'stable_attempt');
assert.deepEqual(wordOrderQuestion.content.tokens, ['Where', 'have', 'you', 'been']);
assert.deepEqual(wordOrderQuestion.content.correct_order, ['Where', 'have', 'you', 'been']);

const compiledAgain = compileStudioDocument(preflight.document);
assert.equal(compiledAgain.exercise.client_key, preflight.runtime.exercise.client_key, 'Compilation should use stable generated identity.');

const invalidTeachingDecision = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'Broken MCQ',
  level: 'A2',
  topic: 'test',
  blocks: [{
    type: 'multiple_choice',
    prompt: 'Choose.',
    options: [
      { text: 'A', is_correct: false },
      { text: 'B', is_correct: false },
    ],
  }],
});
assert.equal(invalidTeachingDecision.valid, false);
assert.ok(invalidTeachingDecision.errors.some((item) => item.code === 'correct_answer'));
assert.equal(invalidTeachingDecision.runtime, null, 'Compiler must not publish through unresolved teaching decisions.');

const unsupported = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'Unsupported',
  level: 'A2',
  topic: 'test',
  blocks: [{ type: 'mystery_block' }],
});
assert.equal(unsupported.valid, false);
assert.ok(unsupported.errors.some((item) => item.code === 'unsupported_block'));

console.log('Learning Studio foundation validated: canonical registry, automatic technical repair, compiler contract and publish preflight are coherent.');
