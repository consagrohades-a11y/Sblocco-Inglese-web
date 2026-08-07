-- Let admins choose the order in which each learner sees assignments.

alter table public.assignments
  add column if not exists display_order integer not null default 0;

alter table public.assignments
  drop constraint if exists assignments_display_order_check;

alter table public.assignments
  add constraint assignments_display_order_check
  check (display_order >= 0);

-- Build the index before the backfill update. The assignments updated_at trigger
-- leaves pending trigger events, and PostgreSQL will reject CREATE INDEX on the
-- same table until those events have been processed at transaction commit.
create index if not exists assignments_learner_display_order_idx
  on public.assignments (learner_id, display_order, created_at desc);

with ranked_assignments as (
  select
    assignment.id,
    row_number() over (
      partition by assignment.learner_id
      order by assignment.created_at desc, assignment.id
    )::integer as display_order
  from public.assignments assignment
)
update public.assignments assignment
set display_order = ranked.display_order
from ranked_assignments ranked
where ranked.id = assignment.id
  and assignment.display_order = 0;

create or replace function public.admin_reorder_learner_assignments(
  p_learner_id uuid,
  p_assignment_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_count integer := coalesce(cardinality(p_assignment_ids), 0);
  v_distinct_count integer;
  v_matching_count integer;
  v_visible_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_learner_id is null then
    raise exception 'Learner is required.';
  end if;

  if v_requested_count = 0 then
    raise exception 'At least one assignment is required.';
  end if;

  select count(distinct requested.assignment_id)
  into v_distinct_count
  from unnest(p_assignment_ids) as requested(assignment_id);

  if v_distinct_count <> v_requested_count then
    raise exception 'Assignment order contains duplicates.';
  end if;

  select count(*)
  into v_matching_count
  from public.assignments assignment
  where assignment.learner_id = p_learner_id
    and assignment.status <> 'archived'
    and assignment.id = any(p_assignment_ids);

  select count(*)
  into v_visible_count
  from public.assignments assignment
  where assignment.learner_id = p_learner_id
    and assignment.status <> 'archived';

  if v_matching_count <> v_requested_count or v_visible_count <> v_requested_count then
    raise exception 'Assignment order must contain every non-archived assignment for this learner.';
  end if;

  update public.assignments assignment
  set display_order = ordered.position::integer
  from unnest(p_assignment_ids) with ordinality as ordered(id, position)
  where assignment.id = ordered.id
    and assignment.learner_id = p_learner_id;
end;
$$;

create or replace function public.admin_get_learner_detail(target_learner_id uuid)
returns table (
  id uuid,
  display_name text,
  email text,
  interface_language text,
  timezone text,
  status text,
  created_at timestamptz,
  relationships jsonb,
  assignments jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    profiles.id,
    profiles.display_name,
    auth_users.email::text,
    profiles.interface_language,
    profiles.timezone,
    profiles.status,
    profiles.created_at,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', relationships.id,
          'relationship_type', relationships.relationship_type,
          'status', relationships.status,
          'starts_at', relationships.starts_at,
          'ends_at', relationships.ends_at,
          'teacher_id', relationships.teacher_id
        )
        order by relationships.created_at desc
      )
      from public.teaching_relationships as relationships
      where relationships.learner_id = profiles.id
    ), '[]'::jsonb) as relationships,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', learner_assignments.id,
          'title', learner_assignments.title,
          'status', learner_assignments.status,
          'required', learner_assignments.required,
          'deadline_at', learner_assignments.deadline_at,
          'estimated_minutes', learner_assignments.estimated_minutes,
          'published_at', learner_assignments.published_at,
          'created_at', learner_assignments.created_at,
          'display_order', learner_assignments.display_order
        )
        order by
          case when learner_assignments.status = 'archived' then 1 else 0 end,
          learner_assignments.display_order,
          learner_assignments.created_at desc
      )
      from public.assignments as learner_assignments
      where learner_assignments.learner_id = profiles.id
    ), '[]'::jsonb) as assignments
  from public.profiles as profiles
  join auth.users as auth_users on auth_users.id = profiles.id
  where profiles.id = target_learner_id
    and profiles.role = 'learner';
end;
$$;

revoke all on function public.admin_reorder_learner_assignments(uuid, uuid[]) from public;
revoke all on function public.admin_get_learner_detail(uuid) from public;

grant execute on function public.admin_reorder_learner_assignments(uuid, uuid[]) to authenticated;
grant execute on function public.admin_get_learner_detail(uuid) to authenticated;

notify pgrst, 'reload schema';
