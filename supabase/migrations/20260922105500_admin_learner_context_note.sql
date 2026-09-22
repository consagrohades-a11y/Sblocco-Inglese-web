-- Persistent admin-only learner context subtitle.
alter table public.profiles
  add column if not exists admin_context_note text;

alter table public.profiles
  drop constraint if exists profiles_admin_context_note_length_check;

alter table public.profiles
  add constraint profiles_admin_context_note_length_check
  check (admin_context_note is null or char_length(admin_context_note) <= 280);

comment on column public.profiles.admin_context_note is
  'Private admin-only learner context shown as a short subtitle in the teaching workspace.';

create or replace function public.admin_get_learner_context_note(target_learner_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_note text;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  select p.admin_context_note into v_note
  from public.profiles p
  where p.id = target_learner_id and p.role = 'learner';
  return v_note;
end;
$$;

create or replace function public.admin_set_learner_context_note(target_learner_id uuid, context_note text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_note text := nullif(btrim(context_note), '');
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if v_note is not null and char_length(v_note) > 280 then
    raise exception 'Context note cannot exceed 280 characters.';
  end if;
  update public.profiles set admin_context_note = v_note
  where id = target_learner_id and role = 'learner';
  if not found then raise exception 'Learner not found.'; end if;
  return v_note;
end;
$$;

revoke all on function public.admin_get_learner_context_note(uuid) from public, anon;
revoke all on function public.admin_set_learner_context_note(uuid,text) from public, anon;
grant execute on function public.admin_get_learner_context_note(uuid) to authenticated;
grant execute on function public.admin_set_learner_context_note(uuid,text) to authenticated;

-- Keep directory RPC compatible while exposing the private subtitle to admins.
drop function if exists public.admin_list_learners();
create function public.admin_list_learners()
returns table (
  id uuid,
  display_name text,
  email text,
  avatar_key text,
  avatar_background_key text,
  profession text,
  age smallint,
  admin_context_note text,
  interface_language text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
  select p.id, p.display_name, u.email::text, p.avatar_key, p.avatar_background_key,
         p.profession, p.age, p.admin_context_note, p.interface_language, p.status, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'learner'
  order by p.created_at desc;
end;
$$;
revoke all on function public.admin_list_learners() from public, anon;
grant execute on function public.admin_list_learners() to authenticated;

notify pgrst, 'reload schema';
