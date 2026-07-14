-- Diagnostic taxonomy import/export support and safe Exercise Builder deletion actions.

create or replace function public.admin_import_exercise_builder_diagnostic_taxonomy(
  p_payload jsonb,
  p_conflict_mode text default 'update'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codes jsonb;
  v_rules jsonb;
  v_item jsonb;
  v_code text;
  v_rule_key text;
  v_messages jsonb;
  v_message_pair record;
  v_language_pair record;
  v_trigger jsonb;
  v_output jsonb;
  v_output_code text;
  v_exists boolean;
  v_created_codes integer := 0;
  v_updated_codes integer := 0;
  v_skipped_codes integer := 0;
  v_created_rules integer := 0;
  v_updated_rules integer := 0;
  v_skipped_rules integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Taxonomy payload must be a JSON object.';
  end if;
  if coalesce((p_payload ->> 'schema_version')::integer, 0) <> 1 then
    raise exception 'Unsupported diagnostic taxonomy schema version.';
  end if;
  if coalesce(p_payload ->> 'entity_type', '') <> 'diagnostic_taxonomy' then
    raise exception 'entity_type must be diagnostic_taxonomy.';
  end if;
  if p_conflict_mode not in ('update', 'skip') then
    raise exception 'Conflict mode must be update or skip.';
  end if;

  v_codes := coalesce(p_payload -> 'codes', '[]'::jsonb);
  v_rules := coalesce(p_payload -> 'rules', '[]'::jsonb);
  if jsonb_typeof(v_codes) <> 'array' or jsonb_typeof(v_rules) <> 'array' then
    raise exception 'codes and rules must be JSON arrays.';
  end if;
  if jsonb_array_length(v_codes) = 0 and jsonb_array_length(v_rules) = 0 then
    raise exception 'The taxonomy does not contain codes or rules.';
  end if;

  for v_item in select value from jsonb_array_elements(v_codes)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Every diagnostic code must be a JSON object.';
    end if;

    v_code := regexp_replace(upper(trim(coalesce(v_item ->> 'code', ''))), '[^A-Z0-9_]+', '_', 'g');
    if v_code = '' then raise exception 'Every diagnostic code requires code.'; end if;

    select exists(
      select 1 from public.exercise_builder_diagnostic_codes where code = v_code
    ) into v_exists;

    if v_exists and p_conflict_mode = 'skip' then
      v_skipped_codes := v_skipped_codes + 1;
      continue;
    end if;

    v_messages := '{}'::jsonb;
    if jsonb_typeof(v_item -> 'messages') = 'object' then
      for v_language_pair in select * from jsonb_each(v_item -> 'messages')
      loop
        if v_language_pair.key in ('it', 'en') and jsonb_typeof(v_language_pair.value) = 'object' then
          for v_message_pair in select * from jsonb_each_text(v_language_pair.value)
          loop
            v_messages := v_messages || jsonb_build_object(
              v_language_pair.key || ':' || v_message_pair.key,
              v_message_pair.value
            );
          end loop;
        elsif position(':' in v_language_pair.key) > 0 and jsonb_typeof(v_language_pair.value) = 'string' then
          v_messages := v_messages || jsonb_build_object(
            v_language_pair.key,
            trim(both '"' from v_language_pair.value::text)
          );
        end if;
      end loop;
    end if;

    perform public.admin_save_exercise_builder_diagnostic_code(
      jsonb_build_object(
        'code', v_code,
        'label', v_item ->> 'label',
        'primary_skill', v_item ->> 'primary_skill',
        'topic', v_item ->> 'topic',
        'subtopic', v_item ->> 'subtopic',
        'group_key', v_item ->> 'group_key',
        'severity', coalesce(nullif(v_item ->> 'severity', ''), case when v_item ->> 'category' = 'precision' then 'precision' else 'minor' end),
        'category', coalesce(nullif(v_item ->> 'category', ''), 'learning'),
        'recommended_resources', case when jsonb_typeof(v_item -> 'recommended_resources') = 'array' then v_item -> 'recommended_resources' else '[]'::jsonb end,
        'status', coalesce(nullif(v_item ->> 'status', ''), 'active'),
        'messages', v_messages
      )
    );

    if v_exists then v_updated_codes := v_updated_codes + 1;
    else v_created_codes := v_created_codes + 1;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(v_rules)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Every diagnostic rule must be a JSON object.';
    end if;

    v_rule_key := regexp_replace(upper(trim(coalesce(v_item ->> 'rule_key', ''))), '[^A-Z0-9_]+', '_', 'g');
    if v_rule_key = '' then raise exception 'Every diagnostic rule requires rule_key.'; end if;

    select exists(
      select 1 from public.exercise_builder_diagnostic_rules where rule_key = v_rule_key
    ) into v_exists;

    if v_exists and p_conflict_mode = 'skip' then
      v_skipped_rules := v_skipped_rules + 1;
      continue;
    end if;

    v_trigger := case
      when jsonb_typeof(v_item -> 'trigger_config') = 'object' then v_item -> 'trigger_config'
      when jsonb_typeof(v_item -> 'trigger') = 'object' then v_item -> 'trigger'
      else '{}'::jsonb
    end;
    v_output := case
      when jsonb_typeof(v_item -> 'output_config') = 'object' then v_item -> 'output_config'
      when jsonb_typeof(v_item -> 'output') = 'object' then v_item -> 'output'
      else '{}'::jsonb
    end;

    v_output_code := nullif(trim(v_output ->> 'diagnostic_code'), '');
    if v_output_code is not null and not exists (
      select 1 from public.exercise_builder_diagnostic_codes where code = v_output_code
    ) then
      raise exception 'Rule % references unknown diagnostic code %.', v_rule_key, v_output_code;
    end if;

    perform public.admin_save_exercise_builder_diagnostic_rule(
      jsonb_build_object(
        'rule_key', v_rule_key,
        'topic', v_item ->> 'topic',
        'priority', coalesce((v_item ->> 'priority')::integer, 0),
        'trigger_config', v_trigger,
        'output_config', v_output,
        'suppress_specific_messages', coalesce((v_item ->> 'suppress_specific_messages')::boolean, true),
        'status', coalesce(nullif(v_item ->> 'status', ''), 'active')
      )
    );

    if v_exists then v_updated_rules := v_updated_rules + 1;
    else v_created_rules := v_created_rules + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'created_codes', v_created_codes,
    'updated_codes', v_updated_codes,
    'skipped_codes', v_skipped_codes,
    'created_rules', v_created_rules,
    'updated_rules', v_updated_rules,
    'skipped_rules', v_skipped_rules
  );
