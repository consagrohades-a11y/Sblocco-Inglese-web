import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const shell = read('src/components/AdminShell.jsx');
const bell = read('src/components/admin/AdminNotificationBell.jsx');
const results = read('src/pages/AdminExerciseResults.jsx');
const resultsApi = read('src/lib/exerciseResultsApi.js');
const renderer = read('src/components/exercises/ExerciseQuestionRendererV2.jsx');
const replay = read('src/components/vocabulary/VocabularyReplay.jsx');
const bank = read('src/pages/LearnerVocabularyBank.jsx');
const migration = read('supabase/migrations/20260922074051_writing_visual_corrections.sql');

assert.match(shell, /AdminNotificationBell/);
assert.match(bell, /setInterval\(refresh, 15000\)/);
assert.doesNotMatch(bell, /subscribeToTeacherNotifications/);

assert.match(results, /WritingCorrectionEditor/);
assert.match(resultsApi, /admin_save_exercise_builder_written_corrections/);
assert.match(renderer, /WritingCorrectionDisplay/);
assert.match(migration, /teacher_correction jsonb/);
assert.match(migration, /review_status = 'approved' then q\.teacher_correction/);

assert.match(replay, /Sblocco Replay/);
assert.match(replay, /Me lo ricordavo/);
assert.match(bank, /<VocabularyReplay items=\{items\}/);

console.log('notifications, writing corrections, and Sblocco Replay validation passed');
