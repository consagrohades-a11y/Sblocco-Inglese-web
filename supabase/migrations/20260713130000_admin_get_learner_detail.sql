-- Return one learner profile with related teaching relationships and assignments.
-- This function is callable only by authenticated users and returns data only to active admins.

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
          'created_at', learner_assignments.created_at
        )
        order by learner_assignments.created_at desc
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

revoke all on function public.admin_get_learner_detail(uuid) from public;
grant execute on function public.admin_get_learner_detail(uuid) to authenticated;
