-- Additive per-turn private audio support for dialogue_roleplay questions.

alter table public.exercise_builder_submission_files
  add column if not exists turn_key text;

drop index if exists public.exercise_builder_submission_files_active_question_idx;
create unique index if not exists exercise_builder_submission_files_active_turn_idx
  on public.exercise_builder_submission_files(attempt_question_id, coalesce(turn_key, ''))
  where status = 'active';

alter table public.exercise_builder_attempt_questions
  add column if not exists teacher_turn_reviews jsonb not null default '{}'::jsonb;

alter table public.exercise_builder_attempt_questions
  drop constraint if exists exercise_builder_attempt_questions_teacher_turn_reviews_object;
alter table public.exercise_builder_attempt_questions
  add constraint exercise_builder_attempt_questions_teacher_turn_reviews_object
  check (jsonb_typeof(teacher_turn_reviews) = 'object');

-- Keep the new teacher-authored field under the same admin-only protection as
-- the existing question and attempt review fields. Automatic grading remains
-- writable by the trusted learner-facing RPCs.
create or replace function public.protect_exercise_builder_teacher_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if tg_table_name = 'exercise_builder_attempt_questions' then
      if new.teacher_status_override is distinct from old.teacher_status_override
        or new.teacher_points_override is distinct from old.teacher_points_override
        or new.teacher_comment is distinct from old.teacher_comment
        or new.teacher_turn_reviews is distinct from old.teacher_turn_reviews
        or new.reviewed_by is distinct from old.reviewed_by
        or new.reviewed_at is distinct from old.reviewed_at then
        raise exception 'Teacher review fields are admin-only.';
      end if;
    elsif tg_table_name = 'exercise_builder_attempts' then
      if new.teacher_note is distinct from old.teacher_note
        or new.review_status is distinct from old.review_status
        or new.reviewed_by is distinct from old.reviewed_by
        or new.reviewed_at is distinct from old.reviewed_at then
        raise exception 'Teacher review fields are admin-only.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_exercise_builder_audio_roleplay_version()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_turn jsonb;
  v_key text;
  v_min integer;
  v_max integer;
  v_keys text[] := array[]::text[];
