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
const progressMigration = read('supabase/migrations/20260922211221_assignment_progress_completion_percent.sql');
const assignmentsPage = read('src/pages/AdminAssignments.jsx');
const adminNotifications = read('src/pages/AdminNotifications.jsx');
const teacherNotificationApi = read('src/lib/teacherNotificationsApi.js');
const smartArchiveMigration = read('supabase/migrations/20260922214549_smart_notification_archive.sql');
const openedReviewMigration = read('supabase/migrations/20260922214924_archive_opened_learner_reviews.sql');
const exercisePlayer = read('src/pages/ExercisePlayerV2.jsx');

assert.match(shell, /AdminNotificationBell/);
assert.match(bell, /setInterval\(refresh, 15000\)/);
assert.match(bell, /markAllTeacherNotificationsRead/);
assert.match(bell, /setUnreadCount\(0\)/);
assert.doesNotMatch(bell, /subscribeToTeacherNotifications/);

assert.match(results, /WritingCorrectionWorkspace/);
const writingWorkspace = read('src/components/exercises/WritingCorrectionWorkspace.jsx');
assert.match(writingWorkspace, /Seleziona il testo/);
assert.match(writingWorkspace, /Versione finale/);
assert.match(writingWorkspace, /Vista studente/);
assert.match(writingWorkspace, /Annulla ultima/);
assert.match(writingWorkspace, /Correzioni create/);
assert.match(results, /Aggiorna correzione pubblicata/);
assert.match(results, /Revisione pronta/);
assert.match(results, /Pubblicata allo studente/);
assert.match(results, /Pubblica risultati allo studente/);
assert.match(resultsApi, /admin_save_exercise_builder_written_corrections/);
assert.match(renderer, /WritingCorrectionDisplay/);
assert.match(migration, /teacher_correction jsonb/);
assert.match(migration, /review_status = 'approved' then q\.teacher_correction/);

assert.match(learnerNotifications, /assignment_published/);
assert.match(learnerNotifications, /writing_review_published/);
assert.match(learnerNotifications, /learner-notifications/);
assert.match(learnerBell, /loadLearnerUnreadCount/);
assert.match(learnerBell, /markAllLearnerNotificationsRead/);
assert.match(learnerBell, /setUnreadCount\(0\)/);
assert.match(learnerBell, /attivita\/esercizi#learner-notifications/);
assert.match(learnerNotificationApi, /related_assignment_id/);
assert.match(learnerNotificationApi, /archived_at/);
assert.match(learnerNotificationApi, /archiveLearnerNotification/);
assert.match(learnerNotificationApi, /archiveLearnerReviewNotificationsForAttempt/);
assert.match(learnerNotifications, /Archivio/);
assert.match(adminNotifications, /Archivio notifiche/);
assert.match(teacherNotificationApi, /archived_at/);
assert.match(smartArchiveMigration, /archive_resolved_exercise_submission_notification/);
assert.match(smartArchiveMigration, /notification_type <> 'learner_signed_up'/);
assert.match(openedReviewMigration, /archive_learner_review_notifications_for_attempt/);
assert.match(exercisePlayer, /archiveLearnerReviewNotificationsForAttempt/);
assert.match(learnerNotificationMigration, /Nuova attività assegnata/);
assert.match(learnerNotificationMigration, /writing_review_published/);
assert.match(learnerNotificationMigration, /learner_assignment_notification_route/);
assert.match(learnerNotificationMigration, /assignment_resources_refresh_learner_notification/);
assert.match(progressMigration, /'progress_percent'/);
assert.match(progressMigration, /v_state in \('completed', 'review'\) then 100/);
assert.match(assignmentsPage, /learner_progress_percent/);
assert.match(assignmentsPage, /Consegnata · da revisionare/);

assert.match(replay, /Sblocco Replay/);
assert.match(replay, /Me lo ricordavo/);
assert.match(bank, /<VocabularyReplay items=\{items\}/);

console.log('notifications, writing corrections, and Sblocco Replay validation passed');
