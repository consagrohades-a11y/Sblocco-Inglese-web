-- Promote validated Exercise Builder import items into versioned catalog content.
-- The public RPC runs as one transaction, so broken references cannot leave
-- partially-created questions, pools, or exercises.

alter table public.exercise_builder_question_versions
  add column if not exists diagnostics jsonb not null default '{}'::jsonb;

create or replace function public.exercise_builder_jsonb_text_array(p_value jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(value), '{}'::text[])
  from jsonb_array_elements_text(coalesce(p_value, '[]'::jsonb));
$$;

create or replace function public.promote_exercise_builder_question_payload(
  p_payload jsonb,
  p_source_import_item_id uuid,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_id uuid;
  v_version_id uuid;
  v_existing_id uuid;
  v_client_key text;
  v_code text;
  v_mapping jsonb;
  v_option jsonb;
begin
  v_client_key := nullif(trim(p_payload->>'client_key'), '');

  if v_client_key is not null then
    select entity_id into v_existing_id
    from pg_temp.exercise_builder_question_map
    where client_key = v_client_key;

    if v_existing_id is not null then
      return v_existing_id;
    end if;
  end if;

  insert into public.exercise_builder_questions (
    status,
    created_by
  )
  values (
    'draft',
    p_created_by
  )
  returning id into v_question_id;

  insert into public.exercise_builder_question_versions (
    question_id,
    version_number,
    schema_version,
    question_type,
    title,
    prompt,
    instructions,
    instruction_language,
    level,
    topic,
    subtopic,
    primary_skill,
    learning_objective,
    difficulty,
    content,
    grading,
    feedback,
    diagnostics,
    tags,
    foundation_links,
    review_status,
    source_import_item_id,
    created_by
  )
  values (
    v_question_id,
    1,
    1,
    p_payload->>'type',
    nullif(p_payload->>'title', ''),
    p_payload->>'prompt',
    nullif(p_payload->>'instructions', ''),
    coalesce(nullif(p_payload->>'instruction_language', ''), 'it'),
    p_payload->>'level',
    p_payload->>'topic',
    nullif(p_payload->>'subtopic', ''),
    p_payload->>'primary_skill',
    p_payload->>'learning_objective',
    coalesce(nullif(p_payload->>'difficulty', ''), 'standard'),
    coalesce(p_payload->'content', '{}'::jsonb),
    coalesce(p_payload->'grading', '{"mode":"automatic","weight":1}'::jsonb),
    coalesce(p_payload->'feedback', '{}'::jsonb),
    coalesce(p_payload->'diagnostics', '{}'::jsonb),
    public.exercise_builder_jsonb_text_array(p_payload->'tags'),
    coalesce(p_payload->'foundation_links', '[]'::jsonb),
    'in_review',
    p_source_import_item_id,
    p_created_by
  )
  returning id into v_version_id;

  update public.exercise_builder_questions
  set current_version_id = v_version_id
  where id = v_question_id;

  if v_client_key is not null then
    insert into pg_temp.exercise_builder_question_map (client_key, entity_id)
    values (v_client_key, v_question_id)
    on conflict (client_key) do update set entity_id = excluded.entity_id;
  end if;

  for v_code in
    select value
    from jsonb_array_elements_text(coalesce(p_payload#>'{diagnostics,tested_codes}', '[]'::jsonb))
  loop
    if exists (
      select 1 from public.exercise_builder_diagnostic_codes where code = v_code
    ) then
      insert into public.exercise_builder_question_diagnostic_targets (
        question_version_id,
        diagnostic_code,
        target_role,
        opportunity_count
      )
      values (
        v_version_id,
        v_code,
        'tested',
        1
      )
      on conflict do nothing;
    end if;
  end loop;

  v_code := nullif(p_payload#>>'{diagnostics,fallback_error_code}', '');
  if v_code is not null and exists (
    select 1 from public.exercise_builder_diagnostic_codes where code = v_code
  ) then
    insert into public.exercise_builder_question_diagnostic_targets (
      question_version_id,
      diagnostic_code,
      target_role,
      opportunity_count
    )
    values (
      v_version_id,
      v_code,
      'fallback',
      1
    )
    on conflict do nothing;
  end if;

  for v_mapping in
    select value
    from jsonb_array_elements(coalesce(p_payload#>'{diagnostics,answer_error_mappings}', '[]'::jsonb))
  loop
    v_code := nullif(v_mapping->>'error_code', '');
    if v_code is not null and exists (
      select 1 from public.exercise_builder_diagnostic_codes where code = v_code
    ) then
      insert into public.exercise_builder_answer_error_mappings (
        question_version_id,
        answer_key,
        matcher_type,
        matcher_config,
        diagnostic_code,
        priority
      )
      values (
        v_version_id,
        nullif(v_mapping->>'answer_key', ''),
        coalesce(nullif(v_mapping->>'matcher_type', ''), 'normalized_exact'),
        coalesce(v_mapping->'matcher_config', '{}'::jsonb),
        v_code,
        coalesce((v_mapping->>'priority')::integer, 0)
      );
    end if;
  end loop;

  for v_option in
    select value
    from jsonb_array_elements(coalesce(p_payload#>'{content,options}', '[]'::jsonb))
  loop
    v_code := nullif(v_option->>'error_code', '');
    if v_code is not null and exists (
      select 1 from public.exercise_builder_diagnostic_codes where code = v_code
    ) then
      insert into public.exercise_builder_answer_error_mappings (
        question_version_id,
        answer_key,
        matcher_type,
        matcher_config,
        diagnostic_code,
        priority
      )
      values (
        v_version_id,
        nullif(v_option->>'key', ''),
        'option',
        jsonb_build_object(
          'option_key', v_option->>'key',
          'option_text', v_option->>'text'
        ),
        v_code,
        0
      );
    end if;
  end loop;

  return v_question_id;
end;
$$;

create or replace function public.promote_exercise_builder_pool_payload(
  p_payload jsonb,
  p_source_import_item_id uuid,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool_id uuid;
  v_pool_version_id uuid;
  v_existing_id uuid;
  v_question_id uuid;
  v_client_key text;
  v_ref text;
  v_entry record;
  v_question_payload jsonb;
  v_pinned boolean;
  v_weight numeric;
  v_sequence integer := 0;
begin
  v_client_key := nullif(trim(p_payload->>'client_key'), '');

  if v_client_key is not null then
    select entity_id into v_existing_id
    from pg_temp.exercise_builder_pool_map
    where client_key = v_client_key;

    if v_existing_id is not null then
      return v_existing_id;
    end if;
  end if;

  insert into public.exercise_builder_pools (
    status,
    created_by
  )
  values (
    'draft',
    p_created_by
  )
  returning id into v_pool_id;

  insert into public.exercise_builder_pool_versions (
    pool_id,
    version_number,
    name,
    description,
    level,
    topic,
    subtopic,
    primary_skill,
    tags,
    foundation_links,
    source_import_item_id,
    created_by
  )
  values (
    v_pool_id,
    1,
    p_payload->>'name',
    nullif(p_payload->>'description', ''),
    p_payload->>'level',
    p_payload->>'topic',
    nullif(p_payload->>'subtopic', ''),
    nullif(p_payload->>'primary_skill', ''),
    public.exercise_builder_jsonb_text_array(p_payload->'tags'),
    coalesce(p_payload->'foundation_links', '[]'::jsonb),
    p_source_import_item_id,
    p_created_by
  )
  returning id into v_pool_version_id;

  update public.exercise_builder_pools
  set current_version_id = v_pool_version_id
  where id = v_pool_id;

  if v_client_key is not null then
    insert into pg_temp.exercise_builder_pool_map (client_key, entity_id)
    values (v_client_key, v_pool_id)
    on conflict (client_key) do update set entity_id = excluded.entity_id;
  end if;

  for v_entry in
    select value, ordinality
    from jsonb_array_elements(coalesce(p_payload->'questions', '[]'::jsonb)) with ordinality
  loop
    if jsonb_typeof(v_entry.value->'question') = 'object' then
      v_question_payload := v_entry.value->'question';
      v_pinned := coalesce((v_entry.value->>'pinned')::boolean, false);
      v_weight := coalesce((v_entry.value->>'selection_weight')::numeric, 1);
    else
      v_question_payload := v_entry.value;
      v_pinned := false;
      v_weight := 1;
    end if;

    v_question_id := public.promote_exercise_builder_question_payload(
      v_question_payload,
      p_source_import_item_id,
      p_created_by
    );

    insert into public.exercise_builder_pool_questions (
      pool_version_id,
      question_id,
      pinned,
      selection_weight,
      sequence_index
    )
    values (
      v_pool_version_id,
      v_question_id,
      v_pinned,
      v_weight,
      v_entry.ordinality - 1
    )
    on conflict (pool_version_id, question_id) do update
      set pinned = excluded.pinned,
          selection_weight = excluded.selection_weight,
          sequence_index = excluded.sequence_index;
  end loop;

  v_sequence := coalesce(jsonb_array_length(coalesce(p_payload->'questions', '[]'::jsonb)), 0);

  for v_ref in
    select value
    from jsonb_array_elements_text(coalesce(p_payload->'question_refs', '[]'::jsonb))
  loop
    select entity_id into v_question_id
    from pg_temp.exercise_builder_question_map
    where client_key = v_ref;

    if v_question_id is null then
      raise exception 'Question reference % was not found while promoting pool %.', v_ref, coalesce(v_client_key, p_payload->>'name');
    end if;

    insert into public.exercise_builder_pool_questions (
      pool_version_id,
      question_id,
      pinned,
      selection_weight,
      sequence_index
    )
    values (
      v_pool_version_id,
      v_question_id,
      false,
      1,
      v_sequence
    )
    on conflict (pool_version_id, question_id) do nothing;

    v_sequence := v_sequence + 1;
  end loop;

  return v_pool_id;
end;
$$;

create or replace function public.promote_exercise_builder_exercise_payload(
  p_payload jsonb,
  p_source_import_item_id uuid,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise_id uuid;
  v_exercise_version_id uuid;
  v_section_id uuid;
  v_question_id uuid;
  v_pool_id uuid;
  v_client_key text;
  v_ref text;
  v_section record;
  v_question record;
  v_pool_rule record;
  v_question_payload jsonb;
  v_pool_payload jsonb;
  v_sequence integer;
begin
  v_client_key := nullif(trim(p_payload->>'client_key'), '');

  insert into public.exercise_builder_exercises (
    status,
    created_by
  )
  values (
    'draft',
    p_created_by
  )
  returning id into v_exercise_id;

  insert into public.exercise_builder_exercise_versions (
    exercise_id,
    version_number,
    schema_version,
    title,
    description,
    instructions,
    instruction_language,
    level,
    topic,
    estimated_minutes,
    settings,
    tags,
    foundation_links,
    review_status,
    source_import_item_id,
    created_by
  )
  values (
    v_exercise_id,
    1,
    1,
    p_payload->>'title',
    nullif(p_payload->>'description', ''),
    p_payload->>'instructions',
    coalesce(nullif(p_payload->>'instruction_language', ''), 'it'),
    p_payload->>'level',
    p_payload->>'topic',
    nullif(p_payload->>'estimated_minutes', '')::integer,
    coalesce(p_payload->'settings', '{}'::jsonb),
    public.exercise_builder_jsonb_text_array(p_payload->'tags'),
    coalesce(p_payload->'foundation_links', '[]'::jsonb),
    'in_review',
    p_source_import_item_id,
    p_created_by
  )
  returning id into v_exercise_version_id;

  update public.exercise_builder_exercises
  set current_version_id = v_exercise_version_id
  where id = v_exercise_id;

  if v_client_key is not null then
    insert into pg_temp.exercise_builder_exercise_map (client_key, entity_id)
    values (v_client_key, v_exercise_id)
    on conflict (client_key) do update set entity_id = excluded.entity_id;
  end if;

  for v_section in
    select value, ordinality
    from jsonb_array_elements(coalesce(p_payload->'sections', '[]'::jsonb)) with ordinality
  loop
    insert into public.exercise_builder_sections (
      exercise_version_id,
      sequence_index,
      title,
      instructions,
      selection_mode,
      feedback_timing,
      settings
    )
    values (
      v_exercise_version_id,
      v_section.ordinality - 1,
      v_section.value->>'title',
      nullif(v_section.value->>'instructions', ''),
      v_section.value->>'selection_mode',
      coalesce(nullif(v_section.value->>'feedback_timing', ''), 'section_end'),
      coalesce(v_section.value->'settings', '{}'::jsonb)
    )
    returning id into v_section_id;

    for v_question in
      select value, ordinality
      from jsonb_array_elements(coalesce(v_section.value->'questions', '[]'::jsonb)) with ordinality
    loop
      if jsonb_typeof(v_question.value->'question') = 'object' then
        v_question_payload := v_question.value->'question';
      else
        v_question_payload := v_question.value;
      end if;

      v_question_id := public.promote_exercise_builder_question_payload(
        v_question_payload,
        p_source_import_item_id,
        p_created_by
      );

      insert into public.exercise_builder_section_fixed_questions (
        section_id,
        question_id,
        sequence_index,
        required
      )
      values (
        v_section_id,
        v_question_id,
        v_question.ordinality - 1,
        true
      )
      on conflict (section_id, question_id) do nothing;
    end loop;

    v_sequence := coalesce(jsonb_array_length(coalesce(v_section.value->'questions', '[]'::jsonb)), 0);

    for v_ref in
      select value
      from jsonb_array_elements_text(coalesce(v_section.value->'question_refs', '[]'::jsonb))
    loop
      select entity_id into v_question_id
      from pg_temp.exercise_builder_question_map
      where client_key = v_ref;

      if v_question_id is null then
        raise exception 'Question reference % was not found while promoting exercise %.', v_ref, p_payload->>'title';
      end if;

      insert into public.exercise_builder_section_fixed_questions (
        section_id,
        question_id,
        sequence_index,
        required
      )
      values (
        v_section_id,
        v_question_id,
        v_sequence,
        true
      )
      on conflict (section_id, question_id) do nothing;

      v_sequence := v_sequence + 1;
    end loop;

    for v_pool_rule in
      select value, ordinality
      from jsonb_array_elements(coalesce(v_section.value->'pool_rules', '[]'::jsonb)) with ordinality
    loop
      if jsonb_typeof(v_pool_rule.value->'pool') = 'object' then
        v_pool_payload := v_pool_rule.value->'pool';
        v_pool_id := public.promote_exercise_builder_pool_payload(
          v_pool_payload,
          p_source_import_item_id,
          p_created_by
        );
      else
        v_ref := nullif(v_pool_rule.value->>'pool_ref', '');
        select entity_id into v_pool_id
        from pg_temp.exercise_builder_pool_map
        where client_key = v_ref;

        if v_pool_id is null then
          raise exception 'Pool reference % was not found while promoting exercise %.', v_ref, p_payload->>'title';
        end if;
      end if;

      insert into public.exercise_builder_section_pool_rules (
        section_id,
        pool_id,
        question_count,
        selection_strategy,
        filters,
        distribution_rules,
        prevent_duplicate_questions,
        sequence_index
      )
      values (
        v_section_id,
        v_pool_id,
        (v_pool_rule.value->>'question_count')::integer,
        coalesce(nullif(v_pool_rule.value->>'selection_strategy', ''), 'balanced'),
        coalesce(v_pool_rule.value->'filters', '{}'::jsonb),
        coalesce(v_pool_rule.value->'distribution_rules', '{}'::jsonb),
        coalesce((v_pool_rule.value->>'prevent_duplicate_questions')::boolean, true),
        v_pool_rule.ordinality - 1
      );
    end loop;
  end loop;

  return v_exercise_id;
end;
$$;

create or replace function public.promote_exercise_builder_import_batch(
  p_batch_id uuid,
  p_item_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_entity_id uuid;
  v_public_id text;
  v_created_by uuid := auth.uid();
  v_results jsonb := '[]'::jsonb;
  v_promoted_count integer := 0;
  v_pending_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only active admins can promote Exercise Builder imports.';
  end if;

  if not exists (
    select 1 from public.exercise_builder_import_batches where id = p_batch_id
  ) then
    raise exception 'Exercise Builder import batch not found.';
  end if;

  create temporary table exercise_builder_question_map (
    client_key text primary key,
    entity_id uuid not null
  ) on commit drop;

  create temporary table exercise_builder_pool_map (
    client_key text primary key,
    entity_id uuid not null
  ) on commit drop;

  create temporary table exercise_builder_exercise_map (
    client_key text primary key,
    entity_id uuid not null
  ) on commit drop;

  insert into pg_temp.exercise_builder_question_map (client_key, entity_id)
  select client_key, promoted_entity_id
  from public.exercise_builder_import_items
  where batch_id = p_batch_id
    and entity_type = 'question'
    and client_key is not null
    and promoted_entity_id is not null
  on conflict (client_key) do update set entity_id = excluded.entity_id;

  insert into pg_temp.exercise_builder_pool_map (client_key, entity_id)
  select client_key, promoted_entity_id
  from public.exercise_builder_import_items
  where batch_id = p_batch_id
    and entity_type = 'question_pool'
    and client_key is not null
    and promoted_entity_id is not null
  on conflict (client_key) do update set entity_id = excluded.entity_id;

  for v_item in
    select *
    from public.exercise_builder_import_items
    where batch_id = p_batch_id
      and entity_type = 'question'
      and validation_status in ('valid', 'warning')
      and promoted_entity_id is null
      and (p_item_ids is null or id = any(p_item_ids))
    order by item_index
  loop
    v_entity_id := public.promote_exercise_builder_question_payload(
      v_item.payload,
      v_item.id,
      v_created_by
    );

    update public.exercise_builder_import_items
    set promoted_entity_id = v_entity_id,
        selected = true
    where id = v_item.id;

    select public_id into v_public_id
    from public.exercise_builder_questions
    where id = v_entity_id;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'item_id', v_item.id,
      'entity_type', v_item.entity_type,
      'entity_id', v_entity_id,
      'public_id', v_public_id
    ));
    v_promoted_count := v_promoted_count + 1;
  end loop;

  for v_item in
    select *
    from public.exercise_builder_import_items
    where batch_id = p_batch_id
      and entity_type = 'question_pool'
      and validation_status in ('valid', 'warning')
      and promoted_entity_id is null
      and (p_item_ids is null or id = any(p_item_ids))
    order by item_index
  loop
    v_entity_id := public.promote_exercise_builder_pool_payload(
      v_item.payload,
      v_item.id,
      v_created_by
    );

    update public.exercise_builder_import_items
    set promoted_entity_id = v_entity_id,
        selected = true
    where id = v_item.id;

    select public_id into v_public_id
    from public.exercise_builder_pools
    where id = v_entity_id;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'item_id', v_item.id,
      'entity_type', v_item.entity_type,
      'entity_id', v_entity_id,
      'public_id', v_public_id
    ));
    v_promoted_count := v_promoted_count + 1;
  end loop;

  for v_item in
    select *
    from public.exercise_builder_import_items
    where batch_id = p_batch_id
      and entity_type = 'exercise'
      and validation_status in ('valid', 'warning')
      and promoted_entity_id is null
      and (p_item_ids is null or id = any(p_item_ids))
    order by item_index
  loop
    v_entity_id := public.promote_exercise_builder_exercise_payload(
      v_item.payload,
      v_item.id,
      v_created_by
    );

    update public.exercise_builder_import_items
    set promoted_entity_id = v_entity_id,
        selected = true
    where id = v_item.id;

    select public_id into v_public_id
    from public.exercise_builder_exercises
    where id = v_entity_id;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'item_id', v_item.id,
      'entity_type', v_item.entity_type,
      'entity_id', v_entity_id,
      'public_id', v_public_id
    ));
    v_promoted_count := v_promoted_count + 1;
  end loop;

  select count(*) into v_pending_count
  from public.exercise_builder_import_items
  where batch_id = p_batch_id
    and selected = true
    and validation_status in ('valid', 'warning')
    and promoted_entity_id is null;

  update public.exercise_builder_import_batches
  set status = case when v_pending_count = 0 then 'imported' else 'partially_imported' end
  where id = p_batch_id;

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'promoted_count', v_promoted_count,
    'pending_count', v_pending_count,
    'items', v_results
  );
end;
$$;

revoke all on function public.exercise_builder_jsonb_text_array(jsonb) from public;
revoke all on function public.promote_exercise_builder_question_payload(jsonb, uuid, uuid) from public;
revoke all on function public.promote_exercise_builder_pool_payload(jsonb, uuid, uuid) from public;
revoke all on function public.promote_exercise_builder_exercise_payload(jsonb, uuid, uuid) from public;
revoke all on function public.promote_exercise_builder_import_batch(uuid, uuid[]) from public;
grant execute on function public.promote_exercise_builder_import_batch(uuid, uuid[]) to authenticated;
