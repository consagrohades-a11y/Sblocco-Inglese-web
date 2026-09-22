create or replace function public.publish_exercise_review_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise_title text;
  v_has_writing_correction boolean := false;
  v_notification_type text;
  v_title text;
  v_message text;
begin
  if new.status = 'submitted'
    and new.review_status = 'approved'
    and old.review_status is distinct from 'approved' then

    v_exercise_title := coalesce(nullif(new.exercise_snapshot ->> 'title', ''), 'Il tuo esercizio');

    select exists (
      select 1
      from public.exercise_builder_attempt_questions question
      where question.attempt_id = new.id
        and coalesce(question.question_snapshot ->> 'type', '') = 'written_response'
        and coalesce(question.teacher_correction, '{}'::jsonb) <> '{}'::jsonb
    ) into v_has_writing_correction;

    if v_has_writing_correction then
      v_notification_type := 'writing_review_published';
      v_title := 'La tua correzione scritta è pronta';
      v_message := v_exercise_title || ': ho revisionato il tuo testo. Apri la correzione per vedere modifiche e spiegazioni.';
    else
      v_notification_type := 'exercise_review_published';
      v_title := 'La revisione è pronta';
      v_message := v_exercise_title || ': la revisione e il punteggio aggiornato sono pronti.';
    end if;

    insert into public.learner_notifications (
      learner_id,
      notification_type,
      title,
      message,
      route,
      related_attempt_id,
      related_assignment_id
    ) values (
      new.learner_id,
      v_notification_type,
      v_title,
      v_message,
      '/exercises?assignmentId=' || new.assignment_id::text || '&resourceId=' || new.assignment_resource_id::text || '&attemptId=' || new.id::text,
      new.id,
      new.assignment_id
    )
    on conflict (learner_id, notification_type, related_attempt_id)
      where related_attempt_id is not null
    do update set
      title = excluded.title,
      message = excluded.message,
      route = excluded.route,
      related_assignment_id = excluded.related_assignment_id,
      created_at = now(),
      read_at = null,
      archived_at = null;
  end if;

  return new;
end;
$$;

create or replace function public.archive_unpublished_review_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.review_status = 'approved'
     and new.review_status is distinct from 'approved' then
    update public.learner_notifications
    set
      read_at = coalesce(read_at, now()),
      archived_at = coalesce(archived_at, now())
    where learner_id = new.learner_id
      and related_attempt_id = new.id
      and notification_type in ('writing_review_published', 'exercise_review_published')
      and archived_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists exercise_builder_attempt_archive_unpublished_review_notification
  on public.exercise_builder_attempts;

create trigger exercise_builder_attempt_archive_unpublished_review_notification
after update of review_status on public.exercise_builder_attempts
for each row
execute function public.archive_unpublished_review_notification();

update public.learner_notifications ln
set
  read_at = coalesce(ln.read_at, now()),
  archived_at = coalesce(ln.archived_at, now())
from public.exercise_builder_attempts a
where ln.related_attempt_id = a.id
  and ln.notification_type in ('writing_review_published', 'exercise_review_published')
  and a.review_status is distinct from 'approved'
  and ln.archived_at is null;

notify pgrst, 'reload schema';
