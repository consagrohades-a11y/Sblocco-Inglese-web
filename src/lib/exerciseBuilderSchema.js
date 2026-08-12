// Compatibility entry point. Existing imports keep the same path while
// validation remains backward-compatible with schema v1 and schema v2.
export {
  EXERCISE_BUILDER_LEVELS,
  EXERCISE_BUILDER_SCHEMA_VERSION,
  EXERCISE_BUILDER_SKILLS,
  EXERCISE_BUILDER_SUPPORTED_SCHEMA_VERSIONS,
} from './exerciseBuilderSchemaV2.js';

import {
  EXERCISE_BUILDER_QUESTION_TYPES as BASE_EXERCISE_BUILDER_QUESTION_TYPES,
  validateExerciseBuilderJson as validateExerciseBuilderJsonV2,
} from './exerciseBuilderSchemaV2.js';
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
import { parseExerciseAuthoringInput } from './exerciseAuthoringInput.js';
import {
  EDUCATIONAL_CONTENT_SCHEMA_VERSION,
  isStructuredEducationalContent,
  validateEducationalContentBlock,
} from './educationalContentBlock.js';
import {
  LISTENING_COMPREHENSION_TEMPLATE_KEY,
  applyListeningComprehensionValidation,
  listeningComprehensionTemplate,
  prepareListeningComprehensionForV2,
  restoreListeningComprehensionValidationResult,
} from './listeningComprehension.js';

export const EXERCISE_BUILDER_QUESTION_TYPES = [
  ...BASE_EXERCISE_BUILDER_QUESTION_TYPES,
  LISTENING_COMPREHENSION_TEMPLATE_KEY,
];

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

function addItemWarning(result, message) {
  (result.items || []).forEach((item) => {
    item.warnings = [...(item.warnings || []), message];
    if (!item.errors?.length) item.status = 'warning';
  });
}

function canonicalTemplateForAuthoring(authoring) {
  if (!authoring || typeof authoring !== 'object') return null;
  if (authoring.template_id === educationalContentBlockAuthoringGuide.template_id) {
    return { key: 'educational_content_block', template: exerciseBuilderTemplates.educational_content_block };
  }
  const key = typeof authoring.template_key === 'string' ? authoring.template_key : '';
  return key && exerciseBuilderTemplates[key]
    ? { key, template: exerciseBuilderTemplates[key] }
    : null;
}

function applyAuthoringContractValidation(result) {
  if (!result?.parsed || result.errors?.length) return result;
  const authoring = result.parsed?._template;

  if (!authoring) {
    const warning = 'Contratto di authoring assente: import consentito per compatibilità, ma non è possibile verificare che il JSON provenga da un template Sblocco Inglese invariato.';
    result.authoring = { status: 'unverified', templateKey: null, message: warning };
    addItemWarning(result, warning);
    return result;
  }

  const canonical = canonicalTemplateForAuthoring(authoring);
  if (!canonical) {
    result.errors = [...(result.errors || []), '_template non riconosciuto: scarica nuovamente il template dall’Exercise Builder e genera il contenuto senza modificare il contratto iniziale.'];
    result.authoring = { status: 'invalid', templateKey: null };
    return result;
  }

  const canonicalContract = canonical.template?._template || null;
  if (JSON.stringify(authoring) !== JSON.stringify(canonicalContract)) {
    result.errors = [...(result.errors || []), `_template modificato per ${canonical.key}: il contratto iniziale deve rimanere identico al template scaricato.`];
    result.authoring = { status: 'invalid', templateKey: canonical.key };
    return result;
  }

  if (result.parsed.schema_version !== canonical.template.schema_version) {
    result.errors = [...(result.errors || []), `schema_version modificato: il template ${canonical.key} richiede ${canonical.template.schema_version}.`];
  }
  if (result.parsed.entity_type !== canonical.template.entity_type) {
    result.errors = [...(result.errors || []), `entity_type modificato: il template ${canonical.key} richiede ${canonical.template.entity_type}.`];
  }

  if (canonical.template.entity_type === 'question') {
    const expectedType = canonical.template.question?.type;
    const actualType = result.parsed.question?.type;
    if (expectedType && actualType !== expectedType) {
      result.errors = [...(result.errors || []), `question.type modificato: il template ${canonical.key} richiede ${expectedType}.`];
    }
  }

  if (canonical.key === 'educational_content_block') {
    const content = result.parsed.question?.content || {};
    if (content.template_id !== educationalContentBlockAuthoringGuide.template_id) {
      result.errors = [...(result.errors || []), `question.content.template_id deve restare ${educationalContentBlockAuthoringGuide.template_id}.`];
    }
    if (Number(content.educational_schema_version) !== EDUCATIONAL_CONTENT_SCHEMA_VERSION) {
      result.errors = [...(result.errors || []), `question.content.educational_schema_version deve restare ${EDUCATIONAL_CONTENT_SCHEMA_VERSION}.`];
    }
  }

  result.authoring = {
    status: result.errors.length ? 'invalid' : 'verified',
    templateKey: canonical.key,
    templateId: canonicalContract?.template_id || null,
    templateVersion: canonicalContract?.template_version || null,
  };
  return result;
}

export function validateExerciseBuilderJson(input) {
  const source = parseExerciseAuthoringInput(input);
  if (source.error) {
    return {
      parsed: null,
      entityType: null,
      schemaVersion: null,
      items: [],
      errors: [`JSON non valido: ${source.error.message}`],
      warnings: [],
      sourceAdjustments: [],
      normalizedJson: source.normalizedText,
      authoring: { status: 'invalid', templateKey: null },
    };
  }

  const prepared = prepareListeningComprehensionForV2(source.parsed);
  const result = restoreListeningComprehensionValidationResult(validateExerciseBuilderJsonV2(prepared));
  result.sourceAdjustments = source.adjustments;
  result.normalizedJson = source.normalizedText;
  return applyAuthoringContractValidation(
    applyListeningComprehensionValidation(
      applyEducationalContentValidation(result),
    ),
  );
}

// Template exports are composed here so the V2 importer stays stable while
// authoring/download contracts can evolve independently of database payloads.
export const EXERCISE_BUILDER_TEMPLATE_VERSION = Math.max(BASE_EXERCISE_BUILDER_TEMPLATE_VERSION, 6);
export const exerciseBuilderQuestionTemplates = {
  ...baseExerciseBuilderQuestionTemplates,
  [LISTENING_COMPREHENSION_TEMPLATE_KEY]: listeningComprehensionTemplate.question,
};

const listeningManifestItem = {
  key: LISTENING_COMPREHENSION_TEMPLATE_KEY,
  entityType: 'question',
  label: 'Listening comprehension con audio',
  fileName: 'exercise-builder-question-listening_comprehension-template.json',
};

const educationalManifestItem = {
  key: 'educational_content_block',
  entityType: 'question',
  label: 'Content block educativo strutturato',
  fileName: 'exercise-builder-educational-content-block-template.json',
};

export const exerciseBuilderTemplateManifest = [
  ...baseExerciseBuilderTemplateManifest,
  listeningManifestItem,
  educationalManifestItem,
];

const composedTemplates = {
  ...baseExerciseBuilderTemplates,
  guided_exercise: structuredGuidedExerciseTemplate,
  [LISTENING_COMPREHENSION_TEMPLATE_KEY]: listeningComprehensionTemplate,
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
  [LISTENING_COMPREHENSION_TEMPLATE_KEY]: listeningComprehensionTemplate,
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
