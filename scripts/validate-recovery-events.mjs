import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260812140550_recovery_event_ledger_v1.sql', 'utf8');

assert.match(migration, /create table public\.recovery_events/);
assert.match(migration, /event_key text not null unique/);

for (const eventType of [
  'plan_recalculated',
  'session_completed',
  'checkpoint_completed',
  'mock_completed',
  'topic_mastered',
  'topic_regressed',
  'error_detected',
  'error_resolved',
]) {
  assert.match(migration, new RegExp(`'${eventType}'`), `${eventType} must be represented in the Recovery event contract.`);
}

// Events are durable/idempotent and emitted from the structural Recovery state changes.
assert.match(migration, /on conflict \(event_key\) do nothing/);
assert.match(migration, /after update of plan_version on public\.recovery_enrollments/);
assert.match(migration, /after update of status on public\.recovery_plan_sessions/);
assert.match(migration, /after insert on public\.recovery_assessment_attempts/);
assert.match(migration, /after update of mastery_state, repeated_errors on public\.recovery_student_topics/);

// Learners may inspect their own event stream but cannot forge events.
assert.match(migration, /revoke all privileges on table public\.recovery_events from anon, authenticated/);
assert.match(migration, /grant select on table public\.recovery_events to authenticated/);
assert.match(migration, /revoke all on function public\.record_recovery_event\([\s\S]*from public, anon, authenticated/);
assert.doesNotMatch(migration, /grant execute on function public\.record_recovery_event/);

// Recovery attempts are excluded from generic Exercise Builder milestones both
// for the current attempt and for aggregate/personal-best comparisons.
const genericMilestoneFunction = migration.match(/create or replace function public\.award_exercise_milestones\(\)[\s\S]*?\n\$\$;/)?.[0] || '';
assert.ok(genericMilestoneFunction, 'Generic Exercise Builder milestone override must be present.');
assert.match(genericMilestoneFunction, /where recovery_session\.assignment_id = new\.assignment_id[\s\S]*return new/);
const aggregateExclusions = genericMilestoneFunction.match(/where recovery_session\.assignment_id = attempt\.assignment_id/g) || [];
assert.ok(aggregateExclusions.length >= 2, 'Recovery attempts must be excluded from both prior-best and high-score aggregates.');

// This phase is infrastructure only; rewards remain a separate downstream ledger.
assert.doesNotMatch(migration, /create table public\.recovery_reward/i);
assert.doesNotMatch(migration, /create table public\.recovery_achievement/i);
assert.doesNotMatch(migration, /xp_amount/i);

console.log('Recovery event ledger validation passed.');
