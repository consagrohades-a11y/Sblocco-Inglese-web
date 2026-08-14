import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateExerciseBuilderJson } from '../src/lib/exerciseBuilderSchemaV2.js';
import { buildRecoveryPlan, RECOVERY_PLAN_RUNTIME_PROFILE } from '../src/lib/recoveryPlanEngine.js';

execFileSync(process.execPath, ['scripts/generate-recovery-mixed-checkpoint-v1.mjs'], { stdio: 'inherit' });

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const curriculum = readJson('content/recovery/curriculum-years-1-3.json');
const bundlePath = 'content/recovery/curriculum-v2/fragments/mixed-checkpoint-v1.bundle.json';
const manifestPath = 'content/recovery/curriculum-v2/fragments/mixed-checkpoint-v1.fragments.json';
const bundleText = fs.readFileSync(bundlePath, 'utf8');
const bundle = JSON.parse(bundleText);
const manifest = readJson(manifestPath);
const migration = fs.readFileSync('supabase/migrations/20260814125000_recovery_mixed_checkpoint_launch_complete.sql', 'utf8');
const originalMigration = fs.readFileSync('supabase/migrations/20260814094844_recovery_mixed_checkpoint_v1.sql', 'utf8');
const masteryMigration = fs.readFileSync('supabase/migrations/20260812133100_recovery_mastery_v2.sql', 'utf8');
const sessionPage = fs.readFileSync('src/pages/RecoverySession.jsx', 'utf8');
const workspacePage = fs.readFileSync('src/pages/RecoveryWorkspace.jsx', 'utf8');

const liveTopics = (curriculum.topics || [])
  .filter((topic) => topic.runtime_status === 'ready-for-content')
  .map((topic) => topic.key)
  .sort();
assert.equal(curriculum.school_programme_is_authoritative, true);
assert.equal(liveTopics.length, 24, 'The current production-ready Recovery catalogue must remain explicit.');

const schema = validateExerciseBuilderJson(bundleText);
assert.deepEqual(schema.errors, []);
assert.equal(schema.items.filter((item) => item.status === 'invalid').length, 0);
assert.equal(bundle.exercises.length, 48);
assert.equal(manifest.fragments.length, 48);
assert.equal(manifest.status, 'approved');
assert.equal(manifest.metadata.live_topic_count, 24);
assert.equal(manifest.metadata.supported_topic_count, 24);
assert.deepEqual([...manifest.metadata.supported_topic_keys].sort(), liveTopics);
assert.equal(manifest.metadata.resource_count_per_checkpoint, 8);
assert.equal(manifest.metadata.estimated_minutes, 24);

const exerciseByKey = new Map(bundle.exercises.map((exercise) => [exercise.client_key, exercise]));
const byTopic = new Map();
const formFamilies = new Set();
const targetLabelPattern = /\b(?:present simple|present continuous|past simple|past continuous|present perfect|future forms?|question formation|countable and uncountable|comparatives?|superlatives?|modal verbs?|some\s*\/\s*any|much\s*\/\s*many)\b/i;

function decisionCount(question) {
  return question.type === 'select_gap' ? (question.content?.blanks?.length || 0) : 1;
}

for (const fragment of manifest.fragments) {
  const [topicKey] = fragment.metadata.topic_keys || [];
  assert.ok(liveTopics.includes(topicKey), `${topicKey} is not a current live Recovery topic.`);
  assert.equal(fragment.status, 'approved');
  assert.equal(fragment.metadata.launch_profile, 'h30_checkpoint_v1');
  assert.equal(fragment.metadata.target_rule_labels_visible, false);
  assert.equal(fragment.estimated_minutes, 3);
  assert.ok(fragment.year_profiles.length >= 1 && fragment.year_profiles.every((year) => [1, 2, 3].includes(year)));
  assert.ok(fragment.outcome_ids.length >= 1);
  assert.ok(!formFamilies.has(fragment.form_family_key), `Duplicate form family ${fragment.form_family_key}`);
  formFamilies.add(fragment.form_family_key);
  byTopic.set(topicKey, [...(byTopic.get(topicKey) || []), fragment]);

  const exercise = exerciseByKey.get(fragment.exercise_client_key);
  assert.ok(exercise, `Missing checkpoint exercise ${fragment.exercise_client_key}`);
  assert.equal(exercise.settings.feedback_timing, 'hidden');
  assert.equal(exercise.settings.show_score, false);
  assert.equal(exercise.settings.show_correct_answers, false);
  assert.equal(exercise.settings.show_explanations, false);
  assert.equal(exercise.settings.allow_retry, false);
  assert.equal(exercise.sections.length, 1);
  assert.equal(exercise.sections[0].feedback_timing, 'hidden');
  assert.equal(exercise.sections[0].questions.length, 1);
  const question = exercise.sections[0].questions[0];
  assert.equal(question.topic, topicKey);
  assert.equal(decisionCount(question), fragment.metadata.scored_decisions);
  assert.ok(Array.isArray(fragment.metadata.subskill_keys) && fragment.metadata.subskill_keys.length >= 1);
  assert.doesNotMatch([
    exercise.title,
    exercise.description,
    exercise.instructions,
    exercise.sections[0].title,
    exercise.sections[0].instructions,
    question.title,
    question.instructions,
  ].join(' '), targetLabelPattern);
}

