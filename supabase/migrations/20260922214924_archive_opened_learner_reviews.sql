create or replace function public.archive_learner_review_notifications_for_attempt(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.learner_notifications
  set
    read_at = coalesce(read_at, now()),
    archived_at = coalesce(archived_at, now())
  where learner_id = auth.uid()
    and related_attempt_id = p_attempt_id
    and notification_type in ('writing_review_published', 'exercise_review_published')
    and archived_at is null;
end;
$$;

revoke all on function public.archive_learner_review_notifications_for_attempt(uuid) from public;
grant execute on function public.archive_learner_review_notifications_for_attempt(uuid) to authenticated;

notify pgrst, 'reload schema';
