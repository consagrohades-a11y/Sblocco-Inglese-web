-- Accept stable exercise UUIDs and legacy exercise-version UUIDs when saving
-- assignment custom exercises. Always persist the canonical published exercise
-- identity and an approved immutable version.

create or replace function public.admin_replace_assignment_resources(
  target_assignment_id uuid,
  resources jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  resource jsonb;
  config jsonb;
  custom_config jsonb;
  inserted_count integer := 0;
  resource_route text;
  resource_type_value text;
  resource_key_value text;
  resource_title_value text;
  sequence_value integer;
  input_exercise_id uuid;
  input_exercise_version_id uuid;
  canonical_exercise_id uuid;
  canonical_exercise_version_id uuid;
  version_exercise_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if not exists (select 1 from public.assignments where id = target_assignment_id) then
    raise exception 'Assignment not found.';
  end if;

  if resources is null or jsonb_typeof(resources) <> 'array' then
    raise exception 'Resources must be a JSON array.';
  end if;

  delete from public.assignment_resources
  where assignment_id = target_assignment_id;

  for resource in select value from jsonb_array_elements(resources)
  loop
    resource_key_value := nullif(trim(resource ->> 'key'), '');
    resource_type_value := nullif(trim(resource ->> 'type'), '');
    resource_title_value := nullif(trim(resource ->> 'title'), '');
    resource_route := nullif(trim(resource ->> 'route'), '');
    sequence_value := (resource ->> 'sequence_index')::integer;
    config := resource -> 'practice_config';
    custom_config := resource -> 'exercise_config';

    if resource_key_value is null or resource_title_value is null or resource_route is null then
      raise exception 'Every resource requires key, title, and route.';
    end if;

    if resource_type_value not in ('grammar_unit', 'trainer', 'practice_session', 'custom_exercise') then
      raise exception 'Unsupported resource type.';
    end if;

    if resource_route not in (
      '/levels/a1/be-basic-sentences',
      '/levels/a1/present-simple-normal-verbs',
      '/trainers/business-expression',
      '/trainers/general-expression',
      '/trainers/hospitality-expression',
      '/trainers/word-trainer',
      '/practice',
      '/exercises'
    ) then
      raise exception 'Unsupported resource route.';
    end if;

    if sequence_value is null or sequence_value <= 0 then
      raise exception 'Invalid resource sequence.';
    end if;

    if resource_type_value = 'practice_session' then
      if resource_route <> '/practice' or jsonb_typeof(config) <> 'object' then
        raise exception 'Invalid practice session.';
      end if;

      if config ->> 'trainer_id' not in ('word', 'mixed', 'general', 'business', 'hospitality') then
        raise exception 'Invalid practice trainer.';
      end if;

      if coalesce((config ->> 'question_count')::integer, 0) not between 1 and 50 then
        raise exception 'Invalid question count.';
      end if;

      if jsonb_typeof(config -> 'modes') <> 'array' or jsonb_array_length(config -> 'modes') = 0 then
        raise exception 'At least one exercise mode is required.';
      end if;

      if exists (
        select 1
        from jsonb_array_elements_text(config -> 'modes') mode
        where mode not in ('italian_to_english', 'english_to_italian', 'multiple_choice', 'sentence_completion')
      ) then
        raise exception 'Invalid exercise mode.';
      end if;

      custom_config := null;

    elsif resource_type_value = 'custom_exercise' then
      if resource_route <> '/exercises' or jsonb_typeof(custom_config) <> 'object' then
        raise exception 'Invalid custom exercise resource.';
      end if;

      begin
        input_exercise_id := nullif(custom_config ->> 'exercise_id', '')::uuid;
        input_exercise_version_id := nullif(custom_config ->> 'exercise_version_id', '')::uuid;
      exception
        when invalid_text_representation then
          raise exception 'Invalid custom exercise identifiers.';
      end;

      canonical_exercise_id := null;
      canonical_exercise_version_id := null;
      version_exercise_id := null;

      -- New clients send the stable identity UUID. Legacy clients accidentally
      -- send an exercise-version UUID in the exercise_id field.
      select exercise.id
      into canonical_exercise_id
      from public.exercise_builder_exercises exercise
      where exercise.id = input_exercise_id
      limit 1;

      if canonical_exercise_id is null and input_exercise_id is not null then
        select version.exercise_id
        into canonical_exercise_id
        from public.exercise_builder_exercise_versions version
        where version.id = input_exercise_id
        limit 1;
      end if;

      if input_exercise_version_id is not null then
        select version.exercise_id
        into version_exercise_id
        from public.exercise_builder_exercise_versions version
        where version.id = input_exercise_version_id
        limit 1;
      end if;

      if canonical_exercise_id is null then
        canonical_exercise_id := version_exercise_id;
      end if;

      if canonical_exercise_id is null then
        raise exception 'Published Exercise Builder exercise not found.';
      end if;

      if version_exercise_id is not null and version_exercise_id <> canonical_exercise_id then
        raise exception 'Exercise and exercise version do not belong to the same Exercise Builder item.';
      end if;

      -- Prefer the explicitly pinned approved version. When a legacy client sends
      -- a stale or unapproved version, pin the current approved version instead.
      select version.id
      into canonical_exercise_version_id
      from public.exercise_builder_exercises exercise
      join public.exercise_builder_exercise_versions version
        on version.exercise_id = exercise.id
      where exercise.id = canonical_exercise_id
        and exercise.status = 'published'
        and version.review_status = 'approved'
        and (
          version.id = input_exercise_version_id
          or version.id = exercise.current_version_id
        )
      order by case when version.id = input_exercise_version_id then 0 else 1 end
      limit 1;

      if canonical_exercise_version_id is null then
        raise exception 'Published Exercise Builder exercise not found.';
      end if;

      resource_key_value := 'custom-exercise:' || canonical_exercise_id::text;
      custom_config := jsonb_build_object(
        'exercise_id', canonical_exercise_id,
        'exercise_version_id', canonical_exercise_version_id,
        'completion_rule', coalesce(nullif(custom_config ->> 'completion_rule', ''), 'passed'),
        'required_score', greatest(0, least(100, coalesce((custom_config ->> 'required_score')::numeric, 70))),
        'required_attempts', greatest(1, coalesce((custom_config ->> 'required_attempts')::integer, 1)),
        'allow_retry', coalesce((custom_config ->> 'allow_retry')::boolean, true),
        'show_score', coalesce((custom_config ->> 'show_score')::boolean, true),
        'show_correct_answers', coalesce((custom_config ->> 'show_correct_answers')::boolean, true),
        'show_explanations', coalesce((custom_config ->> 'show_explanations')::boolean, true),
        'show_diagnostic_summary', coalesce((custom_config ->> 'show_diagnostic_summary')::boolean, true)
      );
      config := null;

    else
      config := null;
      custom_config := null;
    end if;

    insert into public.assignment_resources (
      assignment_id,
      resource_key,
      resource_type,
      title,
      description,
      route,
      sequence_index,
      practice_config,
      exercise_config
    ) values (
      target_assignment_id,
      resource_key_value,
      resource_type_value,
      resource_title_value,
      nullif(trim(resource ->> 'description'), ''),
      resource_route,
      sequence_value,
      config,
      custom_config
    );

    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.admin_replace_assignment_resources(uuid, jsonb) from public;
grant execute on function public.admin_replace_assignment_resources(uuid, jsonb) to authenticated;
