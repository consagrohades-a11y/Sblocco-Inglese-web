import fs from 'node:fs';
import assert from 'node:assert/strict';

const contractPath = 'content/recovery/curriculum-v2/outcome-materializer-contract.json';
const migrationPath = 'supabase/migrations/20260813090000_recovery_curriculum_v2_outcome_materializer.sql';

const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const sql = fs.readFileSync(migrationPath, 'utf8');

assert.equal(contract.contract_id, 'recovery-curriculum-v2-outcome-materializer-v1');
assert.equal(contract.rollout_policy.readiness_v2_active, false);
assert.equal(contract.axis_coverage.checkpoint.grammar_time_share_ceiling, 0.6);
assert.equal(contract.axis_coverage.mock_intermediate.grammar_time_share_ceiling, 0.55);
assert.equal(contract.axis_coverage.mock_final.grammar_time_share_ceiling, 0.5);
assert.equal(contract.axis_coverage.mock_final.rollout_minimum_distinct_axes_when_available, 3);

for (const expected of [
  'recovery_v2_assessment_pool_status_internal',
  'select_recovery_assessment_fragments_internal',
  'materialize_recovery_session',
  "fragment.status = 'approved'",
  "exercise.status = 'published'",
  "version.review_status = 'approved'",
  "fragment.transfer_level = 'transfer'",
  "mapped.evidence_role = 'primary'",
  "used.form_family_key = fragment.form_family_key",
  "recovery_form_family_key",
  "recovery_materializer",
  "curriculum_v2_fragments",
  "legacy_mapping_fallback",
  "insufficient_fresh_v2_fragment_coverage",
  "final_mock_missing_blocking_axis_coverage",
  "'checkpoint' then 0.60",
  "'mock_intermediate' then 0.55",
  "'mock_final' then 0.50",
  "'allow_retry', not v_is_mock",
  "'show_correct_answers', not v_is_mock",
  "metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object"
]) {
  assert.ok(sql.includes(expected), `Missing materializer contract marker: ${expected}`);
}

// Rollout may fall back only before v2 has started. Once started, v2 remains authoritative.
assert.match(sql, /v_use_v2_fragments\s*:=\s*coalesce\(\(v_pool_status ->> 'ready'\)::boolean, false\) or v_v2_started/);
assert.match(sql, /resource\.exercise_config ->> 'recovery_materializer' = 'curriculum_v2_fragments'/);

// The final mock must hard-gate fresh primary-axis coverage for blocking axes.
assert.match(sql, /v_required_blocking_axes/);
assert.match(sql, /v_missing_blocking_axes/);
assert.match(sql, /mock_final[\s\S]*final_mock_missing_blocking_axis_coverage/);

// Cumulative v2 resources must be neutral to avoid leaking the tested rule/outcome.
assert.ok(sql.includes("'Verifica di percorso · Parte '"));
assert.ok(sql.includes("'Simulazione · Parte '"));
assert.ok(sql.includes("'Simulazione finale · Parte '"));
assert.ok(!sql.includes('recovery_outcome_label'));

// Guard against the stale draft schema that does not exist in production.
for (const forbidden of [
  'display_label',
  'estimated_duration',
  'scheduled_date',
  'topic_label',
  'materialization_state',
  "status = 'blocked'"
]) {
  assert.ok(!sql.includes(forbidden), `Stale schema marker must not be used: ${forbidden}`);
}

// Current assignment/resource schema markers must stay explicit.
for (const required of [
  'learner_note',
  'deadline_at',
  'estimated_minutes',
  "route, sequence_index, exercise_config",
  "'/exercises'"
]) {
  assert.ok(sql.includes(required), `Current production schema marker missing: ${required}`);
}

// Readiness cutover is intentionally outside this migration.
assert.ok(!/create or replace function public\.get_recovery_readiness\s*\(/i.test(sql));
assert.ok(!/recovery_readiness_snapshots/i.test(sql));

console.log('Recovery Curriculum v2 outcome materializer contract validated.');
