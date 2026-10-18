import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STUDIO_BLOCK_REGISTRY,
  STUDIO_BLOCK_TYPES,
} from '../src/lib/exerciseStudioBlockRegistry.js';
import {
  EXERCISE_STUDIO_SCHEMA_VERSION,
  addStudioBlock,
  createStudioDocument,
  createStudioRemixDocument,
  normalizeStudioDocument,
} from '../src/lib/exerciseStudioDocument.js';
import {
  compileStudioDocument,
  preflightStudioDocument,
} from '../src/lib/exerciseStudioCompiler.js';
import { stableShuffleWordOrderTokenInstances } from '../src/lib/wordOrderShuffle.js';
import { stableShuffleChoiceOptions } from '../src/lib/choiceOptionShuffle.js';
import { parseStudioImport } from '../src/lib/exerciseStudioImport.js';
import { buildStudioActivitiesZip, buildStudioActivityExport } from '../src/lib/exerciseStudioExport.js';
import { applyStudioRecipe, buildStudioActivityPulse, STUDIO_RECIPES } from '../src/lib/exerciseStudioRecipes.js';

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
  'reading_comprehension',
  'open_answer_set',
  'practice_selection',
  'translation',
  'gap_fill',
  'word_order',
  'written_response',
  'speaking_response',
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

const recordedSpeaking = addStudioBlock(
  createStudioDocument({ internal_title: 'Recorded speaking', learner_title: 'Describe your experience', level: 'B1', topic: 'speaking', skills: ['speaking'] }),
  'speaking_response',
  { prompt: 'Explain a problem you solved while travelling.', context: 'Tell a friend what happened.', min_seconds: 15, max_seconds: 90 },
);
const recordedPreflight = preflightStudioDocument(recordedSpeaking);
assert.equal(recordedPreflight.valid, true, recordedPreflight.errors.map((item) => item.message).join('\n'));
const recordedQuestion = recordedPreflight.runtime.exercise.sections[0].questions[0];
assert.equal(recordedQuestion.type, 'audio_response');
assert.equal(recordedQuestion.grading.mode, 'manual_review');
assert.equal(recordedQuestion.content.max_seconds, 90);
assert.equal(recordedQuestion.content.min_seconds, 15);
assert.ok(recordedQuestion.content.rubric.length > 0);
const recordedInvalid = preflightStudioDocument({ ...recordedSpeaking, blocks: [{ ...recordedSpeaking.blocks[0], prompt: '' }] });
assert.equal(recordedInvalid.valid, false, 'An empty speaking task must never publish.');
const recordedExport = buildStudioActivityExport(recordedPreflight.document);
const recordedReimport = parseStudioImport(JSON.stringify(recordedExport));
assert.equal(recordedReimport.publishable, true, recordedReimport.errors.map((item) => item.message).join('\n'));
assert.equal(recordedReimport.document.blocks[0].type, 'speaking_response');

const multiWrite = addStudioBlock(
  createStudioDocument({ internal_title: 'Write a message', learner_title: 'Make a choice', level: 'B1', topic: 'communication', skills: ['writing'] }),
  'written_response',
  {
    prompt: 'Write to a colleague about changing a meeting.',
    prompt_options: [
      'Write to a colleague about changing a meeting.',
      'Write to a client about changing an appointment.',
      'Write to a friend about changing a plan.',
    ],
    min_words: 40,
    max_words: 100,
  },
);
const multiWritePreflight = preflightStudioDocument(multiWrite);
assert.equal(multiWritePreflight.valid, true, multiWritePreflight.errors.map((e) => e.message).join('\\n'));
const multiWriteRuntime = multiWritePreflight.runtime.exercise.sections[0].questions[0];
assert.equal(multiWriteRuntime.type, 'written_response');
assert.equal(multiWriteRuntime.prompt, multiWrite.blocks[0].prompt);
assert.deepEqual(multiWriteRuntime.content.prompt_options, multiWrite.blocks[0].prompt_options);
assert.equal(multiWriteRuntime.grading.mode, 'manual_review');
const multiWriteImport = parseStudioImport(JSON.stringify(buildStudioActivityExport(multiWritePreflight.document)));
assert.equal(multiWriteImport.publishable, true, multiWriteImport.errors.map((e) => e.message).join('\\n'));
assert.deepEqual(multiWriteImport.document.blocks[0].prompt_options, multiWrite.blocks[0].prompt_options);
for (const options of [
  ['A', 'B', 'C', 'D'],
  ['A', 'A'],
  ['A', ''],
]) {
  const testDoc = {
    ...multiWrite,
    blocks: [{ ...multiWrite.blocks[0], prompt: options[0], prompt_options: options }],
  };
  assert.equal(preflightStudioDocument(testDoc).valid, false, 'Invalid prompt choices must not be publishable.');
}
const multiSpeaking = {
  ...recordedSpeaking,
  blocks: [{
    ...recordedSpeaking.blocks[0],
    prompt_options: [
      'Explain a problem you solved while travelling.',
      'Explain a problem you solved at work.',
      'Explain a problem you helped a friend solve.',
    ],
  }],
};
const multiSpeakingPreflight = preflightStudioDocument(multiSpeaking);
assert.equal(multiSpeakingPreflight.valid, true, multiSpeakingPreflight.errors.map((e) => e.message).join('\\n'));
assert.equal(multiSpeakingPreflight.runtime.exercise.sections[0].questions[0].content.prompt_options.length, 3);
assert.equal(multiSpeakingPreflight.runtime.exercise.sections[0].questions[0].grading.mode, 'manual_review');
const singleWrite = addStudioBlock(
  createStudioDocument({ internal_title: 'Single writing', learner_title: 'Single writing', topic: 'communication' }),
  'written_response',
  { prompt: 'Write about a day you will never forget.' },
);
assert.equal(preflightStudioDocument(singleWrite).valid, true, 'Existing single-prompt writing must keep working.');
assert.deepEqual(preflightStudioDocument(singleWrite).runtime.exercise.sections[0].questions[0].content.prompt_options,
  ['Write about a day you will never forget.']);

