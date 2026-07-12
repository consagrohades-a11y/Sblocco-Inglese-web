create or replace function public.admin_list_learners()
returns table (
  id uuid,
  display_name text,
  email text,
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
