-- Unified admin assignment management.
-- Deadlines are informational. Access is controlled separately by access_ends_at.

create or replace function public.admin_update_assignment(
  target_assignment_id uuid,
  assignment_title text,
  learner_message text default null,
  private_admin_note text default null,
  is_required boolean default true,
  deadline_at_value timestamptz default null,
  estimated_minutes_value integer default null,
  next_status text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select status into current_status
  from public.assignments
  where id = target_assignment_id;

  if current_status is null then
    raise exception 'Assignment not found.';
  end if;

  if nullif(trim(assignment_title), '') is null then
    raise exception 'Assignment title is required.';
  end if;

  if estimated_minutes_value is not null and estimated_minutes_value <= 0 then
    raise exception 'Estimated minutes must be greater than zero.';
  end if;

  if next_status is not null and next_status not in ('draft', 'published', 'completed', 'archived') then
    raise exception 'Unsupported assignment status.';
  end if;

  update public.assignments
  set title = trim(assignment_title),
      learner_note = nullif(trim(learner_message), ''),
      reason = nullif(trim(private_admin_note), ''),
      required = is_required,
      deadline_at = deadline_at_value,
      estimated_minutes = estimated_minutes_value,
      status = coalesce(next_status, current_status),
      published_at = case
        when coalesce(next_status, current_status) = 'published' and published_at is null then now()
        when coalesce(next_status, current_status) = 'draft' then null
        else published_at
      end,
      updated_at = now()
  where id = target_assignment_id;
end;
$$;

revoke all on function public.admin_update_assignment(uuid, text, text, text, boolean, timestamptz, integer, text) from public;
grant execute on function public.admin_update_assignment(uuid, text, text, text, boolean, timestamptz, integer, text) to authenticated;
