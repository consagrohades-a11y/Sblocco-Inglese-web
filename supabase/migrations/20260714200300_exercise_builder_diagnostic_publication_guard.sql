-- Require registered, learner-readable diagnostic codes before publishing.
-- Also provide atomic admin writes for codes and their localized messages.

create or replace function public.exercise_builder_question_diagnostic_code_list(p_question_version_id uuid)
returns table(code text)
language sql
stable
security definer
set search_path = public
as $$
  with source as (
    select diagnostics, content
    from public.exercise_builder_question_versions
    where id = p_question_version_id
  ), codes as (
    select value as code
    from source, jsonb_array_elements_text(coalesce(diagnostics -> 'tested_codes', '[]'::jsonb))
    union
    select nullif(diagnostics ->> 'fallback_error_code', '')
    from source
    union
    select nullif(mapping ->> 'error_code', '')
    from source, jsonb_array_elements(coalesce(diagnostics -> 'answer_error_mappings', '[]'::jsonb)) mapping
    union
    select nullif(option_value ->> 'error_code', '')
    from source, jsonb_array_elements(coalesce(content -> 'options', '[]'::jsonb)) option_value
  )
  select distinct codes.code
  from codes
  where codes.code is not null and trim(codes.code) <> '';
$$;

create or replace function public.validate_exercise_builder_question_for_publication()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_version record;
  v_missing_codes text[];
  v_missing_messages text[];
begin
  if new.status <> 'published' or old.status is not distinct from new.status then
    return new;
  end if;

  select * into v_version
  from public.exercise_builder_question_versions
  where id = new.current_version_id;

  if v_version.id is null then
    raise exception 'Question % has no current version.', new.public_id;
  end if;

  if v_version.question_type = 'content_block' then
    return new;
  end if;

  if not exists (
    select 1 from public.exercise_builder_question_diagnostic_code_list(v_version.id)
  ) then
    raise exception 'Question % requires at least one diagnostic code before publication.', new.public_id;
  end if;

  select array_agg(requested.code order by requested.code)
    into v_missing_codes
  from public.exercise_builder_question_diagnostic_code_list(v_version.id) requested
  left join public.exercise_builder_diagnostic_codes registered
    on registered.code = requested.code and registered.status = 'active'
  where registered.code is null;

  if coalesce(array_length(v_missing_codes, 1), 0) > 0 then
    raise exception 'Question % references unregistered or archived diagnostic codes: %.', new.public_id, array_to_string(v_missing_codes, ', ');
  end if;

  select array_agg(requested.code order by requested.code)
    into v_missing_messages
  from public.exercise_builder_question_diagnostic_code_list(v_version.id) requested
  where not exists (
    select 1
    from public.exercise_builder_diagnostic_messages message
    where message.diagnostic_code = requested.code
      and message.language = 'it'
      and nullif(trim(message.message_text), '') is not null
  );

  if coalesce(array_length(v_missing_messages, 1), 0) > 0 then
    raise exception 'Question % has diagnostic codes without an Italian message: %.', new.public_id, array_to_string(v_missing_messages, ', ');
  end if;

  return new;
end;
$$;

drop trigger if exists exercise_builder_questions_validate_publication on public.exercise_builder_questions;
create trigger exercise_builder_questions_validate_publication
before update of status on public.exercise_builder_questions
for each row execute function public.validate_exercise_builder_question_for_publication();

