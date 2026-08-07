import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260807113000_assignment_display_order.sql', 'utf8');
const adminAssignments = readFileSync('src/pages/AdminAssignments.jsx', 'utf8');
const adminDetail = readFileSync('src/pages/AdminLearnerDetail.jsx', 'utf8');
const learnerAssignments = readFileSync('src/pages/LearnerAssignments.jsx', 'utf8');
const learnerAccount = readFileSync('src/pages/Account.jsx', 'utf8');
const learnerProgress = readFileSync('src/pages/LearnerProgress.jsx', 'utf8');

assert.match(migration, /add column if not exists display_order integer not null default 0/i);
assert.match(migration, /create or replace function public\.admin_reorder_learner_assignments/i);
assert.match(migration, /assignment\.status <> 'archived'/i);
assert.match(migration, /grant execute on function public\.admin_reorder_learner_assignments\(uuid, uuid\[\]\) to authenticated/i);
assert.match(adminAssignments, /assignment\.status === 'archived' && statusFilter !== 'archived'/);
assert.match(adminDetail, /assignment\.status !== 'archived'/);
assert.match(adminDetail, /supabase\.rpc\('admin_reorder_learner_assignments'/);

for (const learnerPage of [learnerAssignments, learnerAccount, learnerProgress]) {
  assert.match(learnerPage, /display_order/);
  assert.match(learnerPage, /\.order\('display_order', \{ ascending: true \}\)/);
}

console.log('Assignment ordering validation passed.');
