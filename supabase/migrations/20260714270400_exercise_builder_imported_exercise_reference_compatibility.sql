-- Preserve stable Exercise Builder identities while accepting legacy version UUID references.

-- Keep the original detail implementation and add a resolver wrapper that accepts
-- either exercise_builder_exercises.id or exercise_builder_exercise_versions.id.
do $$
begin
  if to_regprocedure('public.admin_get_exercise_builder_exercise_detail_by_identity(uuid)') is null then
    if to_regprocedure('public.admin_get_exercise_builder_exercise_detail(uuid)') is null then
      raise exception 'admin_get_exercise_builder_exercise_detail(uuid) is missing.';
    end if;

    alter function public.admin_get_exercise_builder_exercise_detail(uuid)
      rename to admin_get_exercise_builder_exercise_detail_by_identity;
  end if;
end;
$$;

create or replace function public.admin_get_exercise_builder_exercise_detail(p_exercise_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_exercise_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select exercise.id
    into v_exercise_id
  from public.exercise_builder_exercises exercise
  where exercise.id = p_exercise_id
  limit 1;

  if v_exercise_id is null then
    select version.exercise_id
      into v_exercise_id
    from public.exercise_builder_exercise_versions version
    where version.id = p_exercise_id
    limit 1;
  end if;

  if v_exercise_id is null then
    return null;
  end if;

  return public.admin_get_exercise_builder_exercise_detail_by_identity(v_exercise_id);
end;
$$;

-- Keep the original validated lifecycle implementation and add a compatibility
-- wrapper for legacy clients that accidentally send a current-version UUID.
do $$
begin
  if to_regprocedure('public.admin_set_exercise_builder_status_by_identity(text,uuid,text)') is null then
    if to_regprocedure('public.admin_set_exercise_builder_status(text,uuid,text)') is null then
      raise exception 'admin_set_exercise_builder_status(text,uuid,text) is missing.';
    end if;

    alter function public.admin_set_exercise_builder_status(text, uuid, text)
      rename to admin_set_exercise_builder_status_by_identity;
  end if;
end;
$$;

create or replace function public.admin_set_exercise_builder_status(
  p_entity_type text,
  p_entity_id uuid,
  p_next_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id uuid := p_entity_id;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_entity_type = 'question' and not exists (
    select 1 from public.exercise_builder_questions where id = v_entity_id
  ) then
    select version.question_id
      into v_entity_id
    from public.exercise_builder_question_versions version
    where version.id = p_entity_id
    limit 1;
  elsif p_entity_type = 'question_pool' and not exists (
    select 1 from public.exercise_builder_pools where id = v_entity_id
  ) then
    select version.pool_id
      into v_entity_id
    from public.exercise_builder_pool_versions version
    where version.id = p_entity_id
    limit 1;
  elsif p_entity_type = 'exercise' and not exists (
    select 1 from public.exercise_builder_exercises where id = v_entity_id
  ) then
    select version.exercise_id
      into v_entity_id
    from public.exercise_builder_exercise_versions version
    where version.id = p_entity_id
    limit 1;
  end if;

  if v_entity_id is null then
    raise exception 'Exercise Builder entity not found.';
  end if;

  perform public.admin_set_exercise_builder_status_by_identity(
    p_entity_type,
    v_entity_id,
    p_next_status
  );
end;
$$;

revoke all on function public.admin_get_exercise_builder_exercise_detail_by_identity(uuid) from public;
revoke all on function public.admin_get_exercise_builder_exercise_detail_by_identity(uuid) from authenticated;
revoke all on function public.admin_get_exercise_builder_exercise_detail(uuid) from public;
grant execute on function public.admin_get_exercise_builder_exercise_detail(uuid) to authenticated;

revoke all on function public.admin_set_exercise_builder_status_by_identity(text, uuid, text) from public;
revoke all on function public.admin_set_exercise_builder_status_by_identity(text, uuid, text) from authenticated;
revoke all on function public.admin_set_exercise_builder_status(text, uuid, text) from public;
grant execute on function public.admin_set_exercise_builder_status(text, uuid, text) to authenticated;
