import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateExerciseBuilderJson } from '../src/lib/exerciseBuilderSchema.js';

const ROOT = 'content/recovery/verification-v2/wave-1';
const EXPECTED_TOPICS = new Set([
  'present-simple',
  'present-continuous',
  'present-simple-vs-present-continuous',
  'past-simple',
  'irregular-verbs',
  'present-perfect',
  'past-simple-vs-present-perfect',
  'future-forms',
]);

const CONTROLLED_PRODUCTION = new Set(['translation', 'error_correction', 'word_order', 'written_response']);
const files = readdirSync(ROOT).filter((name) => name.endsWith('.bundle.json')).sort();
assert.equal(files.length, EXPECTED_TOPICS.size, `Expected ${EXPECTED_TOPICS.size} verification-v2 patch bundles, found ${files.length}`);

const seen = new Set();
for (const file of files) {
  const payload = JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  const validation = validateExerciseBuilderJson(payload);
  assert.equal(validation.errors.length, 0, `${file}: Exercise Builder schema errors: ${JSON.stringify(validation.errors, null, 2)}`);
  assert.equal(payload.schema_version, 2, `${file}: schema_version must be 2`);
  assert.equal(payload.entity_type, 'bundle', `${file}: entity_type must be bundle`);
  assert.equal(payload.exercises?.length, 1, `${file}: verification patch must contain exactly one exercise`);

  const exercise = payload.exercises[0];
  const topic = exercise.topic;
  assert.ok(EXPECTED_TOPICS.has(topic), `${file}: unexpected topic ${topic}`);
  assert.ok(!seen.has(topic), `${file}: duplicate topic ${topic}`);
  seen.add(topic);
  assert.match(exercise.client_key, /_verify_v2$/, `${file}: client_key must end in _verify_v2`);
  assert.equal(exercise.estimated_minutes, 14, `${file}: verification target is 14 minutes`);
  assert.equal(exercise.settings?.feedback_timing, 'exercise_end', `${file}: feedback must be exercise_end`);
  assert.equal(exercise.settings?.show_score, true, `${file}: score must be shown`);

  const sections = exercise.sections ?? [];
  assert.equal(sections.length, 1, `${file}: verification patch must contain exactly one section`);
  const section = sections[0];
  assert.equal(section.feedback_timing, 'exercise_end', `${file}: section feedback must be exercise_end`);
  assert.equal(section.selection_mode, 'fixed', `${file}: verification must use fixed selection`);

  const questions = section.questions ?? [];
  assert.ok(questions.length >= 10 && questions.length <= 13, `${file}: expected 10-13 activities, found ${questions.length}`);
  assert.ok(questions.every((q) => q.type !== 'content_block'), `${file}: verification cannot contain content_block`);

  const types = new Set(questions.map((q) => q.type));
  assert.ok(types.size >= 4, `${file}: expected at least 4 exercise types, found ${types.size}`);
  const subskills = new Set(questions.map((q) => q.subtopic).filter(Boolean));
  assert.ok(subskills.size >= 6, `${file}: expected at least 6 subskills, found ${subskills.size}`);
  const challengeCount = questions.filter((q) => q.difficulty === 'challenge').length;
  assert.ok(challengeCount >= 3, `${file}: expected at least 3 challenge activities, found ${challengeCount}`);
  assert.ok(questions.some((q) => CONTROLLED_PRODUCTION.has(q.type)), `${file}: needs at least one controlled-production activity`);
  assert.ok(questions.some((q) => q.type === 'dialogue_choice' || (q.content?.text_template && q.content.text_template.length > 80)), `${file}: needs at least one connected context/dialogue`);
  assert.ok(questions.every((q) => q.grading && q.diagnostics && Array.isArray(q.tags)), `${file}: every activity needs grading, diagnostics and tags`);

  const titles = questions.map((q) => String(q.title ?? '').toLowerCase());
  for (const giveaway of ['negative', 'auxiliary', 'short answer', 'use of', 'present simple', 'present continuous', 'past simple', 'present perfect']) {
    assert.ok(!titles.some((title) => title === giveaway), `${file}: task title '${giveaway}' gives away the tested rule`);
  }
}

assert.deepEqual(seen, EXPECTED_TOPICS, 'Verification-v2 patches must cover all eight Wave 1 topics');
console.log(`Recovery verification-v2 validation passed for ${files.length} topic patches.`);
