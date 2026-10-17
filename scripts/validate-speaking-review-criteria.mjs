import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SPEAKING_CATEGORIES,
  SPEAKING_PERFORMANCE_FIELDS,
  SPEAKING_NEXT_STEP_FIELDS,
  normalizeSpeakingFeedback,
  hasSpeakingFeedback,
} from '../src/lib/speakingReviewCriteria.js';

const read = (name) => readFileSync(name, 'utf8');
const categories = new Map(SPEAKING_CATEGORIES);
for (const category of ['grammar', 'structure', 'vocabulary', 'naturalness', 'clarity', 'register']) {
  assert(categories.has(category), 'Missing spoken-language category: ' + category);
}
assert(!categories.has('spelling'), 'Speaking should not use written spelling categories.');
assert(!categories.has('punctuation'), 'Speaking should not use writing punctuation categories.');

assert.deepEqual(SPEAKING_PERFORMANCE_FIELDS.map((field) => field.key), [
  'pronunciation', 'fluency', 'task_fulfilment',
]);
assert.deepEqual(SPEAKING_NEXT_STEP_FIELDS.map((field) => field.key), [
  'strengths', 'priority', 'next_step',
]);

assert.equal(hasSpeakingFeedback(null), false);
assert.equal(hasSpeakingFeedback({ fluency: '   ' }), false);
assert.equal(hasSpeakingFeedback({ task_fulfilment: 'Answered the prompt and supported the argument.' }), true);
assert.equal(normalizeSpeakingFeedback({ fluency: 'Too many pauses', pronunciation: 17 }).pronunciation, '');

const editor = read('src/components/exercises/WritingCorrectionWorkspace.jsx');
const display = read('src/components/exercises/WritingCorrectionDisplay.jsx');
const admin = read('src/pages/AdminExerciseResults.jsx');
const renderer = read('src/components/exercises/ExerciseQuestionRendererV2.jsx');
const migration = read('supabase/migrations/20261017143736_speaking_specific_review_criteria.sql');
const api = read('src/lib/exerciseResultsApi.js');

assert(editor.includes('isSpeaking = false'));
assert(editor.includes('isSpeaking ? SPEAKING_CATEGORIES : WRITING_CATEGORIES'));
assert(editor.includes('kind: draft.kind'));
assert(editor.includes('speaking_feedback: patch.speaking_feedback'));
assert(editor.includes('SPEAKING_PERFORMANCE_FIELDS.map'));
assert(editor.includes('SPEAKING_NEXT_STEP_FIELDS.map'));
assert(editor.includes('Ascolta l\'audio'));
assert(admin.includes("isSpeaking={item.question?.type === 'audio_response'}"));
assert(renderer.includes('isSpeaking'));
assert(renderer.includes('teacher_correction?.speaking_feedback'));
assert(display.includes('showSpeakingFeedback'));
assert(display.includes('SPEAKING_NEXT_STEP_FIELDS.filter'));
assert(display.includes("reason.kind === 'improvement'"));
assert(display.includes('isSpeaking={isSpeaking}'));
assert(api.includes('admin_save_exercise_builder_written_corrections'));
assert(migration.includes("'naturalness'"));
assert(migration.includes("'error', 'improvement'"));
assert(migration.includes("'task_fulfilment'"));

console.log('Speaking review criteria, persistence and learner display checks passed.');
