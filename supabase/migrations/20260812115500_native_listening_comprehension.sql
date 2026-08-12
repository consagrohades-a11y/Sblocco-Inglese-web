-- Native listening comprehension for Exercise Builder schema v2.
-- Reuses the established per-item reading-comprehension grading model while
-- keeping listening as a first-class immutable question type.

alter table public.exercise_builder_question_versions
  drop constraint if exists exercise_builder_question_versions_question_type_check;
alter table public.exercise_builder_question_versions
  add constraint exercise_builder_question_versions_question_type_check
  check (question_type in (
    'multiple_choice',
    'multiple_select',
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

-- Learner snapshots for listening use the same item sanitisation as reading:
-- correct flags and accepted answers are removed, while the audio metadata is
-- retained for playback. Transcript visibility remains a learner-renderer rule.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.exercise_builder_safe_question_snapshot(jsonb)'::regprocedure)
    into v_definition;

  if position('elsif v_type in (''reading_comprehension'', ''listening_comprehension'') then' in v_definition) = 0 then
    if position('elsif v_type = ''reading_comprehension'' then' in v_definition) = 0 then
      raise exception 'Unexpected exercise_builder_safe_question_snapshot definition.';
    end if;
    v_definition := replace(
      v_definition,
      'elsif v_type = ''reading_comprehension'' then',
      'elsif v_type in (''reading_comprehension'', ''listening_comprehension'') then'
    );
    execute v_definition;
  end if;
end;
$$;

-- Listening comprehension is automatically graded item-by-item with the same
-- stable MCQ / multi-select / true-false / short-answer engine used by reading.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.exercise_builder_grade_answer(jsonb,jsonb)'::regprocedure)
    into v_definition;

  if position('elsif v_type in (''reading_comprehension'', ''listening_comprehension'') then' in v_definition) = 0 then
    if position('elsif v_type = ''reading_comprehension'' then' in v_definition) = 0 then
      raise exception 'Unexpected exercise_builder_grade_answer definition.';
    end if;
    v_definition := replace(
      v_definition,
      'elsif v_type = ''reading_comprehension'' then',
      'elsif v_type in (''reading_comprehension'', ''listening_comprehension'') then'
    );
    execute v_definition;
  end if;
end;
$$;

-- The visual/import save path is versioned through the legacy implementation.
-- Extend its whitelist and reuse its comprehension-item checks, but require an
-- audio source rather than a reading passage for listening questions.
do $$
declare
  v_definition text;
  v_old_types text := '''dialogue_choice'', ''written_response'', ''dialogue_roleplay'', ''audio_response'', ''reading_comprehension''';
  v_new_types text := '''dialogue_choice'', ''written_response'', ''dialogue_roleplay'', ''audio_response'', ''reading_comprehension'', ''listening_comprehension''';
  v_old_branch text := 'elsif v_type = ''reading_comprehension'' then';
  v_new_branch text := 'elsif v_type in (''reading_comprehension'', ''listening_comprehension'') then';
  v_old_passage text := 'if nullif(trim(v_content ->> ''passage''), '''') is null then raise exception ''Reading comprehension requires a passage.''; end if;';
  v_new_passage text := 'if v_type = ''reading_comprehension'' and nullif(trim(v_content ->> ''passage''), '''') is null then raise exception ''Reading comprehension requires a passage.''; elsif v_type = ''listening_comprehension'' and (jsonb_typeof(v_content -> ''audio'') <> ''object'' or (nullif(trim(v_content #>> ''{audio,url}''), '''') is null and nullif(trim(v_content #>> ''{audio,storage_path}''), '''') is null)) then raise exception ''Listening comprehension requires an audio url or storage_path.''; end if;';
begin
  select pg_get_functiondef('public.admin_save_exercise_builder_question_version_legacy(uuid,jsonb)'::regprocedure)
    into v_definition;

  if position('''listening_comprehension''' in v_definition) = 0 then
    if position(v_old_types in v_definition) = 0
      or position(v_old_branch in v_definition) = 0
      or position(v_old_passage in v_definition) = 0 then
      raise exception 'Unexpected admin_save_exercise_builder_question_version_legacy definition.';
    end if;
    v_definition := replace(v_definition, v_old_types, v_new_types);
    v_definition := replace(v_definition, v_old_branch, v_new_branch);
    v_definition := replace(v_definition, v_old_passage, v_new_passage);
    v_definition := replace(v_definition, 'Every reading item requires a key, prompt, and supported type.', 'Every comprehension item requires a key, prompt, and supported type.');
    execute v_definition;
  end if;
end;
$$;

notify pgrst, 'reload schema';