assert.equal(byTopic.size, 24);
assert.deepEqual([...byTopic.keys()].sort(), liveTopics);
for (const [topicKey, forms] of byTopic) {
  assert.equal(forms.length, 2, `${topicKey} needs exactly two fresh forms.`);
  const decisions = forms.reduce((sum, fragment) => sum + fragment.metadata.scored_decisions, 0);
  assert.ok(decisions >= 3 && decisions <= 4, `${topicKey} needs 3-4 scored decisions.`);
  assert.ok(new Set(forms.flatMap((fragment) => fragment.metadata.subskill_keys)).size >= 3, `${topicKey} needs meaningful subskill breadth.`);
  assert.ok(new Set(forms.map((fragment) => fragment.school_task_family)).size >= 2, `${topicKey} needs multiple school task families.`);
}

const futureSubskills = new Set(byTopic.get('future-forms').flatMap((fragment) => fragment.metadata.subskill_keys));
for (const subskill of ['instant_decision', 'evidence_prediction', 'fixed_arrangement']) assert.ok(futureSubskills.has(subskill));
const perfectSubskills = new Set(byTopic.get('present-perfect').flatMap((fragment) => fragment.metadata.subskill_keys));
for (const subskill of ['life_experience', 'recent_result', 'unfinished_time']) assert.ok(perfectSubskills.has(subskill));

const yearCoverage = Object.fromEntries([1, 2, 3].map((year) => [year,
  liveTopics.filter((topicKey) => byTopic.get(topicKey).some((fragment) => fragment.year_profiles.includes(year))),
]));
for (const year of [1, 2, 3]) assert.ok(yearCoverage[year].length >= 4, `Year ${year} needs at least four supported current-live topics.`);

for (const year of [1, 2, 3]) {
  const selected = yearCoverage[year].slice(0, 4);
  const composition = [0, 1].flatMap((formIndex) => selected.map((topicKey) => byTopic.get(topicKey)[formIndex]));
  assert.equal(composition.length, 8);
  assert.equal(composition.reduce((sum, fragment) => sum + fragment.estimated_minutes, 0), 24);
  const decisions = composition.reduce((sum, fragment) => sum + fragment.metadata.scored_decisions, 0);
  assert.ok(decisions >= 12 && decisions <= 16, `Year ${year} checkpoint needs 12-16 scored decisions.`);
  assert.equal(new Set(composition.flatMap((fragment) => fragment.metadata.topic_keys)).size, 4);
  assert.equal(new Set(composition.map((fragment) => fragment.form_family_key)).size, 8);
  assert.ok(composition.every((fragment, index) => index === 0 || fragment.metadata.topic_keys[0] !== composition[index - 1].metadata.topic_keys[0]));
}

const now = new Date('2026-08-14T09:00:00+02:00');
const planTopics = yearCoverage[2].slice(0, 4);
const planBase = {
  requiredTopicKeys: planTopics,
  examDate: '2026-09-03',
  now,
  diagnosticScores: Object.fromEntries(planTopics.map((topicKey) => [topicKey, 45])),
};
const safePlan = buildRecoveryPlan({ ...planBase, runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_LAUNCH });
assert.equal(safePlan.sessions.some((session) => session.sessionType === 'checkpoint'), false);
const checkpointPlan = buildRecoveryPlan({ ...planBase, runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_CHECKPOINT_V1 });
assert.equal(checkpointPlan.sessions.filter((session) => session.sessionType === 'checkpoint').length, 1);
assert.equal(checkpointPlan.sessions.some((session) => session.sessionType === 'error_review'), false);
assert.equal(checkpointPlan.sessions.some((session) => session.sessionType === 'mock_intermediate'), false);
assert.equal(checkpointPlan.sessions.some((session) => session.sessionType === 'mock_final'), false);
const afterCheckpoint = buildRecoveryPlan({
  ...planBase,
  checkpointScores: Object.fromEntries(planTopics.map((topicKey, index) => [topicKey, index ? 92 : 45])),
  checkpointCompleted: true,
  runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_CHECKPOINT_V1,
});
assert.equal(afterCheckpoint.sessions.some((session) => session.sessionType === 'checkpoint'), false);
const sosPlan = buildRecoveryPlan({ ...planBase, examDate: '2026-08-17', runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_CHECKPOINT_V1 });
assert.equal(sosPlan.sessions.some((session) => session.sessionType === 'checkpoint'), false);