create or replace function public.admin_save_exercise_builder_diagnostic_code(p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_label text;
  v_primary_skill text;
  v_topic text;
  v_status text;
  v_category text;
  v_severity text;
  v_messages jsonb;
  v_message record;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Diagnostic payload must be an object.'; end if;

  v_code := regexp_replace(upper(trim(coalesce(p_payload ->> 'code', ''))), '[^A-Z0-9_]+', '_', 'g');
  v_label := nullif(trim(p_payload ->> 'label'), '');
  v_primary_skill := nullif(trim(p_payload ->> 'primary_skill'), '');
  v_topic := nullif(trim(p_payload ->> 'topic'), '');
  v_status := coalesce(nullif(p_payload ->> 'status', ''), 'active');
  v_category := coalesce(nullif(p_payload ->> 'category', ''), 'learning');
  v_severity := coalesce(nullif(p_payload ->> 'severity', ''), case when v_category = 'precision' then 'precision' else 'minor' end);
  v_messages := coalesce(p_payload -> 'messages', '{}'::jsonb);

  if v_code = '' then raise exception 'Diagnostic code is required.'; end if;
  if v_label is null or v_primary_skill is null or v_topic is null then
    raise exception 'Label, primary skill, and topic are required.';
  end if;
  if v_status not in ('active', 'archived') then raise exception 'Invalid diagnostic status.'; end if;
  if v_category not in ('learning', 'precision') then raise exception 'Invalid diagnostic category.'; end if;
  if v_severity not in ('precision', 'minor', 'major') then raise exception 'Invalid diagnostic severity.'; end if;
  if v_status = 'active' and not exists (
    select 1
    from jsonb_each_text(v_messages) entry
    where entry.key like 'it:%' and nullif(trim(entry.value), '') is not null
  ) then
    raise exception 'An active diagnostic code requires at least one Italian message.';
  end if;

  insert into public.exercise_builder_diagnostic_codes (
    code, label, primary_skill, topic, subtopic, group_key,
    severity, category, recommended_resources, status, created_by
  ) values (
    v_code, v_label, v_primary_skill, v_topic,
    nullif(trim(p_payload ->> 'subtopic'), ''),
    nullif(trim(p_payload ->> 'group_key'), ''),
    v_severity, v_category,
    case when jsonb_typeof(p_payload -> 'recommended_resources') = 'array' then p_payload -> 'recommended_resources' else '[]'::jsonb end,
    v_status, auth.uid()
  )
  on conflict (code) do update set
    label = excluded.label,
    primary_skill = excluded.primary_skill,
    topic = excluded.topic,
    subtopic = excluded.subtopic,
    group_key = excluded.group_key,
    severity = excluded.severity,
    category = excluded.category,
    recommended_resources = excluded.recommended_resources,
    status = excluded.status;

  delete from public.exercise_builder_diagnostic_messages
  where diagnostic_code = v_code;

  for v_message in
    select split_part(entry.key, ':', 1) language,
           split_part(entry.key, ':', 2) message_level,
           trim(entry.value) message_text
    from jsonb_each_text(v_messages) entry
    where nullif(trim(entry.value), '') is not null
  loop
    if v_message.language not in ('it', 'en')
      or v_message.message_level not in ('reminder', 'weakness', 'subtopic_review', 'topic_review') then
      raise exception 'Invalid diagnostic message key: %:%.', v_message.language, v_message.message_level;
    end if;
    insert into public.exercise_builder_diagnostic_messages (
      diagnostic_code, language, message_level, message_text
    ) values (
      v_code, v_message.language, v_message.message_level, v_message.message_text
    );
  end loop;

  return v_code;
end;
$$;

create or replace function public.admin_save_exercise_builder_diagnostic_rule(p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_key text;
  v_topic text;
  v_status text;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Rule payload must be an object.'; end if;

  v_rule_key := regexp_replace(upper(trim(coalesce(p_payload ->> 'rule_key', ''))), '[^A-Z0-9_]+', '_', 'g');
  v_topic := nullif(trim(p_payload ->> 'topic'), '');
  v_status := coalesce(nullif(p_payload ->> 'status', ''), 'active');

  if v_rule_key = '' or v_topic is null then raise exception 'Rule key and topic are required.'; end if;
  if v_status not in ('active', 'archived') then raise exception 'Invalid rule status.'; end if;
  if jsonb_typeof(p_payload -> 'trigger_config') <> 'object' then raise exception 'Trigger config must be an object.'; end if;
  if jsonb_typeof(p_payload -> 'output_config') <> 'object' then raise exception 'Output config must be an object.'; end if;

  insert into public.exercise_builder_diagnostic_rules (
    rule_key, topic, priority, trigger_config, output_config,
    suppress_specific_messages, status, created_by
  ) values (
    v_rule_key, v_topic, coalesce((p_payload ->> 'priority')::integer, 0),
    p_payload -> 'trigger_config', p_payload -> 'output_config',
    coalesce((p_payload ->> 'suppress_specific_messages')::boolean, true),
    v_status, auth.uid()
  )
  on conflict (rule_key) do update set
    topic = excluded.topic,
    priority = excluded.priority,
    trigger_config = excluded.trigger_config,
    output_config = excluded.output_config,
    suppress_specific_messages = excluded.suppress_specific_messages,
    status = excluded.status;

  return v_rule_key;
end;
$$;

create or replace function public.classify_exercise_builder_learner_diagnostic()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_opportunities := coalesce(new.total_opportunities, 0);
  new.total_errors := coalesce(new.total_errors, 0);
  new.recent_opportunities := coalesce(new.recent_opportunities, 0);
  new.recent_errors := coalesce(new.recent_errors, 0);
  new.error_rate := coalesce(new.error_rate, 0);
  new.recent_error_rate := coalesce(new.recent_error_rate, 0);

  if new.total_opportunities < 3 then
    new.diagnostic_status := 'not_enough_data';
  elsif new.total_opportunities >= 10 and new.error_rate < 0.10 then
    new.diagnostic_status := 'mastered';
  elsif new.recent_opportunities >= 3 and new.recent_error_rate + 0.10 < new.error_rate then
    new.diagnostic_status := 'improving';
    new.last_improved_at := coalesce(new.last_improved_at, now());
  elsif new.error_rate >= 0.50 then
    new.diagnostic_status := 'weakness';
  elsif new.error_rate >= 0.30 then
    new.diagnostic_status := 'emerging_weakness';
  else
    new.diagnostic_status := 'stable';
  end if;
  return new;
end;
$$;

revoke all on function public.exercise_builder_question_diagnostic_code_list(uuid) from public;
revoke all on function public.admin_save_exercise_builder_diagnostic_code(jsonb) from public;
revoke all on function public.admin_save_exercise_builder_diagnostic_rule(jsonb) from public;
grant execute on function public.admin_save_exercise_builder_diagnostic_code(jsonb) to authenticated;
grant execute on function public.admin_save_exercise_builder_diagnostic_rule(jsonb) to authenticated;
