-- Compatibility fields required by the visual Question Editor.

alter table public.exercise_builder_question_versions
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.exercise_builder_question_versions
  drop constraint if exists exercise_builder_question_versions_media_check;
alter table public.exercise_builder_question_versions
  add constraint exercise_builder_question_versions_media_check
  check (jsonb_typeof(media) = 'array');
