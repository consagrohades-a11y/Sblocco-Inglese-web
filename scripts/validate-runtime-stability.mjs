import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const main = read('src/main.js');
const boundary = read('src/components/AppErrorBoundary.jsx');
const teacherBell = read('src/components/admin/AdminNotificationBell.jsx');
const adminNotifications = read('src/pages/AdminNotifications.jsx');
const learnerBell = read('src/components/learner/LearnerNotificationBell.jsx');
const learnerNotifications = read('src/components/learner/LearnerNotificationsPanel.jsx');
const migration = read('supabase/migrations/20260924083600_replace_exercise_diagnostics_with_learning_signals.sql');
const learnerRealtimeMigration = read('supabase/migrations/20260924095200_enable_learner_notifications_realtime.sql');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(!main.includes('recoverFromStaleChunk'), 'Stale chunks must not trigger the old automatic recovery path.');
assert(!main.includes('window.location.reload();\n}'), 'main.js must not auto-reload the page on chunk failure.');
assert(main.includes('showChunkRecoveryNotice'), 'Chunk failures must surface a controlled recovery notice.');
assert(main.includes('AppErrorBoundary'), 'The app root must be protected against render-time white screens.');
assert(boundary.includes('Ricarica questa pagina'), 'Render recovery must give the user an explicit manual recovery action.');
assert(boundary.includes('Vai al Command Center'), 'Admin recovery must provide a stable destination.');

for (const [source, label] of [
  [teacherBell, 'admin notification bell'],
  [adminNotifications, 'admin notification center'],
  [learnerBell, 'learner notification bell'],
  [learnerNotifications, 'learner notification panel'],
]) {
  assert(!source.includes('setInterval'), `${label} must not poll in the background.`);
  assert(source.includes('visibilitychange'), `${label} must refresh safely when the tab becomes visible.`);
}

assert(migration.includes('$function$;\n\nrevoke all on function public.admin_get_learner_learning_signals'), 'Learning Signals migration function definition must be replayable from scratch.');
assert(learnerRealtimeMigration.includes('supabase_realtime'), 'Learner notifications must be enabled for realtime delivery.');

console.log('Runtime stability validation passed: no forced reloads, no notification polling, and migration replay is guarded.');
