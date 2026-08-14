import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateExerciseBuilderJson } from '../src/lib/exerciseBuilderSchemaV2.js';
import {
  buildRecoveryPlan,
  RECOVERY_PLAN_RUNTIME_PROFILE,
} from '../src/lib/recoveryPlanEngine.js';

const bundlePath = 'content/recovery/curriculum-v2/fragments/mixed-checkpoint-v1.bundle.json';
const manifestPath = 'content/recovery/curriculum-v2/fragments/mixed-checkpoint-v1.fragments.json';
const migrationPath = 'supabase/migrations/20260814094844_recovery_mixed_checkpoint_v1.sql';
const bundleText = fs.readFileSync(bundlePath, 'utf8');
const bundle = JSON.parse(bundleText);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const migration = fs.readFileSync(migrationPath, 'utf8');
const sessionPage = fs.readFileSync('src/pages/RecoverySession.jsx', 'utf8');
const workspacePage = fs.readFileSync('src/pages/RecoveryWorkspace.jsx', 'utf8');
const adminPage = fs.readFileSync('src/pages/AdminRecoveryContent.jsx', 'utf8');
const planReplacement = fs.readFileSync('supabase/migrations/20260812131323_recovery_daily_plan_foundation.sql', 'utf8');
const mastery = fs.readFileSync('supabase/migrations/20260812133100_recovery_mastery_v2.sql', 'utf8');

const schema = validateExerciseBuilderJson(bundleText);
assert.deepEqual(schema.errors, []);
assert.equal(schema.items.filter((item) => item.status === 'invalid').length, 0);
assert.equal(bundle.exercises.length, 16);
assert.equal(manifest.fragments.length, 16);
assert.equal(manifest.status, 'approved');

const fragmentsByTopic = new Map();
const formFamilies = new Set();
const taskFamilies = new Set();
const prohibitedTargetLabels = /\b(?:present simple|present continuous|past simple|past continuous|present perfect|future forms?|comparatives?|superlatives?|countable|uncountable|question formation)\b/i;

for (const fragment of manifest.fragments) {
  assert.equal(fragment.status, 'approved');
  assert.equal(fragment.metadata.launch_profile, 'h30_checkpoint_v1');
  assert.equal(fragment.metadata.topic_keys.length, 1);
  assert.equal(fragment.estimated_minutes, 3);
  assert.ok(!formFamilies.has(fragment.form_family_key));
  formFamilies.add(fragment.form_family_key);
  taskFamilies.add(fragment.school_task_family);
  const topicKey = fragment.metadata.topic_keys[0];
  fragmentsByTopic.set(topicKey, [...(fragmentsByTopic.get(topicKey) || []), fragment]);

  const exercise = bundle.exercises.find((item) => item.client_key === fragment.exercise_client_key);
  assert.ok(exercise);
  assert.equal(exercise.settings.feedback_timing, 'hidden');
  assert.equal(exercise.settings.show_score, false);
  assert.equal(exercise.settings.show_correct_answers, false);
  assert.equal(exercise.settings.show_explanations, false);
  assert.equal(exercise.settings.allow_retry, false);
  assert.equal(exercise.sections[0].feedback_timing, 'hidden');
  assert.equal(exercise.sections[0].questions.length, 1);
  assert.equal(exercise.sections[0].questions[0].topic, topicKey);
  assert.doesNotMatch([
    exercise.title,
    exercise.description,
    exercise.instructions,
    exercise.sections[0].title,
    exercise.sections[0].instructions,
    exercise.sections[0].questions[0].title,
    exercise.sections[0].questions[0].prompt,
    exercise.sections[0].questions[0].instructions,
  ].join(' '), prohibitedTargetLabels);
}

assert.equal(fragmentsByTopic.size, 8);
for (const forms of fragmentsByTopic.values()) assert.equal(forms.length, 2);
assert.ok(taskFamilies.size >= 4);

// Behavioral composition: two deterministic passes across four topics yields
// eight interleaved parts, 24 minutes and no repeated form family.
const selectedTopics = [...fragmentsByTopic.keys()].slice(0, 4);
const composition = [0, 1].flatMap((formIndex) => selectedTopics.map((topicKey) => fragmentsByTopic.get(topicKey)[formIndex]));
assert.equal(composition.length, 8);
assert.equal(composition.reduce((sum, fragment) => sum + fragment.estimated_minutes, 0), 24);
assert.equal(new Set(composition.flatMap((fragment) => fragment.metadata.topic_keys)).size, 4);
assert.equal(new Set(composition.map((fragment) => fragment.form_family_key)).size, 8);
assert.ok(composition.every((fragment, index) => index === 0 || fragment.metadata.topic_keys[0] !== composition[index - 1].metadata.topic_keys[0]));

