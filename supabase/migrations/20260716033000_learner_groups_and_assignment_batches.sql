-- Additive learner groups and group assignment batches. Every learner keeps an
-- independent assignment, progress record, attempt, deadline, and review.

create sequence if not exists public.learner_group_public_id_seq;

create table if not exists public.learner_groups (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('GRP-' || lpad(nextval('public.learner_group_public_id_seq')::text, 6, '0')),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  group_type text not null default 'cohort' check (group_type in ('cohort', 'company', 'class', 'private_segment', 'other')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.learner_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.learner_groups(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  membership_status text not null default 'active' check (membership_status in ('invited', 'active', 'completed', 'removed')),
  joined_at timestamptz,
  left_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, learner_id)
);

create table if not exists public.assignment_group_batches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.learner_groups(id) on delete restrict,
  source_assignment_id uuid references public.assignments(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'completed', 'archived')),
  required boolean not null default true,
  deadline_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  learner_note text,
  admin_note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assignments
  add column if not exists group_batch_id uuid references public.assignment_group_batches(id) on delete set null;

create unique index if not exists assignments_group_batch_learner_idx
  on public.assignments(group_batch_id, learner_id)
  where group_batch_id is not null;
create index if not exists learner_group_members_learner_idx
  on public.learner_group_members(learner_id, membership_status, group_id);
create index if not exists assignment_group_batches_group_idx
  on public.assignment_group_batches(group_id, created_at desc);

drop trigger if exists learner_groups_set_updated_at on public.learner_groups;
create trigger learner_groups_set_updated_at before update on public.learner_groups
for each row execute function public.set_updated_at();
drop trigger if exists learner_group_members_set_updated_at on public.learner_group_members;
create trigger learner_group_members_set_updated_at before update on public.learner_group_members
for each row execute function public.set_updated_at();
drop trigger if exists assignment_group_batches_set_updated_at on public.assignment_group_batches;
create trigger assignment_group_batches_set_updated_at before update on public.assignment_group_batches
for each row execute function public.set_updated_at();

alter table public.learner_groups enable row level security;
alter table public.learner_group_members enable row level security;
alter table public.assignment_group_batches enable row level security;

drop policy if exists learner_groups_admin_all on public.learner_groups;
create policy learner_groups_admin_all on public.learner_groups for all to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists learner_group_members_admin_all on public.learner_group_members;
create policy learner_group_members_admin_all on public.learner_group_members for all to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists assignment_group_batches_admin_all on public.assignment_group_batches;
create policy assignment_group_batches_admin_all on public.assignment_group_batches for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.learner_groups to authenticated;
grant select, insert, update, delete on public.learner_group_members to authenticated;
grant select, insert, update, delete on public.assignment_group_batches to authenticated;

