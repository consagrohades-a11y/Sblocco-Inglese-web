import { EXERCISE_BUILDER_LEVELS, EXERCISE_BUILDER_SKILLS } from './exerciseBuilderSchemaV2.js';
import {
  createDefaultStudioBlock,
  getStudioBlockDefinition,
  normalizeStudioBlock,
  STUDIO_BLOCK_TYPES,
  studioSlug,
} from './exerciseStudioBlockRegistry.js';

export const EXERCISE_STUDIO_SCHEMA_VERSION = 1;
export const EXERCISE_STUDIO_KIND = 'learning_activity';
export const EXERCISE_STUDIO_STATUSES = ['draft', 'published', 'archived'];
export const EXERCISE_STUDIO_ACTIVITY_TYPES = ['exercise', 'lesson', 'mini_course', 'listening_lesson', 'assessment'];

const text = (value) => typeof value === 'string' ? value.trim() : '';
const stringList = (value) => Array.isArray(value) ? [...new Set(value.map((item) => text(item)).filter(Boolean))] : [];

function randomToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, '');
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createStudioSystemId(prefix = 'studio') {
  return prefix + '_' + randomToken().slice(0, 24);
}

export function defaultStudioSettings() {
  return {
    instruction_language: 'it',
    display_mode: 'one_at_a_time',
    feedback_timing: 'question_end',
    show_score: true,
    show_correct_answers: true,
    show_explanations: true,
    show_diagnostic_summary: true,
    allow_retry: true,
  };
}

export function createStudioDocument(initial = {}) {
  const level = EXERCISE_BUILDER_LEVELS.includes(initial.level) ? initial.level : 'A2';
  const id = text(initial.id) || createStudioSystemId('activity');
  const internalTitle = text(initial.internal_title || initial.title);

  return {
    schema_version: EXERCISE_STUDIO_SCHEMA_VERSION,
    kind: EXERCISE_STUDIO_KIND,
    id,
    internal_code: text(initial.internal_code) || 'studio_' + id.replace(/^activity_/, '').slice(0, 12),
    internal_title: internalTitle,
    learner_title: text(initial.learner_title),
    description: text(initial.description),
    instructions: text(initial.instructions),
    level,
    topic: text(initial.topic),
    subtopic: text(initial.subtopic),
    skills: stringList(initial.skills).filter((skill) => EXERCISE_BUILDER_SKILLS.includes(skill)),
    tags: stringList(initial.tags),
    activity_type: EXERCISE_STUDIO_ACTIVITY_TYPES.includes(initial.activity_type) ? initial.activity_type : 'exercise',
    estimated_minutes: Number(initial.estimated_minutes) > 0 ? Math.round(Number(initial.estimated_minutes)) : null,
    status: EXERCISE_STUDIO_STATUSES.includes(initial.status) ? initial.status : 'draft',
    slug: text(initial.slug) || studioSlug(internalTitle, 'untitled_activity'),
    settings: { ...defaultStudioSettings(), ...(initial.settings || {}) },
    blocks: [],
  };
}

export function addStudioBlock(document, type, initial = {}) {
  if (!STUDIO_BLOCK_TYPES.includes(type)) throw new Error('Unsupported Studio block type: ' + type);
  const block = {
    id: createStudioSystemId('block'),
    type,
    ...createDefaultStudioBlock(type),
    ...initial,
  };

  return {
    ...document,
    blocks: [...(document.blocks || []), block],
  };
}

export function normalizeStudioDocument(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const repairs = [];
  const id = text(source.id) || createStudioSystemId('activity');
  if (!text(source.id)) repairs.push({ code: 'generated_activity_id', field: 'id' });

  const internalTitle = text(source.internal_title || source.title);
  const level = EXERCISE_BUILDER_LEVELS.includes(source.level) ? source.level : 'A2';
  if (source.level && source.level !== level) repairs.push({ code: 'normalized_level', field: 'level', value: level });

  const internalCode = text(source.internal_code) || 'studio_' + id.replace(/^activity_/, '').slice(0, 12);
  if (!text(source.internal_code)) repairs.push({ code: 'generated_internal_code', field: 'internal_code' });

  const slug = text(source.slug) || studioSlug(internalTitle, 'untitled_activity');
  if (!text(source.slug)) repairs.push({ code: 'generated_slug', field: 'slug' });

  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  const blocks = sourceBlocks.map((rawBlock, index) => {
    const sourceBlock = rawBlock && typeof rawBlock === 'object' && !Array.isArray(rawBlock) ? rawBlock : {};
    const blockId = text(sourceBlock.id) || createStudioSystemId('block');
    if (!text(sourceBlock.id)) repairs.push({ code: 'generated_block_id', field: 'blocks.' + index + '.id' });

    const definition = getStudioBlockDefinition(sourceBlock.type);
    if (!definition) {
      return {
        ...sourceBlock,
        id: blockId,
        sequence_index: index + 1,
      };
    }

    const normalized = normalizeStudioBlock({ ...sourceBlock, id: blockId });
    if (sourceBlock.sequence_index !== index + 1) {
      repairs.push({ code: 'reindexed_block', field: 'blocks.' + index + '.sequence_index', value: index + 1 });
    }

    return {
      ...normalized,
      id: blockId,
      sequence_index: index + 1,
    };
  });

  return {
    document: {
      schema_version: EXERCISE_STUDIO_SCHEMA_VERSION,
      kind: EXERCISE_STUDIO_KIND,
      id,
      internal_code: internalCode,
      internal_title: internalTitle,
      learner_title: text(source.learner_title),
      description: text(source.description),
      instructions: text(source.instructions),
      level,
      topic: text(source.topic),
      subtopic: text(source.subtopic),
      skills: stringList(source.skills).filter((skill) => EXERCISE_BUILDER_SKILLS.includes(skill)),
      tags: stringList(source.tags),
      activity_type: EXERCISE_STUDIO_ACTIVITY_TYPES.includes(source.activity_type) ? source.activity_type : 'exercise',
      estimated_minutes: Number(source.estimated_minutes) > 0 ? Math.round(Number(source.estimated_minutes)) : null,
      status: EXERCISE_STUDIO_STATUSES.includes(source.status) ? source.status : 'draft',
      slug,
      settings: { ...defaultStudioSettings(), ...(source.settings || {}) },
      blocks,
    },
    repairs,
  };
}

export function validateStudioDocumentIdentity(document) {
  const issues = [];

  if (Number(document?.schema_version) !== EXERCISE_STUDIO_SCHEMA_VERSION) {
    issues.push({
      code: 'schema_version',
      field: 'schema_version',
      severity: 'error',
      message: 'Unsupported Studio schema version.',
    });
  }

  if (document?.kind !== EXERCISE_STUDIO_KIND) {
    issues.push({
      code: 'kind',
      field: 'kind',
      severity: 'error',
      message: 'Studio document kind must be learning_activity.',
    });
  }

  if (!text(document?.internal_title)) {
    issues.push({
      code: 'required',
      field: 'internal_title',
      severity: 'error',
      message: 'Give this activity an internal title before publishing.',
    });
  }

  if (!text(document?.topic)) {
    issues.push({
      code: 'required',
      field: 'topic',
      severity: 'error',
      message: 'Choose a topic before publishing.',
    });
  }

  if (!Array.isArray(document?.blocks) || !document.blocks.length) {
    issues.push({
      code: 'required',
      field: 'blocks',
      severity: 'error',
      message: 'Add at least one block before publishing.',
    });
  }

  return issues;
}
