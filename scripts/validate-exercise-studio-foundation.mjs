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
  'multiple_choice_set',
  'practice_selection',
  'translation',
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
      type: 'multiple_choice_set',
      title: 'Which sounds natural?',
      prompt: 'Choose the most natural sentence in each example.',
      instructions: 'Choose one answer for every example.',
      items: [
        {
          key: 'ai_should_not_keep_this',
          prompt: 'Example 1',
          options: [
            { key: 'ai_a', text: 'I have visited Rome last year.', is_correct: false },
            { key: 'ai_b', text: 'I visited Rome last year.', is_correct: true },
            { key: 'ai_c', text: 'I have visit Rome last year.', is_correct: false },
          ],
          feedback: 'Use the past simple with a finished time expression.',
        },
        {
          prompt: 'Example 2',
          options: [
            { text: 'Have you ever been abroad?', is_correct: true },
            { text: 'Did you ever been abroad?', is_correct: false },
            { text: 'Have you ever went abroad?', is_correct: false },
          ],
        },
      ],
    },
    {
      type: 'practice_selection',
      prompt: 'Which expressions would you like to remember?',
      selection_mode: 'multiple',
      options: [
        { text: 'once in a lifetime', vocab_bank: true, vocab_kind: 'chunk' },
        { text: 'memorable', vocab_bank: true, vocab_kind: 'word' },
        { text: 'worth visiting', vocab_bank: false, vocab_kind: null },
      ],
    },
    {
      type: 'translation',
      prompt: 'Traduci: Non sono mai stato in Scozia.',
      accepted_answers: ["I've never been to Scotland.", 'I have never been to Scotland.'],
      learning_objective: 'Translate a present perfect life-experience sentence.',
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
  'reading_comprehension',
  'practice_selection',
  'translation',
  'word_order',
  'content_block',
  'written_response',
]);

const groupedChoiceQuestion = preflight.runtime.exercise.sections[0].questions[3];
assert.equal(groupedChoiceQuestion.content.presentation, 'choice_set');
assert.equal(groupedChoiceQuestion.grading.mode, 'per_item');
assert.equal(groupedChoiceQuestion.content.items.length, 2);
assert.equal(groupedChoiceQuestion.content.items[0].key, 'item_1');
assert.equal(groupedChoiceQuestion.content.items[0].options[0].key, 'option_1');
assert.equal(groupedChoiceQuestion.content.items[0].feedback, 'Use the past simple with a finished time expression.');

const selectionQuestion = preflight.runtime.exercise.sections[0].questions[4];
assert.equal(selectionQuestion.grading.mode, 'ungraded');
assert.equal(selectionQuestion.grading.weight, 0);
assert.deepEqual(selectionQuestion.diagnostics.tested_codes, []);
assert.equal(selectionQuestion.content.options[0].vocab_bank, true);
assert.equal(selectionQuestion.content.options[0].vocab_kind, 'chunk');
assert.equal(selectionQuestion.content.options[1].vocab_kind, 'word');

const translationQuestion = preflight.runtime.exercise.sections[0].questions[5];
assert.equal(translationQuestion.type, 'translation');
assert.equal(translationQuestion.content.accepted_answers.length, 2);

const mediaQuestion = preflight.runtime.exercise.sections[0].questions[7];
assert.equal(mediaQuestion.content.presentation, 'media');
assert.equal(mediaQuestion.content.media.source_type, 'audio');
assert.equal(mediaQuestion.content.media.url, 'https://example.com/audio.mp3');

const wordOrderQuestion = preflight.runtime.exercise.sections[0].questions[6];
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

const invalidChoiceSet = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'Broken grouped choice',
  level: 'B1',
  topic: 'natural_language',
  blocks: [{
    type: 'multiple_choice_set',
    prompt: 'Which sounds natural?',
    items: [
      {
        prompt: 'Example 1',
        options: [
          { text: 'A', is_correct: false },
          { text: 'B', is_correct: false },
        ],
      },
      {
        prompt: 'Example 2',
        options: [
          { text: 'A', is_correct: true },
          { text: 'B', is_correct: false },
        ],
      },
    ],
  }],
});
assert.equal(invalidChoiceSet.valid, false);
assert.ok(invalidChoiceSet.errors.some((item) => item.code === 'correct_answer'));

const importedChoiceSet = parseStudioImport(JSON.stringify({
  _template: {
    template_id: 'sblocco-grammar-mini-course',
    template_version: 1,
    authoring_contract_version: 1,
  },
  activity: {
    internal_title: 'Grouped choices',
    learner_title: 'Which sounds natural?',
    level: 'B1',
    topic: 'natural_language',
    activity_type: 'exercise',
    blocks: [{
      type: 'mcq_set',
      prompt: 'Which sentence sounds most natural?',
      instructions: 'Choose one answer in each example.',
      items: [
        {
          key: 'ai_item',
          prompt: 'Example 1',
          options: [
            { key: 'ai_a', text: 'in response to', is_correct: true },
            { key: 'ai_b', text: 'in response of', is_correct: false },
          ],
        },
        {
          prompt: 'Example 2',
          options: [
            { text: 'more likely to become', is_correct: true },
            { text: 'more likely becoming', is_correct: false },
          ],
        },
      ],
    }],
  },
}));
assert.equal(importedChoiceSet.publishable, true, importedChoiceSet.errors.map((item) => item.message).join('\n'));
assert.equal(importedChoiceSet.document.blocks[0].type, 'multiple_choice_set');
assert.equal(importedChoiceSet.document.blocks[0].items[0].key, 'item_1');
assert.equal(importedChoiceSet.document.blocks[0].items[0].options[0].key, 'option_1');

const invalidVocabBankTag = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'Broken vocab-bank tag',
  level: 'B1',
  topic: 'vocabulary',
  blocks: [{
    type: 'practice_selection',
    prompt: 'Choose.',
    options: [
      { text: 'frazzled', vocab_bank: true },
      { text: 'busy', vocab_bank: false },
    ],
  }],
});
assert.equal(invalidVocabBankTag.valid, false);
assert.ok(invalidVocabBankTag.errors.some((item) => item.code === 'vocab_kind'));

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

const longTranscript = Array.from({ length: 240 }, (_, index) => `Line ${index + 1}: This is a deliberately long transcript segment that must survive Studio import and normalization intact.`).join('\n\n');
const longTranscriptImport = parseStudioImport(JSON.stringify({
  _template: {
    template_id: 'sblocco-listening-lesson',
    template_version: 1,
    authoring_contract_version: 1,
  },
  activity: {
    internal_title: 'Long transcript preservation',
    learner_title: 'Long transcript preservation',
    level: 'B1',
    topic: 'listening',
    activity_type: 'listening_lesson',
    blocks: [{
      type: 'media',
      title: 'Long audio',
      source_type: 'audio',
      url: 'https://example.com/long-audio.mp3',
      transcript: longTranscript,
      transcript_visibility: 'after_submit',
    }],
  },
}));
assert.equal(longTranscriptImport.document.blocks[0].transcript.length, longTranscript.length, 'Studio import must never truncate long transcripts.');
assert.equal(longTranscriptImport.document.blocks[0].transcript, longTranscript, 'Studio transcript content must survive normalization byte-for-byte apart from surrounding whitespace.');

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