const now = new Date('2026-08-14T09:00:00+02:00');
const requiredTopicKeys = selectedTopics;
const base = {
  requiredTopicKeys,
  examDate: '2026-09-03',
  now,
  diagnosticScores: Object.fromEntries(requiredTopicKeys.map((topicKey) => [topicKey, 45])),
};
const safePlan = buildRecoveryPlan({ ...base, runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_LAUNCH });
assert.equal(safePlan.sessions.some((session) => session.sessionType === 'checkpoint'), false);

const checkpointPlan = buildRecoveryPlan({ ...base, runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_CHECKPOINT_V1 });
assert.equal(checkpointPlan.sessions.filter((session) => session.sessionType === 'checkpoint').length, 1);
assert.equal(checkpointPlan.sessions.find((session) => session.sessionType === 'checkpoint').estimatedMinutes, 24);
assert.equal(checkpointPlan.sessions.some((session) => session.sessionType === 'error_review'), false);
assert.equal(checkpointPlan.sessions.some((session) => session.sessionType === 'mock_intermediate'), false);
assert.equal(checkpointPlan.sessions.some((session) => session.sessionType === 'mock_final'), false);

const completedCheckpointPlan = buildRecoveryPlan({
  ...base,
  checkpointScores: Object.fromEntries(requiredTopicKeys.map((topicKey, index) => [topicKey, index === 0 ? 35 : 92])),
  checkpointCompleted: true,
  runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_CHECKPOINT_V1,
});
assert.equal(completedCheckpointPlan.sessions.some((session) => session.sessionType === 'checkpoint'), false);
assert.equal(completedCheckpointPlan.sessions[0].topicKey, requiredTopicKeys[0]);

const sosPlan = buildRecoveryPlan({
  ...base,
  examDate: '2026-08-17',
  runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_CHECKPOINT_V1,
});
assert.equal(sosPlan.sessions.some((session) => session.sessionType === 'checkpoint'), false);

// Database contract: required school topics, two fresh forms per topic, four
// topics, eight resources, hidden feedback and no legacy checkpoint fallback.
assert.match(migration, /topic\.required[\s\S]*topic\.topic_key = fragment\.metadata -> 'topic_keys' ->> 0/);
assert.match(migration, /having count\(\*\) >= 2/);
assert.match(migration, /v_selected_topic_count = 4[\s\S]*v_selected_fragment_count = 8/);
assert.match(migration, /evidence\.form_family_key = fragment\.form_family_key/);
assert.match(migration, /'feedback_timing', 'hidden'/);
assert.match(migration, /'show_score', false/);
assert.match(migration, /'show_correct_answers', false/);
assert.match(migration, /'allow_retry', false/);
assert.match(migration, /session\.session_type = 'checkpoint'/);
assert.match(migration, /materialize_recovery_session_without_checkpoint_v1/);

// Existing evidence and replacement contracts remain authoritative.
assert.match(mastery, /assessment:<session_id>:<topic_key>|'assessment:' \|\| v_session\.id::text \|\| ':' \|\| v_topic_key/);
assert.match(mastery, /if v_session\.status = 'completed' then/);
assert.match(planReplacement, /Only replace the not-started future queue/);
assert.match(planReplacement, /session\.status in \('planned', 'available'\)/);
assert.match(adminPage, /admin_register_recovery_assessment_fragment_manifest_from_import/);

// Learner guidance covers what, why and next without grade prediction or
// punitive failure language. Readiness v2 stays learner-facing off.
for (const copy of ['Che cosa fai:', 'Perché:', 'Dopo:', 'Che cosa cambia nel tuo piano?', 'Continua da dove avevi lasciato']) {
  assert.ok(`${sessionPage}\n${workspacePage}`.includes(copy), `Missing learner guidance: ${copy}`);
}
assert.match(sessionPage, /non predice il voto/i);
assert.match(sessionPage, /Bene[\s\S]*Da consolidare[\s\S]*Torna tra le priorità/);
assert.doesNotMatch(sessionPage, /\bfailed\b|\bfallito\b|\bremediation\b/i);
assert.match(migration, /'readiness_v2_active', false/);

console.log('Recovery mixed checkpoint v1 validated: content, capability gate, hidden assessment behavior, evidence path, reprioritisation contract and learner guidance.');
