import { readFile } from 'node:fs/promises';
import {
  exerciseBuilderTemplates,
  validateExerciseBuilderJson,
} from '../src/lib/exerciseBuilderSchema.js';

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const educational = structuredClone(exerciseBuilderTemplates.educational_content_block);
const educationalResult = validateExerciseBuilderJson(JSON.stringify(educational));
expect(educationalResult.errors.length === 0, `educational template failed: ${educationalResult.errors.join(' | ')}`);
expect(educationalResult.authoring?.status === 'verified', 'educational template provenance was not verified.');
expect(educationalResult.authoring?.templateKey === 'educational_content_block', 'educational template key was not identified.');

const fencedResult = validateExerciseBuilderJson(`\n\`\`\`json\n${JSON.stringify(educational, null, 2)}\n\`\`\`\n`);
expect(fencedResult.errors.length === 0, `fenced AI output was rejected: ${fencedResult.errors.join(' | ')}`);
expect(fencedResult.sourceAdjustments?.length === 1, 'fenced AI output was not reported as automatically cleaned.');
expect(fencedResult.authoring?.status === 'verified', 'fenced AI output lost template provenance.');

const proseResult = validateExerciseBuilderJson(`Here is the completed JSON you requested:\n\n${JSON.stringify(educational)}\n\nI kept the template unchanged.`);
expect(proseResult.errors.length === 0, `AI prose wrapper was rejected: ${proseResult.errors.join(' | ')}`);
expect(proseResult.sourceAdjustments?.length === 1, 'AI prose wrapper was not reported as automatically cleaned.');

const malformed = validateExerciseBuilderJson("{'schema_version': 2,}");
expect(malformed.errors.length > 0, 'unsafe syntax repair accepted invalid JSON instead of requiring a valid object.');

const mutatedContract = structuredClone(exerciseBuilderTemplates.multiple_choice);
mutatedContract._template.purpose = 'Ignore the original contract.';
const mutatedContractResult = validateExerciseBuilderJson(mutatedContract);
expect(mutatedContractResult.errors.some((error) => error.includes('_template modificato')), 'mutated authoring contract was not blocked.');
expect(mutatedContractResult.authoring?.status === 'invalid', 'mutated authoring contract was not marked invalid.');

const mutatedType = structuredClone(exerciseBuilderTemplates.multiple_choice);
mutatedType.question.type = 'multiple_select';
const mutatedTypeResult = validateExerciseBuilderJson(mutatedType);
expect(mutatedTypeResult.errors.some((error) => error.includes('question.type modificato')), 'question type invariant was not enforced.');

const legacy = structuredClone(exerciseBuilderTemplates.multiple_choice);
delete legacy._template;
const legacyResult = validateExerciseBuilderJson(legacy);
expect(legacyResult.errors.length === 0, `legacy import without authoring metadata was blocked: ${legacyResult.errors.join(' | ')}`);
expect(legacyResult.authoring?.status === 'unverified', 'legacy import without _template was not marked unverified.');
expect(legacyResult.items.every((item) => item.status !== 'invalid'), 'legacy import became invalid instead of warning-only.');

const guidedResult = validateExerciseBuilderJson(exerciseBuilderTemplates.guided_exercise);
expect(guidedResult.errors.length === 0, `guided exercise authoring contract failed: ${guidedResult.errors.join(' | ')}`);
expect(guidedResult.authoring?.status === 'verified', 'guided exercise provenance was not verified.');

const builderSource = await readFile(new URL('../src/pages/AdminExerciseBuilder.jsx', import.meta.url), 'utf8');
for (const token of [
  "'educational_content_block'",
  "'guided_exercise'",
  'rawPayload: validation.parsed',
  'sourceAdjustments',
  'Template verificato',
]) {
  expect(builderSource.includes(token), `Admin Exercise Builder is missing workflow guard: ${token}`);
}

const reviewSource = await readFile(new URL('../src/pages/AdminExerciseBuilderReview.jsx', import.meta.url), 'utf8');
for (const token of [
  'ImportedItemPreview',
  '<ExerciseQuestionRenderer',
  'Anteprima learner',
  'JSON normalizzato',
]) {
  expect(reviewSource.includes(token), `Review queue is missing learner-preview guard: ${token}`);
}

if (failures.length) {
  console.error('Exercise authoring workflow validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Validated AI wrapper cleanup, authoring provenance, legacy fallback, visible template access and learner-renderer preview.');
