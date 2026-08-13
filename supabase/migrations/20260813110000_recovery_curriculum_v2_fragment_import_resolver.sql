-- Recovery Curriculum v2 assessment-fragment import resolver.
-- Resolves source-controlled client keys to immutable Exercise Builder UUIDs without
-- prompt-text matching or hardcoded generated IDs. First version intentionally
-- supports fixed inline questions only; pool-based fragment mappings fail closed.
-- Learner-facing Readiness v2 remains inactive.

create or replace function public.admin_resolve_recovery_assessment_fragment_from_import(
  p_batch_id uuid,
  p_fragment jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fragment_id text := nullif(trim(p_fragment ->> 'fragment_id'), '');
  v_exercise_client_key text := nullif(trim(p_fragment ->> 'exercise_client_key'), '');
  v_item public.exercise_builder_import_items%rowtype;
  v_exercise public.exercise_builder_exercises%rowtype;
  v_version public.exercise_builder_exercise_versions%rowtype;
  v_mapping jsonb;
  v_question_client_key text;
  v_match_count integer;
  v_section_index integer;
  v_question_index integer;
  v_section_id uuid;
  v_question_version_id uuid;
  v_question_version public.exercise_builder_question_versions%rowtype;
  v_resolved_mappings jsonb := '[]'::jsonb;
  v_source_question jsonb;
  v_metadata jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_fragment is null or jsonb_typeof(p_fragment) <> 'object' then
    raise exception 'Assessment fragment source must be a JSON object';
  end if;
  if v_fragment_id is null then
    raise exception 'fragment_id is required';
  end if;
  if v_exercise_client_key is null then
    raise exception 'exercise_client_key is required for fragment %', v_fragment_id;
  end if;

  select item.* into v_item
  from public.exercise_builder_import_items item
  where item.batch_id = p_batch_id
    and item.client_key = v_exercise_client_key
    and item.entity_type = 'exercise';

  if v_item.id is null then
    raise exception 'Exercise import item not found for batch/client_key: % / %', p_batch_id, v_exercise_client_key;
  end if;
  if v_item.validation_status = 'invalid' then
    raise exception 'Cannot resolve fragment from an invalid import item: %', v_exercise_client_key;
  end if;
  if v_item.promoted_entity_id is null then
    raise exception 'Exercise import item has not been promoted: %', v_exercise_client_key;
  end if;
  if jsonb_typeof(coalesce(v_item.payload, 'null'::jsonb)) <> 'object' then
    raise exception 'Exercise import item payload is unavailable: %', v_exercise_client_key;
  end if;

  select exercise.* into v_exercise
  from public.exercise_builder_exercises exercise
  where exercise.id = v_item.promoted_entity_id;

  if v_exercise.id is null then
    raise exception 'Promoted exercise no longer exists for import item: %', v_exercise_client_key;
  end if;
  if v_exercise.current_version_id is null then
    raise exception 'Promoted exercise has no current version: %', v_exercise_client_key;
  end if;

  select version.* into v_version
  from public.exercise_builder_exercise_versions version
  where version.id = v_exercise.current_version_id
    and version.exercise_id = v_exercise.id;

  if v_version.id is null then
    raise exception 'Current exercise version not found: %', v_exercise_client_key;
  end if;
  if v_version.source_import_item_id is distinct from v_item.id then
    raise exception 'Current exercise version no longer matches the source import item for %. Re-import or update the fragment manifest before registration.', v_exercise_client_key;
  end if;

  if jsonb_typeof(coalesce(p_fragment -> 'question_mappings', 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_fragment -> 'question_mappings') = 0 then
    raise exception 'Fragment % requires non-empty question_mappings', v_fragment_id;
  end if;

  for v_mapping in
    select value from jsonb_array_elements(p_fragment -> 'question_mappings')
  loop
    if jsonb_typeof(v_mapping) <> 'object' then
      raise exception 'Every question mapping must be an object for fragment %', v_fragment_id;
    end if;

    v_question_client_key := nullif(trim(v_mapping ->> 'question_client_key'), '');
    if v_question_client_key is null then
      raise exception 'question_client_key is required in fragment %', v_fragment_id;
    end if;

    -- Resolve source identity strictly by fixed inline question position. This is
    -- deterministic because Exercise Builder promotion preserves 0-based section
    -- and fixed-question sequence indexes. No prompt/title matching is allowed.
    select
      count(*)::integer,
      min(source.section_ordinality - 1)::integer,
      min(source.question_ordinality - 1)::integer,
      min(source.question) filter (where source.question ->> 'client_key' = v_question_client_key)
      into v_match_count, v_section_index, v_question_index, v_source_question
    from (
      select
        section_ordinality,
        question_ordinality,
        question
      from jsonb_array_elements(coalesce(v_item.payload -> 'sections', '[]'::jsonb))
        with ordinality sections(section, section_ordinality)
      cross join lateral jsonb_array_elements(coalesce(sections.section -> 'questions', '[]'::jsonb))
        with ordinality questions(question, question_ordinality)
      where questions.question ->> 'client_key' = v_question_client_key
    ) source;

    if v_match_count = 0 then
      raise exception 'Question client_key % was not found as a fixed inline question in %. Pool/question_ref resolution is intentionally unsupported.', v_question_client_key, v_exercise_client_key;
    end if;
    if v_match_count <> 1 then
      raise exception 'Question client_key % is not unique in source exercise %', v_question_client_key, v_exercise_client_key;
    end if;

    select section.id into v_section_id
    from public.exercise_builder_sections section
    where section.exercise_version_id = v_version.id
      and section.sequence_index = v_section_index;

    if v_section_id is null then
      raise exception 'Published section position % does not match source payload for %', v_section_index, v_exercise_client_key;
    end if;

    select fixed.question_version_id into v_question_version_id
    from public.exercise_builder_section_fixed_questions fixed
    where fixed.section_id = v_section_id
      and fixed.sequence_index = v_question_index;

    if v_question_version_id is null then
      raise exception 'Question % is not represented by a fixed published question at source position %/% in %', v_question_client_key, v_section_index, v_question_index, v_exercise_client_key;
    end if;

    select question_version.* into v_question_version
    from public.exercise_builder_question_versions question_version
    where question_version.id = v_question_version_id;

    if v_question_version.id is null then
      raise exception 'Resolved question version no longer exists for %', v_question_client_key;
    end if;
    if v_question_version.source_import_item_id is distinct from v_item.id then
      raise exception 'Resolved question version provenance does not match import item for %', v_question_client_key;
    end if;

    v_resolved_mappings := v_resolved_mappings || jsonb_build_array(
      (v_mapping - 'question_client_key') || jsonb_build_object(
        'question_version_id', v_question_version_id,
        'metadata', coalesce(v_mapping -> 'metadata', '{}'::jsonb) || jsonb_build_object(
          'question_client_key', v_question_client_key,
          'source_section_index', v_section_index,
          'source_question_index', v_question_index,
          'source_question_type', v_source_question ->> 'type'
        )
      )
    );
  end loop;

  if jsonb_array_length(v_resolved_mappings) <> jsonb_array_length(p_fragment -> 'question_mappings') then
    raise exception 'Not every source question mapping was resolved for fragment %', v_fragment_id;
  end if;

  v_metadata := coalesce(p_fragment -> 'metadata', '{}'::jsonb) || jsonb_build_object(
    'source_resolver', 'recovery-v2-fragment-import-resolver-v1',
    'source_import_batch_id', p_batch_id,
    'source_import_item_id', v_item.id,
    'source_exercise_client_key', v_exercise_client_key
  );

  return (p_fragment - 'exercise_client_key' - 'question_mappings') || jsonb_build_object(
    'exercise_id', v_exercise.id,
    'exercise_version_id', v_version.id,
    'question_mappings', v_resolved_mappings,
    'metadata', v_metadata
  );
end;
$$;

revoke all on function public.admin_resolve_recovery_assessment_fragment_from_import(uuid, jsonb)
  from public, anon;
grant execute on function public.admin_resolve_recovery_assessment_fragment_from_import(uuid, jsonb)
  to authenticated;

create or replace function public.admin_register_recovery_assessment_fragment_from_import(
  p_batch_id uuid,
  p_fragment jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_resolved jsonb;
  v_registered jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_resolved := public.admin_resolve_recovery_assessment_fragment_from_import(p_batch_id, p_fragment);
  v_registered := public.admin_register_recovery_assessment_fragment(v_resolved);

  return v_registered || jsonb_build_object(
    'source_import_batch_id', p_batch_id,
    'source_exercise_client_key', p_fragment ->> 'exercise_client_key',
    'resolver', 'recovery-v2-fragment-import-resolver-v1'
  );
end;
$$;

revoke all on function public.admin_register_recovery_assessment_fragment_from_import(uuid, jsonb)
  from public, anon;
grant execute on function public.admin_register_recovery_assessment_fragment_from_import(uuid, jsonb)
  to authenticated;

create or replace function public.admin_register_recovery_assessment_fragment_manifest_from_import(
  p_batch_id uuid,
  p_manifest jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_manifest_id text := nullif(trim(p_manifest ->> 'manifest_id'), '');
  v_fragment jsonb;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_batch public.exercise_builder_import_batches%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_manifest is null or jsonb_typeof(p_manifest) <> 'object' then
    raise exception 'Fragment manifest must be a JSON object';
  end if;
  if v_manifest_id is null then
    raise exception 'manifest_id is required';
  end if;
  if jsonb_typeof(coalesce(p_manifest -> 'fragments', 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_manifest -> 'fragments') = 0 then
    raise exception 'Manifest % requires a non-empty fragments array', v_manifest_id;
  end if;

  select batch.* into v_batch
  from public.exercise_builder_import_batches batch
  where batch.id = p_batch_id;

  if v_batch.id is null then
    raise exception 'Exercise Builder import batch not found: %', p_batch_id;
  end if;
  if v_batch.invalid_count > 0 then
    raise exception 'Cannot register Recovery assessment fragments from a batch containing invalid items';
  end if;

  for v_fragment in
    select value from jsonb_array_elements(p_manifest -> 'fragments')
  loop
    v_result := public.admin_register_recovery_assessment_fragment_from_import(p_batch_id, v_fragment);
    v_results := v_results || jsonb_build_array(v_result);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'registered', true,
    'manifest_id', v_manifest_id,
    'source_import_batch_id', p_batch_id,
    'fragment_count', v_count,
    'fragments', v_results,
    'readiness_v2_active', false
  );
end;
$$;

revoke all on function public.admin_register_recovery_assessment_fragment_manifest_from_import(uuid, jsonb)
  from public, anon;
grant execute on function public.admin_register_recovery_assessment_fragment_manifest_from_import(uuid, jsonb)
  to authenticated;

notify pgrst, 'reload schema';
