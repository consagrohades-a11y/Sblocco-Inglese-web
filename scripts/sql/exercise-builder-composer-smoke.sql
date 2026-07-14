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
  v_question_id uuid := gen_random_uuid();
  v_question_version_id uuid := gen_random_uuid();
  v_pool jsonb;
  v_exercise jsonb;
  v_pool_id uuid;
  v_pool_version_id uuid;
  v_exercise_id uuid;
  v_exercise_version_id uuid;
  v_detail jsonb;
begin
  insert into public.exercise_builder_questions (
    id, public_id, status, created_by
  ) values (
    v_question_id, 'Q-99001', 'draft', auth.uid()
  );

  insert into public.exercise_builder_question_versions (
    id, question_id, version_number, question_type, title, prompt,
    instructions, instruction_language, level, topic, subtopic,
    primary_skill, learning_objective, difficulty, content, grading,
    feedback, diagnostics, tags, media, review_status, created_by
  ) values (
    v_question_version_id,
    v_question_id,
    1,
    'multiple_choice',
    'Composer smoke question',
    'Choose the correct answer.',
    'Scegli la risposta corretta.',
    'it',
    'A1',
    'smoke_test',
    'composer',
    'grammar',
    'Validate the visual composer transaction.',
    'standard',
    jsonb_build_object(
      'options', jsonb_build_array(
        jsonb_build_object('key', 'a', 'text', 'Correct', 'is_correct', true),
        jsonb_build_object('key', 'b', 'text', 'Incorrect', 'is_correct', false, 'error_code', 'SPELLING')
      )
    ),
    jsonb_build_object('weight', 1, 'nearly_correct_multiplier', 0.5),
    jsonb_build_object('correct', 'Correct.', 'incorrect', 'Review the answer.'),
    jsonb_build_object('tested_codes', jsonb_build_array('SPELLING'), 'fallback_error_code', 'SPELLING'),
    array['smoke', 'composer'],
    '[]'::jsonb,
    'approved',
    auth.uid()
  );

  update public.exercise_builder_questions
  set current_version_id = v_question_version_id,
      status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  where id = v_question_id;

  v_pool := public.admin_save_exercise_builder_pool_version(
    null,
    jsonb_build_object(
      'title', 'Composer smoke pool',
      'description', 'Pool created by CI smoke test.',
      'level', 'A1',
      'topic', 'smoke_test',
      'primary_skill', 'grammar',
      'tags', jsonb_build_array('smoke'),
      'selection_defaults', jsonb_build_object('selection_strategy', 'balanced')
    ),
    jsonb_build_array(
      jsonb_build_object(
        'question_id', v_question_id,
        'question_version_id', v_question_version_id,
        'pinned', false,
        'sequence_index', 1
      )
    )
  );

  v_pool_id := (v_pool ->> 'id')::uuid;
  v_pool_version_id := (v_pool ->> 'version_id')::uuid;

  v_exercise := public.admin_save_exercise_builder_exercise_version(
    null,
    jsonb_build_object(
      'title', 'Composer smoke exercise',
      'description', 'Exercise created by CI smoke test.',
      'instructions', 'Complete the exercise.',
      'instruction_language', 'it',
      'level', 'A1',
      'topic', 'smoke_test',
      'estimated_minutes', 5,
      'settings', jsonb_build_object(
        'display_mode', 'one_at_a_time',
        'show_score', true,
        'show_correct_answers', true,
        'show_explanations', true,
        'show_diagnostic_summary', true,
        'allow_retry', true
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'title', 'Mixed smoke section',
        'instructions', 'Complete both sources.',
        'selection_mode', 'mixed',
        'feedback_timing', 'section_end',
        'fixed_questions', jsonb_build_array(
          jsonb_build_object(
            'question_id', v_question_id,
            'question_version_id', v_question_version_id
          )
        ),
        'pool_rules', jsonb_build_array(
          jsonb_build_object(
            'pool_id', v_pool_id,
            'pool_version_id', v_pool_version_id,
            'question_count', 1,
            'selection_strategy', 'balanced',
            'filters', '{}'::jsonb,
            'distribution_rules', '{}'::jsonb
          )
        )
      )
    )
  );

  v_exercise_id := (v_exercise ->> 'id')::uuid;
  v_exercise_version_id := (v_exercise ->> 'version_id')::uuid;

  if not exists (
    select 1
    from public.exercise_builder_section_fixed_questions fixed
    join public.exercise_builder_sections section on section.id = fixed.section_id
    where section.exercise_version_id = v_exercise_version_id
      and fixed.question_version_id = v_question_version_id
  ) then
    raise exception 'Composer smoke test did not pin the fixed question version.';
  end if;

  if not exists (
    select 1
    from public.exercise_builder_section_pool_rules rule
    join public.exercise_builder_sections section on section.id = rule.section_id
    where section.exercise_version_id = v_exercise_version_id
      and rule.pool_version_id = v_pool_version_id
  ) then
    raise exception 'Composer smoke test did not pin the pool version.';
  end if;

  v_detail := public.admin_get_exercise_builder_exercise_detail(v_exercise_id);
  if v_detail is null or jsonb_array_length(v_detail -> 'sections') <> 1 then
    raise exception 'Composer detail RPC did not return the saved section.';
  end if;

  perform public.admin_set_exercise_builder_status('exercise', v_exercise_id, 'published');
  if not exists (
    select 1 from public.exercise_builder_exercises
    where id = v_exercise_id and status = 'published'
  ) then
    raise exception 'Composer smoke exercise was not published.';
  end if;
end;
$$;