const rendererSource = fs.readFileSync('src/components/exercises/ExerciseQuestionRendererV2.jsx', 'utf8');
assert.ok(rendererSource.includes('ProductionPromptCarousel'), 'Both production blocks must use the shared one-at-a-time carousel.');
const carouselSource = fs.readFileSync('src/components/exercises/ProductionPromptCarousel.jsx', 'utf8');
assert.match(carouselSource, /onNavigate\(\(selected \+ 1\) % total\)/, 'Carousel must navigate to the next prompt.');
assert.match(carouselSource, /navigationLocked/, 'Carousel navigation must lock during recording and submissions.');
assert.match(carouselSource, /Your friend says/, 'Carousel must preserve the dialogue scenario.');
assert.match(carouselSource, /Your response should/, 'Carousel must distinguish the task from the dialogue.');
assert.match(rendererSource, /prompt_index: chosenIndex/, 'The selected option must persist on the learner response.');
assert.match(rendererSource, /discardExerciseAudioSubmission/, 'Switching topics after recording must explicitly discard audio.');
assert.match(rendererSource, /Changing the prompt will clear your current writing/, 'A prompt switch must protect written drafts.');
assert.ok(rendererSource.includes('prompt_index: chosenIndex'), 'Writing and audio must persist the chosen prompt.');
assert.ok(fs.readFileSync('src/pages/AdminExerciseResults.jsx', 'utf8').includes('item.answer?.text'),
  'Writing review must read structured answers.');

const authoredChoiceOptions = [
  { key: 'option_1', text: 'A' },
  { key: 'option_2', text: 'B' },
  { key: 'option_3', text: 'C' },
  { key: 'option_4', text: 'D' },
];
const shuffledChoiceA = stableShuffleChoiceOptions(authoredChoiceOptions, 'stable_attempt', 'attempt-1:item-1');
const shuffledChoiceAAgain = stableShuffleChoiceOptions(authoredChoiceOptions, 'stable_attempt', 'attempt-1:item-1');
const shuffledChoiceB = stableShuffleChoiceOptions(authoredChoiceOptions, 'stable_attempt', 'attempt-2:item-1');
assert.deepEqual(
  shuffledChoiceA.map((option) => option.key),
  shuffledChoiceAAgain.map((option) => option.key),
  'Multiple-choice option order must stay stable within one attempt.',
);
assert.notDeepEqual(
  shuffledChoiceA.map((option) => option.key),
  authoredChoiceOptions.map((option) => option.key),
  'Stable shuffle must not accidentally preserve the authored option order.',
);
assert.ok(
  shuffledChoiceB.some((option, index) => option.key !== shuffledChoiceA[index]?.key)
    || shuffledChoiceB.length < 3,
  'Different attempt seeds should be able to produce a different option order.',
);

const freshReadingActivity = createStudioDocument({
  internal_title: '',
  learner_title: '',
  level: 'B2',
  topic: 'b2_reading',
  activity_type: 'lesson',
  skills: ['reading'],
});
const part5PresetActivity = addStudioBlock(freshReadingActivity, 'reading_comprehension', {}, 'b2_part5');
assert.equal(part5PresetActivity.blocks[0].format, 'b2_part5');
assert.equal(part5PresetActivity.blocks[0].items.length, 6);
assert.ok(part5PresetActivity.blocks[0].items.every((item) => item.options.length === 4));
assert.ok(part5PresetActivity.blocks[0].items.every((item) => item.options.every((option) => option.is_correct === false)));
assert.equal(part5PresetActivity.activity_type, 'lesson', 'Reading preset must not change teacher-owned activity type.');

const part6PresetActivity = addStudioBlock(freshReadingActivity, 'reading_comprehension', {}, 'b2_part6');
assert.equal(part6PresetActivity.blocks[0].passage_parts.filter((part) => part.type === 'gap').length, 6);
assert.equal(part6PresetActivity.blocks[0].paragraph_options.length, 7);
assert.ok(part6PresetActivity.blocks[0].passage_parts.filter((part) => part.type === 'gap').every((part) => part.correct_option_index === null));

const part7PresetActivity = addStudioBlock(freshReadingActivity, 'reading_comprehension', {}, 'b2_part7');
assert.equal(part7PresetActivity.blocks[0].sections.length, 4);
assert.equal(part7PresetActivity.blocks[0].items.length, 10);
assert.ok(part7PresetActivity.blocks[0].items.every((item) => item.correct_section_index === null));

