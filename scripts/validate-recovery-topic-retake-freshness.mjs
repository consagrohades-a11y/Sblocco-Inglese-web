import fs from 'node:fs';
import assert from 'node:assert/strict';

const annotationMigrationPath = 'supabase/migrations/20260813154500_recovery_topic_retake_freshness.sql';
const masteryMigrationPath = 'supabase/migrations/20260813154600_recovery_mastery_fresh_verify_gate.sql';
const canaryPath = 'scripts/sql/recovery-topic-remediation-canary.sql';

for (const path of [annotationMigrationPath, masteryMigrationPath, canaryPath]) {
  assert.ok(fs.existsSync(path), `Missing Recovery retake safeguard asset: ${path}`);
}

const annotationMigration = fs.readFileSync(annotationMigrationPath, 'utf8');
const masteryMigration = fs.readFileSync(masteryMigrationPath, 'utf8');
const canary = fs.readFileSync(canaryPath, 'utf8');

for (const required of [
  'fresh_form',
  'verify_exercise_version_id',
  'previous_verify_exercise_version_id',
  'same_exercise_version',
  'different_exercise_version',
  'freshness_policy_version',
]) {
  assert.ok(annotationMigration.includes(required), `Freshness annotation migration is missing: ${required}`);
}

assert.ok(
  masteryMigration.includes("evidence.evidence_type in ('checkpoint', 'mock')"),
  'Checkpoint/mock evidence must remain in the reliable mastery gate.',
);
assert.ok(
  masteryMigration.includes("coalesce(evidence.metadata -> 'fresh_form', 'true'::jsonb) = 'true'::jsonb"),
  'Mastery reliable-evidence gate must require fresh mini-check evidence.',
);
assert.ok(
  masteryMigration.includes("'rule_version', 'recovery-mastery-v2-retake-freshness'"),
  'Mastery reason must expose the retake-freshness rule version.',
);

for (const scenarioMarker of [
  'same-form retake must not recover',
  'checkpoint must still consolidate after non-fresh retake',
  'different-form retake must be fresh',
  'different-form retake must recover normally',
]) {
  assert.ok(canary.includes(scenarioMarker), `DB canary is missing scenario: ${scenarioMarker}`);
}

assert.ok(canary.includes('begin;') && canary.includes('rollback;'), 'DB canary must be transactional and rollback its fixtures.');
assert.ok(canary.includes('public.sync_recovery_session'), 'DB canary must exercise the real Recovery session synchronization lifecycle.');
assert.ok(canary.includes('public.record_recovery_mastery_evidence'), 'DB canary must exercise the real mastery evidence recorder.');

console.log('Recovery topic retake freshness safeguard validated.');
