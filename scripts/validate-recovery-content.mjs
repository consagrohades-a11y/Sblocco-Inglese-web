import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { validateExerciseBuilderJson } from '../src/lib/exerciseBuilderSchema.js';

const waveDir = 'content/recovery/wave-1';
const files = readdirSync(waveDir).filter((file) => file.endsWith('.bundle.json')).sort();
assert.ok(files.length >= 1, 'Recovery Wave 1 must contain at least one content bundle.');

const phaseSuffixes = ['_recover', '_practice', '_school', '_verify'];

for (const file of files) {
  const filePath = path.join(waveDir, file);
  const bundle = JSON.parse(readFileSync(filePath, 'utf8'));
  const result = validateExerciseBuilderJson(bundle);
  assert.deepEqual(result.errors, [], `${file}: top-level Exercise Builder validation failed: ${result.errors.join(' | ')}`);
  const invalidItems = result.items.filter((item) => item.status === 'invalid');
  assert.equal(invalidItems.length, 0, `${file}: invalid Exercise Builder items: ${invalidItems.flatMap((item) => item.errors || []).join(' | ')}`);

  assert.equal(bundle.schema_version, 2, `${file}: schema_version must be 2.`);
  assert.equal(bundle.entity_type, 'bundle', `${file}: entity_type must be bundle.`);
  assert.equal(bundle.exercises?.length, 4, `${file}: every Recovery topic batch must contain exactly four phase exercises.`);

  const exercises = bundle.exercises;
  const topic = exercises[0]?.topic;
  assert.ok(topic, `${file}: topic key is required.`);
  assert.equal(exercises.reduce((sum, exercise) => sum + Number(exercise.estimated_minutes || 0), 0), 42, `${file}: Complete-mode batch must total 42 minutes.`);

  for (const suffix of phaseSuffixes) {
    assert.ok(exercises.some((exercise) => String(exercise.client_key || '').endsWith(suffix)), `${file}: missing phase ${suffix}.`);
  }

  const recover = exercises.find((exercise) => String(exercise.client_key || '').endsWith('_recover'));
  const practice = exercises.find((exercise) => String(exercise.client_key || '').endsWith('_practice'));
  const school = exercises.find((exercise) => String(exercise.client_key || '').endsWith('_school'));
  const verify = exercises.find((exercise) => String(exercise.client_key || '').endsWith('_verify'));

  const questionsFor = (exercise) => exercise.sections.flatMap((section) => section.questions || []);
  const recoverQuestions = questionsFor(recover);
  const practiceQuestions = questionsFor(practice);
  const schoolQuestions = questionsFor(school);
  const verifyQuestions = questionsFor(verify);

  assert.ok(recoverQuestions.some((question) => question.type === 'content_block' && question.content?.educational_schema_version === 1 && question.content?.template_id === 'educational-content-block-v1'), `${file}: Recupera must contain structured educational input.`);
  assert.ok(recoverQuestions.length >= 5, `${file}: Recupera needs teaching plus enough scaffolded checks.`);
  assert.ok(practiceQuestions.length >= 7, `${file}: Allenati must contain at least seven retrieval activities.`);
  assert.ok(new Set(practiceQuestions.map((question) => question.type)).size >= 3, `${file}: Allenati must use at least three exercise formats.`);
  assert.ok(schoolQuestions.length >= 5, `${file}: Modalità scuola must contain a substantial school-style set.`);
  assert.ok(new Set(schoolQuestions.map((question) => question.type)).size >= 4, `${file}: Modalità scuola must use at least four school-style formats.`);
  assert.ok(verifyQuestions.length >= 6, `${file}: Mini-verifica must sample the whole topic.`);
  assert.equal(verifyQuestions.some((question) => question.type === 'content_block'), false, `${file}: Mini-verifica cannot contain teaching content.`);

  assert.ok(recover.sections.every((section) => section.feedback_timing === 'question_end'), `${file}: Recupera must give immediate feedback.`);
  assert.ok(practice.sections.every((section) => section.feedback_timing === 'question_end'), `${file}: Allenati must give immediate learning feedback.`);
  assert.ok(school.sections.every((section) => section.feedback_timing === 'exercise_end'), `${file}: Modalità scuola must withhold feedback until the end.`);
  assert.ok(verify.sections.every((section) => section.feedback_timing === 'exercise_end'), `${file}: Mini-verifica must withhold feedback until the end.`);

  const seenClientKeys = new Set();
  for (const exercise of exercises) {
    assert.equal(exercise.topic, topic, `${file}: all exercises must use topic ${topic}.`);
    assert.ok(!seenClientKeys.has(exercise.client_key), `${file}: duplicate exercise client_key ${exercise.client_key}.`);
    seenClientKeys.add(exercise.client_key);
    for (const question of questionsFor(exercise)) {
      assert.equal(question.topic, topic, `${file}: ${question.client_key || question.title} uses the wrong topic key.`);
      if (question.client_key) {
        assert.ok(!seenClientKeys.has(question.client_key), `${file}: duplicate client_key ${question.client_key}.`);
        seenClientKeys.add(question.client_key);
      }
      if (question.type !== 'content_block') {
        assert.ok((question.diagnostics?.tested_codes || []).length >= 1, `${file}: ${question.client_key || question.title} must test at least one registered diagnostic code.`);
      }
    }
  }

  const verifyObjectives = new Set(verifyQuestions.map((question) => String(question.subtopic || question.learning_objective || '').trim()).filter(Boolean));
  assert.ok(verifyObjectives.size >= 5, `${file}: Mini-verifica is too narrow; it must cover several distinct subskills.`);
}

console.log(`Validated ${files.length} Recovery Wave 1 topic batches through the real Exercise Builder contract.`);
