import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = 'content/recovery/curriculum-v2';
const MIGRATION = 'supabase/migrations/20260813003000_recovery_curriculum_v2_fragment_evidence.sql';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const contract = readJson(`${ROOT}/fragment-evidence-contract.json`);
const blueprint = readJson(`${ROOT}/assessment-blueprint.json`);
const readiness = readJson(`${ROOT}/readiness-policy.json`);
const sql = readFileSync(MIGRATION, 'utf8');

assert.equal(contract.schema_version, 1);
assert.equal(contract.contract_id, 'recovery-curriculum-v2-fragment-evidence-v1');
assert.equal(contract.status, 'draft');
assert.ok(contract.principles.some((rule) => /entire exercise score/i.test(rule) && /mapped scored questions/i.test(rule)));
assert.ok(contract.principles.some((rule) => /pending_review/i.test(rule) && /zero/i.test(rule)));
assert.ok(contract.principles.some((rule) => /form_family_key/i.test(rule)));
assert.equal(contract.evidence_capture.readiness_runtime_active, false);
assert.equal(readiness.runtime_status, 'contract_only_not_yet_active');
assert.ok(blueprint.assessment_fragment_contract);

assert.match(sql, /add column if not exists unseen_or_mixed_context boolean not null default true/i);
assert.match(sql, /create table public\.recovery_assessment_fragment_questions/i);
for (const field of [
  'fragment_id', 'question_version_id', 'outcome_id', 'assessment_mode',
  'evidence_role', 'production_evidence', 'evidence_weight',
]) {
  assert.match(sql, new RegExp(`\\b${field}\\b`, 'i'), `Question mapping table missing ${field}`);
}
assert.match(sql, /evidence_weight > 0 and evidence_weight <= 1/i);
assert.match(sql, /alter table public\.recovery_assessment_fragment_questions enable row level security/i);
assert.doesNotMatch(sql, /grant\s+(insert|update|delete|all)\b[^;]*recovery_assessment_fragment_questions[^;]*to authenticated/i);

assert.match(sql, /create or replace function public\.recovery_question_version_belongs_to_exercise_version/i);
assert.match(sql, /exercise_builder_section_fixed_questions/i);
assert.match(sql, /exercise_builder_section_pool_rules/i);
assert.match(sql, /exercise_builder_pool_questions/i);

assert.match(sql, /create or replace function public\.admin_register_recovery_assessment_fragment\(\s*p_fragment jsonb/i);
assert.match(sql, /if not public\.is_admin\(\) then[\s\S]*?Admin access required/i);
assert.match(sql, /v_status = 'approved' and \(v_exercise_status <> 'published' or v_version_status <> 'approved'\)/i);
assert.match(sql, /Approved fragments require approved mapped question versions/i);
assert.match(sql, /Every outcome axis must be the fragment primary_axis or one of its secondary_axes/i);
assert.match(sql, /At least one declared outcome must belong to primary_axis/i);
assert.match(sql, /Every declared outcome_id must have at least one question mapping/i);
assert.match(sql, /Every declared assessment_mode must have at least one question mapping/i);
assert.match(sql, /Primary question evidence must target an outcome on fragment primary_axis/i);
assert.match(sql, /question_mappings must be a non-empty array/i);

assert.match(sql, /create or replace function public\.sync_recovery_outcome_evidence_for_attempt_internal/i);
for (const sessionType of ['checkpoint', 'mock_intermediate', 'mock_final']) {
  assert.match(sql, new RegExp(`when '${sessionType}' then '${sessionType}'`, 'i'), `Evidence capture missing ${sessionType}`);
}
assert.doesNotMatch(sql, /when 'topic' then 'topic_verify'/i, 'B2a cumulative fragment capture must not invent topic-verify mappings.');
assert.match(sql, /join public\.recovery_enrollment_outcomes scoped[\s\S]*?scoped\.required/i);
assert.match(sql, /v_evidence_status := 'pending_review'[\s\S]*?v_score := null/i);
assert.match(sql, /v_evidence_status := 'valid'/i);
assert.match(sql, /100 \* coalesce\(\(v_question\.grading_result ->> 'earned_points'\)::numeric, 0\)/i);
assert.match(sql, /'recovery-v2:' \|\| v_question\.attempt_question_id::text/i);
assert.match(sql, /on conflict \(evidence_key\) do update set/i);
assert.match(sql, /form_family_key,[\s\S]*?v_fragment\.form_family_key/i);
assert.match(sql, /unseen_or_mixed_context,[\s\S]*?v_fragment\.unseen_or_mixed_context/i);
assert.match(sql, /production_evidence,[\s\S]*?v_question\.production_evidence/i);
assert.match(sql, /'evidence_role', v_question\.evidence_role/i);
assert.match(sql, /'fragment_primary_axis', v_fragment\.primary_axis/i);
assert.match(sql, /'readiness_v2_active', false/i);

// Submission trigger captures the first state; question-review trigger refreshes the same evidence key later.
assert.match(sql, /after update of status on public\.exercise_builder_attempts/i);
assert.match(sql, /when \(new\.status = 'submitted'\)/i);
assert.match(sql, /after update of grading_result, reviewed_at, teacher_points_override, teacher_status_override/i);
assert.match(sql, /sync_recovery_outcome_evidence_for_attempt_internal\(new\.attempt_id\)/i);

// B2a must not change cumulative selection or readiness calculation.
assert.doesNotMatch(sql, /create or replace function public\.materialize_recovery_session/i);
assert.doesNotMatch(sql, /create or replace function public\.compute_recovery_readiness/i);
assert.doesNotMatch(sql, /alter table public\.recovery_student_topics/i);
assert.doesNotMatch(sql, /insert into public\.recovery_enrollment_outcomes/i);

const requiredFields = new Set(contract.fragment_registration.required_top_level_fields);
for (const field of ['fragment_id', 'exercise_version_id', 'primary_axis', 'outcome_ids', 'assessment_modes', 'question_mappings']) {
  assert.ok(requiredFields.has(field), `Fragment evidence contract missing registration field ${field}`);
}
assert.deepEqual(contract.evidence_capture.supported_sources, ['checkpoint', 'mock_intermediate', 'mock_final']);

console.log('Recovery Curriculum v2 fragment evidence validation passed.');
