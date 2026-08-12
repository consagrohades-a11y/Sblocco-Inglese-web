-- Align the Curriculum v2 runtime catalogue with the source-controlled outcome schema
-- before any outcome rows are synchronized into production.

alter table public.recovery_curriculum_outcomes
  drop constraint recovery_curriculum_outcomes_status_check,
  add constraint recovery_curriculum_outcomes_status_check
    check (status in ('draft', 'approved', 'deprecated'));

alter table public.recovery_curriculum_outcomes
  drop constraint recovery_curriculum_outcomes_cefr_target_check,
  add constraint recovery_curriculum_outcomes_cefr_target_check
    check (cefr_target in ('A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2'));

notify pgrst, 'reload schema';
