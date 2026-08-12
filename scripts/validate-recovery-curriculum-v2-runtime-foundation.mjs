import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = 'content/recovery/curriculum-v2';
const MIGRATION = 'supabase/migrations/20260812232454_recovery_curriculum_v2_runtime_foundation.sql';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const sql = readFileSync(MIGRATION, 'utf8');
const axes = readJson(`${ROOT}/competence-axes.json`).axes || [];
const modes = readJson(`${ROOT}/assessment-modes.json`).modes || [];
const blueprint = readJson(`${ROOT}/assessment-blueprint.json`);
const readiness = readJson(`${ROOT}/readiness-policy.json`);

assert.equal(readiness.runtime_status, 'contract_only_not_yet_active');

const requiredTables = [
  'recovery_curriculum_axes',
  'recovery_assessment_modes',
  'recovery_curriculum_outcomes',
  'recovery_enrollment_outcomes',
  'recovery_assessment_fragments',
  'recovery_assessment_fragment_outcomes',
  'recovery_assessment_fragment_modes',
  'recovery_outcome_evidence',
];
for (const table of requiredTables) {
  assert.match(sql, new RegExp(`create table public\\.${table}\\b`, 'i'), `Missing ${table}`);
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `${table} must have RLS`);
}

for (const axis of axes) {
  assert.match(sql, new RegExp(`'${axis.key}'`), `Runtime foundation missing canonical axis ${axis.key}`);
}
const insertedAxisKeys = [...sql.matchAll(/\('([a-z][a-z0-9_]*)',\s*'[^']*(?:''[^']*)*',\s*[0-9]+\)/g)]
  .map((match) => match[1])
  .filter((key) => axes.some((axis) => axis.key === key));
assert.equal(new Set(insertedAxisKeys).size, axes.length, 'Runtime axis seed must match canonical competence axes.');

for (const mode of modes) {
  assert.match(sql, new RegExp(`'${mode.key}'`), `Runtime foundation missing canonical assessment mode ${mode.key}`);
}
const canonicalModeKeys = new Set(modes.map((mode) => mode.key));
const seededModeKeys = [...sql.matchAll(/\('([a-z][a-z0-9_]*)',\s*'[^']*(?:''[^']*)*'\)/g)]
  .map((match) => match[1])
  .filter((key) => canonicalModeKeys.has(key));
assert.equal(new Set(seededModeKeys).size, modes.length, 'Runtime assessment-mode seed must match assessment-modes.json.');

assert.match(sql, /outcome_id text primary key/i);
assert.match(sql, /school_year_profile smallint not null/i);
assert.match(sql, /competence_axis text not null references public\.recovery_curriculum_axes/i);
assert.match(sql, /programme_requirement text not null check/i);
assert.match(sql, /blocking_candidate boolean not null/i);
assert.match(sql, /source_payload jsonb not null/i);
assert.match(sql, /requirement_source text not null check \(requirement_source in \('school_programme', 'inferred_year_profile', 'manual_override'\)\)/i);

const fragmentFields = blueprint.assessment_fragment_contract?.required_fields || [];
for (const field of ['fragment_id', 'year_profiles', 'primary_axis', 'estimated_minutes', 'difficulty_band', 'school_task_family', 'transfer_level', 'content_source_policy']) {
  assert.ok(fragmentFields.includes(field), `Assessment blueprint no longer requires ${field}; review runtime foundation.`);
  assert.match(sql, new RegExp(`\\b${field}\\b`, 'i'), `Fragment runtime table missing ${field}`);
}
assert.match(sql, /create table public\.recovery_assessment_fragment_outcomes/i);
assert.match(sql, /create table public\.recovery_assessment_fragment_modes/i);
assert.match(sql, /unique \(exercise_version_id\)/i);
assert.doesNotMatch(sql, /alter table public\.recovery_exercise_map/i, 'T1 must not mutate the mature topic mapping table.');

const evidenceFields = [
  'enrollment_id',
  'outcome_id',
  'evidence_source',
  'primary_axis',
  'assessment_mode',
  'performance_level',
  'evidence_status',
  'score',
  'rubric_dimensions',
  'form_family_key',
  'unseen_or_mixed_context',
  'production_evidence',
  'evidence_key',
  'observed_at',
];
for (const field of evidenceFields) {
  assert.match(sql, new RegExp(`\\b${field}\\b`, 'i'), `Outcome evidence missing ${field}`);
}
for (const source of (blueprint.evidence_sources || []).map((entry) => entry.key)) {
  assert.match(sql, new RegExp(`'${source}'`), `Outcome evidence source check missing ${source}`);
}
assert.match(sql, /evidence_status in \('pending_review', 'valid', 'void'\)/i);
assert.match(sql, /evidence_status = 'pending_review' and score is null/i);
assert.match(sql, /evidence_status = 'valid' and score is not null/i);
assert.match(sql, /evidence_key text not null unique/i);
assert.match(sql, /form_family_key/i);

assert.doesNotMatch(sql, /alter table public\.recovery_mastery_evidence/i, 'T1 must keep topic mastery evidence intact.');
assert.doesNotMatch(sql, /alter table public\.recovery_student_topics/i, 'T1 must not mutate topic mastery state.');
assert.doesNotMatch(sql, /create or replace function public\.compute_recovery_readiness/i, 'T1 must not cut over readiness.');
assert.doesNotMatch(sql, /create or replace function public\.calculateRecoveryReadiness/i, 'T1 must not cut over client readiness.');
assert.doesNotMatch(sql, /grant\s+(insert|update|delete|all)\b[^;]*\bto authenticated/i, 'Authenticated users must not receive direct mutation grants on v2 runtime tables.');

for (const table of ['recovery_enrollment_outcomes', 'recovery_outcome_evidence']) {
  assert.match(sql, new RegExp(`create policy ${table.replace('recovery_', 'recovery_')}.*owner_read[\\s\\S]*?public\\.is_admin\\(\\)[\\s\\S]*?auth\\.uid\\(\\)`, 'i'), `${table} needs owner/admin read policy`);
}

assert.match(sql, /notify pgrst, 'reload schema'/i);

console.log('Recovery Curriculum v2 runtime foundation validation passed.');
