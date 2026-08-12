import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260812153329_recovery_full_topic_review.sql', 'utf8');
const workspace = readFileSync('src/pages/RecoveryWorkspace.jsx', 'utf8');
const standard = JSON.parse(readFileSync('content/recovery/verification-standard-v2.json', 'utf8'));

assert.match(migration, /get_recovery_topic_review_availability/);
assert.match(migration, /start_recovery_topic_full_review/);
assert.match(migration, /mapping\.phase in \('recover', 'practice', 'school', 'verify'\)/);
assert.match(migration, /v_phase_count <> 4/);
assert.match(migration, /'required',?\s*false|false,\s*case when v_enrollment\.exam_date/s, 'Voluntary review assignment must not be required.');
assert.doesNotMatch(migration, /insert into public\.recovery_plan_sessions/i, 'Voluntary full review must not alter the adaptive plan queue.');
assert.doesNotMatch(migration, /update public\.recovery_student_topics/i, 'Voluntary full review must not lower or rewrite Recovery mastery.');
assert.match(migration, /'mastery_unchanged', true/);

assert.match(workspace, /get_recovery_topic_review_availability/);
assert.match(workspace, /start_recovery_topic_full_review/);
assert.match(workspace, /Rivedi tutto/);
assert.match(workspace, /review\?\.available/);
assert.match(workspace, /non abbassa il livello già consolidato/);

assert.equal(standard.schema_version, 2);
assert.equal(standard.display_label, 'Verifica argomento');
assert.ok(standard.duration_minutes.min >= 12, 'Verification v2 must last at least 12 minutes.');
assert.ok(standard.duration_minutes.target >= standard.duration_minutes.min);
assert.ok(standard.activity_count.min >= 10, 'Verification v2 must contain at least ten activities.');
assert.ok(standard.mastery_thresholds.recovered >= 80);
assert.equal(standard.feedback_timing, 'exercise_end');
assert.ok(standard.required_properties.length >= 8);
assert.ok(standard.prohibited_patterns.some((item) => item.includes('signal words')));
assert.ok(standard.required_properties.some((item) => item.includes('four distinct exercise formats')));
assert.ok(standard.required_properties.some((item) => item.includes('integrative items')));
assert.ok(standard.required_properties.some((item) => item.includes('neutral task titles')));

console.log('Recovery voluntary full-topic review and stronger verification v2 contract validated.');
