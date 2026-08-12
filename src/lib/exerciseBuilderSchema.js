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
import {
  educationalContentBlockAuthoringGuide,
  educationalContentBlockTemplate,
} from './educationalContentTemplate.js';
import { structuredGuidedExerciseTemplate } from './guidedExerciseTemplate.js';
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
export const EXERCISE_BUILDER_TEMPLATE_VERSION = Math.max(BASE_EXERCISE_BUILDER_TEMPLATE_VERSION, 5);
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
  guided_exercise: structuredGuidedExerciseTemplate,
  educational_content_block: educationalContentBlockTemplate,
};

// Every object downloaded from Exercise Builder now carries enough authoring
// instructions to be handed to an AI in a fresh chat with no repository context.
const selfContainedTemplates = makeSelfContainedExerciseTemplates(
  composedTemplates,
  exerciseBuilderTemplateManifest,
);

// A guided lesson embeds the complete structured-teaching contract as well as
// the generic exercise contract. This keeps the downloaded file sufficient in a
// fresh chat: no separate content-block template is required to author stage 1.
export const exerciseBuilderTemplates = {
  ...selfContainedTemplates,
  guided_exercise: {
    ...selfContainedTemplates.guided_exercise,
    _template: {
      ...selfContainedTemplates.guided_exercise._template,
      guided_stage_contract: {
        required_order: [
          'structured teaching input',
          'recognition/comprehension',
          'controlled practice',
          'controlled production',
        ],
        rules: [
          'The first question must be a structured content_block with educational_schema_version, template_id, variant, intro and sections.',
          'Do not replace the structured first stage with a single long body paragraph.',
          'All graded questions must practise the same lesson objective introduced by the teaching block.',
          'Increase cognitive demand gradually; do not jump from explanation directly to unsupported freer production.',
          'Keep question_end feedback concise and directly connected to the rule or pattern just practised.',
        ],
      },
      structured_teaching_contract: educationalContentBlockAuthoringGuide,
    },
  },
};

export function stringifyExerciseBuilderTemplate(type = 'bundle') {
  return JSON.stringify(exerciseBuilderTemplates[type] || exerciseBuilderTemplates.bundle, null, 2);
}
