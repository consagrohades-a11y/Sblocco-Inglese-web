import fs from 'node:fs';
import assert from 'node:assert/strict';
import { validateExerciseBuilderJson } from '../src/lib/exerciseBuilderSchemaV2.js';

const bundlePath = 'content/recovery/curriculum-v2/fragments/year-1-reading-p0.bundle.json';
const manifestPath = 'content/recovery/curriculum-v2/fragments/year-1-reading-p0.fragments.json';
const coveragePath = 'content/recovery/curriculum-v2/fragments/year-1-reading-p0.coverage.json';
const modesPath = 'content/recovery/curriculum-v2/assessment-modes.json';
const year1Path = 'content/recovery/curriculum-v2/years/year-1.json';

const bundleText = fs.readFileSync(bundlePath, 'utf8');
const bundle = JSON.parse(bundleText);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const modeKeys = new Set(JSON.parse(fs.readFileSync(modesPath, 'utf8')).modes.map((mode) => mode.key));
const year1 = JSON.parse(fs.readFileSync(year1Path, 'utf8'));
const outcomeById = new Map(year1.outcomes.map((outcome) => [outcome.id, outcome]));
const canonicalReadingOutcomes = new Set(
  year1.outcomes.filter((outcome) => outcome.competence_axis === 'reading').map((outcome) => outcome.id),
);

const schemaResult = validateExerciseBuilderJson(bundleText);
assert.deepEqual(schemaResult.errors, [], `Bundle-level schema errors: ${schemaResult.errors.join(' | ')}`);
const invalidItems = schemaResult.items.filter((item) => item.status === 'invalid');
assert.equal(invalidItems.length, 0, `Invalid Exercise Builder items: ${invalidItems.map((item) => item.errors.join(' | ')).join(' || ')}`);

assert.equal(bundle.schema_version, 2);
assert.equal(bundle.entity_type, 'bundle');
assert.deepEqual(bundle.questions, []);
assert.deepEqual(bundle.pools, []);
assert.equal(bundle.exercises.length, 8, 'Year 1 Reading P0 must contain eight independent forms.');
assert.equal(manifest.schema_version, 1);
assert.equal(manifest.manifest_id, 'recovery-v2-year1-reading-p0');
assert.equal(manifest.status, 'draft');
assert.equal(manifest.fragments.length, 8);
assert.equal(coverage.pool_id, manifest.manifest_id);
assert.equal(coverage.target.primary_axis, 'reading');

const exerciseByKey = new Map(bundle.exercises.map((exercise) => [exercise.client_key, exercise]));
assert.equal(exerciseByKey.size, bundle.exercises.length, 'Exercise client keys must be unique.');

const fragmentIds = new Set();
const questionKeys = new Set();
const formKeys = new Set();
const familyRoots = new Map();
const questionTypeCounts = new Map();
const itemTypeCounts = new Map();
const outcomeFragmentCounts = new Map();
const outcomeQuestionCounts = new Map();
let totalMinutes = 0;

const forbiddenGrammarTitle = /\b(?:present simple|present continuous|past simple|present perfect|future forms?|comparatives?|superlatives?|pronouns?|prepositions?|articles?|quantifiers?|grammar|grammatica)\b/i;
const accidentalAnswerDisclosure = /\b(?:correct answer|risposta corretta|solution|soluzione)\s*[:=-]/i;
const exactCopyMarkers = /\b(?:copy from teaching|reused teaching text|topic practice copy)\b/i;
const schoolTaskFamilies = new Set(['reading_text', 'functional_text']);
const expectedFormPairs = new Set([
  'ry1-reading-functional-notice',
  'ry1-reading-personal-narrative',
  'ry1-reading-context-reference',
  'ry1-reading-short-description',
]);

function familyRoot(formKey) {
  return formKey.replace(/-[ab]$/, '');
}

