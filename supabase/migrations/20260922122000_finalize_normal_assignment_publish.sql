-- Finalize normal assignment publication as soon as learner-visible content exists.
-- This closes the gap where admin_update_assignment marks a publish request as
-- pending but the resource/collection save path never performs the final publish.

create or replace function public.finalize_assignment_publish_on_content_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
begin
  v_assignment_id := coalesce(new.assignment_id, old.assignment_id);

  if exists (
    select 1
    from public.assignments assignment
    where assignment.id = v_assignment_id
      and assignment.pending_status = 'published'
  ) then
    perform public.finalize_pending_assignment_publish(v_assignment_id);
  end if;

  return null;
end;
$$;

revoke all on function public.finalize_assignment_publish_on_content_change() from public, anon, authenticated;

drop trigger if exists assignment_resources_finalize_pending_publish on public.assignment_resources;
create trigger assignment_resources_finalize_pending_publish
after insert or update on public.assignment_resources
for each row execute function public.finalize_assignment_publish_on_content_change();

-- Repair assignments affected by the old flow.
update public.assignments assignment
set status = 'published',
    published_at = coalesce(assignment.published_at, now()),
    pending_status = null,
    updated_at = now()
where assignment.status = 'draft'
  and assignment.pending_status = 'published'
  and public.assignment_has_publishable_content(assignment.id);

notify pgrst, 'reload schema';