create or replace function public.admin_save_learner_group(p_group_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_group_id;
  v_name text := nullif(trim(p_payload ->> 'name'), '');
  v_slug text := lower(regexp_replace(coalesce(nullif(trim(p_payload ->> 'slug'), ''), v_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_status text := coalesce(nullif(trim(p_payload ->> 'status'), ''), 'draft');
  v_type text := coalesce(nullif(trim(p_payload ->> 'group_type'), ''), 'cohort');
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if v_name is null then raise exception 'Group name is required.'; end if;
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then raise exception 'Group slug is required.'; end if;
  if v_status not in ('draft', 'active', 'completed', 'archived') then raise exception 'Invalid group status.'; end if;
  if v_type not in ('cohort', 'company', 'class', 'private_segment', 'other') then raise exception 'Invalid group type.'; end if;

  if v_id is null then
    insert into public.learner_groups (
      name, slug, description, status, group_type, starts_at, ends_at, created_by, archived_at
    ) values (
      v_name, v_slug, nullif(trim(p_payload ->> 'description'), ''), v_status, v_type,
      nullif(p_payload ->> 'starts_at', '')::timestamptz,
      nullif(p_payload ->> 'ends_at', '')::timestamptz,
      auth.uid(), case when v_status = 'archived' then now() else null end
    ) returning id into v_id;
  else
    update public.learner_groups
    set name = v_name,
        slug = v_slug,
        description = nullif(trim(p_payload ->> 'description'), ''),
        status = v_status,
        group_type = v_type,
        starts_at = nullif(p_payload ->> 'starts_at', '')::timestamptz,
        ends_at = nullif(p_payload ->> 'ends_at', '')::timestamptz,
        archived_at = case when v_status = 'archived' then coalesce(archived_at, now()) else null end
    where id = v_id;
    if not found then raise exception 'Group not found.'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_replace_learner_group_members(p_group_id uuid, p_learner_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[] := coalesce(p_learner_ids, '{}'::uuid[]);
  v_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if not exists (select 1 from public.learner_groups where id = p_group_id) then raise exception 'Group not found.'; end if;
  if cardinality(v_ids) <> cardinality(array(select distinct unnest(v_ids))) then raise exception 'Duplicate learners are not allowed.'; end if;
  if exists (
    select 1 from unnest(v_ids) learner_id
    where not exists (
      select 1 from public.profiles profile
      where profile.id = learner_id and profile.role = 'learner' and profile.status <> 'deleted'
    )
  ) then raise exception 'Every group member must be an available learner.'; end if;

  update public.learner_group_members
  set membership_status = 'removed', left_at = coalesce(left_at, now())
  where group_id = p_group_id and membership_status <> 'removed' and not (learner_id = any(v_ids));

  insert into public.learner_group_members (group_id, learner_id, membership_status, joined_at, left_at)
  select p_group_id, learner_id, 'active', now(), null from unnest(v_ids) learner_id
  on conflict (group_id, learner_id) do update
  set membership_status = 'active', joined_at = coalesce(learner_group_members.joined_at, now()), left_at = null;

  select count(*) into v_count from public.learner_group_members
  where group_id = p_group_id and membership_status = 'active';
  return v_count;
end;
$$;

create or replace function public.admin_list_learner_groups()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'id', grouping.id,
    'public_id', grouping.public_id,
    'name', grouping.name,
    'slug', grouping.slug,
    'description', grouping.description,
    'status', grouping.status,
    'group_type', grouping.group_type,
    'starts_at', grouping.starts_at,
    'ends_at', grouping.ends_at,
    'created_at', grouping.created_at,
    'updated_at', grouping.updated_at,
    'member_ids', coalesce(member_summary.member_ids, '[]'::jsonb),
    'active_member_count', coalesce(member_summary.active_count, 0),
    'total_member_count', coalesce(member_summary.total_count, 0),
    'batch_count', coalesce(batch_summary.batch_count, 0),
    'assignment_count', coalesce(batch_summary.assignment_count, 0),
    'pending_review_count', coalesce(batch_summary.pending_review_count, 0)
  ) order by grouping.updated_at desc), '[]'::jsonb) else '[]'::jsonb end
  from public.learner_groups grouping
  left join lateral (
    select jsonb_agg(member.learner_id order by member.created_at) filter (where member.membership_status = 'active') member_ids,
      count(*) filter (where member.membership_status = 'active') active_count,
      count(*) filter (where member.membership_status <> 'removed') total_count
    from public.learner_group_members member where member.group_id = grouping.id
  ) member_summary on true
  left join lateral (
    select count(distinct batch.id) batch_count, count(distinct assignment.id) assignment_count,
      count(distinct attempt.id) filter (where attempt.status = 'submitted' and attempt.review_status <> 'approved') pending_review_count
    from public.assignment_group_batches batch
    left join public.assignments assignment on assignment.group_batch_id = batch.id
    left join public.exercise_builder_attempts attempt on attempt.assignment_id = assignment.id
    where batch.group_id = grouping.id
  ) batch_summary on true;
$$;

create or replace function public.admin_get_learner_group(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  select jsonb_build_object(
    'group', to_jsonb(grouping),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', member.id, 'learner_id', profile.id,
        'display_name', profile.display_name, 'email', auth_user.email,
        'profile_status', profile.status, 'membership_status', member.membership_status,
        'joined_at', member.joined_at, 'left_at', member.left_at,
        'assignment_count', (select count(*) from public.assignments assignment join public.assignment_group_batches batch on batch.id = assignment.group_batch_id where batch.group_id = grouping.id and assignment.learner_id = profile.id),
        'completed_assignment_count', (select count(*) from public.assignments assignment join public.assignment_group_batches batch on batch.id = assignment.group_batch_id where batch.group_id = grouping.id and assignment.learner_id = profile.id and assignment.status = 'completed')
      ) order by member.membership_status, profile.display_name, auth_user.email)
      from public.learner_group_members member
      join public.profiles profile on profile.id = member.learner_id
      join auth.users auth_user on auth_user.id = profile.id
      where member.group_id = grouping.id
    ), '[]'::jsonb),
    'available_learners', coalesce((
      select jsonb_agg(jsonb_build_object('id', profile.id, 'display_name', profile.display_name, 'email', auth_user.email, 'status', profile.status) order by profile.display_name, auth_user.email)
      from public.profiles profile join auth.users auth_user on auth_user.id = profile.id
      where profile.role = 'learner' and profile.status <> 'deleted'
    ), '[]'::jsonb),
    'batches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', batch.id, 'title', batch.title, 'status', batch.status,
        'deadline_at', batch.deadline_at, 'created_at', batch.created_at,
        'assignment_count', (select count(*) from public.assignments assignment where assignment.group_batch_id = batch.id),
        'completed_count', (select count(*) from public.assignments assignment where assignment.group_batch_id = batch.id and assignment.status = 'completed'),
        'published_count', (select count(*) from public.assignments assignment where assignment.group_batch_id = batch.id and assignment.status = 'published')
      ) order by batch.created_at desc)
      from public.assignment_group_batches batch where batch.group_id = grouping.id
    ), '[]'::jsonb),
    'source_assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', assignment.id, 'title', assignment.title,
        'learner_name', coalesce(nullif(profile.display_name, ''), auth_user.email::text),
        'resource_count', (select count(*) from public.assignment_resources resource where resource.assignment_id = assignment.id),
        'study_item_count', coalesce((select settings.snapshot_item_count from public.assignment_study_settings settings where settings.assignment_id = assignment.id), 0)
      ) order by assignment.updated_at desc)
      from public.assignments assignment
      join public.profiles profile on profile.id = assignment.learner_id
      join auth.users auth_user on auth_user.id = profile.id
      where public.assignment_has_publishable_content(assignment.id)
    ), '[]'::jsonb)
  ) into v_result
  from public.learner_groups grouping where grouping.id = p_group_id;
  if v_result is null then raise exception 'Group not found.'; end if;
  return v_result;