end;
$$;

create or replace function public.admin_delete_exercise_builder_import_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_name text;
  v_item_count integer;
  v_promoted_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  select source_name into v_source_name
  from public.exercise_builder_import_batches
  where id = p_batch_id;
  if v_source_name is null then raise exception 'Import batch not found.'; end if;

  select count(*), count(*) filter (where promoted_entity_id is not null)
    into v_item_count, v_promoted_count
  from public.exercise_builder_import_items
  where batch_id = p_batch_id;

  delete from public.exercise_builder_import_batches where id = p_batch_id;

  return jsonb_build_object(
    'source_name', v_source_name,
    'deleted_items', v_item_count,
    'promoted_items_detached', v_promoted_count
  );
end;
$$;

create or replace function public.admin_delete_unused_exercise_builder_exercise(p_exercise_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise record;
  v_assigned_count integer;
  v_attempt_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  select id, public_id, status, published_at into v_exercise
  from public.exercise_builder_exercises
  where id = p_exercise_id;
  if v_exercise.id is null then raise exception 'Exercise not found.'; end if;

  select count(*) into v_assigned_count
  from public.assignment_resources
  where resource_type = 'custom_exercise'
    and exercise_config ->> 'exercise_id' = p_exercise_id::text;

  select count(*) into v_attempt_count
  from public.exercise_builder_attempts
  where exercise_id = p_exercise_id;

  if v_exercise.status = 'published'
     or v_exercise.published_at is not null
     or v_assigned_count > 0
     or v_attempt_count > 0 then
    raise exception 'This exercise has publication or learner history. Archive it instead of deleting it.';
  end if;

  update public.exercise_builder_import_items
  set promoted_entity_id = null
  where entity_type = 'exercise'
    and promoted_entity_id = p_exercise_id;

  delete from public.exercise_builder_exercises where id = p_exercise_id;

  return jsonb_build_object(
    'public_id', v_exercise.public_id,
    'deleted', true
  );
end;
$$;

revoke all on function public.admin_import_exercise_builder_diagnostic_taxonomy(jsonb, text) from public;
revoke all on function public.admin_delete_exercise_builder_import_batch(uuid) from public;
revoke all on function public.admin_delete_unused_exercise_builder_exercise(uuid) from public;
grant execute on function public.admin_import_exercise_builder_diagnostic_taxonomy(jsonb, text) to authenticated;
grant execute on function public.admin_delete_exercise_builder_import_batch(uuid) to authenticated;
grant execute on function public.admin_delete_unused_exercise_builder_exercise(uuid) to authenticated;
