import {
  EXERCISE_STUDIO_ACTIVITY_TYPES,
  EXERCISE_STUDIO_KIND,
  EXERCISE_STUDIO_SCHEMA_VERSION,
  normalizeStudioDocument,
} from './exerciseStudioDocument.js';
import { preflightStudioDocument } from './exerciseStudioCompiler.js';

export const STUDIO_AUTHORING_CONTRACT_VERSION = 1;
export const STUDIO_IMPORT_TEMPLATE_VERSION = 1;

const SUPPORTED_TEMPLATE_IDS = new Set([
  'sblocco-learning-activity',
  'sblocco-grammar-mini-course',
  'sblocco-mixed-practice',
  'sblocco-listening-lesson',
  'sblocco-writing-activity',
  'sblocco-assessment',
]);

const BLOCK_ALIASES = Object.freeze({
  text: 'explanation',
  explanation_text: 'explanation',
  pattern: 'rule',
  rule_pattern: 'rule',
  example: 'examples',
  common_error: 'do_dont',
  do_and_dont: 'do_dont',
  languagebank: 'language_bank',
  useful_phrases: 'language_bank',
  dialogue_context: 'dialogue',
  strategy: 'tip',
  checklist: 'recap',
  summary: 'recap',
  listening: 'media',
  video: 'media',
  audio: 'media',
  mcq: 'multiple_choice',
  mcq_set: 'multiple_choice_set',
  multiple_choice_group: 'multiple_choice_set',
  grouped_multiple_choice: 'multiple_choice_set',
  fill_gap: 'gap_fill',
  fill_the_gap: 'gap_fill',
  reorder: 'word_order',
  sentence_order: 'word_order',
  writing: 'written_response',
  free_writing: 'written_response',
  open_answer: 'translation',
  translation_open: 'translation',
  open_answer_group: 'open_answer_set',
  grouped_open_answer: 'open_answer_set',
  translation_set: 'open_answer_set',
  selection: 'practice_selection',
  ungraded_selection: 'practice_selection',
});

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function issue(code, message, field, severity = 'warning') {
  return { code, message, field, severity, source: 'import' };
}

function sanitizeOptions(value) {
  if (!Array.isArray(value)) return value;
  return value.map((option) => {
    if (typeof option === 'string') return option;
    const source = object(option);
    return {
      text: source.text,
      is_correct: Boolean(source.is_correct),
      ...(source.feedback ? { feedback: source.feedback } : {}),
    };
  });
}

function sanitizeBlanks(value) {
  if (!Array.isArray(value)) return value;
  return value.map((blank) => {
    const source = object(blank);
    return {
      accepted_answers: source.accepted_answers,
      ...(source.points != null ? { points: source.points } : {}),
    };
  });
}

function sanitizeBlock(rawBlock, index, repairs) {
  const source = object(rawBlock);
  const requestedType = text(source.type);
  const type = BLOCK_ALIASES[requestedType] || requestedType;

  if (requestedType && requestedType !== type) {
    repairs.push(issue(
      'normalized_block_type',
      `Block ${index + 1}: converted "${requestedType}" to "${type}".`,
      `blocks.${index}.type`,
      'info',
    ));
  }

  const block = { ...source, type };

  // AI must never control these implementation-owned fields.
  for (const key of [
    'id',
    'sequence_index',
    'client_key',
    'question_id',
    'question_version_id',
    'version',
    'version_number',
    'internal_code',
    'public_id',
    'storage_bucket',
    'storage_path',
    'uploaded_file_name',
    'uploaded_mime_type',
    'uploaded_size_bytes',
  ]) {
    if (Object.prototype.hasOwnProperty.call(block, key)) {
      delete block[key];
      repairs.push(issue(
        'removed_system_field',
        `Block ${index + 1}: ignored AI-supplied system field "${key}".`,
        `blocks.${index}.${key}`,
        'info',
      ));
    }
  }

  if (Object.prototype.hasOwnProperty.call(block, 'diagnostics')) {
    delete block.diagnostics;
    repairs.push(issue(
      'removed_ai_diagnostics',
      `Block ${index + 1}: diagnostic codes are owned by Sblocco and were regenerated.`,
      `blocks.${index}.diagnostics`,
      'info',
    ));
  }

  if (type === 'multiple_choice' && Array.isArray(block.options)) {
    block.options = sanitizeOptions(block.options);
  }

  if (type === 'gap_fill' && Array.isArray(block.blanks)) {
    block.blanks = sanitizeBlanks(block.blanks);
  }

  if (type === 'word_order' && !Array.isArray(block.chunks) && Array.isArray(block.correct_order)) {
    block.chunks = block.correct_order;
    repairs.push(issue(
      'normalized_word_order_chunks',
      `Block ${index + 1}: converted correct_order to Studio chunks.`,
      `blocks.${index}.chunks`,
      'info',
    ));
  }
  delete block.correct_order;
  delete block.tokens;

  if (type === 'media') {
    if (!block.source_type && requestedType === 'video') block.source_type = 'video';
    if (!block.source_type && requestedType === 'audio') block.source_type = 'audio';
  }

  if (type === 'practice_selection' && Array.isArray(block.options)) {
    block.options = block.options
      .map((option) => {
        if (typeof option === 'string') {
          return { text: option.trim(), vocab_bank: false, vocab_kind: null };
        }
        return {
          text: typeof option?.text === 'string' ? option.text.trim() : '',
          vocab_bank: Boolean(option?.vocab_bank),
          vocab_kind: option?.vocab_kind === 'chunk' ? 'chunk' : option?.vocab_kind === 'word' ? 'word' : null,
        };
      })
      .filter((option) => option.text);
  }

  return block;
}

