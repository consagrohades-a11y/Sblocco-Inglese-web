import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mastery = readFileSync('supabase/migrations/20260812154000_recovery_mastery_v2.sql', 'utf8');
const hardening = readFileSync('supabase/migrations/20260812154500_recovery_mastery_v2_hardening.sql', 'utf8');

// Mastery is an evidence ledger, not a generic running average.
assert.match(mastery, /create table public\.recovery_mastery_evidence/);
assert.match(mastery, /evidence_key text not null unique/);
assert.doesNotMatch(mastery, /mastery_score \* 0\.5/);

// Educational evidence has explicit reliability differences.
for (const evidenceType of [
  'diagnostic',
  'guided_practice',
  'practice',
  'school_mode',
  'mini_check',
  'error_review',
  'checkpoint',
  'mock',
]) {
  assert.match(mastery, new RegExp(`when '${evidenceType}' then`), `${evidenceType} must have an explicit weight.`);
}
assert.match(mastery, /when 'mock' then 1\.00/);
assert.match(mastery, /when 'diagnostic' then 0\.20/);

// Strong diagnostic evidence alone cannot produce a recovered state.
assert.match(mastery, /v_weighted_score >= 80[\s\S]*v_reliable_latest is not null[\s\S]*v_reliable_latest >= 80/);
assert.match(mastery, /verification_only[\s\S]*v_reliable_latest is null[\s\S]*diagnostic_score, 0\) >= 85/);
assert.match(mastery, /v_new_state := 'almost_ready'/);

// Regression exists and is driven by later reliable evidence or repeated errors.
assert.match(mastery, /v_had_recovered/);
assert.match(mastery, /v_topic\.repeated_errors >= 3/);
assert.match(mastery, /v_new_state := 'needs_recheck'/);

// Checkpoint/mock topic scores must aggregate every latest submitted resource attempt.
assert.match(mastery, /with latest_attempts as/);
assert.match(mastery, /join public\.exercise_builder_attempt_questions attempt_question on attempt_question\.attempt_id = latest\.id/);
assert.match(mastery, /jsonb_object_agg\(by_topic\.topic, by_topic\.score\)/);

// Topic sessions use the existing Recovery resource phases without changing Exercise Builder.
assert.match(mastery, /when 'recover' then 'guided_practice'/);
assert.match(mastery, /when 'practice' then 'practice'/);
assert.match(mastery, /when 'school' then 'school_mode'/);
assert.match(mastery, /when 'verify' then 'mini_check'/);

// Learners can read their evidence, but cannot write the ledger or invoke mastery mutators directly.
assert.match(mastery, /revoke all privileges on table public\.recovery_mastery_evidence from anon, authenticated/);
assert.match(mastery, /grant select on table public\.recovery_mastery_evidence to authenticated/);
assert.match(hardening, /revoke execute on function public\.recalculate_recovery_topic_mastery\(uuid, text\) from authenticated/);
assert.match(hardening, /revoke execute on function public\.recovery_evidence_weight\(text\) from authenticated/);
assert.match(hardening, /grant execute on function public\.sync_recovery_session\(uuid\) to authenticated/);

console.log('Recovery Mastery Engine v2 validation passed.');