function recordCount(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function visibleQuestionText(question) {
  const content = question.content || {};
  const items = content.items || [];
  const itemText = items.flatMap((item) => [item.prompt, ...(item.options || []).map((option) => option.text)]);
  return [question.title, question.prompt, question.instructions, content.title, content.passage, ...itemText]
    .filter(Boolean)
    .join(' ');
}

for (const fragment of manifest.fragments) {
  assert.match(fragment.fragment_id, /^RAF-RY1-READ-\d{2}$/);
  assert.ok(!fragmentIds.has(fragment.fragment_id), `Duplicate fragment_id: ${fragment.fragment_id}`);
  fragmentIds.add(fragment.fragment_id);
  assert.equal(fragment.status, 'draft');
  assert.deepEqual(fragment.year_profiles, [1]);
  assert.equal(fragment.primary_axis, 'reading');
  assert.deepEqual(fragment.secondary_axes, []);
  assert.equal(fragment.transfer_level, 'transfer');
  assert.equal(fragment.content_source_policy, 'unseen_original_for_recovery_v2_cumulative');
  assert.equal(fragment.unseen_or_mixed_context, true);
  assert.ok(Number(fragment.estimated_minutes) >= 6 && Number(fragment.estimated_minutes) <= 10, `${fragment.fragment_id} must remain modular (6-10 minutes).`);
  assert.ok(schoolTaskFamilies.has(fragment.school_task_family), `Unsupported reading school task family: ${fragment.school_task_family}`);
  totalMinutes += Number(fragment.estimated_minutes);

  assert.ok(fragment.form_family_key && !formKeys.has(fragment.form_family_key), `Duplicate/empty form_family_key: ${fragment.form_family_key}`);
  formKeys.add(fragment.form_family_key);
  const root = familyRoot(fragment.form_family_key);
  assert.ok(expectedFormPairs.has(root), `Unexpected form family: ${fragment.form_family_key}`);
  const forms = familyRoots.get(root) || [];
  forms.push(fragment.form_family_key);
  familyRoots.set(root, forms);

  assert.equal(fragment.outcome_ids.length, 1, `${fragment.fragment_id} must target one reading outcome at container-score granularity.`);
  const outcomeId = fragment.outcome_ids[0];
  assert.ok(canonicalReadingOutcomes.has(outcomeId), `Unsupported Year 1 reading outcome: ${outcomeId}`);
  const outcome = outcomeById.get(outcomeId);
  assert.ok(outcome, `Unknown Year 1 outcome: ${outcomeId}`);
  assert.equal(outcome.competence_axis, 'reading');
  assert.equal(outcome.programme_requirement, 'default_core');
  assert.equal(outcome.blocking_candidate, true);
  recordCount(outcomeFragmentCounts, outcomeId);

  assert.equal(fragment.assessment_modes.length, 1, `${fragment.fragment_id} must declare the mode actually used by its mappings.`);
  for (const mode of fragment.assessment_modes) {
    assert.ok(modeKeys.has(mode), `Unknown assessment mode: ${mode}`);
    assert.ok(['reading_comprehension', 'cumulative_school_test'].includes(mode), `Unsupported reading pool mode: ${mode}`);
    assert.ok(outcome.assessment_modes.includes(mode), `${mode} is not allowed by ${outcomeId}`);
  }

  const exercise = exerciseByKey.get(fragment.exercise_client_key);
  assert.ok(exercise, `Manifest references missing exercise: ${fragment.exercise_client_key}`);
  assert.equal(exercise.estimated_minutes, fragment.estimated_minutes);
  assert.ok(['A1+', 'A2'].includes(exercise.level));
  assert.equal(exercise.settings.display_mode, 'all_questions', 'The passage must remain visible while the learner answers.');
  assert.equal(exercise.settings.feedback_timing, 'exercise_end');
  assert.equal(exercise.settings.show_explanations, false);
  assert.equal(exercise.settings.show_diagnostic_summary, false);
  assert.equal(exercise.sections.length, 1);
  assert.equal(exercise.sections[0].feedback_timing, 'exercise_end');

  const visibleExerciseCopy = [exercise.title, exercise.description, exercise.instructions, exercise.sections[0].title, exercise.sections[0].instructions].join(' ');
  assert.doesNotMatch(visibleExerciseCopy, forbiddenGrammarTitle, `Exercise title/copy leaks a grammar target: ${exercise.client_key}`);
  assert.doesNotMatch(visibleExerciseCopy, accidentalAnswerDisclosure, `Exercise copy discloses an answer: ${exercise.client_key}`);

  const questions = exercise.sections.flatMap((section) => section.questions || []);
  assert.ok(questions.length >= 1 && questions.length <= 2, `${exercise.client_key} must remain a modular reading fragment.`);
  assert.equal(questions.filter((question) => question.type === 'content_block').length, 0, 'Cumulative fragments cannot contain teaching blocks.');
  assert.equal(fragment.question_mappings.length, questions.length, `Manifest must map every versioned question in ${exercise.client_key}`);
  const localKeys = new Set();
  for (const question of questions) {
    assert.ok(question.client_key, `Question client key missing in ${exercise.client_key}`);
    assert.ok(!localKeys.has(question.client_key), `Duplicate local question key: ${question.client_key}`);
    assert.ok(!questionKeys.has(question.client_key), `Duplicate global question key: ${question.client_key}`);
    localKeys.add(question.client_key);
    questionKeys.add(question.client_key);
    recordCount(questionTypeCounts, question.type);

    assert.equal(question.primary_skill, 'reading');
    assert.equal(question.feedback && Object.keys(question.feedback).length, 0, `No coaching in cumulative fragment: ${question.client_key}`);
    assert.deepEqual(question.diagnostics?.tested_codes || [], [], `Cumulative evidence must not depend on topic diagnostics: ${question.client_key}`);
    assert.equal(question.diagnostics?.fallback_error_code ?? null, null);
    const learnerVisible = visibleQuestionText(question);
    assert.doesNotMatch(learnerVisible, forbiddenGrammarTitle, `Learner-visible question copy leaks a grammar target: ${question.client_key}`);
    assert.doesNotMatch(learnerVisible, accidentalAnswerDisclosure, `Question copy discloses an answer: ${question.client_key}`);
    assert.doesNotMatch(learnerVisible, exactCopyMarkers, `Question appears to reuse teaching content: ${question.client_key}`);

    if (question.type === 'reading_comprehension') {
      const items = question.content?.items || [];
      assert.equal(items.length, 4, `${question.client_key} must contain four scored reading decisions.`);
      assert.ok(question.content.passage.split(/\s+/).length >= 65, `${question.client_key} passage is too short for connected evidence.`);
      assert.ok(question.content.passage.split(/\s+/).length <= 150, `${question.client_key} passage is too long for the Year 1 modular budget.`);
      const itemKeys = new Set();
      for (const item of items) {
        assert.ok(!itemKeys.has(item.key), `Duplicate inner item key in ${question.client_key}: ${item.key}`);
        itemKeys.add(item.key);
        recordCount(itemTypeCounts, item.type);
        if (['multiple_choice', 'true_false'].includes(item.type)) {
          assert.equal(item.options.filter((option) => option.is_correct).length, 1, `Exactly one answer required in ${question.client_key}/${item.key}`);
          assert.ok(item.options.filter((option) => !option.is_correct).length >= 1, `Distractor required in ${question.client_key}/${item.key}`);
        }
        if (item.type === 'short_answer') {
          assert.ok(item.accepted_answers.length >= 3, `Short answer needs robust variants: ${question.client_key}/${item.key}`);
          assert.ok(item.accepted_answers.every((answer) => answer.split(/\s+/).length <= 8), `Short answer must remain brief: ${question.client_key}/${item.key}`);
        }
      }
    } else {
      assert.equal(question.type, 'word_order', `Unsupported top-level question type in reading pool: ${question.type}`);
      assert.equal(question.content.tokens.length, 4, `Sequence task must contain four events: ${question.client_key}`);
      assert.deepEqual([...question.content.tokens].sort(), [...question.content.correct_order].sort(), `Sequence options mismatch in ${question.client_key}`);
    }
  }

  const mapped = new Set();
  for (const mapping of fragment.question_mappings) {
    assert.ok(localKeys.has(mapping.question_client_key), `Manifest references missing question: ${mapping.question_client_key}`);
    assert.ok(!mapped.has(mapping.question_client_key), `Question mapped twice: ${mapping.question_client_key}`);
    mapped.add(mapping.question_client_key);
    assert.equal(mapping.outcome_id, outcomeId);
    assert.equal(mapping.evidence_role, 'primary');
    assert.equal(mapping.production_evidence, false);
    assert.ok(fragment.assessment_modes.includes(mapping.assessment_mode));
    assert.ok(modeKeys.has(mapping.assessment_mode));
    assert.ok(Number(mapping.evidence_weight) > 0 && Number(mapping.evidence_weight) <= 1);
    recordCount(outcomeQuestionCounts, outcomeId);
  }
  assert.equal(mapped.size, questions.length);
  const totalWeight = fragment.question_mappings.reduce((sum, mapping) => sum + Number(mapping.evidence_weight), 0);
  assert.ok(Math.abs(totalWeight - 1) < 0.000001, `${fragment.fragment_id} mapping weights must sum to 1.`);
}

assert.deepEqual(new Set(manifest.fragments.map((fragment) => fragment.exercise_client_key)), new Set(bundle.exercises.map((exercise) => exercise.client_key)), 'Manifest and bundle exercise sets must match exactly.');
assert.deepEqual(canonicalReadingOutcomes, new Set(coverage.outcome_matrix.map((row) => row.outcome_id)), 'Coverage matrix must include every canonical Year 1 reading outcome.');
assert.equal(coverage.outcome_matrix.every((row) => row.coverage_status === 'covered'), true);
for (const row of coverage.outcome_matrix) {
  assert.ok(row.fragment_ids.length >= 2, `${row.outcome_id} needs evidence from at least two independent fragments.`);
  for (const fragmentId of row.fragment_ids) assert.ok(fragmentIds.has(fragmentId), `Coverage matrix references missing fragment: ${fragmentId}`);
}
assert.equal(familyRoots.size, 4, 'Pool must contain four task-equivalent form families.');
for (const [root, forms] of familyRoots) {
  assert.equal(forms.length, 2, `${root} must contain two independent forms.`);
  assert.deepEqual(new Set(forms.map((key) => key.slice(-1))), new Set(['a', 'b']), `${root} requires form A and form B.`);
}

assert.deepEqual([...canonicalReadingOutcomes].sort().map((id) => [id, outcomeFragmentCounts.get(id)]), [
  ['RY1-READ-001', 2],
  ['RY1-READ-002', 4],
  ['RY1-READ-003', 2],
]);
assert.ok((outcomeQuestionCounts.get('RY1-READ-002') || 0) >= 6, 'RY1-READ-002 requires dedicated sequence evidence as well as reading containers.');
assert.equal(totalMinutes, 56);
assert.deepEqual(Object.fromEntries([...questionTypeCounts].sort()), { reading_comprehension: 8, word_order: 2 });
assert.deepEqual(Object.fromEntries([...itemTypeCounts].sort()), { multiple_choice: 18, short_answer: 8, true_false: 6 });

console.log('Recovery v2 Year 1 Reading P0 validated: 8 fragments, 4 paired families, 56 minutes, 10 versioned questions, 32 inner reading items, all 3 canonical reading outcomes covered.');