end;
$$;

create or replace function public.admin_create_group_assignment_batch(
  p_group_id uuid,
  p_source_assignment_id uuid,
  p_title text,
  p_learner_note text default null,
  p_admin_note text default null,
  p_required boolean default true,
  p_deadline_at timestamptz default null,
  p_estimated_minutes integer default null,
  p_publish_now boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_assignment_id uuid;
  v_member record;
  v_resource record;
  v_new_resource_id uuid;
  v_assignment_ids uuid[] := '{}'::uuid[];
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'Batch title is required.'; end if;
  if p_estimated_minutes is not null and p_estimated_minutes <= 0 then raise exception 'Estimated minutes must be positive.'; end if;
  if not exists (select 1 from public.learner_groups where id = p_group_id and status <> 'archived') then raise exception 'Active group not found.'; end if;
  if p_source_assignment_id is null or not coalesce(public.assignment_has_publishable_content(p_source_assignment_id), false) then raise exception 'Source assignment has no publishable content.'; end if;
  if not exists (
    select 1 from public.learner_group_members member join public.profiles profile on profile.id = member.learner_id
    where member.group_id = p_group_id and member.membership_status = 'active' and profile.status = 'active'
  ) then raise exception 'Group has no active learners.'; end if;

  insert into public.assignment_group_batches (
    group_id, source_assignment_id, title, status, required, deadline_at,
    estimated_minutes, learner_note, admin_note, created_by
  ) values (
    p_group_id, p_source_assignment_id, trim(p_title), case when p_publish_now then 'published' else 'draft' end,
    p_required, p_deadline_at, p_estimated_minutes, nullif(trim(p_learner_note), ''),
    nullif(trim(p_admin_note), ''), auth.uid()
  ) returning id into v_batch_id;

  create temporary table if not exists pg_temp.group_resource_map (
    old_id uuid primary key,
    new_id uuid not null
  ) on commit drop;

  for v_member in
    select member.learner_id
    from public.learner_group_members member
    join public.profiles profile on profile.id = member.learner_id
    where member.group_id = p_group_id and member.membership_status = 'active' and profile.status = 'active'
    order by member.created_at
  loop
    truncate pg_temp.group_resource_map;
    insert into public.assignments (
      learner_id, teacher_id, title, reason, learner_note, status, required,
      deadline_at, estimated_minutes, published_at, created_by, group_batch_id
    ) values (
      v_member.learner_id, auth.uid(), trim(p_title), nullif(trim(p_admin_note), ''),
      nullif(trim(p_learner_note), ''), case when p_publish_now then 'published' else 'draft' end,
      p_required, p_deadline_at, p_estimated_minutes, case when p_publish_now then now() else null end,
      auth.uid(), v_batch_id
    ) returning id into v_assignment_id;
    v_assignment_ids := array_append(v_assignment_ids, v_assignment_id);

    insert into public.assignment_items (
      assignment_id, learning_item_id, collection_id, sequence_index, required, introduction_state
    ) select v_assignment_id, learning_item_id, collection_id, sequence_index, required, introduction_state
      from public.assignment_items where assignment_id = p_source_assignment_id;

    insert into public.assignment_study_settings (
      assignment_id, include_in_srs, exercise_modes, selected_deck_ids,
      selected_item_ids, snapshot_item_count
    ) select v_assignment_id, include_in_srs, exercise_modes, selected_deck_ids,
      selected_item_ids, snapshot_item_count
      from public.assignment_study_settings where assignment_id = p_source_assignment_id;

    for v_resource in
      select * from public.assignment_resources
      where assignment_id = p_source_assignment_id and collection_parent_resource_id is null
      order by sequence_index
    loop
      insert into public.assignment_resources (
        assignment_id, resource_key, resource_type, title, description, route,
        sequence_index, practice_config, exercise_config, collection_config,
        collection_snapshot, collection_parent_resource_id, collection_item_id
      ) values (
        v_assignment_id, v_resource.resource_key, v_resource.resource_type, v_resource.title,
        v_resource.description, v_resource.route, v_resource.sequence_index,
        v_resource.practice_config, v_resource.exercise_config, v_resource.collection_config,
        v_resource.collection_snapshot, null, v_resource.collection_item_id
      ) returning id into v_new_resource_id;
      insert into pg_temp.group_resource_map(old_id, new_id) values (v_resource.id, v_new_resource_id);
    end loop;

    for v_resource in
      select * from public.assignment_resources
      where assignment_id = p_source_assignment_id and collection_parent_resource_id is not null
      order by sequence_index
    loop
      insert into public.assignment_resources (
        assignment_id, resource_key, resource_type, title, description, route,
        sequence_index, practice_config, exercise_config, collection_config,
        collection_snapshot, collection_parent_resource_id, collection_item_id
      ) values (
        v_assignment_id, v_resource.resource_key, v_resource.resource_type, v_resource.title,
        v_resource.description, v_resource.route, v_resource.sequence_index,
        v_resource.practice_config, v_resource.exercise_config, v_resource.collection_config,
        v_resource.collection_snapshot,
        (select new_id from pg_temp.group_resource_map where old_id = v_resource.collection_parent_resource_id),
        v_resource.collection_item_id
      );
    end loop;
  end loop;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'assignment_count', cardinality(v_assignment_ids),
    'assignment_ids', to_jsonb(v_assignment_ids)
  );
