-- Learner notifications for newly assigned work and published writing reviews.

alter table public.learner_notifications
  add column if not exists related_assignment_id uuid references public.assignments(id) on delete cascade;

alter table public.learner_notifications
  drop constraint if exists learner_notifications_notification_type_check;
alter table public.learner_notifications
  add constraint learner_notifications_notification_type_check
  check (notification_type in (
    'assignment_published',
    'exercise_review_published',
    'writing_review_published',
    'milestone_srs',
    'milestone_exercise',
    'milestone_practice'
  ));

create unique index if not exists learner_notifications_assignment_type_idx
  on public.learner_notifications(learner_id, notification_type, related_assignment_id)
  where related_assignment_id is not null;

create or replace function public.learner_assignment_notification_route(p_assignment_id uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_resource record;
begin
  select id, resource_type, route
    into v_resource
  from public.assignment_resources
  where assignment_id = p_assignment_id
    and collection_parent_resource_id is null
    and resource_type not in ('trainer')
  order by sequence_index, created_at
  limit 1;

  if v_resource.id is null then
    return '/assignments/' || p_assignment_id::text;
  end if;

  if v_resource.resource_type = 'custom_exercise' then
    return '/exercises?assignmentId=' || p_assignment_id::text || '&resourceId=' || v_resource.id::text;
  elsif v_resource.resource_type = 'exercise_collection' then
    return '/collections?assignmentId=' || p_assignment_id::text || '&resourceId=' || v_resource.id::text;
  elsif v_resource.resource_type = 'practice_session' then
    return '/practice?assignmentId=' || p_assignment_id::text || '&resourceId=' || v_resource.id::text;
  elsif nullif(v_resource.route, '') is not null then
    return v_resource.route;
  end if;

  return '/assignments/' || p_assignment_id::text;
end;
$$;

revoke all on function public.learner_assignment_notification_route(uuid) from public;

create or replace function public.publish_learner_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'published' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  insert into public.learner_notifications (
    learner_id,
    notification_type,
    title,
    message,
    route,
    related_assignment_id
  ) values (
    new.learner_id,
    'assignment_published',
    'Nuova attività assegnata',
    coalesce(nullif(new.title, ''), 'La tua nuova attività') || ' è pronta. Aprila e inizia quando vuoi.',
    public.learner_assignment_notification_route(new.id),
    new.id
  )
  on conflict (learner_id, notification_type, related_assignment_id)
    where related_assignment_id is not null
  do update set
    title = excluded.title,
    message = excluded.message,
    route = excluded.route,
    created_at = now(),
    read_at = null;

  return new;
end;
$$;

revoke all on function public.publish_learner_assignment_notification() from public;

drop trigger if exists assignments_learner_published_notification on public.assignments;
create trigger assignments_learner_published_notification
after insert or update of status on public.assignments
for each row execute function public.publish_learner_assignment_notification();

create or replace function public.refresh_learner_assignment_notification_route()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.learner_notifications
  set route = public.learner_assignment_notification_route(new.assignment_id)
  where learner_id = (
      select assignment.learner_id
      from public.assignments assignment
      where assignment.id = new.assignment_id
    )
    and notification_type = 'assignment_published'
    and related_assignment_id = new.assignment_id;

  return new;
end;
$$;

revoke all on function public.refresh_learner_assignment_notification_route() from public;

drop trigger if exists assignment_resources_refresh_learner_notification on public.assignment_resources;
create trigger assignment_resources_refresh_learner_notification
after insert or update of sequence_index, resource_type, route, collection_parent_resource_id
on public.assignment_resources
for each row execute function public.refresh_learner_assignment_notification_route();

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
      read_at = null;
  end if;

  return new;
end;
$$;

revoke all on function public.publish_exercise_review_notification() from public;

drop trigger if exists exercise_builder_attempt_review_notification on public.exercise_builder_attempts;
create trigger exercise_builder_attempt_review_notification
after update of review_status on public.exercise_builder_attempts
for each row execute function public.publish_exercise_review_notification();

notify pgrst, 'reload schema';
