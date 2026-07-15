-- Private audio submissions for Exercise Builder manual speaking tasks.

create table if not exists public.exercise_builder_submission_files (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid not null references public.exercise_builder_attempts(id) on delete cascade,
  attempt_question_id uuid not null references public.exercise_builder_attempt_questions(id) on delete cascade,
  storage_bucket text not null default 'exercise-submissions',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  duration_seconds numeric(8,2) check (duration_seconds is null or duration_seconds > 0),
  status text not null default 'active' check (status in ('active', 'replaced', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists exercise_builder_submission_files_active_question_idx
  on public.exercise_builder_submission_files(attempt_question_id)
  where status = 'active';
create index if not exists exercise_builder_submission_files_attempt_idx
  on public.exercise_builder_submission_files(attempt_id, created_at desc);

alter table public.exercise_builder_submission_files enable row level security;

drop policy if exists exercise_builder_submission_files_admin_all on public.exercise_builder_submission_files;
create policy exercise_builder_submission_files_admin_all
on public.exercise_builder_submission_files
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists exercise_builder_submission_files_learner_select on public.exercise_builder_submission_files;
create policy exercise_builder_submission_files_learner_select
on public.exercise_builder_submission_files
for select to authenticated
using (learner_id = auth.uid());

grant select on public.exercise_builder_submission_files to authenticated;

create or replace function public.register_exercise_builder_submission_file(
  p_attempt_question_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_duration_seconds numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question record;
  v_file_id uuid;
  v_expected_prefix text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if nullif(trim(p_storage_path), '') is null then raise exception 'Storage path is required.'; end if;
  if nullif(trim(p_mime_type), '') is null or lower(p_mime_type) not like 'audio/%' then
    raise exception 'Only audio files are accepted.';
  end if;
  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 26214400 then
    raise exception 'Audio file size must be between 1 byte and 25 MB.';
  end if;

  select
    question.id,
    question.attempt_id,
    question.question_snapshot,
    attempt.learner_id,
    attempt.status
  into v_question
  from public.exercise_builder_attempt_questions question
  join public.exercise_builder_attempts attempt on attempt.id = question.attempt_id
  where question.id = p_attempt_question_id
    and attempt.learner_id = auth.uid()
  for update;

  if v_question.id is null then raise exception 'Attempt question not found.'; end if;
  if v_question.status <> 'in_progress' then raise exception 'Only open attempts accept recordings.'; end if;
  if v_question.question_snapshot ->> 'type' <> 'audio_response' then
    raise exception 'This question does not accept an audio recording.';
  end if;

  v_expected_prefix := auth.uid()::text || '/' || v_question.attempt_id::text || '/' || p_attempt_question_id::text || '/';
  if left(trim(p_storage_path), length(v_expected_prefix)) <> v_expected_prefix then
    raise exception 'Invalid audio storage path.';
  end if;

  update public.exercise_builder_submission_files
  set status = 'replaced', updated_at = now()
  where attempt_question_id = p_attempt_question_id
    and learner_id = auth.uid()
    and status = 'active';

  insert into public.exercise_builder_submission_files (
    learner_id, attempt_id, attempt_question_id, storage_path,
    mime_type, size_bytes, duration_seconds, status
  ) values (
    auth.uid(), v_question.attempt_id, p_attempt_question_id, trim(p_storage_path),
    lower(trim(p_mime_type)), p_size_bytes, p_duration_seconds, 'active'
  ) returning id into v_file_id;

  return jsonb_build_object(
    'file_id', v_file_id,
    'storage_bucket', 'exercise-submissions',
    'storage_path', trim(p_storage_path),
    'mime_type', lower(trim(p_mime_type)),
    'size_bytes', p_size_bytes,
    'duration_seconds', p_duration_seconds
  );
end;
$$;

-- Validate that audio answers reference a file owned by the learner and linked
-- to the same attempt question. Other answer types preserve their current flow.
create or replace function public.save_exercise_builder_answer(
  p_attempt_id uuid,
  p_attempt_question_id uuid,
  p_answer jsonb,
  p_current_section_index integer,
  p_current_question_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_file_id uuid;
begin
  if not exists (
    select 1 from public.exercise_builder_attempts
    where id = p_attempt_id and learner_id = auth.uid() and status = 'in_progress'
  ) then raise exception 'Open attempt not found.'; end if;

  select question_snapshot ->> 'type'
  into v_type
  from public.exercise_builder_attempt_questions
  where id = p_attempt_question_id and attempt_id = p_attempt_id;
  if v_type is null then raise exception 'Attempt question not found.'; end if;

  if v_type = 'audio_response' and p_answer is not null and p_answer <> 'null'::jsonb then
    begin
      v_file_id := nullif(p_answer ->> 'file_id', '')::uuid;
    exception
      when invalid_text_representation then raise exception 'Invalid audio file reference.';
    end;
    if v_file_id is null or not exists (
      select 1
      from public.exercise_builder_submission_files file
      where file.id = v_file_id
        and file.attempt_id = p_attempt_id
        and file.attempt_question_id = p_attempt_question_id
        and file.learner_id = auth.uid()
        and file.status = 'active'
    ) then raise exception 'Registered audio file not found.'; end if;
  end if;

  update public.exercise_builder_attempt_questions
  set answer = p_answer,
      answered_at = case when p_answer is null or p_answer = 'null'::jsonb then answered_at else now() end
  where id = p_attempt_question_id and attempt_id = p_attempt_id;

  update public.exercise_builder_attempts
  set current_section_index = greatest(0, p_current_section_index),
      current_question_index = greatest(0, p_current_question_index)
  where id = p_attempt_id;

  return public.exercise_builder_attempt_payload(p_attempt_id);
end;
$$;

revoke all on function public.register_exercise_builder_submission_file(uuid, text, text, bigint, numeric) from public;
revoke all on function public.save_exercise_builder_answer(uuid, uuid, jsonb, integer, integer) from public;
grant execute on function public.register_exercise_builder_submission_file(uuid, text, text, bigint, numeric) to authenticated;
grant execute on function public.save_exercise_builder_answer(uuid, uuid, jsonb, integer, integer) to authenticated;

-- Supabase Storage exists in production and local Supabase. The conditional
-- block keeps plain-PostgreSQL migration validation compatible.
do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'exercise-submissions',
      'exercise-submissions',
      false,
      26214400,
      array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']::text[]
    )
    on conflict (id) do update set
      public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists exercise_submission_objects_insert on storage.objects';
    execute 'create policy exercise_submission_objects_insert on storage.objects for insert to authenticated with check (
      bucket_id = ''exercise-submissions''
      and (storage.foldername(name))[1] = auth.uid()::text
    )';

    execute 'drop policy if exists exercise_submission_objects_select on storage.objects';
    execute 'create policy exercise_submission_objects_select on storage.objects for select to authenticated using (
      bucket_id = ''exercise-submissions''
      and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
    )';

    execute 'drop policy if exists exercise_submission_objects_update on storage.objects';
    execute 'create policy exercise_submission_objects_update on storage.objects for update to authenticated using (
      bucket_id = ''exercise-submissions''
      and (storage.foldername(name))[1] = auth.uid()::text
    ) with check (
      bucket_id = ''exercise-submissions''
      and (storage.foldername(name))[1] = auth.uid()::text
    )';

    execute 'drop policy if exists exercise_submission_objects_delete on storage.objects';
    execute 'create policy exercise_submission_objects_delete on storage.objects for delete to authenticated using (
      bucket_id = ''exercise-submissions''
      and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
    )';
  end if;
end
$$;
