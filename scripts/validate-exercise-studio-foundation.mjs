import assert from 'node:assert/strict';
import fs from 'node:fs';
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
import { stableShuffleWordOrderTokenInstances } from '../src/lib/wordOrderShuffle.js';
import { parseStudioImport } from '../src/lib/exerciseStudioImport.js';

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

const duplicateIdRepair = normalizeStudioDocument({
  ...raw,
  blocks: raw.blocks.slice(0, 2).map((block) => ({ ...block, id: 'duplicate_block' })),
});
assert.notEqual(duplicateIdRepair.document.blocks[0].id, duplicateIdRepair.document.blocks[1].id);
assert.ok(duplicateIdRepair.repairs.some((repair) => repair.code === 'repaired_duplicate_block_id'));

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

const tokenInstances = wordOrderQuestion.content.tokens.map((token, index) => ({ text: token, instanceKey: token + '-' + index }));
const shuffleA = stableShuffleWordOrderTokenInstances(tokenInstances, 'stable_attempt', 'attempt-1:question-1');
const shuffleARepeat = stableShuffleWordOrderTokenInstances(tokenInstances, 'stable_attempt', 'attempt-1:question-1');
const shuffleB = stableShuffleWordOrderTokenInstances(tokenInstances, 'stable_attempt', 'attempt-2:question-1');
assert.deepEqual(shuffleA, shuffleARepeat, 'Word-order shuffle must stay stable within the same attempt.');
assert.notDeepEqual(shuffleA, tokenInstances, 'Studio word-order should not reveal authored correct order.');
assert.ok(shuffleB.length === tokenInstances.length, 'A new attempt must retain the same token multiset.');

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

const authoringExample = fs.readFileSync(
  new URL('../public/templates/sblocco-learning-studio/grammar-mini-course-example-v1.json', import.meta.url),
  'utf8',
);
const importedExample = parseStudioImport(authoringExample);
assert.equal(importedExample.publishable, true, importedExample.errors.map((item) => item.message).join('\n'));
assert.equal(importedExample.needs_attention_blocks, 0);
assert.ok(importedExample.ready_blocks >= 1);

const hostileTechnicalFields = parseStudioImport(JSON.stringify({
  _template: {
    template_id: 'sblocco-grammar-mini-course',
    template_version: 1,
    authoring_contract_version: 1,
  },
  activity: {
    id: 'ai_should_not_control_this',
    internal_code: 'BREAK_RUNTIME',
    internal_title: 'AI technical field test',
    learner_title: 'Technical field test',
    level: 'A2',
    topic: 'present_simple',
    activity_type: 'lesson',
    blocks: [{
      id: 'ai_block',
      sequence_index: 999,
      type: 'multiple_choice',
      prompt: 'She ___ in Bologna.',
      options: [
        { key: 'evil_a', text: 'lives', is_correct: true },
        { key: 'evil_b', text: 'live', is_correct: false },
      ],
      diagnostics: { tested_codes: ['AI_INVENTED_CODE'] },
    }],
  },
}));
assert.notEqual(hostileTechnicalFields.document.id, 'ai_should_not_control_this');
assert.notEqual(hostileTechnicalFields.document.internal_code, 'BREAK_RUNTIME');
assert.notEqual(hostileTechnicalFields.document.blocks[0].id, 'ai_block');
assert.equal(hostileTechnicalFields.document.blocks[0].sequence_index, 1);
assert.equal(hostileTechnicalFields.document.blocks[0].options[0].key, 'option_1');
assert.ok(hostileTechnicalFields.repairs.some((repair) => repair.code === 'removed_ai_diagnostics'));

const mediaImport = parseStudioImport(JSON.stringify({
  _template: {
    template_id: 'sblocco-listening-lesson',
    template_version: 1,
    authoring_contract_version: 1,
  },
  activity: {
    internal_title: 'Media import safety',
    learner_title: 'Media import safety',
    level: 'A2',
    topic: 'listening',
    activity_type: 'listening_lesson',
    blocks: [{
      type: 'media',
      title: 'Listen',
      source_type: 'audio',
      url: 'https://example.com/listen.mp3',
      storage_bucket: 'ai-invented-bucket',
      storage_path: 'ai/invented/path.mp3',
      uploaded_file_name: 'fake.mp3',
    }],
  },
}));
assert.equal(mediaImport.document.blocks[0].url, 'https://example.com/listen.mp3');
assert.equal(mediaImport.document.blocks[0].storage_bucket, '');
assert.equal(mediaImport.document.blocks[0].storage_path, '');
assert.ok(mediaImport.repairs.some((repair) => repair.field === 'blocks.0.storage_path'));

const partialImport = parseStudioImport(JSON.stringify({
  _template: {
    template_id: 'sblocco-grammar-mini-course',
    template_version: 1,
    authoring_contract_version: 1,
  },
  activity: {
    internal_title: 'Partial import',
    learner_title: 'Partial import',
    level: 'A2',
    topic: 'past_simple',
    activity_type: 'mini_course',
    blocks: [
      {
        type: 'explanation',
        body: 'Use the past simple for finished past events.',
      },
      {
        type: 'multiple_choice',
        prompt: 'Yesterday I ___ home early.',
        options: [
          { text: 'went', is_correct: false },
          { text: 'go', is_correct: false },
        ],
      },
      {
        type: 'recap',
        items: ['Finished past time normally uses the past simple.'],
      },
    ],
  },
}));
assert.equal(partialImport.document.blocks.length, 3, 'A bad block must not reject the whole import.');
assert.equal(partialImport.ready_blocks, 2);
assert.equal(partialImport.needs_attention_blocks, 1);
assert.equal(partialImport.publishable, false);
assert.ok(partialImport.errors.some((item) => item.code === 'correct_answer'));

console.log('Learning Studio foundation validated: registry, compiler, safe JSON import, automatic technical repair and publish preflight are coherent.');
