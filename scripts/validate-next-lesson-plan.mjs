import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260806100000_learner_next_lessons.sql', 'utf8');
const api = readFileSync('src/lib/nextLessonApi.js', 'utf8');
const adminPage = readFileSync('src/pages/AdminLearnerDetail.jsx', 'utf8');
const learnerPage = readFileSync('src/pages/LearnerAssignments.jsx', 'utf8');

assert.match(migration, /create table if not exists public\.learner_next_lessons/);
assert.match(migration, /learner_id = auth\.uid\(\) or public\.is_admin\(\)/);
assert.match(migration, /learner_next_lessons_admin_insert/);
assert.match(migration, /learner_next_lessons_admin_update/);
assert.match(migration, /learner_next_lessons_admin_delete/);
assert.match(migration, /char_length\(trim\(plan\)\) between 1 and 5000/);
assert.match(api, /upsert/);
assert.match(api, /onConflict: 'learner_id'/);
assert.match(adminPage, /LearnerNextLessonPanel/);
assert.match(learnerPage, /LearnerNextLessonCard/);

console.log('Next lesson plan validation passed.');
