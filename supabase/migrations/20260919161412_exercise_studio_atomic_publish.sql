alter table public.exercise_studio_drafts
  add column publication_map jsonb not null default '{}'::jsonb
    check (jsonb_typeof(publication_map) = 'object'),
  add column last_published_at timestamptz;

create or replace function public.admin_publish_exercise_studio_draft(
  p_draft_id uuid,
  p_runtime jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.exercise_studio_drafts%rowtype;
  v_exercise jsonb;
  v_section jsonb;
  v_question jsonb;
  v_question_payload jsonb;
  v_question_result jsonb;
  v_exercise_result jsonb;
  v_diagnostics jsonb;
  v_tested_codes jsonb;
  v_diag_code text;
  v_diag_count integer;
  v_existing_question_id uuid;
  v_block_id text;
  v_index integer := 0;
  v_fixed_questions jsonb := '[]'::jsonb;
  v_sections jsonb;
  v_next_map jsonb := '{}'::jsonb;
  v_topic text;
  v_skill text;
  v_subtopic text;
  v_diag_label text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select *
  into v_draft
  from public.exercise_studio_drafts
  where id = p_draft_id
  for update;

  if v_draft.id is null then
    raise exception 'Studio draft not found.';
  end if;

  if p_runtime is null
    or jsonb_typeof(p_runtime) <> 'object'
    or p_runtime ->> 'entity_type' <> 'exercise'
    or jsonb_typeof(p_runtime -> 'exercise') <> 'object' then
    raise exception 'Invalid Studio runtime payload.';
  end if;

  v_exercise := p_runtime -> 'exercise';

  if jsonb_typeof(v_exercise -> 'sections') <> 'array'
    or jsonb_array_length(v_exercise -> 'sections') <> 1 then
    raise exception 'Studio v1 publishes exactly one ordered section.';
  end if;

  v_section := v_exercise -> 'sections' -> 0;

  if jsonb_typeof(v_section -> 'questions') <> 'array'
    or jsonb_array_length(v_section -> 'questions') = 0 then
    raise exception 'A Studio activity requires at least one block.';
  end if;

  if jsonb_array_length(v_section -> 'questions')
      <> jsonb_array_length(coalesce(v_draft.document -> 'blocks', '[]'::jsonb)) then
    raise exception 'Studio runtime does not match the saved draft block structure.';
  end if;

  for v_question in
    select value
    from jsonb_array_elements(v_section -> 'questions')
  loop
    v_block_id := nullif(v_draft.document -> 'blocks' -> v_index ->> 'id', '');
    if v_block_id is null then
      raise exception 'Studio block % has no stable ID.', v_index + 1;
    end if;

    v_existing_question_id := null;
    begin
      v_existing_question_id := nullif(v_draft.publication_map #>> array[v_block_id, 'question_id'], '')::uuid;
    exception when invalid_text_representation then
      v_existing_question_id := null;
    end;

    v_diagnostics := case
      when jsonb_typeof(v_question -> 'diagnostics') = 'object'
        then v_question -> 'diagnostics'
      else '{}'::jsonb
    end;

    if v_question ->> 'type' <> 'content_block' then
      v_tested_codes := case
        when jsonb_typeof(v_diagnostics -> 'tested_codes') = 'array'
          then v_diagnostics -> 'tested_codes'
        else '[]'::jsonb
      end;

      if jsonb_array_length(v_tested_codes) = 0 then
        v_topic := coalesce(nullif(trim(v_question ->> 'topic'), ''), nullif(trim(v_draft.topic), ''), 'general_english');
        v_skill := coalesce(nullif(trim(v_question ->> 'primary_skill'), ''), 'grammar');
        v_subtopic := nullif(trim(v_question ->> 'subtopic'), '');

        select count(*), min(code)
        into v_diag_count, v_diag_code
        from public.exercise_builder_diagnostic_codes
        where status = 'active'
          and topic = v_topic
          and primary_skill = v_skill
          and coalesce(subtopic, '') = coalesce(v_subtopic, '');

        if v_diag_count <> 1 then
          v_diag_code := regexp_replace(
            upper(
              'STUDIO_AUTO_' || v_topic || '_' ||
              coalesce(v_subtopic || '_', '') || v_skill
            ),
            '[^A-Z0-9_]+',
            '_',
            'g'
          );

          v_diag_label := initcap(replace(coalesce(v_subtopic, v_topic), '_', ' '))
            || ' — ' || initcap(replace(v_skill, '_', ' '));

          perform public.admin_save_exercise_builder_diagnostic_code(
            jsonb_build_object(
              'code', v_diag_code,
              'label', v_diag_label,
              'primary_skill', v_skill,
              'topic', v_topic,
              'subtopic', v_subtopic,
              'group_key', coalesce(v_subtopic, v_topic),
              'severity', 'minor',
              'category', 'learning',
              'status', 'active',
              'messages', jsonb_build_object(
                'it:reminder', 'Rivedi ' || lower(replace(coalesce(v_subtopic, v_topic), '_', ' ')) || ': controlla con attenzione questo punto prima di riprovare.',
                'it:weakness', 'Questo punto va rinforzato: rivedi ' || lower(replace(coalesce(v_subtopic, v_topic), '_', ' ')) || ' e poi riprova con nuovi esempi.'
              )
            )
          );
        end if;

        v_diagnostics := jsonb_set(
          v_diagnostics,
          '{tested_codes}',
          jsonb_build_array(v_diag_code),
          true
        );
      end if;
    end if;

    v_question_payload := jsonb_build_object(
      'schema_version', 2,
      'question_type', v_question ->> 'type',
      'title', v_question ->> 'title',
      'prompt', v_question ->> 'prompt',
      'instructions', v_question ->> 'instructions',
      'instruction_language', coalesce(v_question ->> 'instruction_language', 'it'),
      'level', v_question ->> 'level',
      'topic', v_question ->> 'topic',
      'subtopic', v_question ->> 'subtopic',
      'primary_skill', v_question ->> 'primary_skill',
      'learning_objective', v_question ->> 'learning_objective',
      'difficulty', coalesce(v_question ->> 'difficulty', 'standard'),
      'content', coalesce(v_question -> 'content', '{}'::jsonb),
      'grading', coalesce(v_question -> 'grading', '{}'::jsonb),
      'feedback', coalesce(v_question -> 'feedback', '{}'::jsonb),
      'diagnostics', v_diagnostics,
      'tags', coalesce(v_question -> 'tags', '[]'::jsonb),
      'media', coalesce(v_question -> 'media', '[]'::jsonb)
    );

    v_question_result := public.admin_save_exercise_builder_question_version(
      v_existing_question_id,
      v_question_payload
    );

    v_fixed_questions := v_fixed_questions || jsonb_build_array(
      jsonb_build_object(
        'question_id', v_question_result ->> 'id',
        'question_version_id', v_question_result ->> 'version_id',
        'sequence_index', v_index + 1
      )
    );

    v_next_map := jsonb_set(
      v_next_map,
      array[v_block_id],
      jsonb_build_object(
        'question_id', v_question_result ->> 'id',
        'question_version_id', v_question_result ->> 'version_id',
        'question_version_number', v_question_result -> 'version_number'
      ),
      true
    );

    v_index := v_index + 1;
  end loop;

  v_sections := jsonb_build_array(
    jsonb_build_object(
      'title', coalesce(v_section ->> 'title', v_exercise ->> 'title'),
      'instructions', v_section ->> 'instructions',
      'selection_mode', 'fixed',
      'feedback_timing', coalesce(v_section ->> 'feedback_timing', 'question_end'),
      'settings', coalesce(v_section -> 'settings', '{}'::jsonb),
      'fixed_questions', v_fixed_questions,
      'pool_rules', '[]'::jsonb
    )
  );

  v_exercise_result := public.admin_save_exercise_builder_exercise_version(
    v_draft.exercise_id,
    jsonb_build_object(
      'title', v_exercise ->> 'title',
      'description', v_exercise ->> 'description',
      'instructions', v_exercise ->> 'instructions',
      'instruction_language', coalesce(v_exercise ->> 'instruction_language', 'it'),
      'level', v_exercise ->> 'level',
      'topic', v_exercise ->> 'topic',
      'estimated_minutes', v_exercise -> 'estimated_minutes',
      'settings', coalesce(v_exercise -> 'settings', '{}'::jsonb),
      'foundation_links', coalesce(v_exercise -> 'foundation_links', '[]'::jsonb)
    ),
    v_sections
  );

  perform public.admin_set_exercise_builder_status(
    'exercise',
    (v_exercise_result ->> 'id')::uuid,
    'published'
  );

  update public.exercise_studio_drafts
  set exercise_id = (v_exercise_result ->> 'id')::uuid,
      publication_map = v_next_map,
      status = 'published',
      document = jsonb_set(document, '{status}', '"published"'::jsonb, true),
      updated_by = auth.uid(),
      updated_at = now(),
      last_published_at = now()
  where id = p_draft_id;

  return jsonb_build_object(
    'draft_id', p_draft_id,
    'exercise_id', v_exercise_result ->> 'id',
    'public_id', v_exercise_result ->> 'public_id',
    'version_id', v_exercise_result ->> 'version_id',
    'version_number', v_exercise_result -> 'version_number',
    'published_at', now(),
    'publication_map', v_next_map
  );
end;
$$;

revoke all on function public.admin_publish_exercise_studio_draft(uuid, jsonb) from public;
revoke all on function public.admin_publish_exercise_studio_draft(uuid, jsonb) from anon;
grant execute on function public.admin_publish_exercise_studio_draft(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
