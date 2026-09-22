alter table public.teacher_notifications
  add column if not exists archived_at timestamptz;

alter table public.learner_notifications
  add column if not exists archived_at timestamptz;

create index if not exists teacher_notifications_active_created_idx
  on public.teacher_notifications (teacher_id, created_at desc)
  where archived_at is null;

create index if not exists learner_notifications_active_created_idx
  on public.learner_notifications (learner_id, created_at desc)
  where archived_at is null;

create or replace function public.archive_learner_notification(p_notification_id uuid)
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
  where id = p_notification_id
    and learner_id = auth.uid();
end;
$$;

revoke all on function public.archive_learner_notification(uuid) from public;
grant execute on function public.archive_learner_notification(uuid) to authenticated;

create or replace function public.archive_teacher_notification(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  update public.teacher_notifications
  set
    read_at = coalesce(read_at, now()),
    archived_at = coalesce(archived_at, now())
  where id = p_notification_id
    and notification_type <> 'learner_signed_up';
end;
$$;

revoke all on function public.archive_teacher_notification(uuid) from public;
grant execute on function public.archive_teacher_notification(uuid) to authenticated;

create or replace function public.archive_resolved_exercise_submission_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.review_status in ('reviewed', 'approved')
     and old.review_status is distinct from new.review_status then
    update public.teacher_notifications
    set
      read_at = coalesce(read_at, now()),
      archived_at = coalesce(archived_at, now())
    where related_attempt_id = new.id
      and notification_type = 'exercise_submitted'
      and archived_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists exercise_builder_attempt_archive_teacher_notification
  on public.exercise_builder_attempts;

create trigger exercise_builder_attempt_archive_teacher_notification
after update of review_status on public.exercise_builder_attempts
for each row
execute function public.archive_resolved_exercise_submission_notification();

create or replace function public.archive_started_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignment_id is not null and new.learner_id is not null then
    update public.learner_notifications
    set
      read_at = coalesce(read_at, now()),
      archived_at = coalesce(archived_at, now())
    where learner_id = new.learner_id
      and related_assignment_id = new.assignment_id
      and notification_type = 'assignment_published'
      and archived_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists exercise_builder_attempt_archive_assignment_notification
  on public.exercise_builder_attempts;

create trigger exercise_builder_attempt_archive_assignment_notification
after insert on public.exercise_builder_attempts
for each row
execute function public.archive_started_assignment_notification();

update public.teacher_notifications tn
set
  read_at = coalesce(tn.read_at, now()),
  archived_at = coalesce(tn.archived_at, now())
from public.exercise_builder_attempts a
where tn.notification_type = 'exercise_submitted'
  and tn.related_attempt_id = a.id
  and a.review_status in ('reviewed', 'approved')
  and tn.archived_at is null;

update public.learner_notifications ln
set
  read_at = coalesce(ln.read_at, now()),
  archived_at = coalesce(ln.archived_at, now())
where ln.notification_type = 'assignment_published'
  and ln.archived_at is null
  and exists (
    select 1
    from public.exercise_builder_attempts a
    where a.learner_id = ln.learner_id
      and a.assignment_id = ln.related_assignment_id
  );

update public.learner_notifications
set archived_at = coalesce(archived_at, read_at)
where notification_type in ('writing_review_published', 'exercise_review_published')
  and read_at is not null
  and archived_at is null;

notify pgrst, 'reload schema';
