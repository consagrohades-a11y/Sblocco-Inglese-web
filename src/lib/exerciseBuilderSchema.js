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

import {
  EXERCISE_BUILDER_TEMPLATE_VERSION as BASE_EXERCISE_BUILDER_TEMPLATE_VERSION,
  exerciseBuilderQuestionTemplates as baseExerciseBuilderQuestionTemplates,
  exerciseBuilderTemplateManifest as baseExerciseBuilderTemplateManifest,
  exerciseBuilderTemplates as baseExerciseBuilderTemplates,
} from './exerciseBuilderTemplatesV2.js';
import { educationalContentBlockTemplate } from './educationalContentTemplate.js';

// Template exports are composed here so the existing V2 importer stays stable while
// new authoring templates can evolve independently and remain fully self-contained.
export const EXERCISE_BUILDER_TEMPLATE_VERSION = Math.max(BASE_EXERCISE_BUILDER_TEMPLATE_VERSION, 3);
export const exerciseBuilderQuestionTemplates = baseExerciseBuilderQuestionTemplates;
export const exerciseBuilderTemplates = {
  ...baseExerciseBuilderTemplates,
  educational_content_block: educationalContentBlockTemplate,
};
export const exerciseBuilderTemplateManifest = [
  ...baseExerciseBuilderTemplateManifest,
  {
    key: 'educational_content_block',
    entityType: 'question',
    label: 'Content block educativo strutturato',
    fileName: 'exercise-builder-educational-content-block-template.json',
  },
];

export function stringifyExerciseBuilderTemplate(type = 'bundle') {
  return JSON.stringify(exerciseBuilderTemplates[type] || exerciseBuilderTemplates.bundle, null, 2);
}
