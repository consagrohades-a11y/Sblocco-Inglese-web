-- Extend managed Recovery mapping sync from Wave 1 to every canonical recovery-wave-N import.

create or replace function public.admin_sync_recovery_wave_mappings()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate record;
  v_synced integer := 0;
  v_manual_overrides integer := 0;
  v_deactivated integer := 0;
  v_changed integer := 0;
  v_active_managed integer := 0;
  v_ready_topics integer := 0;
begin
  if not public.is_admin() then raise exception 'Only active admins can sync Recovery Wave mappings.'; end if;
  for v_candidate in
    with candidates as (
      select item.id as source_import_item_id,item.client_key,item.payload ->> 'topic' as topic_key,
        case when item.client_key like '%\_recover' escape '\' then 'recover' when item.client_key like '%\_practice' escape '\' then 'practice' when item.client_key like '%\_school' escape '\' then 'school' when item.client_key like '%\_verify' escape '\' then 'verify' else null end as phase,
        exercise.id as exercise_id,version.id as exercise_version_id,version.estimated_minutes,batch.created_at as batch_created_at,version.created_at as version_created_at,
        row_number() over (partition by item.payload ->> 'topic',case when item.client_key like '%\_recover' escape '\' then 'recover' when item.client_key like '%\_practice' escape '\' then 'practice' when item.client_key like '%\_school' escape '\' then 'school' when item.client_key like '%\_verify' escape '\' then 'verify' else null end order by batch.created_at desc,version.created_at desc,item.item_index desc) as freshness_rank
      from public.exercise_builder_import_batches batch
      join public.exercise_builder_import_items item on item.batch_id=batch.id
      join public.exercise_builder_exercises exercise on exercise.id=item.promoted_entity_id
      join public.exercise_builder_exercise_versions version on version.id=exercise.current_version_id
      join public.recovery_topic_catalog catalog on catalog.topic_key=item.payload ->> 'topic' and catalog.active
      where batch.source_name ~ '^recovery-wave-[0-9]+:'
        and item.entity_type='exercise' and item.validation_status in ('valid','warning') and item.promoted_entity_id is not null and item.client_key is not null
        and exercise.status='published' and version.review_status='approved' and version.source_import_item_id=item.id
    ) select * from candidates where freshness_rank=1 and phase is not null order by topic_key,phase
  loop
    if exists (select 1 from public.recovery_exercise_map manual where manual.topic_key=v_candidate.topic_key and manual.phase=v_candidate.phase and manual.active and manual.mapping_source='manual') then
      update public.recovery_exercise_map managed set active=false where managed.topic_key=v_candidate.topic_key and managed.phase=v_candidate.phase and managed.mapping_source='recovery_wave_import' and managed.active;
      get diagnostics v_changed=row_count; v_deactivated:=v_deactivated+v_changed; v_manual_overrides:=v_manual_overrides+1; continue;
    end if;
    update public.recovery_exercise_map managed set active=false where managed.topic_key=v_candidate.topic_key and managed.phase=v_candidate.phase and managed.mapping_source='recovery_wave_import' and managed.source_import_item_id is distinct from v_candidate.source_import_item_id and managed.active;
    get diagnostics v_changed=row_count; v_deactivated:=v_deactivated+v_changed;
    insert into public.recovery_exercise_map(topic_key,phase,exercise_id,exercise_version_id,estimated_minutes,active,sort_order,mapping_source,source_import_item_id)
    values(v_candidate.topic_key,v_candidate.phase,v_candidate.exercise_id,v_candidate.exercise_version_id,v_candidate.estimated_minutes,true,100,'recovery_wave_import',v_candidate.source_import_item_id)
    on conflict (source_import_item_id) where source_import_item_id is not null do update set topic_key=excluded.topic_key,phase=excluded.phase,exercise_id=excluded.exercise_id,exercise_version_id=excluded.exercise_version_id,estimated_minutes=excluded.estimated_minutes,active=true,mapping_source='recovery_wave_import';
    v_synced:=v_synced+1;
  end loop;
  select count(*) into v_active_managed from public.recovery_exercise_map where mapping_source='recovery_wave_import' and active;
  select count(*) into v_ready_topics from (select topic_key from public.recovery_exercise_map where active and topic_key is not null and phase in ('recover','practice','school','verify') group by topic_key having count(distinct phase)=4) ready;
  return jsonb_build_object('synced_mappings',v_synced,'manual_overrides',v_manual_overrides,'deactivated_managed_mappings',v_deactivated,'active_managed_mappings',v_active_managed,'ready_topics',v_ready_topics);
end;
$$;
revoke all on function public.admin_sync_recovery_wave_mappings() from public,anon,authenticated;
grant execute on function public.admin_sync_recovery_wave_mappings() to authenticated;
notify pgrst,'reload schema';
