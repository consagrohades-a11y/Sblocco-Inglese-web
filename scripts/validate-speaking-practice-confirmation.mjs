import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260926130000_speaking_practice_confirmation.sql', 'utf8');
const api = readFileSync('src/lib/adminSpeakingActivitiesApi.js', 'utf8');
const presenter = readFileSync('src/pages/SpeakingActivityPresenter.jsx', 'utf8');
const controller = readFileSync('src/components/admin/SpeakingLiveController.jsx', 'utf8');
const library = readFileSync('src/pages/AdminSpeakingActivities.jsx', 'utf8');

for (const fragment of [
  'create table if not exists public.admin_speaking_practice_events',
  'admin_confirm_speaking_practice',
  'admin_undo_latest_speaking_practice',
  'admin_get_speaking_item_history_v2',
  'admin_get_speaking_practice_catalog',
  'undone_at is null',
  'enable row level security',
  'if not public.is_admin()',
]) {
  if (!migration.includes(fragment)) throw new Error('Practice migration is missing: ' + fragment);
}

if (migration.includes('insert into public.admin_speaking_practice_events') && migration.includes('select usage.') && migration.includes('from public.admin_speaking_item_usage usage')) {
  const insertIndex = migration.indexOf('insert into public.admin_speaking_practice_events');
  const selectUsageIndex = migration.indexOf('select usage.', insertIndex);
  if (selectUsageIndex > insertIndex && selectUsageIndex < migration.indexOf('create or replace function public.admin_get_speaking_item_history_v2')) {
    throw new Error('Legacy shown history must not be backfilled as confirmed practice.');
  }
}

for (const fragment of [
  'confirmSpeakingPractice',
  'undoLatestSpeakingPractice',
  'loadSpeakingPracticeCatalog',
]) {
  if (!api.includes(fragment)) throw new Error('Speaking API is missing: ' + fragment);
}

if (!presenter.includes('sessionId: sessionId || null') || !presenter.includes('recent_practice_count')) {
  throw new Error('Presenter state must expose its live session and prefer confirmed-practice history.');
}
if (!controller.includes('Done & next') || !controller.includes('Skip') || !controller.includes('Undo practice')) {
  throw new Error('Teacher controller must expose Done & next, Skip and Undo practice.');
}
if (!library.includes('unpractisedOnly') || !library.includes('findMatchingSpeakingItems')) {
  throw new Error('Speaking library must support learner-specific unpractised item discovery.');
}

console.log('Speaking confirmed-practice validation passed.');