// Materialisation remains the established Exercise Builder path.
for (const pattern of [
  /materialize_recovery_checkpoint_v1/,
  /'feedback_timing', 'hidden'/,
  /'show_score', false/,
  /'show_correct_answers', false/,
  /'allow_retry', false/,
]) assert.match(originalMigration, pattern);

// Capability/evidence contract: school topics only, fresh forms, >=3 decisions/topic,
// 12-16 overall, and no class-year-2 hard gate.
assert.doesNotMatch(migration, /v_class_year\s*<>\s*2/);
assert.match(migration, /topic\.required/);
assert.match(migration, /topic\.topic_key = fragment\.metadata -> 'topic_keys' ->> 0/);
assert.match(migration, /evidence\.form_family_key = fragment\.form_family_key/);
assert.match(migration, /sum\(candidate\.scored_decisions\) >= 3/);
assert.match(migration, /v_selected_scored_decisions between 12 and 16/);
assert.match(migration, /fewer_than_four_required_school_topics/);
assert.match(migration, /fewer_than_four_required_topics_with_sufficient_fresh_evidence/);

// Authoritative server sequence: submitted Exercise Builder attempt -> existing
// Recovery sync/evidence/mastery -> completed checkpoint -> future-plan rebuild.
assert.match(migration, /after update of status on public\.exercise_builder_attempts/);
assert.match(migration, /perform public\.sync_recovery_session\(v_session_id\)/);
assert.match(migration, /after update of status on public\.recovery_plan_sessions/);
assert.match(migration, /perform public\.recovery_checkpoint_v1_reprioritize_future_internal\(new\.id\)/);
assert.match(migration, /checkpoint_server_reprioritized_at/);
assert.match(migration, /checkpoint_plan_update_summary/);
assert.match(migration, /serverAuthoritative/);
assert.match(migration, /future\.status in \('planned', 'available'\)/);
assert.match(migration, /not coalesce\(\(future\.metadata ->> 'recovery_cycle'\)::boolean, false\)/);
assert.match(migration, /when v_score < 70 then greatest\(topic\.priority_score, 75\)/);
assert.match(migration, /when v_score < 85 then greatest\(topic\.priority_score, 55\)/);
assert.match(migration, /else least\(topic\.priority_score, 40\)/);
assert.match(migration, /client-side plan mutation is disabled/);

// Existing evidence/mastery architecture remains authoritative and idempotent.
assert.match(masteryMigration, /record_recovery_mastery_evidence/);
assert.match(masteryMigration, /if v_session\.status = 'completed' then/);
assert.match(masteryMigration, /'assessment:' \|\| v_session\.id::text \|\| ':' \|\| v_topic_key/);

// Existing guided UX remains present; no checkpoint redesign or punitive copy.
const learnerUx = `${sessionPage}\n${workspacePage}`;
for (const copy of ['Che cosa fai:', 'Perché:', 'Dopo:', 'Che cosa cambia nel tuo piano?', 'Continua da dove avevi lasciato']) {
  assert.ok(learnerUx.includes(copy), `Missing learner guidance: ${copy}`);
}
assert.match(sessionPage, /Bene[\s\S]*Da consolidare[\s\S]*Torna tra le priorità/);
assert.match(sessionPage, /non predice il voto/i);
assert.doesNotMatch(sessionPage, /\bfailed\b|\bfallito\b/i);

console.log(`Recovery mixed checkpoint v1 launch-complete: 24/24 current live topics; Year coverage ${yearCoverage[1].length}/${yearCoverage[2].length}/${yearCoverage[3].length}; 12-16 scored decisions; server-authoritative reprioritisation.`);
