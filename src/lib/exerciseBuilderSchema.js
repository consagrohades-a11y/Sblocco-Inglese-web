// Compatibility entry point. Existing imports keep the same path while
// validation remains backward-compatible with schema v1 and schema v2.
export {
  EXERCISE_BUILDER_LEVELS,
  EXERCISE_BUILDER_QUESTION_TYPES,
  EXERCISE_BUILDER_SCHEMA_VERSION,
  EXERCISE_BUILDER_SKILLS,
  EXERCISE_BUILDER_SUPPORTED_SCHEMA_VERSIONS,
} from './exerciseBuilderSchemaV2.js';

import { validateExerciseBuilderJson as validateExerciseBuilderJsonV2 } from './exerciseBuilderSchemaV2.js';
import {
  EXERCISE_BUILDER_TEMPLATE_VERSION as BASE_EXERCISE_BUILDER_TEMPLATE_VERSION,
  exerciseBuilderQuestionTemplates as baseExerciseBuilderQuestionTemplates,
  exerciseBuilderTemplateManifest as baseExerciseBuilderTemplateManifest,
  exerciseBuilderTemplates as baseExerciseBuilderTemplates,
} from './exerciseBuilderTemplatesV2.js';
import { educationalContentBlockTemplate } from './educationalContentTemplate.js';
import { makeSelfContainedExerciseTemplates } from './exerciseAuthoringTemplateContracts.js';
import {
  isStructuredEducationalContent,
  validateEducationalContentBlock,
} from './educationalContentBlock.js';

function applyEducationalContentValidation(result) {
  if (!result || !Array.isArray(result.items)) return result;

  result.items.forEach((item) => {
    const payload = item?.payload;
    if (item?.entityType !== 'question' || payload?.type !== 'content_block' || !isStructuredEducationalContent(payload.content)) return;

    const semantic = validateEducationalContentBlock(payload.content, 'question.content');
    item.errors = [...(item.errors || []), ...semantic.errors];
    item.warnings = [...(item.warnings || []), ...semantic.warnings];
    item.status = item.errors.length ? 'invalid' : item.warnings.length ? 'warning' : 'valid';
    item.selected = item.status !== 'invalid';
  });

  return result;
}

export function validateExerciseBuilderJson(input) {
  return applyEducationalContentValidation(validateExerciseBuilderJsonV2(input));
}

// Template exports are composed here so the V2 importer stays stable while
// authoring/download contracts can evolve independently of database payloads.
export const EXERCISE_BUILDER_TEMPLATE_VERSION = Math.max(BASE_EXERCISE_BUILDER_TEMPLATE_VERSION, 4);
export const exerciseBuilderQuestionTemplates = baseExerciseBuilderQuestionTemplates;

const educationalManifestItem = {
  key: 'educational_content_block',
  entityType: 'question',
  label: 'Content block educativo strutturato',
  fileName: 'exercise-builder-educational-content-block-template.json',
};

export const exerciseBuilderTemplateManifest = [
  ...baseExerciseBuilderTemplateManifest,
  educationalManifestItem,
];

const composedTemplates = {
  ...baseExerciseBuilderTemplates,
  educational_content_block: educationalContentBlockTemplate,
};

// Every object downloaded from Exercise Builder now carries enough authoring
// instructions to be handed to an AI in a fresh chat with no repository context.
export const exerciseBuilderTemplates = makeSelfContainedExerciseTemplates(
  composedTemplates,
  exerciseBuilderTemplateManifest,
);

export function stringifyExerciseBuilderTemplate(type = 'bundle') {
  return JSON.stringify(exerciseBuilderTemplates[type] || exerciseBuilderTemplates.bundle, null, 2);
}