end;
$$;

create or replace function public.refresh_assignment_group_batch_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_total integer;
  v_completed integer;
  v_archived integer;
  v_published integer;
begin
  v_batch_id := case when tg_op = 'DELETE' then old.group_batch_id else new.group_batch_id end;
  if v_batch_id is null then return null; end if;
  select count(*), count(*) filter (where status = 'completed'),
    count(*) filter (where status = 'archived'), count(*) filter (where status = 'published')
  into v_total, v_completed, v_archived, v_published
  from public.assignments where group_batch_id = v_batch_id;
  update public.assignment_group_batches
  set status = case
    when v_total > 0 and v_completed = v_total then 'completed'
    when v_total > 0 and v_archived = v_total then 'archived'
    when v_published > 0 then 'published'
    else 'draft'
  end
  where id = v_batch_id;
  return null;
end;
$$;

drop trigger if exists assignments_refresh_group_batch_status on public.assignments;
create trigger assignments_refresh_group_batch_status
after insert or update or delete on public.assignments
for each row execute function public.refresh_assignment_group_batch_status();

create or replace function public.admin_list_assignment_group_links()
returns table (assignment_id uuid, batch_id uuid, group_id uuid, group_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  return query
  select assignment.id, batch.id, grouping.id, grouping.name
  from public.assignments assignment
  join public.assignment_group_batches batch on batch.id = assignment.group_batch_id
  join public.learner_groups grouping on grouping.id = batch.group_id;
end;
$$;

revoke all on function public.admin_save_learner_group(uuid, jsonb) from public;
revoke all on function public.admin_replace_learner_group_members(uuid, uuid[]) from public;
revoke all on function public.admin_list_learner_groups() from public;
revoke all on function public.admin_get_learner_group(uuid) from public;
revoke all on function public.admin_create_group_assignment_batch(uuid, uuid, text, text, text, boolean, timestamptz, integer, boolean) from public;
revoke all on function public.admin_list_assignment_group_links() from public;
revoke all on function public.refresh_assignment_group_batch_status() from public;
grant execute on function public.admin_save_learner_group(uuid, jsonb) to authenticated;
grant execute on function public.admin_replace_learner_group_members(uuid, uuid[]) to authenticated;
grant execute on function public.admin_list_learner_groups() to authenticated;
grant execute on function public.admin_get_learner_group(uuid) to authenticated;
grant execute on function public.admin_create_group_assignment_batch(uuid, uuid, text, text, text, boolean, timestamptz, integer, boolean) to authenticated;
grant execute on function public.admin_list_assignment_group_links() to authenticated;

notify pgrst, 'reload schema';
