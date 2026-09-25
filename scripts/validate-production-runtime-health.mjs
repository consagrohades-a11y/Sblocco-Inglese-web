import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const media = read('src/components/exercises/ExerciseMediaBlock.jsx');
const adminBell = read('src/components/admin/AdminNotificationBell.jsx');
const adminNotifications = read('src/pages/AdminNotifications.jsx');
const learnerBell = read('src/components/learner/LearnerNotificationBell.jsx');
const learnerNotifications = read('src/components/learner/LearnerNotificationsPanel.jsx');
const speakingApi = read('src/lib/adminSpeakingActivitiesApi.js');
const diagnosticsApi = read('src/lib/exerciseDiagnosticsApi.js');
const radar = read('src/components/admin/TeacherRadar.jsx');
const pulse = read('src/components/admin/LearnerLearningPulse.jsx');
const main = read('src/main.js');
const versionGuard = read('src/lib/appVersionGuard.js');
const versionApi = read('api/version.js');
const viteConfig = read('vite.config.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(media.includes('SIGNED_URL_REFRESH_MS'), 'Studio media must renew private signed URLs before they expire.');
assert(media.includes('onError={recoverPlayback}'), 'Audio/video playback must recover by requesting a fresh signed URL.');
assert(media.includes('setSigningRevision'), 'Media renewal must be able to re-sign an existing object without remounting the page.');

for (const [source, label] of [
  [adminBell, 'admin notification bell'],
  [adminNotifications, 'admin notification center'],
  [learnerBell, 'learner notification bell'],
  [learnerNotifications, 'learner notification panel'],
]) {
  assert(source.includes('session?.access_token'), `${label} must not query Supabase without an active access token.`);
}

assert(speakingApi.includes('refreshSession'), 'Speaking session close must retry after refreshing auth when a 401 occurs.');
assert(!diagnosticsApi.includes('get_exercise_builder_learner_diagnostics'), 'Retired learner diagnostic RPC must not remain callable from the current client.');
assert(!diagnosticsApi.includes('admin_rebuild_exercise_builder_diagnostics'), 'Retired diagnostic rebuild RPC must not remain callable from the current client.');

assert(radar.includes('Promise.allSettled'), 'Teacher Radar must survive a failure in one optional data source.');
assert(pulse.includes('Promise.allSettled'), 'Learning Pulse must render available data when one source fails.');
assert(learnerNotifications.includes('Promise.allSettled'), 'Learner notifications must not fail because milestone data is unavailable.');

assert(viteConfig.includes('__SBLOCCO_BUILD_SHA__'), 'The client build must carry its deployment version.');
assert(versionApi.includes('VERCEL_GIT_COMMIT_SHA'), 'The server must expose the current deployment version.');
assert(versionGuard.includes("fetch('/api/version'"), 'Open tabs must check whether their bundle is stale.');
assert(main.includes('installAppVersionGuard(showChunkRecoveryNotice)'), 'Stale tabs must surface the existing manual update notice.');
assert(!versionGuard.includes('window.location.reload'), 'Version detection must never reload the page automatically.');

console.log('Production runtime health validation passed.');
