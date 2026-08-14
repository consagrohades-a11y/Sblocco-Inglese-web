import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateExerciseBuilderJson } from '../src/lib/exerciseBuilderSchemaV2.js';
import {
  buildRecoveryPlan,
  RECOVERY_PLAN_RUNTIME_PROFILE,
} from '../src/lib/recoveryPlanEngine.js';

execFileSync(process.execPath, ['scripts/generate-recovery-mixed-checkpoint-v1.mjs'], { stdio: 'inherit' });

const bundlePath = 'content/recovery/curriculum-v2/fragments/mixed-checkpoint-v1.bundle.json';
const manifestPath = 'content/recovery/curriculum-v2/fragments/mixed-checkpoint-v1.fragments.json';
const curriculumPath = 'content/recovery/curriculum-years-1-3.json';
const originalMigrationPath = 'supabase/migrations/20260814094844_recovery_mixed_checkpoint_v1.sql';
const tighteningMigrationPath = 'supabase/migrations/20260814125000_recovery_mixed_checkpoint_launch_complete.sql';
const bundleText = fs.readFileSync(bundlePath, 'utf8');
const bundle = JSON.parse(bundleText);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
const originalMigration = fs.readFileSync(originalMigrationPath, 'utf8');
const tighteningMigration = fs.readFileSync(tighteningMigrationPath, 'utf8');
const sessionPage = fs.readFileSync('src/pages/RecoverySession.jsx', 'utf8');
const workspacePage = fs.readFileSync('src/pages/RecoveryWorkspace.jsx', 'utf8');
const adminPage = fs.readFileSync('src/pages/AdminRecoveryContent.jsx', 'utf8');
const mastery = fs.readFileSync('supabase/migrations/20260812133100_recovery_mastery_v2.sql', 'utf8');

function collectReadyTopics(value, out = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectReadyTopics(item, out));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  if (typeof value.topic_key === 'string' && value.runtime_status === 'ready-for-content') out.add(value.topic_key);
  Object.values(value).forEach((item) => collectReadyTopics(item, out));
  return out;
}

function scoredDecisions(question) {
  if (question.type === 'select_gap') return question.content?.blanks?.length || 0;
  return question.type === 'content_block' ? 0 : 1;
}

const liveTopics = [...collectReadyTopics(curriculum)].sort();
assert.equal(liveTopics.length, 24, 'Current live Recovery catalogue should contain 24 ready-for-content topics.');

const schema = validateExerciseBuilderJson(bundleText);
assert.deepEqual(schema.errors, []);
assert.equal(schema.items.filter((item) => item.status === 'invalid').length, 0);
assert.equal(bundle.exercises.length, 48);
assert.equal(manifest.fragments.length, 48);
assert.equal(manifest.status, 'approved');
assert.equal(manifest.metadata.live_topic_count, 24);
assert.equal(manifest.metadata.supported_topic_count, 24);
assert.deepEqual([...manifest.metadata.supported_topic_keys].sort(), liveTopics);

const fragmentsByTopic = new Map();
const exerciseByKey = new Map(bundle.exercises.map((exercise) => [exercise.client_key, exercise]));
const formFamilies = new Set();
const learnerVisibleRuleLabels = /\b(?:present simple|present continuous|past simple|past continuous|present perfect|future forms?|question formation|countable and uncountable|comparatives?|superlatives?|modal verbs?)\b/i;

for (const fragment of manifest.fragments) {
  assert.equal(fragment.status, 'approved');
  assert.equal(fragment.metadata.launch_profile, 'h30_checkpoint_v1');
  assert.equal(fragment.metadata.runtime_profile, 'h30_checkpoint_v1');
  assert.equal(fragment.metadata.topic_keys.length, 1);
  assert.equal(fragment.metadata.target_rule_labels_visible, false);
  assert.equal(fragment.estimated_minutes, 3);
  assert.ok(fragment.year_profiles.length >= 1);
  assert.ok(fragment.year_profiles.every((year) => [1, 2, 3].includes(year)));
  assert.ok(fragment.outcome_ids.length >= 1);
  assert.ok(fragment.question_mappings.length >= fragment.outcome_ids.length);
  assert.ok(!formFamilies.has(fragment.form_family_key));
  assert.match(fragment.form_family_key, /^checkpoint-v1-/);
  formFamilies.add(fragment.form_family_key);

  const topicKey = fragment.metadata.topic_keys[0];
  fragmentsByTopic.set(topicKey, [...(fragmentsByTopic.get(topicKey) || []), fragment]);
  const exercise = exerciseByKey.get(fragment.exercise_client_key);
  assert.ok(exercise, `Missing exercise for ${fragment.fragment_id}`);
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
  assert.equal(scoredDecisions(question), fragment.metadata.scored_decisions);
  assert.ok(fragment.metadata.scored_decisions >= 1);
  assert.ok(Array.isArray(fragment.metadata.subskill_keys) && fragment.metadata.subskill_keys.length >= 1);
  assert.doesNotMatch([
    exercise.title,
    exercise.description,
    exercise.instructions,
    exercise.sections[0].title,
    exercise.sections[0].instructions,
    question.title,
    question.instructions,
  ].join(' '), learnerVisibleRuleLabels);
}

