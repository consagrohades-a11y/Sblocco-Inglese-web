// Compatibility entry point. Existing imports keep the same path while
// validation remains backward-compatible with schema v1 and schema v2.
export {
  EXERCISE_BUILDER_LEVELS,
  EXERCISE_BUILDER_QUESTION_TYPES,
  EXERCISE_BUILDER_SCHEMA_VERSION,
  EXERCISE_BUILDER_SKILLS,
  EXERCISE_BUILDER_SUPPORTED_SCHEMA_VERSIONS,
  validateExerciseBuilderJson,
} from './exerciseBuilderSchemaV2.js';

// Template exports are maintained separately so every supported question type,
// pool, exercise and bundle download stays complete without duplicating validator logic.
export {
  EXERCISE_BUILDER_TEMPLATE_VERSION,
  exerciseBuilderQuestionTemplates,
  exerciseBuilderTemplateManifest,
  exerciseBuilderTemplates,
  stringifyExerciseBuilderTemplate,
} from './exerciseBuilderTemplatesV2.js';
