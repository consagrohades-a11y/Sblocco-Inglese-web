-- Use an integer row count internally and expose a boolean result.

create or replace function public.finalize_pending_assignment_publish(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  update public.assignments assignment
  set status = 'published',
      published_at = coalesce(assignment.published_at, now()),
      pending_status = null,
      updated_at = now()
  where assignment.id = p_assignment_id
    and assignment.pending_status = 'published'
    and public.assignment_has_publishable_content(assignment.id);

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.finalize_pending_assignment_publish(uuid) from public;