assert.deepEqual(
  STUDIO_RECIPES.map((recipe) => recipe.id),
  ['quick_lesson', 'grammar_arc', 'listening_arc', 'vocabulary_to_use'],
  'Studio Recipes should remain a small intentional set.',
);

for (const recipe of STUDIO_RECIPES) {
  const recipeDocument = applyStudioRecipe(createStudioDocument({
    internal_title: 'Recipe test',
    level: 'A2',
    topic: 'test',
  }), recipe.id);
  assert.ok(recipeDocument.blocks.length >= 4, recipe.id + ' must create a meaningful learning sequence.');
  assert.equal(recipeDocument.activity_type, recipe.activity_type, recipe.id + ' must set the intended activity type.');
  assert.equal(
    new Set(recipeDocument.blocks.map((block) => block.id)).size,
    recipeDocument.blocks.length,
    recipe.id + ' must keep system-owned block IDs unique.',
  );
  for (const block of recipeDocument.blocks) {
    assert.ok(STUDIO_BLOCK_TYPES.includes(block.type), recipe.id + ' may only use registered Studio blocks.');
  }
}

const teachOnlyPulse = buildStudioActivityPulse(addStudioBlock(
  createStudioDocument({ internal_title: 'Teach only', topic: 'test' }),
  'explanation',
  { body: 'A clear explanation.' },
));
assert.equal(teachOnlyPulse.counts.teach, 1);
assert.equal(teachOnlyPulse.counts.practice, 0);
assert.equal(teachOnlyPulse.suggestion?.type, 'multiple_choice_set', 'Activity Pulse should recommend practice after teaching.');

const grammarRecipePulse = buildStudioActivityPulse(applyStudioRecipe(
  createStudioDocument({ internal_title: 'Grammar arc', topic: 'test' }),
  'grammar_arc',
));
assert.ok(grammarRecipePulse.counts.teach > 0);
assert.ok(grammarRecipePulse.counts.practice > 0);
assert.ok(grammarRecipePulse.counts.produce > 0);
assert.equal(grammarRecipePulse.complete, true, 'Grammar recipe should already span teach, practice and production.');

const studioPageSource = fs.readFileSync('src/pages/AdminExerciseStudio.jsx', 'utf8');
assert.ok(studioPageSource.includes('StudioActivityPulse'), 'Learning Studio must surface Activity Pulse.');
assert.ok(studioPageSource.includes('Publish & assign'), 'Learning Studio must expose the one-step publish-and-assign action.');
assert.ok(studioPageSource.includes('onRecipe={startRecipe}'), 'Learning Studio empty state must expose Studio Recipes.');

const remixSource = addStudioBlock(
  createStudioDocument({
    internal_title: 'B2 Reading Master',
    learner_title: 'Reading Master',
    level: 'B2',
    topic: 'reading',
    activity_type: 'lesson',
    tags: ['reading', 'master'],
  }),
  'reading_comprehension',
  {
    title: 'Original reading',
    format: 'b2_part5',
    passage: 'Original content.',
    items: Array.from({ length: 6 }, (_, index) => ({
      prompt: 'Question ' + (index + 1),
      options: Array.from({ length: 4 }, (_, optionIndex) => ({
        text: 'Option ' + (optionIndex + 1),
        is_correct: optionIndex === 0,
      })),
    })),
  },
);
const remixA = createStudioRemixDocument(remixSource);
const remixB = createStudioRemixDocument(remixSource);
assert.notEqual(remixA.id, remixSource.id, 'Remix must generate a fresh activity ID.');
assert.notEqual(remixA.internal_code, remixSource.internal_code, 'Remix must generate a fresh internal code.');
assert.notEqual(remixA.blocks[0].id, remixSource.blocks[0].id, 'Remix must generate fresh block IDs.');
assert.notEqual(remixA.id, remixB.id, 'Separate remixes must not share activity IDs.');
assert.notEqual(remixA.blocks[0].id, remixB.blocks[0].id, 'Separate remixes must not share block IDs.');
assert.equal(remixA.status, 'draft');
assert.equal(remixA.learner_title, remixSource.learner_title);
assert.equal(remixA.blocks[0].passage, remixSource.blocks[0].passage);
assert.match(remixA.internal_title, /Remix$/);

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
      transcript: 'This is the activity transcript used later in the lesson.',
      transcript_visibility: 'after_submit',
    },
    {
      type: 'written_response',
      prompt: 'Read the transcript, then write about one place you have visited and say when you went there.',
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
assert.equal(normalized.document.settings.feedback_timing, 'exercise_end', 'Studio must default learner results to exercise end.');
assert.equal(normalized.document.blocks.length, raw.blocks.length);
normalized.document.blocks.forEach((block, index) => {
  assert.ok(block.id, 'Studio must generate block IDs.');
  assert.equal(block.sequence_index, index + 1, 'Studio must own sequence indexes.');
});

const compiledDefaultFeedback = compileStudioDocument({
  ...normalized.document,
  settings: {
    ...normalized.document.settings,
    feedback_timing: undefined,
  },
});
assert.equal(compiledDefaultFeedback.exercise.settings.feedback_timing, 'exercise_end');
assert.equal(compiledDefaultFeedback.exercise.sections[0].feedback_timing, 'exercise_end');

const exported = buildStudioActivityExport(normalized.document);
assert.equal(exported._template.template_id, 'sblocco-learning-activity');
assert.deepEqual(exported.activity.tags, raw.tags, 'Studio JSON export must preserve teacher-authored tags.');
assert.equal(Object.hasOwn(exported.activity, 'id'), false, 'Portable export must omit activity IDs.');
assert.equal(Object.hasOwn(exported.activity, 'internal_code'), false, 'Portable export must omit internal codes.');
assert.equal(Object.hasOwn(exported.activity, 'slug'), false, 'Portable export must omit system slugs.');
assert.equal(Object.hasOwn(exported.activity.blocks[0], 'id'), false, 'Portable export must omit block IDs.');
assert.equal(Object.hasOwn(exported.activity.blocks[0], 'sequence_index'), false, 'Portable export must omit sequence indexes.');

const reimportedExport = parseStudioImport(JSON.stringify(exported));
assert.equal(reimportedExport.publishable, true, reimportedExport.errors.map((item) => item.message).join('\n'));
assert.deepEqual(reimportedExport.document.tags, raw.tags, 'Exported JSON must round-trip tags through Studio import.');
assert.equal(reimportedExport.document.blocks.length, raw.blocks.length, 'Exported JSON must round-trip every authored block.');

const bulkZip = buildStudioActivitiesZip([
  normalized.document,
  { ...normalized.document, internal_title: normalized.document.internal_title + ' Copy' },
]);
assert.ok(bulkZip instanceof Uint8Array, 'Bulk Studio export must create ZIP bytes.');
assert.equal(new DataView(bulkZip.buffer, bulkZip.byteOffset, bulkZip.byteLength).getUint32(0, true), 0x04034b50, 'Bulk Studio export must start with a ZIP local-file header.');
assert.ok(
  new TextDecoder().decode(bulkZip).includes('.json'),
  'Bulk Studio export must contain individually named JSON files.',
);

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
assert.equal(groupedChoiceQuestion.content.shuffle_options, 'stable_attempt');
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

const transcriptReferencedWriting = preflight.runtime.exercise.sections[0].questions[8];
assert.equal(
  transcriptReferencedWriting.content.transcript_reference,
  true,
  'Blocks that explicitly reference the transcript must compile with contextual transcript access.',
);

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

const missingTranscriptReference = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'Transcript reference without source',
  level: 'B1',
  topic: 'listening',
  blocks: [{
    type: 'written_response',
    prompt: 'Read the transcript and summarise the speaker’s point.',
    min_words: 20,
    max_words: 60,
  }],
});
assert.equal(missingTranscriptReference.valid, false);
assert.ok(
  missingTranscriptReference.errors.some((item) => item.code === 'missing_referenced_transcript'),
  'Studio must stop publish when a learner task references a transcript that does not exist.',
);

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

