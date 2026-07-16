import {
  EXERCISE_BUILDER_QUESTION_TYPES,
  exerciseBuilderTemplateManifest,
  exerciseBuilderTemplates,
  validateExerciseBuilderJson,
} from '../src/lib/exerciseBuilderSchema.js';

const failures = [];
const manifestKeys = new Set(exerciseBuilderTemplateManifest.map((item) => item.key));

for (const type of EXERCISE_BUILDER_QUESTION_TYPES) {
  if (!exerciseBuilderTemplates[type]) failures.push(`Missing question template: ${type}`);
  if (!manifestKeys.has(type)) failures.push(`Missing manifest entry: ${type}`);
}

for (const item of exerciseBuilderTemplateManifest) {
  const template = exerciseBuilderTemplates[item.key];
  if (!template) {
    failures.push(`Manifest points to a missing template: ${item.key}`);
    continue;
  }

  const result = validateExerciseBuilderJson(template);
  if (result.errors.length) {
    failures.push(`${item.key}: ${result.errors.join(' | ')}`);
    continue;
  }
  if (!result.items.length) failures.push(`${item.key}: validator returned no importable items`);
  result.items.forEach((validatedItem) => {
    if (validatedItem.status === 'invalid') {
      failures.push(`${item.key}: ${validatedItem.errors.join(' | ')}`);
    }
  });
}

const audioPerTurnTemplate = exerciseBuilderTemplates.dialogue_roleplay_audio_per_turn;
const audioPerTurnRoundTrip = validateExerciseBuilderJson(JSON.stringify(audioPerTurnTemplate));
if (audioPerTurnRoundTrip.errors.length || audioPerTurnRoundTrip.items.some((item) => item.status === 'invalid')) {
  failures.push(`dialogue_roleplay_audio_per_turn round trip failed: ${[
    ...audioPerTurnRoundTrip.errors,
    ...audioPerTurnRoundTrip.items.flatMap((item) => item.errors || []),
  ].join(' | ')}`);
}
const importedAudioRoleplay = audioPerTurnRoundTrip.items[0]?.payload;
if (importedAudioRoleplay?.content?.response_mode !== 'audio_per_turn') failures.push('audio_per_turn response mode was not preserved by import.');
if ((importedAudioRoleplay?.content?.turns || []).filter((turn) => turn.learner_response).some((turn) => !turn.constraints?.max_seconds)) {
  failures.push('audio_per_turn constraints were not preserved by import.');
}

const selectGapRoundTrip = validateExerciseBuilderJson(JSON.stringify(exerciseBuilderTemplates.select_gap));
const importedSelectGap = selectGapRoundTrip.items[0]?.payload;
if (selectGapRoundTrip.errors.length || selectGapRoundTrip.items.some((item) => item.status === 'invalid')) {
  failures.push('select_gap text template round trip failed.');
}
if (importedSelectGap?.content?.text_template !== 'I [[blank_1]] coffee every morning.') {
  failures.push('select_gap text_template was not preserved by import.');
}
const invalidGapTemplate = structuredClone(exerciseBuilderTemplates.select_gap);
invalidGapTemplate.question.content.text_template = 'I [[unknown_blank]] coffee every morning.';
const invalidGapResult = validateExerciseBuilderJson(invalidGapTemplate);
if (!invalidGapResult.items.some((item) => item.status === 'invalid')) {
  failures.push('select_gap accepted an unknown text_template marker.');
}
const multiParagraphGap = structuredClone(exerciseBuilderTemplates.select_gap);
multiParagraphGap.question.content.text_template = 'First paragraph: I [[blank_1]] this option.\n\nSecond paragraph: We [[blank_2]] another test.';
multiParagraphGap.question.content.blanks.push({
  key: 'blank_2',
  accepted_answers: ['recommend'],
  options: ['recommend', 'recommends'],
  points: 1,
  feedback: {},
  answer_error_mappings: [],
});
const multiParagraphResult = validateExerciseBuilderJson(JSON.stringify(multiParagraphGap));
const importedMultiParagraph = multiParagraphResult.items[0]?.payload;
if (multiParagraphResult.errors.length || multiParagraphResult.items.some((item) => item.status === 'invalid')) {
  failures.push('multi-paragraph select_gap validation failed.');
}
if (importedMultiParagraph?.content?.text_template !== multiParagraphGap.question.content.text_template) {
  failures.push('multi-paragraph select_gap text_template was not preserved by import.');
}

const bundleTypes = new Set(
  (exerciseBuilderTemplates.bundle?.questions || []).map((question) => question.type),
);
for (const type of EXERCISE_BUILDER_QUESTION_TYPES) {
  if (!bundleTypes.has(type)) failures.push(`Bundle is missing question type: ${type}`);
}

if (failures.length) {
  console.error('Exercise Builder template validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validated ${exerciseBuilderTemplateManifest.length} templates and ${EXERCISE_BUILDER_QUESTION_TYPES.length} question types.`);
