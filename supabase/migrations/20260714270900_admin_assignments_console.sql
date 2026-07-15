-- Global admin assignments console with learner, content, and attempt summaries.

create or replace function public.admin_list_assignments_overview()
returns table (
  id uuid,
  learner_id uuid,
  learner_name text,
  learner_email text,
  learner_status text,
  title text,
  status text,
  required boolean,
  deadline_at timestamptz,
  estimated_minutes integer,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  resource_count bigint,
  resource_types text[],
  study_item_count integer,
  exercise_attempt_count bigint,
  submitted_attempt_count bigint,
  latest_score numeric,
  has_content boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    assignment.id,
    assignment.learner_id,
    coalesce(nullif(trim(profile.display_name), ''), auth_user.email::text, 'Studente') as learner_name,
    auth_user.email::text as learner_email,
    profile.status as learner_status,
    assignment.title,
    assignment.status,
    assignment.required,
    assignment.deadline_at,
    assignment.estimated_minutes,
    assignment.published_at,
    assignment.created_at,
    assignment.updated_at,
    coalesce(resource_summary.resource_count, 0)::bigint,
    coalesce(resource_summary.resource_types, '{}'::text[]),
    coalesce(study.snapshot_item_count, 0),
    coalesce(attempt_summary.exercise_attempt_count, 0)::bigint,
    coalesce(attempt_summary.submitted_attempt_count, 0)::bigint,
    attempt_summary.latest_score,
    public.assignment_has_publishable_content(assignment.id)
  from public.assignments assignment
  join public.profiles profile on profile.id = assignment.learner_id
  join auth.users auth_user on auth_user.id = assignment.learner_id
  left join public.assignment_study_settings study on study.assignment_id = assignment.id
  left join lateral (
    select
      count(*)::bigint as resource_count,
      coalesce(array_agg(distinct resource.resource_type order by resource.resource_type), '{}'::text[]) as resource_types
    from public.assignment_resources resource
    where resource.assignment_id = assignment.id
  ) resource_summary on true
  left join lateral (
    select
      count(*)::bigint as exercise_attempt_count,
      count(*) filter (where attempt.status = 'submitted')::bigint as submitted_attempt_count,
      (
        select submitted.score
        from public.exercise_builder_attempts submitted
        where submitted.assignment_id = assignment.id
          and submitted.status = 'submitted'
        order by submitted.submitted_at desc nulls last, submitted.created_at desc
        limit 1
      ) as latest_score
    from public.exercise_builder_attempts attempt
    where attempt.assignment_id = assignment.id
  ) attempt_summary on true
  order by
    case assignment.status
      when 'published' then 0
      when 'draft' then 1
      when 'completed' then 2
      when 'archived' then 3
      else 4
    end,
    assignment.deadline_at asc nulls last,
    assignment.created_at desc;
end;
$$;

create or replace function public.admin_set_assignment_overview_status(
  p_assignment_id uuid,
  p_next_status text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_next_status text := lower(trim(coalesce(p_next_status, '')));
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if v_next_status not in ('draft', 'published', 'completed', 'archived') then
    raise exception 'Unsupported assignment status.';
  end if;

  select assignment.status
  into v_current_status
  from public.assignments assignment
  where assignment.id = p_assignment_id
  for update;

  if v_current_status is null then
    raise exception 'Assignment not found.';
  end if;

  if v_next_status = 'published'
    and not public.assignment_has_publishable_content(p_assignment_id) then
    raise exception 'Add at least one learner-visible activity before publishing.';
  end if;

  update public.assignments assignment
  set status = v_next_status,
      pending_status = null,
      published_at = case
        when v_next_status = 'published' then coalesce(assignment.published_at, now())
        when v_next_status = 'draft' then null
        else assignment.published_at
      end,
      updated_at = now()
  where assignment.id = p_assignment_id;

  return v_next_status;
end;
$$;

revoke all on function public.admin_list_assignments_overview() from public;
revoke all on function public.admin_set_assignment_overview_status(uuid, text) from public;

grant execute on function public.admin_list_assignments_overview() to authenticated;
grant execute on function public.admin_set_assignment_overview_status(uuid, text) to authenticated;
