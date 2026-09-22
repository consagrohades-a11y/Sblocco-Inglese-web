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
const learnerNotifications = read('src/components/learner/LearnerNotificationsPanel.jsx');
const learnerBell = read('src/components/learner/LearnerNotificationBell.jsx');
const learnerNotificationApi = read('src/lib/learnerNotificationsApi.js');
const learnerNotificationMigration = read('supabase/migrations/20260922184917_learner_assignment_and_writing_notifications.sql');

assert.match(shell, /AdminNotificationBell/);
assert.match(bell, /setInterval\(refresh, 15000\)/);
assert.doesNotMatch(bell, /subscribeToTeacherNotifications/);

assert.match(results, /WritingCorrectionWorkspace/);
const writingWorkspace = read('src/components/exercises/WritingCorrectionWorkspace.jsx');
assert.match(writingWorkspace, /Seleziona il testo/);
assert.match(writingWorkspace, /Versione finale/);
assert.match(writingWorkspace, /Vista studente/);
assert.match(resultsApi, /admin_save_exercise_builder_written_corrections/);
assert.match(renderer, /WritingCorrectionDisplay/);
assert.match(migration, /teacher_correction jsonb/);
assert.match(migration, /review_status = 'approved' then q\.teacher_correction/);

assert.match(learnerNotifications, /assignment_published/);
assert.match(learnerNotifications, /writing_review_published/);
assert.match(learnerNotifications, /learner-notifications/);
assert.match(learnerBell, /loadLearnerUnreadCount/);
assert.match(learnerBell, /attivita\/esercizi#learner-notifications/);
assert.match(learnerNotificationApi, /related_assignment_id/);
assert.match(learnerNotificationMigration, /Nuova attività assegnata/);
assert.match(learnerNotificationMigration, /writing_review_published/);
assert.match(learnerNotificationMigration, /learner_assignment_notification_route/);
assert.match(learnerNotificationMigration, /assignment_resources_refresh_learner_notification/);

assert.match(replay, /Sblocco Replay/);
assert.match(replay, /Me lo ricordavo/);
assert.match(bank, /<VocabularyReplay items=\{items\}/);

console.log('notifications, writing corrections, and Sblocco Replay validation passed');
