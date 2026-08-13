import fs from 'node:fs';
import assert from 'node:assert/strict';
import { validateExerciseBuilderJson } from '../src/lib/exerciseBuilderSchemaV2.js';

const bundlePath = 'content/recovery/curriculum-v2/fragments/year-2-grammar-a.bundle.json';
const manifestPath = 'content/recovery/curriculum-v2/fragments/year-2-grammar-a.fragments.json';
const modesPath = 'content/recovery/curriculum-v2/assessment-modes.json';
const year2Path = 'content/recovery/curriculum-v2/years/year-2.json';

const bundleText = fs.readFileSync(bundlePath, 'utf8');
const bundle = JSON.parse(bundleText);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const modeKeys = new Set(JSON.parse(fs.readFileSync(modesPath, 'utf8')).modes.map((mode) => mode.key));
const year2 = JSON.parse(fs.readFileSync(year2Path, 'utf8'));
const outcomeById = new Map(year2.outcomes.map((outcome) => [outcome.id, outcome]));

const schemaResult = validateExerciseBuilderJson(bundleText);
assert.deepEqual(schemaResult.errors, [], `Bundle-level schema errors: ${schemaResult.errors.join(' | ')}`);
const invalidItems = schemaResult.items.filter((item) => item.status === 'invalid');
assert.equal(invalidItems.length, 0, `Invalid Exercise Builder items: ${invalidItems.map((item) => item.errors.join(' | ')).join(' || ')}`);

assert.equal(bundle.schema_version, 2);
assert.equal(bundle.entity_type, 'bundle');
assert.equal(bundle.exercises.length, 6, 'First pool must contain exactly six independent grammar forms.');
assert.equal(manifest.schema_version, 1);
assert.equal(manifest.manifest_id, 'recovery-v2-year2-grammar-fragments-a');
assert.equal(manifest.status, 'draft');
assert.equal(manifest.fragments.length, 6);

const allowedOutcomes = new Set(['RY2-GRAM-001', 'RY2-GRAM-002', 'RY2-GRAM-005']);
const forbiddenUntilB1 = new Set(['RY2-GRAM-003', 'RY2-GRAM-004']);
const exerciseByKey = new Map(bundle.exercises.map((exercise) => [exercise.client_key, exercise]));
const fragmentIds = new Set();
const formFamilies = new Set();
const outcomeCounts = new Map();
const allPrimaryAxes = new Set();
const learnerVisibleTargetLeak = /\b(?:present simple|present continuous|past simple|past continuous|present perfect|future forms?|question formation|articles?|quantifiers?|comparatives?|superlatives?)\b/i;

