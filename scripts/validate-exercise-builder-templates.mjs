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
