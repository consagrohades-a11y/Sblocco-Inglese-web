create or replace function public.admin_archive_exercise_studio_draft(
  p_draft_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.exercise_studio_drafts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select *
  into v_draft
  from public.exercise_studio_drafts
  where id = p_draft_id
  for update;

  if v_draft.id is null then
    raise exception 'Studio draft not found.';
  end if;

  if v_draft.exercise_id is not null then
    perform public.admin_set_exercise_builder_status(
      'exercise',
      v_draft.exercise_id,
      'archived'
    );
  end if;

  update public.exercise_studio_drafts
  set status = 'archived',
      document = jsonb_set(document, '{status}', '"archived"'::jsonb, true),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_draft_id;

  return jsonb_build_object(
    'draft_id', p_draft_id,
    'exercise_id', v_draft.exercise_id,
    'status', 'archived'
  );
end;
$$;

revoke all on function public.admin_archive_exercise_studio_draft(uuid) from public;
revoke all on function public.admin_archive_exercise_studio_draft(uuid) from anon;
grant execute on function public.admin_archive_exercise_studio_draft(uuid) to authenticated;