for (const fragment of manifest.fragments) {
  assert.match(fragment.fragment_id, /^RAF-RY2-GRAM-\d{2}$/);
  assert.ok(!fragmentIds.has(fragment.fragment_id), `Duplicate fragment_id: ${fragment.fragment_id}`);
  fragmentIds.add(fragment.fragment_id);
  assert.equal(fragment.status, 'draft');
  assert.deepEqual(fragment.year_profiles, [2]);
  assert.equal(fragment.primary_axis, 'grammar_sentence_control');
  allPrimaryAxes.add(fragment.primary_axis);
  assert.deepEqual(fragment.secondary_axes, []);
  assert.equal(fragment.transfer_level, 'transfer');
  assert.equal(fragment.content_source_policy, 'unseen_original_for_recovery_v2_cumulative');
  assert.equal(fragment.unseen_or_mixed_context, true);
  assert.ok(Number(fragment.estimated_minutes) >= 5 && Number(fragment.estimated_minutes) <= 6);
  assert.ok(fragment.form_family_key && !formFamilies.has(fragment.form_family_key), `Duplicate/empty form_family_key: ${fragment.form_family_key}`);
  formFamilies.add(fragment.form_family_key);

  assert.equal(fragment.outcome_ids.length, 1);
  const outcomeId = fragment.outcome_ids[0];
  assert.ok(allowedOutcomes.has(outcomeId), `Outcome not allowed in this pool: ${outcomeId}`);
  assert.ok(!forbiddenUntilB1.has(outcomeId));
  const outcome = outcomeById.get(outcomeId);
  assert.ok(outcome, `Unknown Year 2 outcome: ${outcomeId}`);
  assert.equal(outcome.programme_requirement, 'default_core');
  assert.equal(outcome.competence_axis, 'grammar_sentence_control');
  assert.equal(outcome.blocking_candidate, true);
  outcomeCounts.set(outcomeId, (outcomeCounts.get(outcomeId) || 0) + 1);

  assert.ok(Array.isArray(fragment.assessment_modes) && fragment.assessment_modes.length >= 3);
  for (const mode of fragment.assessment_modes) {
    assert.ok(modeKeys.has(mode), `Unknown assessment mode ${mode}`);
    assert.ok(outcome.assessment_modes.includes(mode), `${mode} is not allowed by ${outcomeId}`);
  }

  const exercise = exerciseByKey.get(fragment.exercise_client_key);
  assert.ok(exercise, `Missing exercise ${fragment.exercise_client_key}`);
  assert.equal(exercise.estimated_minutes, fragment.estimated_minutes);
  assert.equal(exercise.settings.feedback_timing, 'exercise_end');
  assert.equal(exercise.settings.show_explanations, false);
  assert.equal(exercise.settings.show_diagnostic_summary, false);
  assert.equal(exercise.sections.length, 1);
  assert.equal(exercise.sections[0].feedback_timing, 'exercise_end');

  const visibleExerciseText = [exercise.title, exercise.description, exercise.instructions, exercise.sections[0].title, exercise.sections[0].instructions].join(' ');
  assert.ok(!learnerVisibleTargetLeak.test(visibleExerciseText), `Learner-visible exercise copy leaks target: ${exercise.client_key}`);

  const questions = exercise.sections.flatMap((section) => section.questions || []);
  assert.equal(questions.length, 5, `${exercise.client_key} must contain five scored decisions.`);
  assert.equal(questions.filter((question) => question.type === 'content_block').length, 0, 'Cumulative fragments cannot teach.');

  const questionKeys = new Set(questions.map((question) => question.client_key));
  assert.equal(questionKeys.size, questions.length, `Duplicate question client key inside ${exercise.client_key}`);
  assert.equal(fragment.question_mappings.length, questions.length, `Manifest must map every question in ${exercise.client_key}`);

  const mappedKeys = new Set();
  let productionCount = 0;
  for (const mapping of fragment.question_mappings) {
    assert.ok(questionKeys.has(mapping.question_client_key), `Manifest references missing question ${mapping.question_client_key}`);
    assert.ok(!mappedKeys.has(mapping.question_client_key), `Question mapped twice: ${mapping.question_client_key}`);
    mappedKeys.add(mapping.question_client_key);
    assert.equal(mapping.outcome_id, outcomeId);
    assert.equal(mapping.evidence_role, 'primary');
    assert.ok(modeKeys.has(mapping.assessment_mode));
    assert.ok(fragment.assessment_modes.includes(mapping.assessment_mode));
    assert.ok(Number(mapping.evidence_weight) > 0 && Number(mapping.evidence_weight) <= 1);
    if (mapping.production_evidence) productionCount += 1;
  }
  assert.equal(mappedKeys.size, questions.length);
  assert.ok(productionCount >= 2, `${fragment.fragment_id} requires at least two production decisions.`);

  for (const question of questions) {
    const learnerVisible = [question.title, question.prompt, question.instructions].join(' ');
    assert.ok(!learnerVisibleTargetLeak.test(learnerVisible), `Question leaks target rule: ${question.client_key}`);
    assert.equal(question.feedback && Object.keys(question.feedback).length, 0, `No per-question coaching in cumulative fragment: ${question.client_key}`);
    assert.deepEqual(question.diagnostics?.tested_codes || [], [], `Cumulative outcome evidence must not depend on topic diagnostic labels: ${question.client_key}`);
    assert.equal(question.diagnostics?.fallback_error_code ?? null, null);
  }
}

assert.deepEqual([...allowedOutcomes].sort().map((id) => [id, outcomeCounts.get(id)]), [
  ['RY2-GRAM-001', 2],
  ['RY2-GRAM-002', 2],
  ['RY2-GRAM-005', 2],
]);

// This pool is deliberately not sufficient to trigger Curriculum v2 rollout.
// Year 2 default-core currently activates grammar + lexical + reading; B2 checkpoint rollout needs >=2 axes.
assert.deepEqual([...allPrimaryAxes], ['grammar_sentence_control']);

const forbiddenDependencyLanguage = /\b(?:ever|never|already|yet|for since|since for)\b/i;
const learnerPrompts = bundle.exercises.flatMap((exercise) => exercise.sections.flatMap((section) => section.questions.map((question) => question.prompt))).join(' ');
assert.ok(!forbiddenDependencyLanguage.test(learnerPrompts), 'Pool must not rely on the missing Present Perfect time-expression module.');

console.log('Recovery v2 Year 2 grammar fragment pool A validated: 6 forms, 30 questions, 3 covered core grammar outcomes, rollout intentionally inactive.');
