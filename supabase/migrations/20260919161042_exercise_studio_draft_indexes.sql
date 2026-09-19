create index exercise_studio_drafts_exercise_idx
  on public.exercise_studio_drafts(exercise_id)
  where exercise_id is not null;

create index exercise_studio_drafts_created_by_idx
  on public.exercise_studio_drafts(created_by)
  where created_by is not null;

create index exercise_studio_drafts_updated_by_idx
  on public.exercise_studio_drafts(updated_by)
  where updated_by is not null;
