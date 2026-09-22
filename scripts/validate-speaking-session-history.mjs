import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

const migration = read('supabase/migrations/20260922153000_speaking_session_history_no_repeat.sql');
const presenter = read('src/pages/SpeakingActivityPresenter.jsx');
const library = read('src/pages/AdminSpeakingActivities.jsx');
const api = read('src/lib/adminSpeakingActivitiesApi.js');

for (const token of [
  'create table if not exists public.admin_speaking_sessions',
  'create table if not exists public.admin_speaking_item_usage',
  'alter table public.admin_speaking_sessions enable row level security',
  'alter table public.admin_speaking_item_usage enable row level security',
  'revoke all on table public.admin_speaking_sessions from public, anon, authenticated',
  'revoke all on table public.admin_speaking_item_usage from public, anon, authenticated',
  'admin_start_speaking_session',
  'admin_record_speaking_item',
  'admin_get_speaking_item_history',
  'admin_get_speaking_activity_history',
  'admin_finish_speaking_session',
]) {
  assert.ok(migration.includes(token), `Missing speaking history migration guard: ${token}`);
}

assert.ok(api.includes('startSpeakingSession'), 'Speaking API must start tracked sessions.');
assert.ok(api.includes('recordSpeakingItem'), 'Speaking API must record shown items.');
assert.ok(api.includes('loadSpeakingItemHistory'), 'Speaking API must load per-item learner history.');
assert.ok(api.includes('loadSpeakingActivityHistory'), 'Speaking API must load per-activity learner history.');
assert.ok(api.includes('finishSpeakingSession'), 'Speaking API must finish sessions best-effort.');

assert.ok(presenter.includes('RECENT_ITEM_DAYS = 60'), 'Presenter must define the recent-item no-repeat window.');
assert.ok(presenter.includes('freshUnseen'), 'Random selection must prefer fresh unseen items.');
assert.ok(presenter.includes('recent_use_count'), 'Presenter must use recent learner history.');
assert.ok(presenter.includes('recordSpeakingItem'), 'Presenter must persist each shown item.');
assert.ok(presenter.includes('startSpeakingSession'), 'Presenter must create a session when a learner is selected.');
assert.ok(presenter.includes('finishSpeakingSession'), 'Presenter must finish tracked sessions on cleanup.');

assert.ok(library.includes('loadSpeakingActivityHistory'), 'Launcher must load learner activity history.');
assert.ok(library.includes('Smart no-repeat'), 'Launcher must explain smart no-repeat before opening the presenter.');
assert.ok(library.includes('items_seen'), 'Launcher must show prior item usage for the selected learner.');
assert.ok(library.includes('requestIdleCallback'), 'Speaking library must defer expensive similarity analysis until after first paint.');
assert.ok(library.includes('setSimilarityByActivity'), 'Similarity diagnostics must be populated asynchronously.');
assert.ok(!library.includes('const similarityByActivity = useMemo(() =>'), 'Speaking library must not block initial render with eager similarity analysis.');

console.log('Speaking session history and no-repeat validation passed.');