const openAnswerSet = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'Grouped translations',
  level: 'B1',
  topic: 'workplace_language',
  blocks: [{
    type: 'open_answer_set',
    prompt: 'Translate each sentence naturally.',
    instructions: 'Write one answer for every item.',
    items: [
      {
        key: 'ai_item_1',
        prompt: 'Non posso rimandarlo ancora.',
        accepted_answers: ["I can't put it off any longer.", 'I cannot put it off any longer.'],
        feedback: 'Put off means postpone.',
      },
      {
        prompt: 'È più probabile che succeda sotto pressione.',
        accepted_answers: ["It's more likely to happen under pressure.", 'It is more likely to happen under pressure.'],
      },
    ],
  }],
});
assert.equal(openAnswerSet.valid, true, openAnswerSet.errors.map((item) => item.message).join('\n'));
const openSetQuestion = openAnswerSet.runtime.exercise.sections[0].questions[0];
assert.equal(openSetQuestion.type, 'reading_comprehension');
assert.equal(openSetQuestion.content.presentation, 'open_answer_set');
assert.equal(openSetQuestion.grading.mode, 'per_item');
assert.equal(openSetQuestion.content.items[0].key, 'item_1');
assert.equal(openSetQuestion.content.items[0].type, 'short_answer');
assert.deepEqual(openSetQuestion.content.items[0].accepted_answers, ["I can't put it off any longer.", 'I cannot put it off any longer.']);
assert.equal(openSetQuestion.content.items[0].feedback, 'Put off means postpone.');

const importedOpenAnswerSet = parseStudioImport(JSON.stringify({
  _template: {
    template_id: 'sblocco-grammar-mini-course',
    template_version: 1,
    authoring_contract_version: 1,
  },
  activity: {
    internal_title: 'Imported grouped translations',
    learner_title: 'Translate naturally',
    level: 'B1',
    topic: 'workplace_language',
    activity_type: 'exercise',
    blocks: [{
      type: 'translation_set',
      prompt: 'Translate each sentence naturally.',
      items: [
        {
          key: 'ai_owned_key',
          prompt: 'Non posso rimandarlo ancora.',
          accepted_answers: ["I can't put it off any longer."],
        },
        {
          prompt: 'È più probabile che succeda.',
          accepted_answers: ["It's more likely to happen."],
        },
      ],
    }],
  },
}));
assert.equal(importedOpenAnswerSet.publishable, true, importedOpenAnswerSet.errors.map((item) => item.message).join('\n'));
assert.equal(importedOpenAnswerSet.document.blocks[0].type, 'open_answer_set');
assert.equal(importedOpenAnswerSet.document.blocks[0].items[0].key, 'item_1');

