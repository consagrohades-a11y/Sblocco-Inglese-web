-- Manual smoke test for assignment custom exercise reference compatibility.
-- Do not apply as a migration.

begin;

-- Expected setup:
-- 1. an admin session
-- 2. a published Exercise Builder exercise with an approved current version
-- 3. a draft assignment
--
-- Call admin_replace_assignment_resources twice:
-- - once with the stable exercise UUID in exercise_id
-- - once with the exercise-version UUID in exercise_id
-- Both calls must persist the same canonical exercise_id and approved version ID.

rollback;
