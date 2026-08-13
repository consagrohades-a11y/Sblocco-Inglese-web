import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = 'content/recovery/curriculum-v2';
const MIGRATION = 'supabase/migrations/20260813010000_recovery_curriculum_v2_enrollment_scope.sql';
const sql = readFileSync(MIGRATION, 'utf8');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const years = [1, 2, 3].map((year) => readJson(`${ROOT}/years/year-${year}.json`));
const outcomes = years.flatMap((year) => year.outcomes || []);
const counts = new Map();
for (const year of [1, 2, 3]) {
  const current = outcomes.filter((outcome) => outcome.school_year_profile === year);
  counts.set(year, {
    default_core: current.filter((outcome) => outcome.programme_requirement === 'default_core').length,
    default_if_assessed: current.filter((outcome) => outcome.programme_requirement === 'default_if_assessed').length,
    programme_dependent: current.filter((outcome) => outcome.programme_requirement === 'programme_dependent').length,
  });
}
assert.deepEqual(Object.fromEntries(counts), {
  1: { default_core: 16, default_if_assessed: 2, programme_dependent: 3 },
  2: { default_core: 9, default_if_assessed: 7, programme_dependent: 3 },
  3: { default_core: 9, default_if_assessed: 9, programme_dependent: 5 },
});

for (const fn of [
  'sync_recovery_inferred_outcome_scope_internal',
  'refresh_recovery_enrollment_outcome_scope',
  'admin_set_recovery_enrollment_outcome_requirement',
  'admin_clear_recovery_enrollment_outcome_override',
  'get_recovery_enrollment_curriculum_scope',
  'sync_recovery_enrollment_outcome_scope_trigger',
]) {
  assert.match(sql, new RegExp(`create or replace function public\\.${fn}\\b`, 'i'), `Missing ${fn}`);
}

// Fallback must be narrow: approved default_core outcomes for the enrollment year only.
assert.match(sql, /outcome\.status = 'approved'/i);
assert.match(sql, /outcome\.school_year_profile = v_class_year/i);
assert.match(sql, /outcome\.programme_requirement = 'default_core'/i);
assert.doesNotMatch(sql, /outcome\.programme_requirement\s+in\s*\([^)]*default_if_assessed/i, 'Fallback must never auto-activate default_if_assessed.');
assert.doesNotMatch(sql, /outcome\.programme_requirement\s+in\s*\([^)]*programme_dependent/i, 'Fallback must never auto-activate programme_dependent.');

// Refresh deletes only inferred rows and explicit rows win via PK conflict.
assert.match(sql, /delete from public\.recovery_enrollment_outcomes[\s\S]*?requirement_source = 'inferred_year_profile'/i);
assert.match(sql, /on conflict \(enrollment_id, outcome_id\) do nothing/i);
assert.doesNotMatch(sql, /delete from public\.recovery_enrollment_outcomes[\s\S]*?requirement_source in \('school_programme', 'manual_override'\)[\s\S]*?insert into public\.recovery_enrollment_outcomes[\s\S]*?'inferred_year_profile'/i,
  'Inferred refresh must not delete explicit programme/manual overrides.');

// Explicit admin override can include or exclude, but only with explicit sources.
assert.match(sql, /p_requirement_source not in \('school_programme', 'manual_override'\)/i);
assert.match(sql, /required = excluded\.required/i);
assert.match(sql, /requirement_source = excluded\.requirement_source/i);
assert.match(sql, /created_by = excluded\.created_by/i);
assert.match(sql, /if not public\.is_admin\(\) then[\s\S]*?Admin access required/i);
assert.match(sql, /p_required boolean/i);

// Clearing an explicit core override must allow the inferred default to return.
assert.match(sql, /admin_clear_recovery_enrollment_outcome_override[\s\S]*?requirement_source in \('school_programme', 'manual_override'\)[\s\S]*?sync_recovery_inferred_outcome_scope_internal/i);

// Owners/admins can read/refresh their own scope, but direct table writes stay unavailable.
assert.match(sql, /not public\.is_admin\(\) and v_user_id <> \(select auth\.uid\(\)\)/i);
assert.match(sql, /grant execute on function public\.refresh_recovery_enrollment_outcome_scope\(uuid\) to authenticated/i);
assert.match(sql, /grant execute on function public\.get_recovery_enrollment_curriculum_scope\(uuid\) to authenticated/i);
assert.doesNotMatch(sql, /grant\s+(insert|update|delete|all)\b[^;]*recovery_enrollment_outcomes[^;]*to authenticated/i,
  'Enrollment scope must not expose direct authenticated mutation grants.');

// Scope response must be disaggregated and must not claim v2 readiness is active.
for (const field of [
  'outcome_id', 'competence_axis', 'cefr_target', 'programme_requirement', 'blocking_candidate',
  'required', 'requirement_source', 'active_axes', 'required_outcome_count',
]) {
  assert.match(sql, new RegExp(`'${field}'`, 'i'), `Scope response missing ${field}`);
}
assert.match(sql, /'readiness_v2_active', false/i);

// Trigger covers new enrollments and class-year changes; existing enrollments receive only inferred fallback.
assert.match(sql, /after insert or update of class_year on public\.recovery_enrollments/i);
assert.match(sql, /for enrollment in[\s\S]*?select id from public\.recovery_enrollments where class_year between 1 and 3/i);
assert.match(sql, /perform public\.sync_recovery_inferred_outcome_scope_internal\(enrollment\.id\)/i);

// This is programme scoping only: no evidence, fragments or readiness cutover.
assert.doesNotMatch(sql, /insert into public\.recovery_outcome_evidence/i);
assert.doesNotMatch(sql, /insert into public\.recovery_assessment_fragments/i);
assert.doesNotMatch(sql, /compute_recovery_readiness/i);
assert.doesNotMatch(sql, /recovery_readiness_snapshots/i);

console.log('Recovery Curriculum v2 enrollment scope validation passed.');