const invalidOpenAnswerSet = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'Broken open-answer set',
  level: 'B1',
  topic: 'test',
  blocks: [{
    type: 'open_answer_set',
    prompt: 'Answer each item.',
    items: [
      { prompt: 'One', accepted_answers: [] },
      { prompt: 'Two', accepted_answers: ['Two'] },
    ],
  }],
});
assert.equal(invalidOpenAnswerSet.valid, false);
assert.ok(invalidOpenAnswerSet.errors.some((item) => item.code === 'accepted_answer'));

const b2Part5 = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'B2 Part 5 reading',
  learner_title: 'Close reading',
  level: 'B2',
  topic: 'reading',
  blocks: [{
    type: 'reading_comprehension',
    format: 'b2_part5',
    title: 'Working differently',
    prompt: 'Read the text and choose the best answer.',
    passage: 'A complete original B2 passage with enough evidence for every question.',
    items: Array.from({ length: 6 }, (_, index) => ({
      prompt: 'Question ' + (index + 1),
      options: [
        { text: 'A' + index, is_correct: index % 4 === 0 },
        { text: 'B' + index, is_correct: index % 4 === 1 },
        { text: 'C' + index, is_correct: index % 4 === 2 },
        { text: 'D' + index, is_correct: index % 4 === 3 },
      ],
    })),
  }],
});
assert.equal(b2Part5.valid, true, b2Part5.errors.map((item) => item.message).join('\n'));
const b2Part5Question = b2Part5.runtime.exercise.sections[0].questions[0];
assert.equal(b2Part5Question.type, 'reading_comprehension');
assert.equal(b2Part5Question.content.presentation, 'b2_part5');
assert.equal(b2Part5Question.content.items.length, 6);
assert.ok(b2Part5Question.content.items.every((item) => item.points === 2));
assert.ok(b2Part5Question.content.items.every((item) => item.options.length === 4));

const part6Parts = [];
for (let index = 0; index < 6; index += 1) {
  part6Parts.push({ type: 'text', text: 'Visible section ' + (index + 1) + '.' });
  part6Parts.push({ type: 'gap', correct_option_index: index });
}
part6Parts.push({ type: 'text', text: 'Final visible section.' });

const b2Part6 = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'B2 Part 6 reading',
  learner_title: 'Gapped text',
  level: 'B2',
  topic: 'reading',
  blocks: [{
    type: 'reading_comprehension',
    format: 'b2_part6',
    title: 'How ideas connect',
    prompt: 'Choose the paragraph that fits each gap.',
    passage_parts: part6Parts,
    paragraph_options: Array.from({ length: 7 }, (_, index) => ({ text: 'Paragraph option ' + String.fromCharCode(65 + index) + '.' })),
  }],
});
assert.equal(b2Part6.valid, true, b2Part6.errors.map((item) => item.message).join('\n'));
const b2Part6Question = b2Part6.runtime.exercise.sections[0].questions[0];
assert.equal(b2Part6Question.content.presentation, 'b2_part6');
assert.equal(b2Part6Question.content.items.length, 6);
assert.equal(b2Part6Question.content.paragraph_options.length, 7);
assert.ok(b2Part6Question.content.items.every((item) => item.points === 2));
assert.equal(b2Part6Question.content.items[0].options.filter((option) => option.is_correct).length, 1);

const b2Part7 = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'B2 Part 7 reading',
  learner_title: 'Multiple matching',
  level: 'B2',
  topic: 'reading',
  blocks: [{
    type: 'reading_comprehension',
    format: 'b2_part7',
    title: 'Different viewpoints',
    prompt: 'Match each statement to a section.',
    sections: [
      { title: 'First person', text: 'Section A text with clear evidence.' },
      { title: 'Second person', text: 'Section B text with clear evidence.' },
      { title: 'Third person', text: 'Section C text with clear evidence.' },
      { title: 'Fourth person', text: 'Section D text with clear evidence.' },
    ],
    items: Array.from({ length: 10 }, (_, index) => ({
      prompt: 'Statement ' + (index + 1),
      correct_section_index: index % 4,
    })),
  }],
});
assert.equal(b2Part7.valid, true, b2Part7.errors.map((item) => item.message).join('\n'));
const b2Part7Question = b2Part7.runtime.exercise.sections[0].questions[0];
assert.equal(b2Part7Question.content.presentation, 'b2_part7');
assert.equal(b2Part7Question.content.sections.length, 4);
assert.equal(b2Part7Question.content.items.length, 10);
assert.ok(b2Part7Question.content.items.every((item) => item.points === 1));

const unresolvedB2Answer = preflightStudioDocument({
  schema_version: 1,
  kind: 'learning_activity',
  internal_title: 'Incomplete B2 Part 7',
  learner_title: 'Incomplete matching',
  level: 'B2',
  topic: 'reading',
  blocks: [{
    type: 'reading_comprehension',
    format: 'b2_part7',
    prompt: 'Match.',
    sections: [
      { text: 'Section A.' },
      { text: 'Section B.' },
      { text: 'Section C.' },
    ],
    items: Array.from({ length: 10 }, (_, index) => ({
      prompt: 'Statement ' + (index + 1),
      correct_section_index: index === 0 ? null : index % 3,
    })),
  }],
});
assert.equal(unresolvedB2Answer.valid, false);
assert.ok(unresolvedB2Answer.errors.some((item) => item.code === 'correct_answer'));

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

