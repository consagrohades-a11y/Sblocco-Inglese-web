-- Move only the historical Present Simple manual verification mapping to the published v2 overlay.
-- This intentionally does not override any different/manual administrator mapping.

do $$
declare
  v_item_id uuid;
  v_exercise_id uuid;
  v_version_id uuid;
  v_mapping_id uuid;
begin
  select item.id, exercise.id, version.id
  into v_item_id, v_exercise_id, v_version_id
  from public.exercise_builder_import_batches batch
  join public.exercise_builder_import_items item on item.batch_id = batch.id
  join public.exercise_builder_exercises exercise on exercise.id = item.promoted_entity_id
  join public.exercise_builder_exercise_versions version on version.id = exercise.current_version_id
  where batch.source_name like 'recovery-wave-1:verification-v2:present-simple.bundle.json:%'
    and item.client_key = 'recovery_present_simple_verify_v2'
    and item.entity_type = 'exercise'
    and item.validation_status in ('valid', 'warning')
    and item.promoted_entity_id is not null
    and exercise.status = 'published'
    and version.review_status = 'approved'
    and version.source_import_item_id = item.id
  order by batch.created_at desc, version.created_at desc
  limit 1;

  if v_item_id is null then
    raise notice 'Present Simple verification-v2 import is not present; legacy mapping migration is a no-op.';
    return;
  end if;

  if exists (
    select 1
    from public.recovery_exercise_map mapping
    where mapping.topic_key = 'present-simple'
      and mapping.phase = 'verify'
      and mapping.active
      and mapping.mapping_source = 'recovery_wave_import'
      and mapping.source_import_item_id = v_item_id
  ) then
    return;
  end if;

  select mapping.id
  into v_mapping_id
  from public.recovery_exercise_map mapping
  join public.exercise_builder_exercises exercise on exercise.id = mapping.exercise_id
  where mapping.topic_key = 'present-simple'
    and mapping.phase = 'verify'
    and mapping.active
    and mapping.mapping_source = 'manual'
    and mapping.source_import_item_id is null
    and mapping.estimated_minutes = 8
    and exercise.public_id = 'EX-00067'
  limit 1;

  if v_mapping_id is null then
    raise notice 'Historical EX-00067 Present Simple verify override not found; leaving current manual mapping unchanged.';
    return;
  end if;

  update public.recovery_exercise_map
  set exercise_id = v_exercise_id,
      exercise_version_id = v_version_id,
      estimated_minutes = 14,
      mapping_source = 'recovery_wave_import',
      source_import_item_id = v_item_id,
      active = true
  where id = v_mapping_id;
end;
$$;