begin
  if new.question_type <> 'dialogue_roleplay'
    or coalesce(new.content ->> 'response_mode', 'written') <> 'audio_per_turn' then
    return new;
  end if;

  if jsonb_typeof(new.content -> 'characters') <> 'array'
    or jsonb_array_length(new.content -> 'characters') < 2 then
    raise exception 'Audio roleplay requires at least two characters.';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(new.content -> 'characters') character
    where coalesce((character ->> 'selectable')::boolean, true)
  ) then
    raise exception 'Audio roleplay requires a selectable learner role.';
  end if;
  if jsonb_typeof(new.content -> 'turns') <> 'array' then
    raise exception 'Audio roleplay requires turns.';
  end if;

  for v_turn in select value from jsonb_array_elements(new.content -> 'turns')
  loop
    v_key := nullif(trim(v_turn ->> 'key'), '');
    if v_key is null then raise exception 'Every audio roleplay turn requires a key.'; end if;
    if v_key = any(v_keys) then raise exception 'Audio roleplay turn keys must be unique.'; end if;
    v_keys := array_append(v_keys, v_key);
    if nullif(trim(v_turn ->> 'speaker'), '') is null or not exists (
      select 1 from jsonb_array_elements(new.content -> 'characters') character
      where character ->> 'key' = v_turn ->> 'speaker'
    ) then raise exception 'Audio roleplay turn speaker must match a character.'; end if;

    if coalesce((v_turn ->> 'learner_response')::boolean, false) then
      v_min := coalesce((v_turn #>> '{constraints,min_seconds}')::integer, 0);
      v_max := coalesce((v_turn #>> '{constraints,max_seconds}')::integer, 35);
      if v_max < 5 then raise exception 'Audio roleplay max_seconds must be at least 5.'; end if;
      if v_min < 0 or v_min > v_max then raise exception 'Audio roleplay min_seconds must not exceed max_seconds.'; end if;
      if jsonb_typeof(coalesce(v_turn #> '{constraints,required_points}', '[]'::jsonb)) <> 'array'
        or jsonb_typeof(coalesce(v_turn #> '{constraints,recommended_language}', '[]'::jsonb)) <> 'array'
        or jsonb_typeof(coalesce(v_turn #> '{constraints,required_language}', '[]'::jsonb)) <> 'array'
        or jsonb_typeof(coalesce(v_turn #> '{constraints,avoid_language}', '[]'::jsonb)) <> 'array' then
        raise exception 'Audio roleplay language constraints must be arrays.';
      end if;
    end if;
  end loop;

  if not exists (
    select 1 from jsonb_array_elements(new.content -> 'turns') turn_item
    where coalesce((turn_item ->> 'learner_response')::boolean, false)
  ) then raise exception 'Audio roleplay requires at least one learner turn.'; end if;

  if coalesce(new.grading ->> 'mode', '') <> 'manual_review' then
    raise exception 'Audio roleplay requires manual_review grading.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_exercise_builder_audio_roleplay_version on public.exercise_builder_question_versions;
create trigger validate_exercise_builder_audio_roleplay_version
before insert or update of question_type, content, grading
on public.exercise_builder_question_versions
for each row execute function public.validate_exercise_builder_audio_roleplay_version();

drop function if exists public.register_exercise_builder_submission_file(uuid, text, text, bigint, numeric);
create or replace function public.register_exercise_builder_submission_file(
  p_attempt_question_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_duration_seconds numeric default null,
  p_turn_key text default null
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
  v_type text;
  v_content jsonb;
  v_turn jsonb;
  v_min_seconds numeric;
  v_max_seconds numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if nullif(trim(p_storage_path), '') is null then raise exception 'Storage path is required.'; end if;
  if nullif(trim(p_mime_type), '') is null or lower(p_mime_type) not like 'audio/%' then
    raise exception 'Only audio files are accepted.';
  end if;
  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 26214400 then
    raise exception 'Audio file size must be between 1 byte and 25 MB.';
  end if;

  select question.id, question.attempt_id, question.question_snapshot,
    attempt.learner_id, attempt.status
  into v_question
  from public.exercise_builder_attempt_questions question
  join public.exercise_builder_attempts attempt on attempt.id = question.attempt_id
  where question.id = p_attempt_question_id and attempt.learner_id = auth.uid()
  for update;

  if v_question.id is null then raise exception 'Attempt question not found.'; end if;
  if v_question.status <> 'in_progress' then raise exception 'Only open attempts accept recordings.'; end if;
  v_type := v_question.question_snapshot ->> 'type';
  v_content := coalesce(v_question.question_snapshot -> 'content', '{}'::jsonb);

  if v_type = 'audio_response' then
    if nullif(trim(p_turn_key), '') is not null then raise exception 'Single audio responses do not accept turn keys.'; end if;
    p_turn_key := null;
  elsif v_type = 'dialogue_roleplay' and v_content ->> 'response_mode' = 'audio_per_turn' then
    p_turn_key := nullif(trim(p_turn_key), '');
    select turn_item into v_turn
    from jsonb_array_elements(v_content -> 'turns') turn_item
    where turn_item ->> 'key' = p_turn_key
      and coalesce((turn_item ->> 'learner_response')::boolean, false);
    if p_turn_key is null or v_turn is null then raise exception 'Invalid audio roleplay turn.'; end if;
    v_min_seconds := coalesce((v_turn #>> '{constraints,min_seconds}')::numeric, 0);
    v_max_seconds := coalesce((v_turn #>> '{constraints,max_seconds}')::numeric, 35);
    if p_duration_seconds is null or p_duration_seconds < v_min_seconds or p_duration_seconds > v_max_seconds then
      raise exception 'Audio roleplay duration must be between % and % seconds.', v_min_seconds, v_max_seconds;
    end if;
  else
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
    and turn_key is not distinct from p_turn_key
    and status = 'active';

  insert into public.exercise_builder_submission_files (
    learner_id, attempt_id, attempt_question_id, turn_key, storage_path,
    mime_type, size_bytes, duration_seconds, status
  ) values (
    auth.uid(), v_question.attempt_id, p_attempt_question_id, p_turn_key, trim(p_storage_path),
    lower(trim(p_mime_type)), p_size_bytes, p_duration_seconds, 'active'
  ) returning id into v_file_id;

  return jsonb_build_object(
    'file_id', v_file_id,
    'turn_key', p_turn_key,
    'storage_bucket', 'exercise-submissions',
    'storage_path', trim(p_storage_path),
    'mime_type', lower(trim(p_mime_type)),
    'size_bytes', p_size_bytes,
    'duration_seconds', p_duration_seconds,
    'uploaded_at', now()
  );
end;
$$;

create or replace function public.exercise_builder_audio_roleplay_answer_complete(
  p_attempt_question_id uuid,
  p_snapshot jsonb,
  p_answer jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_turn jsonb;
  v_file_id uuid;
  v_learner_turns integer := 0;
begin
  if coalesce(p_snapshot ->> 'type', '') <> 'dialogue_roleplay'
    or coalesce(p_snapshot #>> '{content,response_mode}', 'written') <> 'audio_per_turn' then
    return true;
  end if;
  if p_answer is null or jsonb_typeof(p_answer) <> 'object' then return false; end if;
  v_role := nullif(trim(p_answer ->> 'role_key'), '');
  if v_role is null or not exists (
    select 1 from jsonb_array_elements(p_snapshot #> '{content,characters}') character
    where character ->> 'key' = v_role and coalesce((character ->> 'selectable')::boolean, true)
  ) then return false; end if;

  for v_turn in select value from jsonb_array_elements(p_snapshot #> '{content,turns}')
  loop
    if v_turn ->> 'speaker' = v_role and coalesce((v_turn ->> 'learner_response')::boolean, false) then
      v_learner_turns := v_learner_turns + 1;
      if coalesce((v_turn ->> 'required')::boolean, true) then
        begin
          v_file_id := nullif(p_answer #>> array['turns', v_turn ->> 'key', 'file_id'], '')::uuid;
        exception when invalid_text_representation then return false;
        end;
        if v_file_id is null or not exists (
          select 1 from public.exercise_builder_submission_files submission
          where submission.id = v_file_id
            and submission.attempt_question_id = p_attempt_question_id
            and submission.turn_key = v_turn ->> 'key'
            and submission.status = 'active'
        ) then return false; end if;
      end if;
    end if;
  end loop;
  return v_learner_turns > 0;
end;
$$;

create or replace function public.guard_exercise_builder_audio_roleplay_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and exists (
    select 1 from public.exercise_builder_attempt_questions question
    where question.attempt_section_id = new.id
      and not public.exercise_builder_audio_roleplay_answer_complete(question.id, question.question_snapshot, question.answer)
  ) then raise exception 'Complete all required audio roleplay turns before continuing.'; end if;
  return new;
end;
$$;

drop trigger if exists guard_exercise_builder_audio_roleplay_completion on public.exercise_builder_attempt_sections;
create trigger guard_exercise_builder_audio_roleplay_completion
before update of status on public.exercise_builder_attempt_sections
for each row execute function public.guard_exercise_builder_audio_roleplay_completion();

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
  v_snapshot jsonb;
  v_file_id uuid;
  v_role text;
  v_turn_key text;
  v_turn_answer jsonb;
begin
  if not exists (
    select 1 from public.exercise_builder_attempts
    where id = p_attempt_id and learner_id = auth.uid() and status = 'in_progress'
  ) then raise exception 'Open attempt not found.'; end if;

  select question_snapshot into v_snapshot
  from public.exercise_builder_attempt_questions
  where id = p_attempt_question_id and attempt_id = p_attempt_id;
  v_type := v_snapshot ->> 'type';
  if v_type is null then raise exception 'Attempt question not found.'; end if;

  if v_type = 'audio_response' and p_answer is not null and p_answer <> 'null'::jsonb then
    begin v_file_id := nullif(p_answer ->> 'file_id', '')::uuid;
    exception when invalid_text_representation then raise exception 'Invalid audio file reference.'; end;
    if v_file_id is null or not exists (
      select 1 from public.exercise_builder_submission_files file
      where file.id = v_file_id and file.attempt_id = p_attempt_id
        and file.attempt_question_id = p_attempt_question_id
        and file.learner_id = auth.uid() and file.turn_key is null and file.status = 'active'
    ) then raise exception 'Registered audio file not found.'; end if;
  elsif v_type = 'dialogue_roleplay' and v_snapshot #>> '{content,response_mode}' = 'audio_per_turn'
    and p_answer is not null and p_answer <> 'null'::jsonb then
    v_role := nullif(trim(p_answer ->> 'role_key'), '');
    if v_role is null or not exists (
      select 1 from jsonb_array_elements(v_snapshot #> '{content,characters}') character
      where character ->> 'key' = v_role and coalesce((character ->> 'selectable')::boolean, true)
    ) then raise exception 'Select a valid roleplay character.'; end if;
    if jsonb_typeof(coalesce(p_answer -> 'turns', '{}'::jsonb)) <> 'object' then
      raise exception 'Audio roleplay turns must be an object.';
    end if;
    for v_turn_key, v_turn_answer in select key, value from jsonb_each(coalesce(p_answer -> 'turns', '{}'::jsonb))
    loop
      if not exists (
        select 1 from jsonb_array_elements(v_snapshot #> '{content,turns}') turn_item
        where turn_item ->> 'key' = v_turn_key and turn_item ->> 'speaker' = v_role
          and coalesce((turn_item ->> 'learner_response')::boolean, false)
      ) then raise exception 'Invalid learner turn in audio roleplay answer.'; end if;
      begin v_file_id := nullif(v_turn_answer ->> 'file_id', '')::uuid;
      exception when invalid_text_representation then raise exception 'Invalid audio turn file reference.'; end;
      if v_file_id is null or not exists (
        select 1 from public.exercise_builder_submission_files file
        where file.id = v_file_id and file.attempt_id = p_attempt_id
          and file.attempt_question_id = p_attempt_question_id
          and file.learner_id = auth.uid() and file.turn_key = v_turn_key and file.status = 'active'
      ) then raise exception 'Registered audio turn file not found.'; end if;
    end loop;
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

create or replace function public.admin_save_exercise_builder_attempt_turn_reviews(
  p_attempt_id uuid,
  p_reviews jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review jsonb;
  v_question_id uuid;
  v_turn_reviews jsonb;
  v_item record;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if jsonb_typeof(coalesce(p_reviews, '[]'::jsonb)) <> 'array' then raise exception 'Reviews must be an array.'; end if;
  for v_review in select value from jsonb_array_elements(coalesce(p_reviews, '[]'::jsonb))
  loop
    v_question_id := nullif(v_review ->> 'attempt_question_id', '')::uuid;
    v_turn_reviews := coalesce(v_review -> 'turn_reviews', '{}'::jsonb);
    if jsonb_typeof(v_turn_reviews) <> 'object' then raise exception 'Turn reviews must be an object.'; end if;
    select question_snapshot, answer into v_item
    from public.exercise_builder_attempt_questions
    where id = v_question_id and attempt_id = p_attempt_id;
    if v_item.question_snapshot is null then raise exception 'Attempt question not found.'; end if;
    if coalesce(v_item.question_snapshot #>> '{content,response_mode}', '') <> 'audio_per_turn' and v_turn_reviews <> '{}'::jsonb then
      raise exception 'Turn reviews are only supported for audio roleplays.';
    end if;
    if exists (
      select 1 from jsonb_each(v_turn_reviews) review_item
      where not exists (
        select 1 from jsonb_array_elements(v_item.question_snapshot #> '{content,turns}') turn_item
        where turn_item ->> 'key' = review_item.key
          and turn_item ->> 'speaker' = v_item.answer ->> 'role_key'
          and coalesce((turn_item ->> 'learner_response')::boolean, false)
      )
    ) then raise exception 'Turn review references an invalid learner turn.'; end if;
    if exists (
      select 1 from jsonb_each(v_turn_reviews) review_item
      where jsonb_typeof(review_item.value) <> 'object'
        or (review_item.value ? 'status' and review_item.value ->> 'status' not in ('correct', 'nearly_correct', 'incorrect'))
        or (review_item.value ? 'score' and jsonb_typeof(review_item.value -> 'score') <> 'number')
        or (review_item.value ? 'max_score' and jsonb_typeof(review_item.value -> 'max_score') <> 'number')
        or coalesce((review_item.value ->> 'score')::numeric, 0) < 0
        or coalesce((review_item.value ->> 'max_score')::numeric, 0) < 0
        or ((review_item.value ? 'score') and (review_item.value ? 'max_score')
          and (review_item.value ->> 'score')::numeric > (review_item.value ->> 'max_score')::numeric)
    ) then raise exception 'Turn review contains an invalid status or score.'; end if;
    update public.exercise_builder_attempt_questions
    set teacher_turn_reviews = v_turn_reviews
    where id = v_question_id and attempt_id = p_attempt_id;
  end loop;
end;
$$;

-- Learners receive turn feedback only after the review is released.
create or replace function public.exercise_builder_attempt_payload(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'status', a.status, 'attempt_number', a.attempt_number,
      'current_section_index', a.current_section_index, 'current_question_index', a.current_question_index,
      'earned_points', case when a.review_status = 'reviewed' then null else a.earned_points end,
      'max_points', a.max_points,
      'score', case when a.review_status = 'reviewed' then null else a.score end,
      'result_summary', case when a.review_status = 'reviewed' then jsonb_build_object('pending_review', 0, 'review_required', true) else a.result_summary end,
      'review_status', a.review_status,
      'teacher_note', case when a.review_status = 'approved' then a.teacher_note else null end,
      'reviewed_at', case when a.review_status = 'approved' then a.reviewed_at else null end,
      'started_at', a.started_at, 'submitted_at', a.submitted_at
    ),
    'exercise', a.exercise_snapshot,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'sequence_index', s.sequence_index, 'title', s.title,
        'instructions', s.instructions, 'feedback_timing', s.feedback_timing,
        'settings', s.settings, 'status', s.status,
        'earned_points', case when a.review_status = 'reviewed' then null else s.earned_points end,
        'max_points', s.max_points,
        'questions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', q.id, 'sequence_index', q.sequence_index,
            'question', public.exercise_builder_safe_question_snapshot(q.question_snapshot),
            'answer', q.answer,
            'teacher_comment', case when a.review_status = 'approved' then q.teacher_comment else null end,
            'teacher_turn_reviews', case when a.review_status = 'approved' then q.teacher_turn_reviews else '{}'::jsonb end,
            'result', case
              when a.status = 'submitted' then public.exercise_builder_learner_grading_result(q.question_snapshot, case when a.review_status = 'approved' then q.grading_result else coalesce(q.automatic_grading_result, q.grading_result) end)
              when s.status = 'completed' and s.feedback_timing = 'section_end' then public.exercise_builder_learner_grading_result(q.question_snapshot, case when a.review_status = 'approved' then q.grading_result else coalesce(q.automatic_grading_result, q.grading_result) end)
              else null end
          ) order by q.sequence_index)
          from public.exercise_builder_attempt_questions q where q.attempt_section_id = s.id
        ), '[]'::jsonb)
      ) order by s.sequence_index)
      from public.exercise_builder_attempt_sections s where s.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.exercise_builder_attempts a
  where a.id = p_attempt_id and (a.learner_id = auth.uid() or public.is_admin());
$$;

revoke all on function public.register_exercise_builder_submission_file(uuid, text, text, bigint, numeric, text) from public;
revoke all on function public.exercise_builder_audio_roleplay_answer_complete(uuid, jsonb, jsonb) from public;
revoke all on function public.admin_save_exercise_builder_attempt_turn_reviews(uuid, jsonb) from public;
revoke all on function public.save_exercise_builder_answer(uuid, uuid, jsonb, integer, integer) from public;
grant execute on function public.register_exercise_builder_submission_file(uuid, text, text, bigint, numeric, text) to authenticated;
grant execute on function public.admin_save_exercise_builder_attempt_turn_reviews(uuid, jsonb) to authenticated;
grant execute on function public.save_exercise_builder_answer(uuid, uuid, jsonb, integer, integer) to authenticated;

notify pgrst, 'reload schema';
