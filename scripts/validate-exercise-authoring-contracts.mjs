import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  exerciseBuilderTemplateManifest,
  exerciseBuilderTemplates,
  validateExerciseBuilderJson,
} from '../src/lib/exerciseBuilderSchema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function requireArray(value, minLength, label) {
  if (!Array.isArray(value) || value.length < minLength) {
    failures.push(`${label}: expected at least ${minLength} entries.`);
  }
}

for (const item of exerciseBuilderTemplateManifest) {
  const template = exerciseBuilderTemplates[item.key];
  if (!template) {
    failures.push(`${item.key}: missing template.`);
    continue;
  }

  const keys = Object.keys(template);
  if (keys[0] !== 'schema_version' || keys[1] !== 'entity_type' || keys[2] !== '_template') {
    failures.push(`${item.key}: _template must appear immediately after schema_version and entity_type so downloaded files start with authoring instructions.`);
  }

  const guide = template._template;
  if (!guide || typeof guide !== 'object' || Array.isArray(guide)) {
    failures.push(`${item.key}: missing self-contained _template authoring guide.`);
    continue;
  }

  if (!String(guide.purpose || '').trim()) failures.push(`${item.key}: _template.purpose is required.`);
  requireArray(guide.workflow, 4, `${item.key} workflow`);

  const generation = guide.generation_contract || {};
  if (generation.output !== 'valid_json_only') failures.push(`${item.key}: generation output must be valid_json_only.`);
  if (generation.markdown_fences !== false) failures.push(`${item.key}: markdown fences must be explicitly disabled.`);
  if (generation.comments !== false) failures.push(`${item.key}: JSON comments must be explicitly disabled.`);
  if (!Array.isArray(generation.invariant_fields) || !generation.invariant_fields.includes('_template')) {
    failures.push(`${item.key}: _template must be listed as an invariant field.`);
  }

  if (item.key === 'educational_content_block') {
    requireArray(guide.global_pedagogical_rules, 8, `${item.key} pedagogical rules`);
    requireArray(guide.supported_section_types, 6, `${item.key} supported section types`);
    if (!guide.section_contracts?.rule || !guide.section_contracts?.example || !guide.section_contracts?.recap) {
      failures.push(`${item.key}: structured teaching section contracts are incomplete.`);
    }
  } else {
    if (guide.template_key !== item.key) failures.push(`${item.key}: _template.template_key does not match manifest key.`);
    if (guide.entity_type !== item.entityType) failures.push(`${item.key}: _template.entity_type does not match manifest entity type.`);
    requireArray(guide.common_pedagogical_rules, 8, `${item.key} pedagogical rules`);
    requireArray(guide.metadata_rules, 5, `${item.key} metadata rules`);
    requireArray(guide.diagnostics_rules, 3, `${item.key} diagnostics rules`);
    requireArray(guide.grading_rules, 4, `${item.key} grading rules`);
    requireArray(guide.validation_checklist, 7, `${item.key} validation checklist`);
    requireArray(guide.invalid_patterns, 6, `${item.key} invalid patterns`);
    requireArray(guide.entity_contract?.rules, 3, `${item.key} entity contract`);

    if (item.entityType === 'question') {
      if (!guide.question_type) failures.push(`${item.key}: question template must declare question_type.`);
      requireArray(guide.question_contract?.rules, 3, `${item.key} question contract`);
      if (item.key === 'dialogue_roleplay_audio_per_turn' && guide.question_type !== 'dialogue_roleplay_audio_per_turn') {
        failures.push(`${item.key}: audio-per-turn template must declare its specialised question contract.`);
      }
    }
  }

  const roundTrip = validateExerciseBuilderJson(JSON.stringify(template));
  if (roundTrip.errors.length || roundTrip.items.some((validatedItem) => validatedItem.status === 'invalid')) {
    failures.push(`${item.key}: self-contained template does not round-trip through Exercise Builder.`);
  }

  try {
    const stored = JSON.parse(await readFile(path.join(root, 'public', 'templates', item.fileName), 'utf8'));
    if (!stored._template) failures.push(`${item.fileName}: generated static download is missing _template.`);
    if (Object.keys(stored)[2] !== '_template') failures.push(`${item.fileName}: generated static download does not place _template near the top.`);
  } catch (error) {
    failures.push(`${item.fileName}: generated static download missing or invalid (${error.message}).`);
  }
}

if (failures.length) {
  console.error('Exercise authoring contract validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validated ${exerciseBuilderTemplateManifest.length} self-contained authoring contracts and their generated downloads.`);
