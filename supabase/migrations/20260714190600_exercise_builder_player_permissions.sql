-- Keep answer keys and full reviewed snapshots behind the assigned-player RPCs.

revoke all on function public.exercise_builder_full_question_snapshot(uuid) from public;
revoke all on function public.exercise_builder_safe_question_snapshot(jsonb) from public;
revoke all on function public.exercise_builder_grade_answer(jsonb, jsonb) from public;
revoke all on function public.exercise_builder_normalize_answer(text) from public;

-- These helpers are invoked internally by SECURITY DEFINER functions owned by the
-- migration role. They intentionally receive no browser-facing grant.
