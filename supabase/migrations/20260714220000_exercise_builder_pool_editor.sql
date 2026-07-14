-- Versioned visual editing for Exercise Builder question pools.

create or replace function public.admin_save_exercise_builder_pool_version(
  p_pool_id uuid,
  p_payload jsonb,
  p_memberships jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool_id uuid := p_pool_id;
  v_public_id text;
  v_version_id uuid;
  v_version_number integer;
  v_level text;
  v_title text;
  v_description text;
  v_topic text;
  v_subtopic text;
  v_primary_skill text;
  v_item jsonb;
  v_question_id uuid;
  v_question_version_id uuid;
  v_sequence integer := 0;
  v_seen uuid[] := '{}';
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Pool payload must be an object.'; end if;
  if p_memberships is null or jsonb_typeof(p_memberships) <> 'array' then raise exception 'Pool memberships must be an array.'; end if;

  v_title := nullif(trim(p_payload ->> 'title'), '');
  v_description := nullif(trim(p_payload ->> 'description'), '');
  v_level := nullif(trim(p_payload ->> 'level'), '');
  v_topic := nullif(trim(p_payload ->> 'topic'), '');
  v_subtopic := nullif(trim(p_payload ->> 'subtopic'), '');
  v_primary_skill := nullif(trim(p_payload ->> 'primary_skill'), '');

  if v_title is null or v_level is null or v_topic is null or v_primary_skill is null then
    raise exception 'Title, level, topic, and primary skill are required.';
  end if;
  if v_level not in ('A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed') then
    raise exception 'Invalid CEFR level.';
  end if;

  if v_pool_id is null then
    v_public_id := public.next_exercise_builder_public_id('question_pool');
    insert into public.exercise_builder_pools (
      public_id, status, created_by
    ) values (
      v_public_id, 'draft', auth.uid()
    ) returning id into v_pool_id;
    v_version_number := 1;
  else
    select public_id into v_public_id
    from public.exercise_builder_pools
    where id = v_pool_id
    for update;
    if v_public_id is null then raise exception 'Pool not found.'; end if;
    select coalesce(max(version_number), 0) + 1 into v_version_number
    from public.exercise_builder_pool_versions
    where pool_id = v_pool_id;
  end if;

  insert into public.exercise_builder_pool_versions (
    pool_id, version_number, title, description, level, topic, subtopic,
    primary_skill, tags, foundation_links, selection_defaults, review_status, created_by
  ) values (
    v_pool_id,
    v_version_number,
    v_title,
    v_description,
    v_level,
    v_topic,
    v_subtopic,
    v_primary_skill,
    public.exercise_builder_jsonb_text_array(coalesce(p_payload -> 'tags', '[]'::jsonb)),
    case when jsonb_typeof(p_payload -> 'foundation_links') = 'array' then p_payload -> 'foundation_links' else '[]'::jsonb end,
    case when jsonb_typeof(p_payload -> 'selection_defaults') = 'object' then p_payload -> 'selection_defaults' else '{}'::jsonb end,
    'in_review',
    auth.uid()
  ) returning id into v_version_id;

  for v_item in select value from jsonb_array_elements(p_memberships)
  loop
    v_question_id := nullif(v_item ->> 'question_id', '')::uuid;
    if v_question_id is null then raise exception 'Every membership requires question_id.'; end if;
    if v_question_id = any(v_seen) then raise exception 'Question % is duplicated in this pool.', v_question_id; end if;
    v_seen := array_append(v_seen, v_question_id);

    v_question_version_id := nullif(v_item ->> 'question_version_id', '')::uuid;
    if v_question_version_id is null then
      select current_version_id into v_question_version_id
      from public.exercise_builder_questions
      where id = v_question_id;
    end if;
    if not exists (
      select 1 from public.exercise_builder_question_versions
      where id = v_question_version_id and question_id = v_question_id
    ) then raise exception 'Invalid version for question %.', v_question_id; end if;

    v_sequence := v_sequence + 1;
    insert into public.exercise_builder_pool_questions (
      pool_version_id, question_id, question_version_id, pinned, sequence_index
    ) values (
      v_version_id,
      v_question_id,
      v_question_version_id,
      coalesce((v_item ->> 'pinned')::boolean, false),
      coalesce((v_item ->> 'sequence_index')::integer, v_sequence)
    );
  end loop;

  update public.exercise_builder_pools
  set current_version_id = v_version_id,
      status = 'draft',
      approved_by = null,
      approved_at = null
  where id = v_pool_id;

  return jsonb_build_object(
    'id', v_pool_id,
    'public_id', v_public_id,
    'version_id', v_version_id,
    'version_number', v_version_number,
    'question_count', jsonb_array_length(p_memberships)
  );
end;
$$;

create or replace function public.admin_get_exercise_builder_pool_detail(p_pool_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', pool.id,
    'public_id', pool.public_id,
    'status', pool.status,
    'version_id', version.id,
    'version_number', version.version_number,
    'review_status', version.review_status,
    'title', version.title,
    'description', version.description,
    'level', version.level,
    'topic', version.topic,
    'subtopic', version.subtopic,
    'primary_skill', version.primary_skill,
    'tags', to_jsonb(version.tags),
    'foundation_links', version.foundation_links,
    'selection_defaults', version.selection_defaults,
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'question_id', membership.question_id,
        'question_version_id', membership.question_version_id,
        'pinned', membership.pinned,
        'sequence_index', membership.sequence_index
      ) order by coalesce(membership.sequence_index, 999999), membership.question_id)
      from public.exercise_builder_pool_questions membership
      where membership.pool_version_id = version.id
    ), '[]'::jsonb)
  )
  from public.exercise_builder_pools pool
  join public.exercise_builder_pool_versions version on version.id = pool.current_version_id
  where pool.id = p_pool_id
    and public.is_admin();
$$;

revoke all on function public.admin_save_exercise_builder_pool_version(uuid, jsonb, jsonb) from public;
revoke all on function public.admin_get_exercise_builder_pool_detail(uuid) from public;
grant execute on function public.admin_save_exercise_builder_pool_version(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.admin_get_exercise_builder_pool_detail(uuid) to authenticated;