assert.equal(fragmentsByTopic.size, 24);
assert.deepEqual([...fragmentsByTopic.keys()].sort(), liveTopics);
for (const [topicKey, forms] of fragmentsByTopic) {
  assert.equal(forms.length, 2, `${topicKey} must have two fresh forms.`);
  const decisions = forms.reduce((sum, fragment) => sum + fragment.metadata.scored_decisions, 0);
  assert.ok(decisions >= 3 && decisions <= 4, `${topicKey} must yield 3-4 scored decisions.`);
  const subskills = new Set(forms.flatMap((fragment) => fragment.metadata.subskill_keys));
  assert.ok(subskills.size >= 3, `${topicKey} needs meaningful subskill breadth.`);
  assert.ok(new Set(forms.map((fragment) => fragment.school_task_family)).size >= 2, `${topicKey} needs more than one school task family.`);
}

const yearCoverage = Object.fromEntries([1, 2, 3].map((year) => [
  year,
  liveTopics.filter((topicKey) => fragmentsByTopic.get(topicKey).some((fragment) => fragment.year_profiles.includes(year))),
]));
assert.ok(yearCoverage[1].length >= 4, 'Year 1 needs enough live checkpoint topics.');
assert.ok(yearCoverage[2].length >= 4, 'Year 2 needs enough live checkpoint topics.');
assert.ok(yearCoverage[3].length >= 4, 'Year 3 needs enough live checkpoint topics where current outcome scope permits.');

const futureSubskills = new Set(fragmentsByTopic.get('future-forms').flatMap((fragment) => fragment.metadata.subskill_keys));
for (const key of ['instant_decision', 'evidence_prediction', 'fixed_arrangement']) assert.ok(futureSubskills.has(key));
const presentPerfectSubskills = new Set(fragmentsByTopic.get('present-perfect').flatMap((fragment) => fragment.metadata.subskill_keys));
for (const key of ['life_experience', 'recent_result', 'unfinished_time']) assert.ok(presentPerfectSubskills.has(key));

function compose(topics) {
  return [0, 1].flatMap((formIndex) => topics.map((topicKey) => fragmentsByTopic.get(topicKey)[formIndex]));
}
for (const year of [1, 2, 3]) {
  const selectedTopics = yearCoverage[year].slice(0, 4);
  assert.equal(selectedTopics.length, 4);
  const composition = compose(selectedTopics);
  assert.equal(composition.length, 8);
  assert.equal(composition.reduce((sum, fragment) => sum + fragment.estimated_minutes, 0), 24);
  const decisions = composition.reduce((sum, fragment) => sum + fragment.metadata.scored_decisions, 0);
  assert.ok(decisions >= 12 && decisions <= 16, `Year ${year} composition needs 12-16 scored decisions.`);
  assert.equal(new Set(composition.flatMap((fragment) => fragment.metadata.topic_keys)).size, 4);
  assert.equal(new Set(composition.map((fragment) => fragment.form_family_key)).size, 8);
  assert.ok(composition.every((fragment, index) => index === 0 || fragment.metadata.topic_keys[0] !== composition[index - 1].metadata.topic_keys[0]));
}

const now = new Date('2026-08-14T09:00:00+02:00');
const planTopics = yearCoverage[2].slice(0, 4);
const base = {
  requiredTopicKeys: planTopics,
  examDate: '2026-09-03',
  now,
  diagnosticScores: Object.fromEntries(planTopics.map((topicKey) => [topicKey, 45])),
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
  checkpointScores: Object.fromEntries(planTopics.map((topicKey, index) => [topicKey, index === 0 ? 35 : 92])),
  checkpointCompleted: true,
  runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_CHECKPOINT_V1,
});
assert.equal(completedCheckpointPlan.sessions.some((session) => session.sessionType === 'checkpoint'), false);
const sosPlan = buildRecoveryPlan({
  ...base,
  examDate: '2026-08-17',
  runtimeProfile: RECOVERY_PLAN_RUNTIME_PROFILE.H30_CHECKPOINT_V1,
});
assert.equal(sosPlan.sessions.some((session) => session.sessionType === 'checkpoint'), false);

