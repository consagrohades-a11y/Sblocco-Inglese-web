do $migration$
declare
  v_definition text;
  v_patched text;
begin
  select pg_get_functiondef('public.record_exercise_builder_attempt_diagnostics(uuid)'::regprocedure)
  into v_definition;

  if position('grading_result ->> ''status'', ''unanswered'') = ''pending_review''' in v_definition) > 0 then
    return;
  end if;

  v_patched := regexp_replace(
    v_definition,
    'where aq\.attempt_id = p_attempt_id[[:space:]]+loop[[:space:]]+for v_code in',
    E'where aq.attempt_id = p_attempt_id\n  loop\n    -- Do not turn a provisional manual-review state into learner diagnostic evidence.\n    if coalesce(v_question.grading_result ->> ''status'', ''unanswered'') = ''pending_review'' then\n      continue;\n    end if;\n\n    for v_code in',
    ''
  );

  if v_patched = v_definition then
    raise exception 'Unexpected diagnostic recorder definition.';
  end if;

  execute v_patched;
end;
$migration$;
