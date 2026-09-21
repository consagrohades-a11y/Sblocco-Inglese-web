-- Add lightweight learner profile details used in account settings and teacher context.

alter table public.profiles
  add column if not exists profession text,
  add column if not exists age smallint;

alter table public.profiles
  drop constraint if exists profiles_profession_length_check,
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add constraint profiles_profession_length_check
  check (profession is null or char_length(btrim(profession)) between 1 and 80),
  add constraint profiles_age_check
  check (age is null or age between 5 and 120);

comment on column public.profiles.profession is
  'Optional learner-entered profession or current role.';
comment on column public.profiles.age is
  'Optional learner-entered age in years; date of birth is intentionally not stored.';

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.id is distinct from old.id
      or new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at
      or new.updated_at is distinct from old.updated_at then
      raise exception 'Only display_name, interface_language, timezone, profession, age, avatar_key, and avatar_background_key can be updated by learners.';
    end if;
  end if;

  return new;
end;
$$;

drop function if exists public.admin_get_learner_detail(uuid);

create function public.admin_get_learner_detail(target_learner_id uuid)
returns table (
  id uuid,
  display_name text,
  email text,
  avatar_key text,
  avatar_background_key text,
  profession text,
  age smallint,
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
    profiles.avatar_key,
    profiles.avatar_background_key,
    profiles.profession,
    profiles.age,
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

revoke all on function public.admin_get_learner_detail(uuid) from public;
grant execute on function public.admin_get_learner_detail(uuid) to authenticated;

notify pgrst, 'reload schema';
