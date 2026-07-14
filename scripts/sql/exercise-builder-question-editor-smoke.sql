\set ON_ERROR_STOP on

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$;

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'admin@example.test')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role, status)
values ('00000000-0000-0000-0000-000000000001', 'CI Admin', 'admin', 'active')
on conflict (id) do update set role = 'admin', status = 'active';

do $$
declare
  v_first jsonb;
  v_second jsonb;
  v_pool jsonb;
  v_question_id uuid;
  v_version_one uuid;
  v_version_two uuid;
  v_pool_version_id uuid;
  v_base_payload jsonb;
begin
  v_base_payload := jsonb_build_object(
    'question_type', 'multiple_choice',
    'title', 'Question editor smoke',
    'prompt', 'Choose version one.',
    'instructions', 'Scegli la risposta corretta.',
    'instruction_language', 'it',
    'level', 'A1',
    'topic', 'smoke_test',
    'subtopic', 'question_editor',
    'primary_skill', 'grammar',
    'learning_objective', 'Validate question versioning.',
    'difficulty', 'standard',
    'content', jsonb_build_object(
      'options', jsonb_build_array(
        jsonb_build_object('key', 'a', 'text', 'Correct', 'is_correct', true),
        jsonb_build_object('key', 'b', 'text', 'Incorrect', 'is_correct', false, 'error_code', 'SPELLING')
      )
    ),
    'grading', jsonb_build_object('weight', 1, 'nearly_correct_multiplier', 0.5),
    'feedback', jsonb_build_object('correct', 'Correct.', 'incorrect', 'Try again.'),
    'diagnostics', jsonb_build_object(
      'tested_codes', jsonb_build_array('SPELLING'),
      'fallback_error_code', 'SPELLING',
      'answer_error_mappings', '[]'::jsonb
    ),
    'tags', jsonb_build_array('smoke', 'question-editor'),
    'media', '[]'::jsonb
  );

  v_first := public.admin_save_exercise_builder_question_version(null, v_base_payload);
  v_question_id := (v_first ->> 'id')::uuid;
  v_version_one := (v_first ->> 'version_id')::uuid;

  update public.exercise_builder_question_versions
  set review_status = 'approved'
  where id = v_version_one;
  update public.exercise_builder_questions
  set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = v_question_id;

  v_pool := public.admin_save_exercise_builder_pool_version(
    null,
    jsonb_build_object(
      'title', 'Question editor pinned pool',
      'level', 'A1',
      'topic', 'smoke_test',
      'primary_skill', 'grammar'
    ),
    jsonb_build_array(
      jsonb_build_object(
        'question_id', v_question_id,
        'question_version_id', v_version_one,
        'pinned', false,
        'sequence_index', 1
      )
    )
  );
  v_pool_version_id := (v_pool ->> 'version_id')::uuid;

  v_second := public.admin_save_exercise_builder_question_version(
    v_question_id,
    v_base_payload || jsonb_build_object('prompt', 'Choose version two.')
  );
  v_version_two := (v_second ->> 'version_id')::uuid;

  if v_version_one = v_version_two then
    raise exception 'Question editor did not create a new version.';
  end if;
  if (v_second ->> 'version_number')::integer <> 2 then
    raise exception 'Question editor did not increment the version number.';
  end if;
  if not exists (
    select 1 from public.exercise_builder_questions
    where id = v_question_id
      and current_version_id = v_version_two
      and status = 'draft'
  ) then
    raise exception 'Question identity does not point to the new draft version.';
  end if;
  if not exists (
    select 1 from public.exercise_builder_pool_questions
    where pool_version_id = v_pool_version_id
      and question_id = v_question_id
      and question_version_id = v_version_one
  ) then
    raise exception 'Existing pool membership changed after editing the question.';
  end if;
  if not exists (
    select 1 from public.exercise_builder_question_versions
    where id = v_version_one and prompt = 'Choose version one.'
  ) then
    raise exception 'Historical question version was modified.';
  end if;
end;
$$;
