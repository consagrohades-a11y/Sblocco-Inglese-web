-- Keep Targeted Practice database validation aligned with the exercise engine.

do $$
declare
  v_function_definition text;
  v_updated_definition text;
begin
  select pg_get_functiondef(
    'public.admin_replace_assignment_resources(uuid, jsonb)'::regprocedure
  ) into v_function_definition;

  if position('italian_to_english_multiple_choice' in v_function_definition) = 0 then
    v_updated_definition := replace(
      v_function_definition,
      '''italian_to_english'', ''english_to_italian'', ''multiple_choice'', ''sentence_completion''',
      '''italian_to_english'', ''english_to_italian'', ''multiple_choice'', ''italian_to_english_multiple_choice'', ''sentence_completion'''
    );

    if v_updated_definition = v_function_definition then
      raise exception 'Could not update admin_replace_assignment_resources exercise modes.';
    end if;

    execute v_updated_definition;
  end if;

  select pg_get_functiondef(
    'public.admin_replace_assignment_study_scope(uuid, uuid[], uuid[], text[], boolean)'::regprocedure
  ) into v_function_definition;

  if position('italian_to_english_multiple_choice' in v_function_definition) = 0 then
    v_updated_definition := replace(
      v_function_definition,
      '''italian_to_english'', ''english_to_italian'', ''multiple_choice'', ''sentence_completion''',
      '''italian_to_english'', ''english_to_italian'', ''multiple_choice'', ''italian_to_english_multiple_choice'', ''sentence_completion'''
    );

    if v_updated_definition = v_function_definition then
      raise exception 'Could not update admin_replace_assignment_study_scope exercise modes.';
    end if;

    execute v_updated_definition;
  end if;
end;
$$;

do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select constraint_definition.conname
    from pg_constraint constraint_definition
    where constraint_definition.conrelid = 'public.assignment_study_settings'::regclass
      and constraint_definition.contype = 'c'
      and pg_get_constraintdef(constraint_definition.oid) like '%multiple_choice%'
      and pg_get_constraintdef(constraint_definition.oid) not like '%italian_to_english_multiple_choice%'
  loop
    execute format(
      'alter table public.assignment_study_settings drop constraint %I',
      v_constraint_name
    );
  end loop;
end;
$$;

alter table public.assignment_study_settings
  drop constraint if exists assignment_study_settings_exercise_modes_allowed_check;

alter table public.assignment_study_settings
  add constraint assignment_study_settings_exercise_modes_allowed_check
  check (
    exercise_modes <@ array[
      'italian_to_english',
      'english_to_italian',
      'multiple_choice',
      'italian_to_english_multiple_choice',
      'sentence_completion'
    ]::text[]
  );

notify pgrst, 'reload schema';
