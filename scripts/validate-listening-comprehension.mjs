import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  EXERCISE_BUILDER_QUESTION_TYPES,
  exerciseBuilderTemplates,
  validateExerciseBuilderJson,
} from '../src/lib/exerciseBuilderSchema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);

if (!EXERCISE_BUILDER_QUESTION_TYPES.includes('listening_comprehension')) {
  fail('listening_comprehension is missing from the public Exercise Builder question-type contract.');
}

const template = exerciseBuilderTemplates.listening_comprehension;
if (!template) {
  fail('listening_comprehension downloadable template is missing.');
} else {
  const result = validateExerciseBuilderJson(JSON.stringify(template));
  const item = result.items?.[0];
  if (result.errors.length || !item || item.status === 'invalid') {
    fail(`listening template does not round-trip: ${[...result.errors, ...(item?.errors || [])].join(' | ')}`);
  }
  if (item?.payload?.type !== 'listening_comprehension') fail('validation bridge did not restore the native listening question type.');
  if (item?.payload?.primary_skill !== 'listening') fail('listening template must keep primary_skill=listening.');
  if (!item?.payload?.content?.audio?.url && !item?.payload?.content?.audio?.storage_path) fail('listening template lost its audio source.');
  if ((item?.payload?.content?.items || []).length < 3) fail('listening template should demonstrate multiple comprehension items.');
  if ('passage' in (item?.payload?.content || {})) fail('listening payload leaked the internal reading-validation bridge passage.');
  const codes = item?.payload?.diagnostics?.tested_codes || [];
  if (!codes.includes('LISTENING_GIST') || !codes.includes('LISTENING_DETAIL')) fail('listening template must ship with registered gist/detail diagnostics.');
}

if (template) {
  const noAudio = JSON.parse(JSON.stringify(template));
  noAudio.question.content.audio.url = '';
  noAudio.question.content.audio.storage_path = null;
  const noAudioResult = validateExerciseBuilderJson(noAudio);
  if (!noAudioResult.items?.[0]?.errors?.some((message) => message.includes('url oppure storage_path'))) {
    fail('listening validation must reject a question without an audio source.');
  }

  const invalidReplay = JSON.parse(JSON.stringify(template));
  invalidReplay.question.content.audio.max_plays = 0;
  const invalidReplayResult = validateExerciseBuilderJson(invalidReplay);
  if (!invalidReplayResult.items?.[0]?.errors?.some((message) => message.includes('max_plays'))) {
    fail('listening validation must reject max_plays below 1.');
  }
}

const renderer = await readFile(path.join(root, 'src/components/exercises/ExerciseQuestionRenderer.jsx'), 'utf8');
const listeningRenderer = await readFile(path.join(root, 'src/components/exercises/ListeningComprehensionQuestion.jsx'), 'utf8');
if (!renderer.includes("question.type === 'listening_comprehension'")) fail('compatibility renderer does not route native listening questions.');
if (!listeningRenderer.includes('createExerciseListeningSignedUrl')) fail('listening renderer does not support private Supabase audio paths.');
if (!listeningRenderer.includes('transcript_visibility')) fail('listening renderer does not enforce transcript visibility metadata.');
if (!listeningRenderer.includes('max_plays')) fail('listening renderer does not implement optional replay limits.');

const migration = await readFile(path.join(root, 'supabase/migrations/20260812121412_native_listening_comprehension.sql'), 'utf8');
for (const marker of [
  "'listening_comprehension'",
  "'LISTENING_GIST'",
  "'LISTENING_DETAIL'",
  "exercise_builder_safe_question_snapshot",
  "exercise_builder_grade_answer",
  "admin_save_exercise_builder_question_version_legacy",
]) {
  if (!migration.includes(marker)) fail(`listening migration is missing ${marker}.`);
}

if (failures.length) {
  console.error('Listening comprehension validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Native listening comprehension validation passed: template, bridge, diagnostics, audio contract, renderer and production-aligned database migration are aligned.');
