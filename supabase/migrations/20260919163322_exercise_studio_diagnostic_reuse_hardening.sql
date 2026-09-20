do $migration$
declare
  v_definition text;
  v_old text := $old$
        from public.exercise_builder_diagnostic_codes
        where status = 'active'
          and topic = v_topic
          and primary_skill = v_skill
          and coalesce(subtopic, '') = coalesce(v_subtopic, '');
$old$;
  v_new text := $new$
        from public.exercise_builder_diagnostic_codes
        where status = 'active'
          and topic = v_topic
          and primary_skill = v_skill
          and coalesce(subtopic, '') = coalesce(v_subtopic, '')
          and exists (
            select 1
            from public.exercise_builder_diagnostic_messages message
            where message.diagnostic_code = exercise_builder_diagnostic_codes.code
              and message.language = 'it'
              and nullif(trim(message.message_text), '') is not null
          );
$new$;
begin
  select pg_get_functiondef('public.admin_publish_exercise_studio_draft(uuid,jsonb)'::regprocedure)
  into v_definition;

  if position(v_new in v_definition) > 0 then
    return;
  end if;

  if position(v_old in v_definition) = 0 then
    raise exception 'Unexpected Studio publish function definition.';
  end if;

  execute replace(v_definition, v_old, v_new);
end;
$migration$;