function assertNoEmDashTitles(document, label) {
  const titles = [
    document.internal_title,
    document.learner_title,
    ...(document.blocks || []).map((block) => block?.title),
  ].filter((value) => typeof value === 'string');

  assert.equal(
    titles.some((value) => value.includes('—')),
    false,
    `${label} must use "|" rather than em dashes in generated titles.`,
  );
}

const authoringExample = fs.readFileSync(
  new URL('../public/templates/sblocco-learning-studio/grammar-mini-course-example-v1.json', import.meta.url),
  'utf8',
);
const importedExample = parseStudioImport(authoringExample);
assert.equal(importedExample.publishable, true, importedExample.errors.map((item) => item.message).join('\n'));
assert.equal(importedExample.needs_attention_blocks, 0);
assert.ok(importedExample.ready_blocks >= 1);
assertNoEmDashTitles(importedExample.document, 'Grammar authoring example');

const universalAuthoringExample = fs.readFileSync(
  new URL('../public/templates/sblocco-learning-studio/learning-activity-example-v1.json', import.meta.url),
  'utf8',
);
const importedUniversalExample = parseStudioImport(universalAuthoringExample);
assert.equal(
  importedUniversalExample.publishable,
  true,
  importedUniversalExample.errors.map((item) => item.message).join('\n'),
);
assert.equal(importedUniversalExample.needs_attention_blocks, 0);
assert.equal(importedUniversalExample.document.activity_type, 'lesson');
assert.equal(importedUniversalExample.document.level, 'B1');
assert.ok(importedUniversalExample.ready_blocks >= 10);
assertNoEmDashTitles(importedUniversalExample.document, 'Universal authoring example');
assert.ok(
  importedUniversalExample.document.blocks.some((block) => block.type === 'vocabulary'),
  'Universal benchmark should exercise vocabulary authoring.',
);
assert.ok(
  importedUniversalExample.document.blocks.some((block) => block.type === 'written_response'),
  'Universal benchmark should exercise manual-review production.',
);

const goldAssessment = fs.readFileSync(
  new URL('../public/templates/sblocco-learning-studio/gold-benchmark-a1plus-a2-threshold-assessment-v1.json', import.meta.url),
  'utf8',
);
const importedGoldAssessment = parseStudioImport(goldAssessment);
assert.equal(
  importedGoldAssessment.publishable,
  true,
  importedGoldAssessment.errors.map((item) => item.message).join('\n'),
);
assert.equal(importedGoldAssessment.needs_attention_blocks, 0);
assert.equal(importedGoldAssessment.document.activity_type, 'assessment');
assert.equal(importedGoldAssessment.document.level, 'A1+');
assert.equal(importedGoldAssessment.document.settings.feedback_timing, 'exercise_end');
assertNoEmDashTitles(importedGoldAssessment.document, 'Gold assessment');
assert.ok(importedGoldAssessment.ready_blocks >= 11);
assert.ok(
  importedGoldAssessment.document.blocks.some((block) => block.type === 'multiple_choice_set'),
  'Gold assessment should include grouped recognition tasks.',
);
assert.ok(
  importedGoldAssessment.document.blocks.some((block) => block.type === 'open_answer_set'),
  'Gold assessment should include active retrieval.',
);
assert.ok(
  importedGoldAssessment.document.blocks.some((block) => block.type === 'word_order'),
  'Gold assessment should include sentence construction.',
);

const goldReading = fs.readFileSync(
  new URL('../public/templates/sblocco-learning-studio/gold-benchmark-b2-reading-exam-style-v1.json', import.meta.url),
  'utf8',
);
const importedGoldReading = parseStudioImport(goldReading);
assert.equal(
  importedGoldReading.publishable,
  true,
  importedGoldReading.errors.map((item) => item.message).join('\n'),
);
assert.equal(importedGoldReading.needs_attention_blocks, 0);
assert.equal(importedGoldReading.document.level, 'B2');
assert.equal(importedGoldReading.document.blocks.length, 3);
assert.deepEqual(
  importedGoldReading.document.blocks.map((block) => block.type),
  ['reading_comprehension', 'reading_comprehension', 'reading_comprehension'],
);
assert.deepEqual(
  importedGoldReading.document.blocks.map((block) => block.format),
  ['b2_part5', 'b2_part6', 'b2_part7'],
);
assertNoEmDashTitles(importedGoldReading.document, 'Gold B2 reading');

