import { validateExerciseBuilderJson } from './exerciseBuilderSchemaV2.js';
import {
  compileStudioBlock,
  getStudioBlockDefinition,
  studioSlug,
  validateStudioBlock,
} from './exerciseStudioBlockRegistry.js';
import {
  normalizeStudioDocument,
  validateStudioDocumentIdentity,
} from './exerciseStudioDocument.js';

const text = (value) => typeof value === 'string' ? value.trim() : '';

function blockClientKey(block, index) {
  const stable = studioSlug(block?.id, 'block_' + (index + 1));
  return 'studio_' + stable;
}

function runtimeSettings(document) {
  const source = document.settings || {};
  return {
    display_mode: source.display_mode === 'all_questions' ? 'all_questions' : 'one_at_a_time',
    feedback_timing: ['question_end', 'section_end', 'exercise_end', 'hidden'].includes(source.feedback_timing)
      ? source.feedback_timing
      : 'question_end',
    show_score: source.show_score !== false,
    show_correct_answers: source.show_correct_answers !== false,
    show_explanations: source.show_explanations !== false,
    show_diagnostic_summary: source.show_diagnostic_summary !== false,
    allow_retry: source.allow_retry !== false,
  };
}

export function compileStudioDocument(document) {
  const questions = (document.blocks || []).map((block, index) => {
    const definition = getStudioBlockDefinition(block.type);
    if (!definition) throw new Error('Unsupported Studio block type: ' + (block.type || 'missing'));
    return compileStudioBlock(block, {
      document,
      blockIndex: index,
      clientKey: blockClientKey(block, index),
    });
  });

  return {
    schema_version: 2,
    entity_type: 'exercise',
    exercise: {
      client_key: 'exercise_' + studioSlug(document.internal_code || document.id, 'studio_activity'),
      title: text(document.learner_title) || text(document.internal_title) || 'Untitled activity',
      description: text(document.description),
      instructions: text(document.instructions),
      instruction_language: document.settings?.instruction_language === 'en' ? 'en' : 'it',
      level: document.level,
      topic: text(document.topic) || 'general_english',
      estimated_minutes: document.estimated_minutes || Math.max(3, Math.ceil(questions.length * 1.5)),
      settings: runtimeSettings(document),
      sections: [{
        client_key: 'section_main',
        title: text(document.learner_title) || text(document.internal_title) || 'Activity',
        instructions: '',
        selection_mode: 'fixed',
        feedback_timing: runtimeSettings(document).feedback_timing,
        questions,
        question_refs: [],
        pool_rules: [],
      }],
      tags: [...new Set([...(document.tags || []), document.activity_type].filter(Boolean))],
      foundation_links: [],
      studio_source: {
        studio_schema_version: document.schema_version,
        studio_activity_id: document.id,
        studio_internal_code: document.internal_code,
      },
    },
  };
}

function collectRuntimeIssues(validation) {
  const issues = [];

  (validation?.errors || []).forEach((message) => {
    issues.push({
      code: 'runtime_contract',
      severity: 'error',
      field: 'runtime',
      message,
    });
  });

  (validation?.warnings || []).forEach((message) => {
    issues.push({
      code: 'runtime_warning',
      severity: 'warning',
      field: 'runtime',
      message,
    });
  });

  (validation?.items || []).forEach((item, itemIndex) => {
    (item.errors || []).forEach((message) => {
      issues.push({
        code: 'runtime_contract',
        severity: 'error',
        field: 'runtime.items.' + itemIndex,
        message,
      });
    });
    (item.warnings || []).forEach((message) => {
      issues.push({
        code: 'runtime_warning',
        severity: 'warning',
        field: 'runtime.items.' + itemIndex,
        message,
      });
    });
  });

  return issues;
}

export function preflightStudioDocument(rawDocument) {
  const normalized = normalizeStudioDocument(rawDocument);
  const document = normalized.document;
  const issues = [...validateStudioDocumentIdentity(document)];

  (document.blocks || []).forEach((block, index) => {
    const definition = getStudioBlockDefinition(block.type);
    if (!definition) {
      issues.push({
        code: 'unsupported_block',
        severity: 'error',
        field: 'blocks.' + index + '.type',
        block_id: block.id || null,
        message: 'Unsupported Studio block type: ' + (block.type || 'missing'),
      });
      return;
    }

    validateStudioBlock(block).forEach((blockIssue) => {
      issues.push({
        ...blockIssue,
        field: 'blocks.' + index + (blockIssue.field ? '.' + blockIssue.field : ''),
        block_id: block.id,
        block_type: block.type,
      });
    });
  });

  let runtime = null;
  let runtimeValidation = null;

  if (!issues.some((item) => item.severity === 'error')) {
    try {
      runtime = compileStudioDocument(document);
      runtimeValidation = validateExerciseBuilderJson(JSON.stringify(runtime));
      issues.push(...collectRuntimeIssues(runtimeValidation));
    } catch (error) {
      issues.push({
        code: 'compiler_failure',
        severity: 'error',
        field: 'runtime',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');

  return {
    valid: errors.length === 0,
    document,
    runtime,
    runtime_validation: runtimeValidation,
    repairs: normalized.repairs,
    issues,
    errors,
    warnings,
  };
}

export function prepareStudioDocumentForPublish(rawDocument) {
  const result = preflightStudioDocument(rawDocument);
  if (!result.valid) {
    const error = new Error('Studio document is not ready to publish.');
    error.preflight = result;
    throw error;
  }
  return result;
}
