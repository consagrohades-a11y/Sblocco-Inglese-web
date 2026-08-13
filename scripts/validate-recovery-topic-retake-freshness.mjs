import fs from 'node:fs';
import assert from 'node:assert/strict';

const migrationPath = 'supabase/migrations/20260813154500_recovery_topic_retake_freshness.sql';
const canaryPath = 'scripts/sql/recovery-topic-remediation-canary.sql';

assert.ok(fs.existsSync(migrationPath), 'Missing Recovery retake freshness migration.');
assert.ok(fs.existsSync(canaryPath), 'Missing Recovery remediation DB canary.');

const migration = fs.readFileSync(migrationPath, 'utf8');
const canary = fs.readFileSync(canaryPath, 'utf8');

for (const required of [
  'fresh_form',
  'verify_exercise_version_id',
  'previous_verify_exercise_version_id',
  'same_exercise_version',
  'different_exercise_version',
  "evidence.evidence_type in ('checkpoint', 'mock')",
]) {
  assert.ok(migration.includes(required), `Freshness migration is missing: ${required}`);
}

assert.ok(
  migration.includes("coalesce(evidence.metadata -> 'fresh_form', 'true'::jsonb) = 'true'::jsonb"),
  'Mastery reliable-evidence gate must require fresh mini-check evidence.',
);

for (const scenarioMarker of [
  'same-form retake must not recover',
  'checkpoint must still consolidate after non-fresh retake',
  'different-form retake must be fresh',
  'different-form retake must recover normally',
]) {
  assert.ok(canary.includes(scenarioMarker), `DB canary is missing scenario: ${scenarioMarker}`);
}

console.log('Recovery topic retake freshness safeguard validated.');