const goldListening = fs.readFileSync(
  new URL('../public/templates/sblocco-learning-studio/gold-benchmark-b2-listening-vocabulary-chunks-v1.json', import.meta.url),
  'utf8',
);
const importedGoldListening = parseStudioImport(goldListening);
assert.equal(
  importedGoldListening.publishable,
  true,
  importedGoldListening.errors.map((item) => item.message).join('\n'),
);
assert.equal(importedGoldListening.needs_attention_blocks, 0);
assert.equal(importedGoldListening.document.activity_type, 'listening_lesson');
assert.equal(importedGoldListening.document.level, 'B2');
assert.equal(importedGoldListening.document.settings.feedback_timing, 'exercise_end');
assertNoEmDashTitles(importedGoldListening.document, 'Gold listening lesson');
assert.ok(importedGoldListening.ready_blocks >= 15);
const goldListeningMedia = importedGoldListening.document.blocks.filter((block) => block.type === 'media');
assert.ok(goldListeningMedia.length >= 4, 'Gold listening should use staged media passes.');
assert.equal(goldListeningMedia[0].transcript_visibility, 'never');
assert.equal(goldListeningMedia.at(-1).transcript_visibility, 'always');
assert.ok(
  importedGoldListening.document.blocks.some((block) => block.type === 'vocabulary'),
  'Gold listening should teach individual vocabulary explicitly.',
);
assert.ok(
  importedGoldListening.document.blocks.some((block) => block.type === 'language_bank'),
  'Gold listening should teach reusable chunks.',
);
assert.ok(
  importedGoldListening.document.blocks.some((block) => block.type === 'practice_selection'),
  'Gold listening should support learner vocabulary-bank selection.',
);

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


const quickAssignPanelSource = fs.readFileSync(
  new URL('../src/components/admin/exercise-studio/StudioQuickAssignPanel.jsx', import.meta.url),
  'utf8',
);
const quickAssignApiSource = fs.readFileSync(
  new URL('../src/lib/exerciseStudioAssignmentApi.js', import.meta.url),
  'utf8',
);
const retryGuardMigrationSource = fs.readFileSync(
  new URL('../supabase/migrations/20260922193603_assignment_retry_guard.sql', import.meta.url),
  'utf8',
);
const comprehensionSummaryMigrationSource = fs.readFileSync(
  new URL('../supabase/migrations/20260922193322_comprehension_item_result_summaries.sql', import.meta.url),
  'utf8',
);

assert.match(
  quickAssignPanelSource,
  /useState\('submitted'\)/,
  'Studio Quick Assign must default completion to first submission.',
);
assert.match(
  quickAssignApiSource,
  /completionRule = 'submitted'/,
  'Studio assignment API must default completion to first submission.',
);
assert.match(
  quickAssignPanelSource,
  /retryRequiredByAttempts/,
  'Studio Quick Assign must auto-enable retry for multi-attempt completion.',
);
assert.match(
  retryGuardMigrationSource,
  /assignment_resources_retry_guard/,
  'Database must guard multi-attempt assignments against disabled retry.',
);
assert.match(
  comprehensionSummaryMigrationSource,
  /exercise_builder_result_counts/,
  'Comprehension summaries must count inner items.',
);
assert.match(
  comprehensionSummaryMigrationSource,
  /reading_comprehension.*listening_comprehension/,
  'Inner-item summaries must cover reading and listening comprehension.',
);


const assignmentProgressRetryMigrationSource = fs.readFileSync(
  new URL('../supabase/migrations/20260922194016_assignment_progress_retry_stability.sql', import.meta.url),
  'utf8',
);
const assignmentProgressApiSource = fs.readFileSync(
  new URL('../src/lib/assignmentProgressApi.js', import.meta.url),
  'utf8',
);
const exercisePlayerSource = fs.readFileSync(
  new URL('../src/pages/ExercisePlayerV2.jsx', import.meta.url),
  'utf8',
);

assert.match(
  assignmentProgressRetryMigrationSource,
  /v_latest_submitted/,
  'Assignment progress must retain the latest submitted attempt while a retry is in progress.',
);
assert.match(
  assignmentProgressRetryMigrationSource,
  /v_completion_rule = 'submitted' and v_submitted_count >= 1/,
  'Submitted completion must remain monotonic across retries.',
);
assert.ok(
  assignmentProgressApiSource.indexOf("if (waitingForReview && allDone) return 'review';")
    < assignmentProgressApiSource.indexOf("if (assignment?.status === 'completed') return 'completed';"),
  'Learner summary state must preserve a new review state even after prior completion.',
);
assert.match(
  exercisePlayerSource,
  /obiettivo non raggiunto/,
  'Learner result UI must explain an unmet score goal.',
);
assert.match(
  exercisePlayerSource,
  /Inizia tentativo/,
  'Learner result UI must explain required retry progression.',
);


assert.match(
  exercisePlayerSource,
  /function answerMissingCount\(answer, question\)/,
  'Learner player must count unanswered inner comprehension items.',
);
assert.match(
  exercisePlayerSource,
  /reading_comprehension.*listening_comprehension/s,
  'Inner unanswered counting must cover reading and listening comprehension.',
);
assert.match(
  exercisePlayerSource,
  /risposte.*in bianco/,
  'Learner must be warned about unanswered comprehension subitems before continuing.',
);


