import fs from 'node:fs';
import assert from 'node:assert/strict';

const migrationPath = 'supabase/migrations/20260813110000_recovery_curriculum_v2_fragment_import_resolver.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

for (const marker of [
  'admin_resolve_recovery_assessment_fragment_from_import',
  'admin_register_recovery_assessment_fragment_from_import',
  'admin_register_recovery_assessment_fragment_manifest_from_import',
  'if not public.is_admin()',
  'item.batch_id = p_batch_id',
  'item.client_key = v_exercise_client_key',
  "item.entity_type = 'exercise'",
  'v_item.promoted_entity_id',
  'v_exercise.current_version_id',
  'v_version.source_import_item_id is distinct from v_item.id',
  "v_item.payload -> 'sections'",
  "sections.section -> 'questions'",
  'with ordinality sections(section, section_ordinality)',
  'with ordinality questions(question, question_ordinality)',
  'section.sequence_index = v_section_index',
  'fixed.sequence_index = v_question_index',
  'v_question_version.source_import_item_id is distinct from v_item.id',
  "'question_version_id', v_question_version_id",
  "'source_section_index', v_section_index",
  "'source_question_index', v_question_index",
  "'source_resolver', 'recovery-v2-fragment-import-resolver-v1'",
  'public.admin_register_recovery_assessment_fragment(v_resolved)',
  'v_batch.invalid_count > 0',
  "'readiness_v2_active', false"
]) {
  assert.ok(sql.includes(marker), `Missing resolver contract marker: ${marker}`);
}

// Client-key resolution must be position/provenance based, never fuzzy learner-copy matching.
assert.ok(!/question_version\.prompt\s*=|question_version\.title\s*=|ilike\s+[^;]*(prompt|title)/i.test(sql), 'Resolver must never match immutable questions by prompt/title text.');
assert.ok(!/levenshtein|similarity\s*\(/i.test(sql), 'Resolver must not use fuzzy text matching.');

// First version is deliberately fixed-question-only and fails closed for pools/question refs.
assert.match(sql, /Pool\/question_ref resolution is intentionally unsupported/);
assert.ok(sql.includes('exercise_builder_section_fixed_questions'));
assert.ok(!sql.includes('exercise_builder_pool_questions'));
assert.ok(!sql.includes('exercise_builder_section_pool_rules'));

// Source ordinality is converted to the 0-based indexes preserved by Exercise Builder promotion.
assert.match(sql, /section_ordinality\s*-\s*1/);
assert.match(sql, /question_ordinality\s*-\s*1/);

// Registration lifecycle stays delegated to the existing guarded fragment registrar.
assert.equal((sql.match(/public\.admin_register_recovery_assessment_fragment\(v_resolved\)/g) || []).length, 1);
assert.ok(!/insert\s+into\s+public\.recovery_assessment_fragments/i.test(sql), 'Resolver must not bypass the canonical guarded fragment registrar.');

// No learner-facing readiness cutover or cumulative materializer changes belong here.
assert.ok(!/create or replace function public\.get_recovery_readiness\s*\(/i.test(sql));
assert.ok(!/create or replace function public\.materialize_recovery_session\s*\(/i.test(sql));

console.log('Recovery v2 fragment import resolver validation passed: source client keys resolve by immutable import provenance + fixed 0-based position.');
