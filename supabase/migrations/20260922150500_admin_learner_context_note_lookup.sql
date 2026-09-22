create or replace function public.admin_get_learner_context_note(target_learner_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_note text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select p.admin_context_note
  into v_note
  from public.profiles p
  where p.id = target_learner_id
    and p.role = 'learner';

  return v_note;
end;
$$;

revoke all on function public.admin_get_learner_context_note(uuid) from public, anon;
grant execute on function public.admin_get_learner_context_note(uuid) to authenticated;

notify pgrst, 'reload schema';
