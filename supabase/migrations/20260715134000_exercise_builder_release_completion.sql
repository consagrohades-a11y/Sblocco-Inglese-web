-- Exercise Builder v2 release completion.
-- Adds automatic dialogue choices, learner review notifications, and ensures
-- teacher feedback is learner-visible only after the review is published.

alter table public.exercise_builder_question_versions
  drop constraint if exists exercise_builder_question_versions_question_type_check;
alter table public.exercise_builder_question_versions
  add constraint exercise_builder_question_versions_question_type_check
  check (question_type in (
    'multiple_choice',
    'multiple_select',
    'gap_fill',
    'select_gap',
    'translation',
    'error_correction',
    'word_order',
    'content_block',
    'dialogue_choice',
    'written_response',
    'dialogue_roleplay',
    'audio_response',
    'reading_comprehension'
  ));

-- Keep the established automatic single-choice grading and safe snapshot
-- behavior for dialogue_choice without duplicating the grading engine.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.exercise_builder_safe_question_snapshot(jsonb)'::regprocedure)
  into v_definition;
  if position('if v_type in (''multiple_choice'', ''multiple_select'') then' in v_definition) = 0 then
    raise exception 'Unexpected exercise_builder_safe_question_snapshot definition.';
  end if;
  execute replace(
    v_definition,
    'if v_type in (''multiple_choice'', ''multiple_select'') then',
    'if v_type in (''multiple_choice'', ''multiple_select'', ''dialogue_choice'') then'
  );
end;
$$;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.exercise_builder_grade_answer(jsonb,jsonb)'::regprocedure)
  into v_definition;
  if position('if v_type = ''multiple_choice'' then' in v_definition) = 0 then
    raise exception 'Unexpected exercise_builder_grade_answer definition.';
  end if;
  execute replace(
    v_definition,
    'if v_type = ''multiple_choice'' then',
    'if v_type in (''multiple_choice'', ''dialogue_choice'') then'
  );
end;
$$;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.admin_save_exercise_builder_question_version_legacy(uuid,jsonb)'::regprocedure)
  into v_definition;
  if position('''written_response'', ''dialogue_roleplay'', ''audio_response'', ''reading_comprehension''' in v_definition) = 0
    or position('if v_type in (''multiple_choice'', ''multiple_select'') then' in v_definition) = 0
    or position('if v_type = ''multiple_choice'' and v_correct_count <> 1 then' in v_definition) = 0 then
    raise exception 'Unexpected admin question save definition.';
  end if;
  v_definition := replace(
    v_definition,
    '''written_response'', ''dialogue_roleplay'', ''audio_response'', ''reading_comprehension''',
    '''dialogue_choice'', ''written_response'', ''dialogue_roleplay'', ''audio_response'', ''reading_comprehension'''
  );
  v_definition := replace(
    v_definition,
    'if v_type in (''multiple_choice'', ''multiple_select'') then',
    'if v_type in (''multiple_choice'', ''multiple_select'', ''dialogue_choice'') then'
  );
  v_definition := replace(
    v_definition,
    'if v_type = ''multiple_choice'' and v_correct_count <> 1 then',
    'if v_type in (''multiple_choice'', ''dialogue_choice'') and v_correct_count <> 1 then'
  );
  execute v_definition;
end;
$$;

create table if not exists public.learner_notifications (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text,
  route text not null,
  related_attempt_id uuid references public.exercise_builder_attempts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (notification_type in ('exercise_review_published'))
);

create unique index if not exists learner_notifications_attempt_type_idx
  on public.learner_notifications(learner_id, notification_type, related_attempt_id)
  where related_attempt_id is not null;
create index if not exists learner_notifications_learner_created_idx
  on public.learner_notifications(learner_id, created_at desc);
create index if not exists learner_notifications_unread_idx
  on public.learner_notifications(learner_id, created_at desc)
  where read_at is null;

alter table public.learner_notifications enable row level security;

drop policy if exists learner_notifications_select_own on public.learner_notifications;
create policy learner_notifications_select_own
on public.learner_notifications for select to authenticated
using (learner_id = auth.uid() or public.is_admin());

drop policy if exists learner_notifications_admin_all on public.learner_notifications;
create policy learner_notifications_admin_all
on public.learner_notifications for all to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke update on public.learner_notifications from authenticated;
grant select on public.learner_notifications to authenticated;

