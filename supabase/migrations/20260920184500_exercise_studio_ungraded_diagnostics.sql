-- Learning Studio: keep ungraded learner activity out of diagnostic evidence.
-- practice_selection deliberately returns grading status "ungraded"; this state
-- must never be inserted into exercise_builder_diagnostic_events and Studio
-- publishing must not auto-create diagnostics for ungraded questions.

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.record_exercise_builder_attempt_diagnostics(uuid)'::regprocedure)
    into v_definition;

  if position(
    'if coalesce(v_question.grading_result ->> ''status'', ''unanswered'') in (''pending_review'', ''ungraded'') then'
    in v_definition
  ) = 0 then
    if position(
      'if coalesce(v_question.grading_result ->> ''status'', ''unanswered'') = ''pending_review'' then'
      in v_definition
    ) = 0 then
      raise exception 'Unexpected record_exercise_builder_attempt_diagnostics definition.';
    end if;

    execute replace(
      v_definition,
      'if coalesce(v_question.grading_result ->> ''status'', ''unanswered'') = ''pending_review'' then',
      'if coalesce(v_question.grading_result ->> ''status'', ''unanswered'') in (''pending_review'', ''ungraded'') then'
    );
  end if;
end;
$$;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.admin_publish_exercise_studio_draft(uuid,jsonb)'::regprocedure)
    into v_definition;

  if position(
    'if coalesce(v_question #>> ''{grading,mode}'', ''automatic'') = ''ungraded'' then'
    in v_definition
  ) = 0 then
    if position(
      'if v_question ->> ''type'' <> ''content_block'' then'
      in v_definition
    ) = 0 then
      raise exception 'Unexpected admin_publish_exercise_studio_draft definition.';
    end if;

    execute replace(
      v_definition,
      'if v_question ->> ''type'' <> ''content_block'' then',
      'if coalesce(v_question #>> ''{grading,mode}'', ''automatic'') = ''ungraded'' then
      v_diagnostics := jsonb_build_object(
        ''tested_codes'', ''[]''::jsonb,
        ''fallback_error_code'', null
      );
    elsif v_question ->> ''type'' <> ''content_block'' then'
    );
  end if;
end;
$$;

do $fix$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.assert_exercise_builder_question_version_publishable(uuid)'::regprocedure)
    into v_definition;

  if position(
    'if v_version.question_type in (''content_block'', ''practice_selection'') then return; end if;'
    in v_definition
  ) = 0 then
    if position(
      'if v_version.question_type = ''content_block'' then return; end if;'
      in v_definition
    ) = 0 then
      raise exception 'Unexpected assert_exercise_builder_question_version_publishable definition.';
    end if;

    execute replace(
      v_definition,
      'if v_version.question_type = ''content_block'' then return; end if;',
      'if v_version.question_type in (''content_block'', ''practice_selection'') then return; end if;'
    );
  end if;
end;
$fix$;

notify pgrst, 'reload schema';
