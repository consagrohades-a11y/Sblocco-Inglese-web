-- Secure admin-only assignment creation.
-- Apply manually in Supabase SQL Editor after review.

create or replace function public.admin_create_assignment(
  target_learner_id uuid,
  assignment_title text,
  learner_message text default null,
  private_admin_note text default null,
  is_required boolean default true,
  deadline_at_value timestamptz default null,
  estimated_minutes_value integer default null,
  publish_now boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_assignment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if target_learner_id is null then
    raise exception 'Learner is required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_learner_id
      and role = 'learner'
      and status <> 'deleted'
  ) then
    raise exception 'Learner not found.';
  end if;

  if nullif(trim(assignment_title), '') is null then
    raise exception 'Assignment title is required.';
  end if;

  if estimated_minutes_value is not null and estimated_minutes_value <= 0 then
    raise exception 'Estimated minutes must be greater than zero.';
  end if;

  insert into public.assignments (
    learner_id,
    teacher_id,
    title,
    reason,
    learner_note,
    status,
    required,
    deadline_at,
    estimated_minutes,
    published_at,
    created_by
  )
  values (
    target_learner_id,
    auth.uid(),
    trim(assignment_title),
    nullif(trim(private_admin_note), ''),
    nullif(trim(learner_message), ''),
    case when publish_now then 'published' else 'draft' end,
    is_required,
    deadline_at_value,
    estimated_minutes_value,
    case when publish_now then now() else null end,
    auth.uid()
  )
  returning id into new_assignment_id;

  return new_assignment_id;
end;
$$;

revoke all on function public.admin_create_assignment(uuid, text, text, text, boolean, timestamptz, integer, boolean) from public;
grant execute on function public.admin_create_assignment(uuid, text, text, text, boolean, timestamptz, integer, boolean) to authenticated;