create or replace function public.publish_exercise_review_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise_title text;
begin
  if new.status = 'submitted'
    and new.review_status = 'approved'
    and old.review_status is distinct from 'approved' then
    v_exercise_title := coalesce(nullif(new.exercise_snapshot ->> 'title', ''), 'Il tuo esercizio');
    insert into public.learner_notifications (
      learner_id,
      notification_type,
      title,
      message,
      route,
      related_attempt_id
    ) values (
      new.learner_id,
      'exercise_review_published',
      'Ho visto i tuoi esercizi!',
      v_exercise_title || ': la revisione e il punteggio aggiornato sono pronti.',
      '/exercises?assignmentId=' || new.assignment_id::text || '&resourceId=' || new.assignment_resource_id::text || '&attemptId=' || new.id::text,
      new.id
    )
    on conflict (learner_id, notification_type, related_attempt_id)
      where related_attempt_id is not null
    do update set
      title = excluded.title,
      message = excluded.message,
      route = excluded.route,
      created_at = now(),
      read_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists exercise_builder_attempt_review_notification on public.exercise_builder_attempts;
create trigger exercise_builder_attempt_review_notification
after update of review_status on public.exercise_builder_attempts
for each row execute function public.publish_exercise_review_notification();

create or replace function public.mark_learner_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  update public.learner_notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and learner_id = auth.uid();
  if not found then raise exception 'Notification not found.'; end if;
end;
$$;

create or replace function public.mark_all_learner_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  update public.learner_notifications
  set read_at = now()
  where learner_id = auth.uid()
    and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.publish_exercise_review_notification() from public;
revoke all on function public.mark_learner_notification_read(uuid) from public;
revoke all on function public.mark_all_learner_notifications_read() from public;
grant execute on function public.mark_learner_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_learner_notifications_read() to authenticated;

-- Existing approved reviews become visible in the learner activity feed once.
insert into public.learner_notifications (
  learner_id,
  notification_type,
  title,
  message,
  route,
  related_attempt_id,
  created_at
)
select
  attempt.learner_id,
  'exercise_review_published',
  'Ho visto i tuoi esercizi!',
  coalesce(nullif(attempt.exercise_snapshot ->> 'title', ''), 'Il tuo esercizio') || ': la revisione e il punteggio aggiornato sono pronti.',
  '/exercises?assignmentId=' || attempt.assignment_id::text || '&resourceId=' || attempt.assignment_resource_id::text || '&attemptId=' || attempt.id::text,
  attempt.id,
  coalesce(attempt.reviewed_at, attempt.submitted_at, attempt.updated_at)
from public.exercise_builder_attempts attempt
where attempt.status = 'submitted'
  and attempt.review_status = 'approved'
on conflict (learner_id, notification_type, related_attempt_id)
  where related_attempt_id is not null
do nothing;

-- A saved internal review must not expose teacher comments or scores. Only the
-- explicit approved state publishes feedback to the learner.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.exercise_builder_attempt_payload(uuid)'::regprocedure)
  into v_definition;
  if position('a.review_status in (''reviewed'', ''approved'')' in v_definition) = 0
    or position('public.exercise_builder_learner_grading_result(q.question_snapshot, q.grading_result)' in v_definition) = 0
    or position('''score'', a.score' in v_definition) = 0
    or position('''result_summary'', a.result_summary' in v_definition) = 0
    or position('''earned_points'', s.earned_points' in v_definition) = 0 then
    raise exception 'Unexpected exercise_builder_attempt_payload definition.';
  end if;
  v_definition := replace(
    v_definition,
    'a.review_status in (''reviewed'', ''approved'')',
    'a.review_status = ''approved'''
  );
  v_definition := replace(
    v_definition,
    'public.exercise_builder_learner_grading_result(q.question_snapshot, q.grading_result)',
    'public.exercise_builder_learner_grading_result(q.question_snapshot, case when a.review_status = ''approved'' then q.grading_result else coalesce(q.automatic_grading_result, q.grading_result) end)'
  );
  v_definition := replace(
    v_definition,
    '''earned_points'', a.earned_points',
    '''earned_points'', case when a.review_status = ''reviewed'' then null else a.earned_points end'
  );
  v_definition := replace(
    v_definition,
    '''score'', a.score',
    '''score'', case when a.review_status = ''reviewed'' then null else a.score end'
  );
  v_definition := replace(
    v_definition,
    '''result_summary'', a.result_summary',
    '''result_summary'', case when a.review_status = ''reviewed'' then jsonb_build_object(''pending_review'', 0, ''review_required'', true) else a.result_summary end'
  );
  v_definition := replace(
    v_definition,
    '''earned_points'', s.earned_points',
    '''earned_points'', case when a.review_status = ''reviewed'' then null else s.earned_points end'
  );
  execute v_definition;
end;
$$;

notify pgrst, 'reload schema';
