-- Create a learner profile automatically when Supabase Auth creates a user.
-- Review-only migration: do not apply to production from Codex.
-- Browser clients cannot choose role, status, id, created_at, or updated_at.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    interface_language,
    timezone,
    role,
    status
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), ''),
    'it',
    'Europe/Rome',
    'learner',
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
