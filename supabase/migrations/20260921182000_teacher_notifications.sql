-- Teacher notification inbox for operational learner events.
-- V1 covers new learner registrations and Exercise Builder submissions.

create table if not exists public.teacher_notifications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text,
  route text not null,
  related_learner_id uuid references public.profiles(id) on delete cascade,
  related_attempt_id uuid references public.exercise_builder_attempts(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint teacher_notifications_type_check
    check (notification_type in ('learner_signed_up', 'exercise_submitted'))
);

create unique index if not exists teacher_notifications_signup_unique_idx
  on public.teacher_notifications(teacher_id, notification_type, related_learner_id)
  where notification_type = 'learner_signed_up' and related_learner_id is not null;

create unique index if not exists teacher_notifications_attempt_unique_idx
  on public.teacher_notifications(teacher_id, notification_type, related_attempt_id)
  where notification_type = 'exercise_submitted' and related_attempt_id is not null;

create index if not exists teacher_notifications_teacher_created_idx
  on public.teacher_notifications(teacher_id, created_at desc);

create index if not exists teacher_notifications_unread_idx
  on public.teacher_notifications(teacher_id, created_at desc)
  where read_at is null;

alter table public.teacher_notifications enable row level security;

drop policy if exists teacher_notifications_select_own on public.teacher_notifications;
create policy teacher_notifications_select_own
on public.teacher_notifications
for select
to authenticated
using (teacher_id = auth.uid());

revoke all on public.teacher_notifications from anon;
revoke insert, update, delete on public.teacher_notifications from authenticated;
grant select on public.teacher_notifications to authenticated;

create or replace function public.publish_teacher_learner_signup_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.role <> 'learner' or new.status <> 'active' then
    return new;
  end if;

  v_name := coalesce(nullif(btrim(new.display_name), ''), 'Un nuovo studente');

  insert into public.teacher_notifications (
    teacher_id,
    notification_type,
    title,
    message,
    route,
    related_learner_id,
    metadata
  )
  select
    admin_profile.id,
    'learner_signed_up',
    'Nuovo studente',
    v_name || ' ha creato il suo account Sblocco.',
    '/admin/learners/' || new.id::text,
    new.id,
    jsonb_build_object(
      'learner_name', v_name,
      'profession', new.profession,
      'age', new.age
    )
  from public.profiles admin_profile
  where admin_profile.role = 'admin'
    and admin_profile.status = 'active'
  on conflict (teacher_id, notification_type, related_learner_id)
    where notification_type = 'learner_signed_up' and related_learner_id is not null
  do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_teacher_signup_notification on public.profiles;
create trigger profiles_teacher_signup_notification
after insert on public.profiles
for each row execute function public.publish_teacher_learner_signup_notification();

create or replace function public.publish_teacher_exercise_submission_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid;
  v_learner_name text;
  v_exercise_title text;
  v_pending_review integer := 0;
  v_message text;
begin
  if new.status <> 'submitted' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'submitted' then
    return new;
  end if;

  select coalesce(assignment.teacher_id, assignment.created_by)
    into v_teacher_id
  from public.assignments assignment
  where assignment.id = new.assignment_id;

  select coalesce(nullif(btrim(profile.display_name), ''), 'Uno studente')
    into v_learner_name
  from public.profiles profile
  where profile.id = new.learner_id;

  v_learner_name := coalesce(v_learner_name, 'Uno studente');
  v_exercise_title := coalesce(nullif(new.exercise_snapshot ->> 'title', ''), 'un esercizio');
  v_pending_review := greatest(coalesce((new.result_summary ->> 'pending_review')::integer, 0), 0);

  if v_pending_review > 0 then
    v_message := v_learner_name || ' ha completato "' || v_exercise_title || '". '
      || v_pending_review::text
      || case when v_pending_review = 1 then ' risposta da rivedere.' else ' risposte da rivedere.' end;
  elsif new.score is not null then
    v_message := v_learner_name || ' ha completato "' || v_exercise_title || '" · '
      || round(new.score)::integer::text || '%.';
  else
    v_message := v_learner_name || ' ha completato "' || v_exercise_title || '".';
  end if;

  if exists (
    select 1
    from public.profiles profile
    where profile.id = v_teacher_id
      and profile.role = 'admin'
      and profile.status = 'active'
  ) then
    insert into public.teacher_notifications (
      teacher_id,
      notification_type,
      title,
      message,
      route,
      related_learner_id,
      related_attempt_id,
      metadata
    ) values (
      v_teacher_id,
      'exercise_submitted',
      'Esercizio completato',
      v_message,
      '/admin/content/exercises/results?attemptId=' || new.id::text,
      new.learner_id,
      new.id,
      jsonb_build_object(
        'learner_name', v_learner_name,
        'exercise_title', v_exercise_title,
        'score', new.score,
        'pending_review', v_pending_review,
        'review_required', coalesce((new.result_summary ->> 'review_required')::boolean, false)
      )
    )
    on conflict (teacher_id, notification_type, related_attempt_id)
      where notification_type = 'exercise_submitted' and related_attempt_id is not null
    do nothing;
  else
    insert into public.teacher_notifications (
      teacher_id,
      notification_type,
      title,
      message,
      route,
      related_learner_id,
      related_attempt_id,
      metadata
    )
    select
      admin_profile.id,
      'exercise_submitted',
      'Esercizio completato',
      v_message,
      '/admin/content/exercises/results?attemptId=' || new.id::text,
      new.learner_id,
      new.id,
      jsonb_build_object(
        'learner_name', v_learner_name,
        'exercise_title', v_exercise_title,
        'score', new.score,
        'pending_review', v_pending_review,
        'review_required', coalesce((new.result_summary ->> 'review_required')::boolean, false)
      )
    from public.profiles admin_profile
    where admin_profile.role = 'admin'
      and admin_profile.status = 'active'
    on conflict (teacher_id, notification_type, related_attempt_id)
      where notification_type = 'exercise_submitted' and related_attempt_id is not null
    do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists exercise_builder_attempt_teacher_notification on public.exercise_builder_attempts;
create trigger exercise_builder_attempt_teacher_notification
after insert or update of status on public.exercise_builder_attempts
for each row execute function public.publish_teacher_exercise_submission_notification();

create or replace function public.mark_teacher_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.teacher_notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and teacher_id = auth.uid();

  if not found then
    raise exception 'Notification not found.';
  end if;
end;
$$;

create or replace function public.mark_all_teacher_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.teacher_notifications
  set read_at = now()
  where teacher_id = auth.uid()
    and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.publish_teacher_learner_signup_notification() from public;
revoke all on function public.publish_teacher_exercise_submission_notification() from public;
revoke all on function public.mark_teacher_notification_read(uuid) from public;
revoke all on function public.mark_all_teacher_notifications_read() from public;
grant execute on function public.mark_teacher_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_teacher_notifications_read() to authenticated;

do $realtime$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'teacher_notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.teacher_notifications';
  end if;
end;
$realtime$;

notify pgrst, 'reload schema';
