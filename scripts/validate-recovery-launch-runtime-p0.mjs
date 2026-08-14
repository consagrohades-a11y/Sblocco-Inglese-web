import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildRecoveryPlan,
  RECOVERY_PLAN_RUNTIME_PROFILE,
} from '../src/lib/recoveryPlanEngine.js';

const launchSessionTypes = new Set(['topic', 'quick_review']);
const unsupportedLaunchSessionTypes = new Set([
  'checkpoint',
  'error_review',
  'mock_intermediate',
  'mock_final',
]);
const now = new Date('2026-08-14T09:00:00+02:00');
const topicKeys = ['present-simple', 'past-simple', 'present-perfect', 'comparatives'];

function launchPlan(examDate, diagnosticScores = {}) {
  return buildRecoveryPlan({
    requiredTopicKeys: topicKeys,
    examDate,
    now,
    diagnosticScores,
    runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_LAUNCH,
  });
}

const completePlan = launchPlan('2026-09-03', {
  'present-simple': 34,
  'past-simple': 48,
  'present-perfect': 61,
  'comparatives-superlatives': 94,
});
const intensivePlan = launchPlan('2026-08-23');
const sosPlan = launchPlan('2026-08-18');

// 1. Every newly generated H30 plan contains only currently mapped topic work.
for (const plan of [completePlan, intensivePlan, sosPlan]) {
  assert.equal(plan.runtimeProfile, RECOVERY_PLAN_RUNTIME_PROFILE.H30_LAUNCH);
  assert.ok(plan.sessions.length > 0, 'A launch plan must contain actionable work.');
  assert.ok(plan.sessions.every((session) => launchSessionTypes.has(session.sessionType)));
  assert.equal(
    plan.sessions.some((session) => unsupportedLaunchSessionTypes.has(session.sessionType)),
    false,
  );
  assert.ok(plan.sessions.every((session) => topicKeys.includes(session.topicKey)));
  assert.ok(plan.sessions.every((session) => session.metadata.runtimeProfile === RECOVERY_PLAN_RUNTIME_PROFILE.H30_LAUNCH));
}

// 2. Weak required topics remain and rise to the front of the queue.
assert.equal(completePlan.sessions[0].topicKey, 'present-simple');
assert.ok(
  completePlan.topics.find((topic) => topic.topicKey === 'present-simple').priorityScore
    > completePlan.topics.find((topic) => topic.topicKey === 'comparatives').priorityScore,
);

// 3. Strong required school topics remain as quick verification work.
const strongTopic = completePlan.topics.find((topic) => topic.topicKey === 'comparatives');
const strongSession = completePlan.sessions.find((session) => session.topicKey === 'comparatives');
assert.equal(strongTopic.verificationOnly, true);
assert.equal(strongSession.sessionType, 'quick_review');

// Deferred cumulative architecture is retained, but cannot be selected accidentally.
const fullPlan = buildRecoveryPlan({
  requiredTopicKeys: topicKeys,
  examDate: '2026-09-03',
  now,
  runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.FULL_CURRICULUM,
});
assert.ok(fullPlan.sessions.some((session) => session.sessionType === 'checkpoint'));
assert.ok(fullPlan.sessions.some((session) => session.sessionType === 'mock_final'));

const remediationSql = readFileSync('supabase/migrations/20260813100500_recovery_topic_remediation_loop.sql', 'utf8');
const masterySql = readFileSync('supabase/migrations/20260812133100_recovery_mastery_v2.sql', 'utf8');
const dailyPlanSql = readFileSync('supabase/migrations/20260812131323_recovery_daily_plan_foundation.sql', 'utf8');
const recoveryFoundationSql = readFileSync('supabase/migrations/20260811010000_recovery_debt_foundation.sql', 'utf8');
const player = readFileSync('src/pages/ExercisePlayerV2.jsx', 'utf8');
const playerApi = readFileSync('src/lib/exercisePlayerApi.js', 'utf8');
const commerceMigration = readFileSync('supabase/migrations/20260809140000_stripe_pathway_commerce.sql', 'utf8');
const checkoutApi = readFileSync('api/stripe/checkout.js', 'utf8');
const webhookApi = readFileSync('api/stripe/webhook.js', 'utf8');
const primaryAxisFix = readFileSync('supabase/migrations/20260814062121_fix_recovery_assessment_primary_axis_ambiguity.sql', 'utf8');

