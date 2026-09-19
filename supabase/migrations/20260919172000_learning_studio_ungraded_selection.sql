-- Learning Studio: add an explicitly ungraded selection question type.
-- This is used for vocabulary/self-selection tasks where the learner's choice
-- is saved but must never be scored as correct/incorrect or create diagnostics.
-- Options may also carry dormant vocabulary-bank metadata for a future bank UI.

alter table public.exercise_builder_question_versions
  drop constraint if exists exercise_builder_question_versions_question_type_check;
alter table public.exercise_builder_question_versions
  add constraint exercise_builder_question_versions_question_type_check
  check (question_type in (
    'multiple_choice',
    'multiple_select',
    'practice_selection',
    'gap_fill',
    'select_gap',
    'translation',
    'error_correction',
    'word_order',
    'content_block',
    'dialogue_choice',
    'written_response',
    'dialogue_roleplay',
    'audio_response',
    'reading_comprehension',
    'listening_comprehension'
  ));

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.exercise_builder_safe_question_snapshot(jsonb)'::regprocedure)
    into v_definition;

  if position('if v_type in (''multiple_choice'', ''multiple_select'', ''dialogue_choice'') then' in v_definition) = 0 then
    raise exception 'Unexpected exercise_builder_safe_question_snapshot definition.';
  end if;

  execute replace(
    v_definition,
    'if v_type in (''multiple_choice'', ''multiple_select'', ''dialogue_choice'') then',
    'if v_type = ''practice_selection'' then
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      ''key'', value->>''key'',
      ''text'', value->>''text'',
      ''vocab_bank'', coalesce((value->>''vocab_bank'')::boolean, false),
      ''vocab_kind'', case when value->>''vocab_kind'' in (''word'', ''chunk'') then value->>''vocab_kind'' else null end
    ))), ''[]''::jsonb)
      into v_options
    from jsonb_array_elements(coalesce(v_content -> ''options'', ''[]''::jsonb));
    v_content := v_content || jsonb_build_object(''options'', v_options);
  elsif v_type in (''multiple_choice'', ''multiple_select'', ''dialogue_choice'') then'
  );
end;
$$;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.exercise_builder_grade_answer(jsonb,jsonb)'::regprocedure)
    into v_definition;

  if position('if v_type = ''content_block'' then' in v_definition) = 0 then
    raise exception 'Unexpected exercise_builder_grade_answer definition.';
  end if;

  execute replace(
    v_definition,
    'if v_type = ''content_block'' then',
    'if v_type = ''practice_selection'' then
    if p_answer is null or p_answer = ''null''::jsonb or p_answer = ''""''::jsonb or p_answer = ''{}''::jsonb or p_answer = ''[]''::jsonb then
      return jsonb_build_object(
        ''status'', ''unanswered'',
        ''earned_points'', 0,
        ''max_points'', 0,
        ''correct_answer'', null,
        ''ungraded'', true
      );
    end if;
    return jsonb_build_object(
      ''status'', ''ungraded'',
      ''earned_points'', 0,
      ''max_points'', 0,
      ''correct_answer'', null,
      ''ungraded'', true
    );
  elsif v_type = ''content_block'' then'
  );
end;
$$;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.admin_save_exercise_builder_question_version_legacy(uuid,jsonb)'::regprocedure)
    into v_definition;

  if position('''multiple_choice'', ''multiple_select'', ''gap_fill'', ''select_gap'',' in v_definition) = 0
    or position('if v_type in (''multiple_choice'', ''multiple_select'', ''dialogue_choice'') then' in v_definition) = 0
    or position('if v_type <> ''content_block'' and coalesce(jsonb_array_length(v_diagnostics -> ''tested_codes''), 0) < 1 then' in v_definition) = 0 then
    raise exception 'Unexpected admin_save_exercise_builder_question_version_legacy definition.';
  end if;

  v_definition := replace(
    v_definition,
    '''multiple_choice'', ''multiple_select'', ''gap_fill'', ''select_gap'',',
    '''multiple_choice'', ''multiple_select'', ''practice_selection'', ''gap_fill'', ''select_gap'','
  );

  v_definition := replace(
    v_definition,
    'if v_type in (''multiple_choice'', ''multiple_select'', ''dialogue_choice'') then',
    'if v_type in (''multiple_choice'', ''multiple_select'', ''practice_selection'', ''dialogue_choice'') then'
  );

  v_definition := replace(
    v_definition,
    'if v_type <> ''content_block'' and coalesce(jsonb_array_length(v_diagnostics -> ''tested_codes''), 0) < 1 then',
    'if v_type = ''practice_selection'' then
    v_grading := v_grading || jsonb_build_object(
      ''mode'', ''ungraded'',
      ''weight'', 0,
      ''nearly_correct_multiplier'', 0
    );
  end if;

  if v_type not in (''content_block'', ''practice_selection'') and coalesce(jsonb_array_length(v_diagnostics -> ''tested_codes''), 0) < 1 then'
  );

  execute v_definition;
end;
$$;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.validate_exercise_builder_question_for_publication()'::regprocedure)
    into v_definition;

  if position('if v_version.question_type = ''content_block'' then' in v_definition) = 0 then
    raise exception 'Unexpected validate_exercise_builder_question_for_publication definition.';
  end if;

  execute replace(
    v_definition,
    'if v_version.question_type = ''content_block'' then',
    'if v_version.question_type in (''content_block'', ''practice_selection'') then'
  );
end;
$$;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.submit_exercise_builder_attempt(uuid)'::regprocedure)
    into v_definition;

  if position('when ''ungraded'' then' in lower(v_definition)) = 0 then
    if position('when ''pending_review'' then v_pending := v_pending + 1;' in v_definition) = 0 then
      raise exception 'Unexpected submit_exercise_builder_attempt definition.';
    end if;

    execute replace(
      v_definition,
      'when ''pending_review'' then v_pending := v_pending + 1;',
      'when ''pending_review'' then v_pending := v_pending + 1;
      when ''ungraded'' then null;'
    );
  end if;
end;
$$;