// The original migration still owns materialisation. The tightening migration
// deliberately replaces only capability/selection and adds authoritative sync.
assert.match(originalMigration, /materialize_recovery_checkpoint_v1/);
assert.match(originalMigration, /'feedback_timing', 'hidden'/);
assert.match(originalMigration, /'show_score', false/);
assert.match(originalMigration, /'show_correct_answers', false/);
assert.match(originalMigration, /'allow_retry', false/);
assert.match(tighteningMigration, /create or replace function public\.recovery_checkpoint_v1_pool_status_internal/);
assert.doesNotMatch(tighteningMigration, /v_class_year\s*<>\s*2/);
assert.match(tighteningMigration, /having count\(\*\) >= 2[\s\S]*sum\(candidate\.scored_decisions\) >= 3/);
assert.match(tighteningMigration, /v_selected_scored_decisions between 12 and 16/);
assert.match(tighteningMigration, /fewer_than_four_required_school_topics/);
assert.match(tighteningMigration, /fewer_than_four_required_topics_with_sufficient_fresh_evidence/);
assert.match(tighteningMigration, /topic\.required[\s\S]*topic\.topic_key = fragment\.metadata -> 'topic_keys' ->> 0/);
assert.match(tighteningMigration, /evidence\.form_family_key = fragment\.form_family_key/);

// Submission is authoritative: attempt submission -> existing sync/evidence ->
// session completion -> server reprioritisation, all inside the database path.
assert.match(tighteningMigration, /create trigger recovery_checkpoint_v1_sync_on_attempt_submit[\s\S]*after update of status on public\.exercise_builder_attempts/);
assert.match(tighteningMigration, /perform public\.sync_recovery_session\(v_session_id\)/);
assert.match(tighteningMigration, /create trigger recovery_checkpoint_v1_reprioritize_after_completion[\s\S]*after update of status on public\.recovery_plan_sessions/);
assert.match(tighteningMigration, /perform public\.recovery_checkpoint_v1_reprioritize_future_internal\(new\.id\)/);
assert.match(tighteningMigration, /checkpoint_server_reprioritized_at/);
assert.match(tighteningMigration, /checkpoint_plan_update_summary/);
assert.match(tighteningMigration, /serverAuthoritative/);
assert.match(tighteningMigration, /future\.status in \('planned', 'available'\)/);
assert.match(tighteningMigration, /future\.session_type in \('checkpoint', 'mock_intermediate', 'mock_final', 'error_review'\)/);
assert.match(tighteningMigration, /not coalesce\(\(future\.metadata ->> 'recovery_cycle'\)::boolean, false\)/);
assert.match(tighteningMigration, /when v_score < 70 then greatest\(topic\.priority_score, 75\)/);
assert.match(tighteningMigration, /when v_score < 85 then greatest\(topic\.priority_score, 55\)/);
assert.match(tighteningMigration, /else least\(topic\.priority_score, 40\)/);
assert.match(tighteningMigration, /if v_session\.metadata \? 'checkpoint_server_reprioritized_at'/);
assert.match(tighteningMigration, /client-side plan mutation is disabled/);

// Existing mastery/evidence remains the only evidence architecture.
assert.match(mastery, /assessment:<session_id>:<topic_key>|'assessment:' \|\| v_session\.id::text \|\| ':' \|\| v_topic_key/);
assert.match(mastery, /if v_session\.status = 'completed' then/);
assert.match(mastery, /public\.record_recovery_mastery_evidence/);
assert.match(adminPage, /admin_register_recovery_assessment_fragment_manifest_from_import/);

// Learner guidance remains intact; server summary means React only needs to display it.
for (const copy of ['Che cosa fai:', 'Perché:', 'Dopo:', 'Che cosa cambia nel tuo piano?', 'Continua da dove avevi lasciato']) {
  assert.ok(`${sessionPage}\n${workspacePage}`.includes(copy), `Missing learner guidance: ${copy}`);
}
assert.match(sessionPage, /non predice il voto/i);
assert.match(sessionPage, /Bene[\s\S]*Da consolidare[\s\S]*Torna tra le priorità/);
assert.doesNotMatch(sessionPage, /\bfailed\b|\bfallito\b|\bremediation\b/i);
assert.match(tighteningMigration, /server_authoritative/);
assert.match(originalMigration, /'readiness_v2_active', false/);

console.log(`Recovery mixed checkpoint v1 launch-complete: ${liveTopics.length} live topics supported; Year coverage ${yearCoverage[1].length}/${yearCoverage[2].length}/${yearCoverage[3].length}; 12-16 scored decisions; server-authoritative reprioritisation.`);
