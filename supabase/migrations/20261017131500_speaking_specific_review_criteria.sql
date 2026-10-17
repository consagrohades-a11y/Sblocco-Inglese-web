-- Keep writing corrections backward compatible while adding speaking-only review criteria.
-- No changes to audio cleanup, transcript storage or scoring.
CREATE OR REPLACE FUNCTION public.admin_save_exercise_builder_written_corrections(p_attempt_id uuid, p_corrections jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item jsonb;
  v_question_id uuid;
  v_correction jsonb;
  v_snapshot jsonb;
  v_speech_transcript text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if jsonb_typeof(coalesce(p_corrections, '[]'::jsonb)) <> 'array' then
    raise exception 'Corrections must be an array.';
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_corrections, '[]'::jsonb))
  loop
    v_question_id := nullif(v_item ->> 'attempt_question_id', '')::uuid;
    v_correction := coalesce(v_item -> 'correction', '{}'::jsonb);

    select question_snapshot, speech_transcript
      into v_snapshot, v_speech_transcript
    from public.exercise_builder_attempt_questions
    where id = v_question_id
      and attempt_id = p_attempt_id
    for update;

    if v_snapshot is null then
      raise exception 'Attempt question not found.';
    end if;

    if jsonb_typeof(v_correction) <> 'object' then
      raise exception 'Writing correction must be an object.';
    end if;

    if v_correction <> '{}'::jsonb
      and coalesce(v_snapshot ->> 'type', '') not in ('written_response', 'audio_response') then
      raise exception 'Visual corrections are supported only for writing and speaking responses.';
    end if;

    if v_correction <> '{}'::jsonb
      and v_snapshot ->> 'type' = 'audio_response'
      and nullif(btrim(coalesce(v_speech_transcript, '')), '') is null then
      raise exception 'Save a transcript before correcting a speaking response.';
    end if;

    if (v_correction ? 'corrected_text')
      and jsonb_typeof(v_correction -> 'corrected_text') <> 'string' then
      raise exception 'corrected_text must be a string.';
    end if;

    if (v_correction ? 'summary')
      and jsonb_typeof(v_correction -> 'summary') <> 'string' then
      raise exception 'summary must be a string.';
    end if;

    if (v_correction ? 'reasons')
      and jsonb_typeof(v_correction -> 'reasons') <> 'array' then
      raise exception 'reasons must be an array.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(coalesce(v_correction -> 'reasons', '[]'::jsonb)) reason
      where jsonb_typeof(reason) <> 'object'
        or (reason ? 'original' and jsonb_typeof(reason -> 'original') <> 'string')
        or (reason ? 'corrected' and jsonb_typeof(reason -> 'corrected') <> 'string')
        or (reason ? 'reason' and jsonb_typeof(reason -> 'reason') <> 'string')
        or (reason ? 'category' and (
          jsonb_typeof(reason -> 'category') <> 'string'
          or reason ->> 'category' not in (
            'grammar', 'vocabulary', 'spelling', 'punctuation',
            'style', 'clarity', 'register', 'structure', 'naturalness', 'other'
          )
        ))
        or (reason ? 'kind' and (
          jsonb_typeof(reason -> 'kind') <> 'string'
          or reason ->> 'kind' not in ('error', 'improvement')
        ))
    ) then
      raise exception 'Writing correction reasons are invalid.';
    end if;

    if v_correction ? 'speaking_feedback' then
      if coalesce(v_snapshot ->> 'type', '') <> 'audio_response'
         or jsonb_typeof(v_correction -> 'speaking_feedback') <> 'object' then
        raise exception 'Speaking feedback is allowed only for speaking responses.';
      end if;

      if exists (
        select 1
        from jsonb_each(v_correction -> 'speaking_feedback') feedback
        where feedback.key not in (
          'pronunciation', 'fluency', 'task_fulfilment',
          'strengths', 'priority', 'next_step'
        )
          or jsonb_typeof(feedback.value) <> 'string'
          or length(feedback.value #>> '{}') > 1200
      ) then
        raise exception 'Speaking feedback fields are invalid.';
      end if;
    end if;

    update public.exercise_builder_attempt_questions
    set teacher_correction = v_correction,
        reviewed_by = auth.uid(),
        reviewed_at = case when v_correction <> '{}'::jsonb then now() else reviewed_at end
    where id = v_question_id
      and attempt_id = p_attempt_id;
  end loop;
end;
$function$