// 4. Review/redo creates a fresh sequence and a new evidence-producing cycle.
assert.match(remediationSql, /coalesce\(max\(session\.sequence_index\), 0\) \+ 1/);
assert.match(remediationSql, /'voluntary_redo', true/);
assert.match(remediationSql, /'recovery_cycle', true/);
assert.match(masterySql, /attempt\.status = 'submitted'/);

// 5. A failed verify creates exactly one same-topic remediation cycle.
assert.match(remediationSql, /new\.evidence_type = 'mini_check' and new\.score < 80/);
assert.match(remediationSql, /session\.topic_key = v_evidence\.topic_key/);
assert.match(remediationSql, /'source_mastery_evidence_id', v_evidence\.id/);
assert.match(remediationSql, /'mandatory_remediation', true/);

// 6. Answers and cursor position are autosaved and the same attempt is reopened.
assert.match(player, /saveExerciseAnswer\(\{/);
assert.match(player, /currentSectionIndex: nextSectionIndex/);
assert.match(player, /currentQuestionIndex: nextQuestionIndex/);
assert.match(playerApi, /open_assigned_exercise_attempt/);
assert.match(playerApi, /save_exercise_builder_answer/);

// 7. Double submit recovers the authoritative attempt instead of creating another one.
assert.match(player, /if \(submitInFlight\.current \|\| busy \|\| !payload\?\.attempt\?\.id\) return/);
assert.match(player, /submitInFlight\.current = true[\s\S]*submitExerciseAttempt[\s\S]*submitInFlight\.current = false/);
assert.match(playerApi, /if \(error\) return recoverExerciseAttemptState\(error, attemptId\)/);

// 8. Completed sessions persist before the next due work is activated.
assert.match(masterySql, /if v_session\.status = 'completed' then/);
assert.match(masterySql, /set status = 'completed',[\s\S]*completed_at = coalesce\(completed_at, now\(\)\)/);
assert.match(masterySql, /queued\.status = 'planned'/);
assert.match(dailyPlanSql, /Only replace the not-started future queue/);
assert.match(dailyPlanSql, /session\.status in \('planned', 'available'\)/);

// 9. The primary_axis regression is fixed by a qualified candidate-table column.
assert.match(primaryAxisFix, /count\(distinct candidate\.primary_axis\)/);
assert.match(primaryAxisFix, /from pg_temp\.recovery_v2_candidate_fragments candidate/);
assert.doesNotMatch(primaryAxisFix, /count\(distinct primary_axis\)/);

// 10. Recovery writes are owner/entitlement scoped; the success URL grants nothing.
assert.match(recoveryFoundationSql, /if not public\.has_active_recovery_entitlement\(auth\.uid\(\)\)/);
assert.match(recoveryFoundationSql, /enrollment\.user_id = auth\.uid\(\)/);
assert.match(recoveryFoundationSql, /revoke all on function public\.configure_recovery_enrollment/);
assert.match(dailyPlanSql, /enrollment\.user_id = auth\.uid\(\)/);
assert.match(remediationSql, /enrollment\.user_id = auth\.uid\(\)/);
assert.doesNotMatch(checkoutApi, /insert\([^)]*user_entitlements|from\(['"]user_entitlements['"]\)\.insert/s);
assert.match(webhookApi, /fulfill_stripe_checkout/);
assert.match(commerceMigration, /grant execute on function public\.fulfill_stripe_checkout[\s\S]*to service_role/);

console.log('Recovery H30 launch runtime P0 validation passed.');
