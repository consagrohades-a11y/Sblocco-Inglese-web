import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { validateExerciseBuilderJson } from '../src/lib/exerciseBuilderSchema.js';

const recoveryRoot = 'content/recovery';
const waveDirs = readdirSync(recoveryRoot)
  .filter((entry) => /^wave-\d+$/.test(entry) && statSync(path.join(recoveryRoot, entry)).isDirectory())
  .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));

assert.ok(waveDirs.length >= 1, 'Recovery content must contain at least one wave directory.');

const phaseSuffixes = ['_recover', '_practice', '_school', '_verify'];
let validatedBundles = 0;

for (const waveDirName of waveDirs) {
  const waveNumber = Number(waveDirName.split('-')[1]);
  const waveDir = path.join(recoveryRoot, waveDirName);
  const files = readdirSync(waveDir).filter((file) => file.endsWith('.bundle.json')).sort();

  if (files.length === 0) continue;

  for (const file of files) {
    validatedBundles += 1;
    const filePath = path.join(waveDir, file);
    const bundle = JSON.parse(readFileSync(filePath, 'utf8'));
    const result = validateExerciseBuilderJson(bundle);
    assert.deepEqual(result.errors, [], `${waveDirName}/${file}: top-level Exercise Builder validation failed: ${result.errors.join(' | ')}`);
    const invalidItems = result.items.filter((item) => item.status === 'invalid');
    assert.equal(invalidItems.length, 0, `${waveDirName}/${file}: invalid Exercise Builder items: ${invalidItems.flatMap((item) => item.errors || []).join(' | ')}`);

    assert.equal(bundle.schema_version, 2, `${waveDirName}/${file}: schema_version must be 2.`);
    assert.equal(bundle.entity_type, 'bundle', `${waveDirName}/${file}: entity_type must be bundle.`);
    assert.equal(bundle.exercises?.length, 4, `${waveDirName}/${file}: every Recovery topic batch must contain exactly four phase exercises.`);

    const exercises = bundle.exercises;
    const topic = exercises[0]?.topic;
    assert.ok(topic, `${waveDirName}/${file}: topic key is required.`);

    const totalMinutes = exercises.reduce((sum, exercise) => sum + Number(exercise.estimated_minutes || 0), 0);
    if (waveNumber === 1) {
      assert.ok([42, 48].includes(totalMinutes), `${waveDirName}/${file}: Wave 1 must remain at legacy 42 minutes or upgraded v2 48 minutes.`);
    } else {
      assert.equal(totalMinutes, 48, `${waveDirName}/${file}: new Recovery batches must total 48 minutes (12 + 12 + 10 + 14).`);
    }

    for (const suffix of phaseSuffixes) {
      assert.ok(exercises.some((exercise) => String(exercise.client_key || '').endsWith(suffix)), `${waveDirName}/${file}: missing phase ${suffix}.`);
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

    assert.ok(recoverQuestions.some((question) => question.type === 'content_block' && question.content?.educational_schema_version === 1 && question.content?.template_id === 'educational-content-block-v1'), `${waveDirName}/${file}: Recupera must contain structured educational input.`);
    assert.ok(recoverQuestions.length >= 5, `${waveDirName}/${file}: Recupera needs teaching plus enough scaffolded checks.`);
    assert.ok(practiceQuestions.length >= 7, `${waveDirName}/${file}: Allenati must contain at least seven retrieval activities.`);
    assert.ok(new Set(practiceQuestions.map((question) => question.type)).size >= 3, `${waveDirName}/${file}: Allenati must use at least three exercise formats.`);
    assert.ok(schoolQuestions.length >= 5, `${waveDirName}/${file}: Modalità scuola must contain a substantial school-style set.`);
    assert.ok(new Set(schoolQuestions.map((question) => question.type)).size >= 4, `${waveDirName}/${file}: Modalità scuola must use at least four school-style formats.`);
    assert.equal(verifyQuestions.some((question) => question.type === 'content_block'), false, `${waveDirName}/${file}: verification cannot contain teaching content.`);

    assert.ok(recover.sections.every((section) => section.feedback_timing === 'question_end'), `${waveDirName}/${file}: Recupera must give immediate feedback.`);
    assert.ok(practice.sections.every((section) => section.feedback_timing === 'question_end'), `${waveDirName}/${file}: Allenati must give immediate learning feedback.`);
    assert.ok(school.sections.every((section) => section.feedback_timing === 'exercise_end'), `${waveDirName}/${file}: Modalità scuola must withhold feedback until the end.`);
    assert.ok(verify.sections.every((section) => section.feedback_timing === 'exercise_end'), `${waveDirName}/${file}: verification must withhold feedback until the end.`);

    const verifyObjectives = new Set(verifyQuestions.map((question) => String(question.subtopic || question.learning_objective || '').trim()).filter(Boolean));

    const isVerificationV2 = waveNumber >= 2 || Number(verify.estimated_minutes || 0) >= 12;
    if (isVerificationV2) {
      assert.ok(Number(verify.estimated_minutes || 0) >= 12 && Number(verify.estimated_minutes || 0) <= 15, `${waveDirName}/${file}: Verifica argomento v2 must be 12-15 minutes.`);
      assert.ok(verifyQuestions.length >= 10 && verifyQuestions.length <= 13, `${waveDirName}/${file}: Verifica argomento v2 must contain 10-13 activities.`);
      assert.ok(new Set(verifyQuestions.map((question) => question.type)).size >= 4, `${waveDirName}/${file}: Verifica argomento v2 must use at least four exercise formats.`);
      assert.ok(verifyObjectives.size >= 6, `${waveDirName}/${file}: Verifica argomento v2 must cover at least six distinct subskills.`);
      assert.ok(verifyQuestions.filter((question) => question.difficulty === 'challenge').length >= 3, `${waveDirName}/${file}: Verifica argomento v2 needs a meaningful challenge sample.`);
      assert.ok(verifyQuestions.some((question) => ['translation', 'error_correction', 'word_order', 'written_response'].includes(question.type)), `${waveDirName}/${file}: Verifica argomento v2 needs controlled production.`);
    } else {
      assert.ok(verifyQuestions.length >= 6, `${waveDirName}/${file}: legacy Mini-verifica must sample the whole topic.`);
      assert.ok(verifyObjectives.size >= 5, `${waveDirName}/${file}: legacy Mini-verifica is too narrow.`);
    }

    const seenClientKeys = new Set();
    for (const exercise of exercises) {
      assert.equal(exercise.topic, topic, `${waveDirName}/${file}: all exercises must use topic ${topic}.`);
      assert.ok(!seenClientKeys.has(exercise.client_key), `${waveDirName}/${file}: duplicate exercise client_key ${exercise.client_key}.`);
      seenClientKeys.add(exercise.client_key);
      for (const question of questionsFor(exercise)) {
        assert.equal(question.topic, topic, `${waveDirName}/${file}: ${question.client_key || question.title} uses the wrong topic key.`);
        if (question.client_key) {
          assert.ok(!seenClientKeys.has(question.client_key), `${waveDirName}/${file}: duplicate client_key ${question.client_key}.`);
          seenClientKeys.add(question.client_key);
        }
        if (question.type !== 'content_block') {
          assert.ok((question.diagnostics?.tested_codes || []).length >= 1, `${waveDirName}/${file}: ${question.client_key || question.title} must test at least one registered diagnostic code.`);
        }
      }
    }
  }
}

assert.ok(validatedBundles >= 1, 'Recovery content validation found no bundle files.');
console.log(`Validated ${validatedBundles} Recovery topic batches across ${waveDirs.length} wave directories through the real Exercise Builder contract.`);
