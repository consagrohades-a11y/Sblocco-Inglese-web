-- Recupero Debito event ledger v1.
-- Records durable, idempotent Recovery events for later rewards/analytics.
-- No XP or achievements are awarded in this migration.

create table public.recovery_events (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.recovery_enrollments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'plan_recalculated',
    'session_completed',
    'checkpoint_completed',
    'mock_completed',
    'topic_mastered',
    'topic_regressed',
    'error_detected',
    'error_resolved'
  )),
  session_id uuid references public.recovery_plan_sessions(id) on delete set null,
  topic_key text references public.recovery_topic_catalog(topic_key) on delete set null,
  source_type text,
  source_id uuid,
  event_key text not null unique check (length(event_key) between 8 and 240),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index recovery_events_enrollment_time_idx
  on public.recovery_events(enrollment_id, occurred_at desc);
create index recovery_events_user_time_idx
  on public.recovery_events(user_id, occurred_at desc);
create index recovery_events_type_time_idx
  on public.recovery_events(event_type, occurred_at desc);
create index recovery_events_session_idx
  on public.recovery_events(session_id) where session_id is not null;
create index recovery_events_topic_idx
  on public.recovery_events(topic_key) where topic_key is not null;

alter table public.recovery_events enable row level security;

create policy recovery_events_owner_read
on public.recovery_events for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

revoke all privileges on table public.recovery_events from anon, authenticated;
grant select on table public.recovery_events to authenticated;