function unwrapEnvelope(parsed, repairs) {
  const source = object(parsed);
  const template = object(source._template);

  if (Object.keys(template).length) {
    const templateId = text(template.template_id);
    const templateVersion = Number(template.template_version || 1);
    const contractVersion = Number(template.authoring_contract_version || 1);

    if (templateId && !SUPPORTED_TEMPLATE_IDS.has(templateId)) {
      repairs.push(issue(
        'unknown_template',
        `Template "${templateId}" is not registered. The activity will still be imported as a repairable draft.`,
        '_template.template_id',
      ));
    }

    if (templateVersion > STUDIO_IMPORT_TEMPLATE_VERSION) {
      repairs.push(issue(
        'newer_template_version',
        `This file uses template version ${templateVersion}; Studio currently knows version ${STUDIO_IMPORT_TEMPLATE_VERSION}. Review the imported draft carefully.`,
        '_template.template_version',
      ));
    }

    if (contractVersion > STUDIO_AUTHORING_CONTRACT_VERSION) {
      repairs.push(issue(
        'newer_contract_version',
        `This file uses authoring contract v${contractVersion}; Studio currently knows v${STUDIO_AUTHORING_CONTRACT_VERSION}.`,
        '_template.authoring_contract_version',
      ));
    }
  }

  if (source.activity && typeof source.activity === 'object' && !Array.isArray(source.activity)) {
    return source.activity;
  }

  if (source.document && typeof source.document === 'object' && !Array.isArray(source.document)) {
    repairs.push(issue(
      'legacy_document_wrapper',
      'Converted the document wrapper to the current activity wrapper.',
      'document',
      'info',
    ));
    return source.document;
  }

  return source;
}

function sanitizeActivity(rawActivity, repairs) {
  const source = object(rawActivity);
  const blocks = Array.isArray(source.blocks) ? source.blocks : [];

  const activity = {
    ...source,
    schema_version: EXERCISE_STUDIO_SCHEMA_VERSION,
    kind: EXERCISE_STUDIO_KIND,
    status: 'draft',
    blocks: blocks.map((block, index) => sanitizeBlock(block, index, repairs)),
  };

  for (const key of [
    'id',
    'internal_code',
    'slug',
    'exercise_id',
    'public_id',
    'current_version_id',
    'version',
    'version_number',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'publication_map',
  ]) {
    if (Object.prototype.hasOwnProperty.call(activity, key)) {
      delete activity[key];
      repairs.push(issue(
        'removed_system_field',
        `Ignored AI-supplied activity field "${key}". Sblocco owns this value.`,
        key,
        'info',
      ));
    }
  }

  if (!EXERCISE_STUDIO_ACTIVITY_TYPES.includes(activity.activity_type)) {
    if (activity.activity_type) {
      repairs.push(issue(
        'normalized_activity_type',
        `Unknown activity type "${activity.activity_type}" was converted to "exercise".`,
        'activity_type',
      ));
    }
    activity.activity_type = 'exercise';
  }

  return activity;
}

export function parseStudioImport(rawInput) {
  let parsed;

  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      throw new Error('Paste or upload JSON first.');
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`The file is not valid JSON: ${message}`);
    }
  } else {
    parsed = rawInput;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The import must contain one JSON object.');
  }

  const importRepairs = [];
  const rawActivity = unwrapEnvelope(parsed, importRepairs);
  const sanitized = sanitizeActivity(rawActivity, importRepairs);
  const normalized = normalizeStudioDocument(sanitized);
  const preflight = preflightStudioDocument(normalized.document);

  const combinedRepairs = [
    ...importRepairs,
    ...normalized.repairs.map((repair) => ({
      ...repair,
      severity: 'info',
      source: 'normalizer',
    })),
  ];

  const blockErrors = new Set(
    preflight.errors
      .map((item) => item.block_id)
      .filter(Boolean),
  );

  const readyBlocks = normalized.document.blocks.filter((block) => !blockErrors.has(block.id)).length;
  const needsAttentionBlocks = normalized.document.blocks.length - readyBlocks;

  return {
    document: normalized.document,
    template: object(object(parsed)._template),
    repairs: combinedRepairs,
    issues: preflight.issues,
    errors: preflight.errors,
    warnings: preflight.warnings,
    ready_blocks: readyBlocks,
    needs_attention_blocks: needsAttentionBlocks,
    publishable: preflight.valid,
  };
}
