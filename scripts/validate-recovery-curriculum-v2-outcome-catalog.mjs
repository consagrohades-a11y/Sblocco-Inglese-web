import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const ROOT = 'content/recovery/curriculum-v2';
const MIGRATION = 'supabase/migrations/20260813030000_recovery_curriculum_v2_outcome_catalog.sql';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const years = [1, 2, 3].map((year) => readJson(`${ROOT}/years/year-${year}.json`));
const outcomes = years.flatMap((year) => year.outcomes || []).sort((a, b) => a.id.localeCompare(b.id));
assert.equal(outcomes.length, 63, 'Runtime catalog seed expects exactly 63 Curriculum v2 outcomes.');
assert.equal(new Set(outcomes.map((outcome) => outcome.id)).size, 63, 'Outcome IDs must be unique.');
for (const outcome of outcomes) assert.equal(outcome.status, 'approved', `${outcome.id}: reviewed runtime source must be approved.`);

const sql = readFileSync(MIGRATION, 'utf8');
const marker = '$recovery_curriculum_v2$';
const first = sql.indexOf(marker);
const second = sql.indexOf(marker, first + marker.length);
assert.ok(first >= 0 && second > first, 'Could not find embedded Curriculum v2 seed payload.');
const records = JSON.parse(sql.slice(first + marker.length, second));
assert.equal(records.length, 63, 'Embedded seed must contain exactly 63 records.');
assert.equal(new Set(records.map((record) => record.outcome_id)).size, 63, 'Embedded seed IDs must be unique.');

const sourceById = new Map(outcomes.map((outcome) => [outcome.id, outcome]));
for (const record of records) {
  const source = sourceById.get(record.outcome_id);
  assert.ok(source, `Seed contains unknown outcome ${record.outcome_id}`);
  assert.equal(record.curriculum_id, 'recovery-years-1-3-v2');
  assert.equal(record.schema_version, 1);
  assert.equal(record.school_year_profile, source.school_year_profile, `${record.outcome_id}: year mismatch`);
  assert.equal(record.competence_axis, source.competence_axis, `${record.outcome_id}: axis mismatch`);
  assert.equal(record.cefr_target, source.cefr_target, `${record.outcome_id}: CEFR mismatch`);
  assert.equal(record.label_it, source.label_it, `${record.outcome_id}: label mismatch`);
  assert.equal(record.observable_outcome_it, source.observable_outcome_it, `${record.outcome_id}: observable outcome mismatch`);
  assert.equal(record.programme_requirement, source.programme_requirement, `${record.outcome_id}: programme requirement mismatch`);
  assert.equal(record.blocking_candidate, Boolean(source.blocking_candidate), `${record.outcome_id}: blocking flag mismatch`);
  assert.equal(record.status, 'approved', `${record.outcome_id}: seed status must be approved`);
  assert.deepEqual(record.source_payload, source, `${record.outcome_id}: source payload drift`);
  const expectedHash = crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex');
  assert.equal(record.source_hash, expectedHash, `${record.outcome_id}: source hash drift`);
}

assert.match(sql, /insert into public\.recovery_curriculum_outcomes/i);
assert.match(sql, /on conflict \(outcome_id\) do update/i);
assert.match(sql, /where public\.recovery_curriculum_outcomes\.source_hash is distinct from excluded\.source_hash/i);
assert.match(sql, /v_total <> 63 or v_approved <> 63/i);
assert.doesNotMatch(sql, /insert into public\.recovery_enrollment_outcomes/i, 'Catalog seed must not assign outcomes to learners.');
assert.doesNotMatch(sql, /insert into public\.recovery_outcome_evidence/i, 'Catalog seed must not create learner evidence.');
assert.doesNotMatch(sql, /insert into public\.recovery_assessment_fragments/i, 'Catalog seed must not create assessment fragments.');
assert.doesNotMatch(sql, /compute_recovery_readiness/i, 'Catalog seed must not change readiness runtime.');

console.log('Recovery Curriculum v2 outcome catalog validation passed.');
