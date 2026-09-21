-- Fixed learner avatar selection.
-- The application owns the 36 PNG assets; profiles store only the stable avatar key.

alter table public.profiles
  add column if not exists avatar_key text;

alter table public.profiles
  drop constraint if exists profiles_avatar_key_check;

alter table public.profiles
  add constraint profiles_avatar_key_check
  check (
    avatar_key is null
    or avatar_key ~ '^avatar-(0[1-9]|[12][0-9]|3[0-6])$'
  );

comment on column public.profiles.avatar_key is
  'Optional key for the fixed Sblocco learner avatar set (avatar-01 through avatar-36).';

-- Keep learner-editable profile fields explicit in the guard message.
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
      raise exception 'Only display_name, interface_language, timezone, and avatar_key can be updated by learners.';
    end if;
  end if;

  return new;
end;
$$;

-- Surface avatar_key to existing admin learner-directory consumers.
drop function if exists public.admin_list_learners();

create function public.admin_list_learners()
returns table (
  id uuid,
  display_name text,
  email text,
  avatar_key text,
  interface_language text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    p.id,
    p.display_name,
    u.email::text,
    p.avatar_key,
    p.interface_language,
    p.status,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'learner'
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_learners() from public;
grant execute on function public.admin_list_learners() to authenticated;
