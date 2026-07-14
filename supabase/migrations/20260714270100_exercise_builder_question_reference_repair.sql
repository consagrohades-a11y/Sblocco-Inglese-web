-- Repair incomplete question identities and resolve admin question references safely.

-- Restore missing or invalid current-version pointers from the latest available version.
update public.exercise_builder_questions question
set current_version_id = (
  select version.id
  from public.exercise_builder_question_versions version
  where version.question_id = question.id
  order by version.version_number desc, version.created_at desc
  limit 1
)
where (
    question.current_version_id is null
    or not exists (
      select 1
      from public.exercise_builder_question_versions current_version
      where current_version.id = question.current_version_id
        and current_version.question_id = question.id
    )
  )
  and exists (
    select 1
    from public.exercise_builder_question_versions available_version
    where available_version.question_id = question.id
  );

create or replace function public.admin_get_exercise_builder_question_detail_by_reference(p_reference text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_reference text := nullif(trim(p_reference), '');
  v_question_id uuid;
  v_uuid uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if v_reference is null then return null; end if;

  begin
    v_uuid := v_reference::uuid;
  exception when invalid_text_representation then
    v_uuid := null;
  end;

  if v_uuid is not null then
    select question.id into v_question_id
    from public.exercise_builder_questions question
    where question.id = v_uuid
    limit 1;

    if v_question_id is null then
      select version.question_id into v_question_id
      from public.exercise_builder_question_versions version
      where version.id = v_uuid
      limit 1;
    end if;
  end if;

  if v_question_id is null then
    select question.id into v_question_id
    from public.exercise_builder_questions question
    where upper(question.public_id) = upper(v_reference)
    limit 1;
  end if;

  if v_question_id is null then return null; end if;

  return public.admin_get_exercise_builder_question_detail(v_question_id);
end;
$$;

create or replace function public.admin_list_exercise_builder_orphan_questions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', question.id,
    'public_id', question.public_id,
    'status', question.status,
    'created_at', question.created_at,
    'version_count', (
      select count(*)
      from public.exercise_builder_question_versions version
      where version.question_id = question.id
    )
  ) order by question.created_at desc), '[]'::jsonb)
  from public.exercise_builder_questions question
  where public.is_admin()
    and (
      question.current_version_id is null
      or not exists (
        select 1
        from public.exercise_builder_question_versions version
        where version.id = question.current_version_id
          and version.question_id = question.id
      )
    );
$$;

revoke all on function public.admin_get_exercise_builder_question_detail_by_reference(text) from public;
revoke all on function public.admin_list_exercise_builder_orphan_questions() from public;
grant execute on function public.admin_get_exercise_builder_question_detail_by_reference(text) to authenticated;
grant execute on function public.admin_list_exercise_builder_orphan_questions() to authenticated;