create or replace function public.record_recovery_event(
  p_enrollment_id uuid,
  p_event_type text,
  p_event_key text,
  p_session_id uuid default null,
  p_topic_key text default null,
  p_source_type text default null,
  p_source_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_event_id uuid;
begin
  if p_event_type not in (
    'plan_recalculated', 'session_completed', 'checkpoint_completed', 'mock_completed',
    'topic_mastered', 'topic_regressed', 'error_detected', 'error_resolved'
  ) then
    raise exception 'Invalid Recovery event type.';
  end if;
  if coalesce(length(trim(p_event_key)), 0) < 8 then
    raise exception 'Recovery event requires an idempotency key.';
  end if;
  if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'Recovery event payload must be an object.';
  end if;

  select enrollment.user_id into v_user_id
  from public.recovery_enrollments enrollment
  where enrollment.id = p_enrollment_id;

  if v_user_id is null then
    raise exception 'Recovery enrollment not found.';
  end if;

  insert into public.recovery_events (
    enrollment_id, user_id, event_type, session_id, topic_key,
    source_type, source_id, event_key, payload, occurred_at
  ) values (
    p_enrollment_id, v_user_id, p_event_type, p_session_id, p_topic_key,
    nullif(p_source_type, ''), p_source_id, left(p_event_key, 240),
    coalesce(p_payload, '{}'::jsonb), coalesce(p_occurred_at, now())
  )
  on conflict (event_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select event.id into v_event_id
    from public.recovery_events event
    where event.event_key = left(p_event_key, 240);
  end if;

  return v_event_id;
end;
$$;

create or replace function public.capture_recovery_event_on_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.plan_version is distinct from old.plan_version and new.plan_version > 0 then
    perform public.record_recovery_event(
      new.id,
      'plan_recalculated',
      'plan:' || new.id::text || ':v' || new.plan_version::text,
      null,
      null,
      'plan',
      new.id,
      jsonb_build_object(
        'plan_version', new.plan_version,
        'previous_plan_version', old.plan_version,
        'mode', new.mode,
        'exam_date', new.exam_date
      ),
      coalesce(new.last_planned_at, now())
    );
  end if;
  return new;
end;
$$;

create or replace function public.capture_recovery_event_on_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    perform public.record_recovery_event(
      new.enrollment_id,
      'session_completed',
      'session:' || new.id::text || ':completed',
      new.id,
      new.topic_key,
      'session',
      new.id,
      jsonb_build_object(
        'session_type', new.session_type,
        'sequence_index', new.sequence_index,
        'score', new.score,
        'estimated_minutes', new.estimated_minutes,
        'scheduled_for', new.scheduled_for
      ),
      coalesce(new.completed_at, now())
    );
  end if;
  return new;
end;
$$;

create or replace function public.capture_recovery_event_on_assessment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_type text;
  v_topic_key text;
begin
  v_event_type := case
    when new.assessment_type = 'checkpoint' then 'checkpoint_completed'
    when new.assessment_type in ('mock_intermediate', 'mock_final') then 'mock_completed'
    else null
  end;

  if v_event_type is null then return new; end if;

  select session.topic_key into v_topic_key
  from public.recovery_plan_sessions session
  where session.id = new.session_id;

  perform public.record_recovery_event(
    new.enrollment_id,
    v_event_type,
    'assessment:' || new.id::text,
    new.session_id,
    v_topic_key,
    'assessment',
    new.id,
    jsonb_build_object(
      'assessment_type', new.assessment_type,
      'score', new.score,
      'topic_scores', coalesce(new.topic_scores, '{}'::jsonb),
      'feedback_released', new.feedback_released
    ),
    coalesce(new.submitted_at, new.created_at, now())
  );

  return new;
end;
$$;

create or replace function public.capture_recovery_event_on_topic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_observed_at timestamptz;
  v_suffix text;
begin
  v_observed_at := coalesce(new.last_evidence_at, new.updated_at, now());
  v_suffix := replace(v_observed_at::text, ' ', 'T');

  if new.mastery_state = 'recovered' and old.mastery_state is distinct from new.mastery_state then
    perform public.record_recovery_event(
      new.enrollment_id,
      'topic_mastered',
      'topic:' || new.enrollment_id::text || ':' || new.topic_key || ':mastered:' || v_suffix,
      null,
      new.topic_key,
      'topic',
      null,
      jsonb_build_object(
        'previous_state', old.mastery_state,
        'mastery_state', new.mastery_state,
        'mastery_score', new.mastery_score,
        'mastery_confidence', new.mastery_confidence,
        'repeated_errors', new.repeated_errors
      ),
      v_observed_at
    );
  elsif (
    new.mastery_state = 'needs_recheck'
    or (old.mastery_state = 'recovered' and new.mastery_state <> 'recovered')
  ) and old.mastery_state is distinct from new.mastery_state then
    perform public.record_recovery_event(
      new.enrollment_id,
      'topic_regressed',
      'topic:' || new.enrollment_id::text || ':' || new.topic_key || ':regressed:' || v_suffix,
      null,
      new.topic_key,
      'topic',
      null,
      jsonb_build_object(
        'previous_state', old.mastery_state,
        'mastery_state', new.mastery_state,
        'mastery_score', new.mastery_score,
        'mastery_confidence', new.mastery_confidence,
        'repeated_errors', new.repeated_errors
      ),
      v_observed_at
    );
  end if;

  if coalesce(new.repeated_errors, 0) > coalesce(old.repeated_errors, 0) then
    perform public.record_recovery_event(
      new.enrollment_id,
      'error_detected',
      'topic:' || new.enrollment_id::text || ':' || new.topic_key || ':errors:' || new.repeated_errors::text || ':' || v_suffix,
      null,
      new.topic_key,
      'topic',
      null,
      jsonb_build_object(
        'previous_repeated_errors', coalesce(old.repeated_errors, 0),
        'repeated_errors', coalesce(new.repeated_errors, 0)
      ),
      v_observed_at
    );
  elsif coalesce(old.repeated_errors, 0) > 0 and coalesce(new.repeated_errors, 0) = 0 then
    perform public.record_recovery_event(
      new.enrollment_id,
      'error_resolved',
      'topic:' || new.enrollment_id::text || ':' || new.topic_key || ':errors-resolved:' || v_suffix,
      null,
      new.topic_key,
      'topic',
      null,
      jsonb_build_object(
        'previous_repeated_errors', coalesce(old.repeated_errors, 0),
        'repeated_errors', 0
      ),
      v_observed_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists recovery_enrollments_capture_event on public.recovery_enrollments;
create trigger recovery_enrollments_capture_event
after update of plan_version on public.recovery_enrollments
for each row execute function public.capture_recovery_event_on_plan();

drop trigger if exists recovery_plan_sessions_capture_event on public.recovery_plan_sessions;
create trigger recovery_plan_sessions_capture_event
after update of status on public.recovery_plan_sessions
for each row execute function public.capture_recovery_event_on_session();

drop trigger if exists recovery_assessment_attempts_capture_event on public.recovery_assessment_attempts;
create trigger recovery_assessment_attempts_capture_event
after insert on public.recovery_assessment_attempts
for each row execute function public.capture_recovery_event_on_assessment();

drop trigger if exists recovery_student_topics_capture_event on public.recovery_student_topics;
create trigger recovery_student_topics_capture_event
after update of mastery_state, repeated_errors on public.recovery_student_topics
for each row execute function public.capture_recovery_event_on_topic();

-- Recovery attempts must not create or influence generic Exercise Builder milestones.
create or replace function public.award_exercise_milestones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_high_exercises integer;
  v_prior_best numeric;
  v_route text;
  v_title text;
begin
  if not public.exercise_attempt_is_final_for_milestones(new.status, new.review_status, new.result_summary, new.score) then
    return new;
  end if;

  if exists (
    select 1
    from public.recovery_plan_sessions recovery_session
    where recovery_session.assignment_id = new.assignment_id
  ) then
    return new;
  end if;

  v_route := '/exercises?assignmentId=' || new.assignment_id::text
    || '&resourceId=' || new.assignment_resource_id::text
    || '&attemptId=' || new.id::text;
  v_title := coalesce(nullif(new.exercise_snapshot ->> 'title', ''), 'this exercise');

  select max(attempt.score) into v_prior_best
  from public.exercise_builder_attempts attempt
  where attempt.learner_id = new.learner_id
    and attempt.id <> new.id
    and not exists (
      select 1
      from public.recovery_plan_sessions recovery_session
      where recovery_session.assignment_id = attempt.assignment_id
    )
    and public.exercise_attempt_is_final_for_milestones(
      attempt.status, attempt.review_status, attempt.result_summary, attempt.score
    );

  if new.score = 100 then
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_exercise',
      'exercise_first_perfect',
      'Perfect score! 🏆',
      'You got 100% on ' || v_title || '. That deserves a little celebration.',
      v_route
    );
  end if;

  select count(distinct attempt.exercise_id) into v_high_exercises
  from public.exercise_builder_attempts attempt
  where attempt.learner_id = new.learner_id
    and attempt.score >= 90
    and not exists (
      select 1
      from public.recovery_plan_sessions recovery_session
      where recovery_session.assignment_id = attempt.assignment_id
    )
    and public.exercise_attempt_is_final_for_milestones(
      attempt.status, attempt.review_status, attempt.result_summary, attempt.score
    );

  if v_high_exercises in (1, 3, 5, 10) then
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_exercise',
      'exercise_high_' || v_high_exercises::text,
      case when v_high_exercises = 1 then 'Star performance! 🌟' else 'You are on a roll! 🚀' end,
      case
        when v_high_exercises = 1 then 'You earned your first exercise score above 90%.'
        else 'You have scored at least 90% in ' || v_high_exercises::text || ' different exercises.'
      end,
      v_route
    );
  end if;

  if v_prior_best is not null and new.score >= v_prior_best + 10 then
    perform public.create_learner_milestone(
      new.learner_id,
      'milestone_exercise',
      'exercise_personal_best_' || new.id::text,
      'New personal best! ✨',
      'Your best exercise score jumped from ' || round(v_prior_best)::text || '% to ' || round(new.score)::text || '%.',
      v_route
    );
  end if;

  return new;
end;
$$;

revoke all on function public.record_recovery_event(uuid, text, text, uuid, text, text, uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.capture_recovery_event_on_plan() from public, anon, authenticated;
revoke all on function public.capture_recovery_event_on_session() from public, anon, authenticated;
revoke all on function public.capture_recovery_event_on_assessment() from public, anon, authenticated;
revoke all on function public.capture_recovery_event_on_topic() from public, anon, authenticated;

notify pgrst, 'reload schema';