// Speaking transcripts persist on the attempt question, independent of 14-day audio files.
// Teacher highlighting is manual, and learner access is gated by approved review status.
const speakingTranscriptMigration = fs.readFileSync(
  new URL('../supabase/migrations/20261011194800_persist_speaking_transcripts_and_manual_corrections.sql', import.meta.url),
  'utf8',
);
const speakingTranscriptionFunction = fs.readFileSync(
  new URL('../supabase/functions/transcribe-exercise-audio/index.ts', import.meta.url),
  'utf8',
);
const speakingResultsSource = fs.readFileSync(
  new URL('../src/pages/AdminExerciseResults.jsx', import.meta.url),
  'utf8',
);
const speakingRendererSource = fs.readFileSync(
  new URL('../src/components/exercises/ExerciseQuestionRendererV2.jsx', import.meta.url),
  'utf8',
);
assert.match(speakingTranscriptMigration, /add column if not exists speech_transcript text/);
assert.match(speakingTranscriptMigration, /if not public\.is_admin\(\)/);
assert.match(speakingTranscriptMigration, /speech_transcript', case when a\.review_status = 'approved'/);
assert.match(speakingTranscriptMigration, /written_response', 'audio_response'/);
assert.match(speakingTranscriptMigration, /teacher_correction = '\{\}'::jsonb/);
assert.doesNotMatch(speakingTranscriptMigration, /delete\s+from\s+public\.exercise_builder_submission_files/i,
  'Transcript migration must not change audio retention.');
assert.match(speakingTranscriptionFunction, /admin_save_exercise_builder_speech_transcript/);
assert.match(speakingResultsSource, /saveExerciseSpeechTranscript/);
assert.match(speakingResultsSource, /<WritingCorrectionWorkspace/);
assert.match(speakingRendererSource, /item\.speech_transcript/);
assert.match(speakingRendererSource, /item\.teacher_correction/);
console.log('Speaking transcript persistence and manual correction integration validated.');


// A single editorial instruction renderer is shared by Studio media and native listening.
// Teacher-authored instructions remain plain strings: no new database codes or fields.
const listeningInstructionsSource = fs.readFileSync(
  new URL('../src/components/exercises/ListeningInstructionsPanel.jsx', import.meta.url), 'utf8',
);
const studioMediaRendererSource = fs.readFileSync(
  new URL('../src/components/exercises/ExerciseMediaBlock.jsx', import.meta.url), 'utf8',
);
const nativeListeningRendererSource = fs.readFileSync(
  new URL('../src/components/exercises/ListeningComprehensionQuestion.jsx', import.meta.url), 'utf8',
);
const studioBlockEditorSource = fs.readFileSync(
  new URL('../src/components/admin/exercise-studio/StudioBlockEditor.jsx', import.meta.url), 'utf8',
);
assert.match(listeningInstructionsSource, /parseListeningInstructionRows/);
assert.match(listeningInstructionsSource, /Turn OFF subtitles \(CC\)/);
assert.match(listeningInstructionsSource, /Listen without reading the transcript/);
assert.match(listeningInstructionsSource, /transcriptVisibility === 'after_submit'/);
assert.match(studioMediaRendererSource, /<ListeningInstructionsPanel/);
assert.match(studioMediaRendererSource, /showTranscript/);
assert.match(studioMediaRendererSource, /createSignedUrl/);
assert.match(nativeListeningRendererSource, /<ListeningInstructionsPanel/);
assert.match(nativeListeningRendererSource, /maxPlays/);
assert.match(nativeListeningRendererSource, /revealTranscript/);
assert.match(studioBlockEditorSource, /label="Listening instructions"/);
assert.match(studioBlockEditorSource, /Separate steps with a blank line/);
console.log('Listening instruction panels, editor guidance and existing media controls validated.');

// Bulk Studio assignments must use one authorised, transactional database call.
// Both Studio and Library must expose the same multi-select dialog; existing
// single-learner and group routes must remain intact.
const bulkQuickAssignPanelSource = fs.readFileSync(
  'src/components/admin/exercise-studio/StudioQuickAssignPanel.jsx', 'utf8',
);
const bulkQuickAssignApiSource = fs.readFileSync('src/lib/exerciseStudioAssignmentApi.js', 'utf8');
const bulkQuickAssignMigration = fs.readFileSync(
  'supabase/migrations/20261018123000_studio_quick_assign_multiple_learners.sql', 'utf8',
);
const bulkStudioLibrarySource = fs.readFileSync('src/pages/AdminExerciseBuilderLibrary.jsx', 'utf8');
assert.match(bulkQuickAssignPanelSource, /selectedLearnerIds/);
assert.match(bulkQuickAssignPanelSource, /Select matches/);
assert.match(bulkQuickAssignPanelSource, /Deselect matches/);
assert.match(bulkQuickAssignPanelSource, /quickAssignStudioExerciseLearners/);
assert.match(bulkQuickAssignPanelSource, /quickAssignStudioExerciseGroup/);
assert.match(bulkQuickAssignPanelSource, /selectedLearnerIds\.length === 1/);
assert.match(bulkQuickAssignApiSource, /admin_quick_assign_exercise_learners/);
assert.match(bulkQuickAssignApiSource, /p_learner_ids: learnerIds/);
assert.match(bulkQuickAssignMigration, /if not public\.is_admin\(\)/i);
assert.match(bulkQuickAssignMigration, /cardinality\(p_learner_ids\) <>/i);
assert.match(bulkQuickAssignMigration, /profile\.status = 'active'/);
assert.match(bulkQuickAssignMigration, /for share/i);
assert.match(bulkQuickAssignMigration, /public\.admin_quick_assign_exercise\(/);
assert.match(bulkQuickAssignMigration, /grant execute on function public\.admin_quick_assign_exercise_learners[\s\S]*to authenticated/i);
assert.match(studioPageSource, /mode === 'learners'/);
assert.match(bulkStudioLibrarySource, /mode === 'learners'/);
console.log('Studio atomic multi-learner quick assignment contract validated.');
