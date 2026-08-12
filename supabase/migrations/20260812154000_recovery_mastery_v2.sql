-- Recupero Debito Mastery Engine v2.
-- Evidence is append-only/idempotent and topic mastery is derived from evidence quality,
-- not from a generic 50/50 running average.

alter table public.recovery_student_topics
  add column if not exists mastery_state text not null default 'needs_recovery'
    check (mastery_state in ('needs_recovery', 'training', 'almost_ready', 'recovered', 'needs_recheck')),
  add column if not exists mastery_confidence numeric(5,2) not null default 0
    check (mastery_confidence between 0 and 100),
  add column if not exists mastery_reason jsonb not null default '{}'::jsonb
    check (jsonb_typeof(mastery_reason) = 'object');

create table public.recovery_mastery_evidence (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.recovery_enrollments(id) on delete cascade,
  topic_key text not null references public.recovery_topic_catalog(topic_key) on delete restrict,
  session_id uuid references public.recovery_plan_sessions(id) on delete set null,
  exercise_attempt_id uuid references public.exercise_builder_attempts(id) on delete set null,
  evidence_type text not null check (evidence_type in (
    'diagnostic', 'guided_practice', 'practice', 'school_mode', 'mini_check',
    'error_review', 'checkpoint', 'mock'
  )),
  score numeric(5,2) not null check (score between 0 and 100),
  evidence_weight numeric(5,2) not null check (evidence_weight > 0 and evidence_weight <= 1),
  evidence_key text not null unique check (length(evidence_key) between 8 and 240),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index recovery_mastery_evidence_topic_idx
  on public.recovery_mastery_evidence(enrollment_id, topic_key, observed_at desc);
create index recovery_mastery_evidence_session_idx
  on public.recovery_mastery_evidence(session_id)
  where session_id is not null;

alter table public.recovery_mastery_evidence enable row level security;

create policy recovery_mastery_evidence_owner_read
on public.recovery_mastery_evidence for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.recovery_enrollments enrollment
    where enrollment.id = enrollment_id
      and enrollment.user_id = (select auth.uid())
  )
);

revoke all privileges on table public.recovery_mastery_evidence from anon, authenticated;
grant select on table public.recovery_mastery_evidence to authenticated;

create or replace function public.recovery_evidence_weight(p_evidence_type text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_evidence_type
    when 'diagnostic' then 0.20
    when 'guided_practice' then 0.20
    when 'practice' then 0.35
    when 'school_mode' then 0.60
    when 'mini_check' then 0.78
    when 'error_review' then 0.45
    when 'checkpoint' then 0.90
    when 'mock' then 1.00
    else 0.20
  end::numeric;
$$;

create or replace function public.recalculate_recovery_topic_mastery(
  p_enrollment_id uuid,
  p_topic_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic public.recovery_student_topics%rowtype;
  v_weighted_score numeric;
  v_weight_sum numeric;
  v_evidence_count integer := 0;
  v_reliable_latest numeric;
  v_reliable_latest_at timestamptz;
  v_new_state text;
  v_confidence numeric;
  v_reason jsonb;
  v_had_recovered boolean;
begin
  select * into v_topic
  from public.recovery_student_topics topic
  where topic.enrollment_id = p_enrollment_id
    and topic.topic_key = p_topic_key
    and topic.required;

  if v_topic.enrollment_id is null then
    return jsonb_build_object('updated', false, 'reason', 'topic_not_found');
  end if;

  v_had_recovered := v_topic.mastery_state = 'recovered';

  with recent as (
    select evidence.score,
           evidence.evidence_weight,
           evidence.evidence_type,
           evidence.observed_at,
           case
             when evidence.observed_at >= now() - interval '3 days' then 1.00
             when evidence.observed_at >= now() - interval '7 days' then 0.90
             when evidence.observed_at >= now() - interval '14 days' then 0.75
             else 0.60
           end as recency_factor
    from public.recovery_mastery_evidence evidence
    where evidence.enrollment_id = p_enrollment_id
      and evidence.topic_key = p_topic_key
    order by evidence.observed_at desc
    limit 12
  )
  select
    round(sum(score * evidence_weight * recency_factor) / nullif(sum(evidence_weight * recency_factor), 0), 2),
    sum(evidence_weight * recency_factor),
    count(*)
  into v_weighted_score, v_weight_sum, v_evidence_count
  from recent;

  -- Diagnostic remains a weak baseline if no explicit ledger row exists yet.
  if v_evidence_count = 0 and v_topic.diagnostic_score is not null then
    v_weighted_score := v_topic.diagnostic_score;
    v_weight_sum := 0.20;
  end if;

  select evidence.score, evidence.observed_at
  into v_reliable_latest, v_reliable_latest_at
  from public.recovery_mastery_evidence evidence
  where evidence.enrollment_id = p_enrollment_id
    and evidence.topic_key = p_topic_key
    and evidence.evidence_type in ('mini_check', 'checkpoint', 'mock')
  order by evidence.observed_at desc
  limit 1;

  v_weighted_score := greatest(0, least(100, coalesce(v_weighted_score, 0)));
  v_confidence := greatest(0, least(100, round(coalesce(v_weight_sum, 0) * 30, 2)));

  if (v_had_recovered and (
        coalesce(v_reliable_latest, 100) < 70
        or v_topic.repeated_errors >= 3
      ))
     or (v_reliable_latest is not null and v_reliable_latest < 60 and coalesce(v_topic.mastery_score, 0) >= 80) then
    v_new_state := 'needs_recheck';
  elsif v_weighted_score >= 80
        and v_reliable_latest is not null
        and v_reliable_latest >= 80 then
    v_new_state := 'recovered';
  elsif v_weighted_score >= 70
        or (v_topic.verification_only and v_reliable_latest is null and coalesce(v_topic.diagnostic_score, 0) >= 85) then
    v_new_state := 'almost_ready';
  elsif v_weighted_score >= 45 then
    v_new_state := 'training';
  else
    v_new_state := 'needs_recovery';
  end if;

  v_reason := jsonb_build_object(
    'weighted_score', round(v_weighted_score, 2),
    'evidence_count', v_evidence_count,
    'confidence', round(v_confidence, 2),
    'latest_reliable_score', v_reliable_latest,
    'latest_reliable_at', v_reliable_latest_at,
    'repeated_errors', v_topic.repeated_errors,
    'diagnostic_score', v_topic.diagnostic_score,
    'verification_only', v_topic.verification_only,
    'rule_version', 'recovery-mastery-v2'
  );

  update public.recovery_student_topics topic
  set mastery_score = round(v_weighted_score, 2),
      mastery_state = v_new_state,
      mastery_confidence = round(v_confidence, 2),
      mastery_reason = v_reason,
      last_evidence_at = case
        when v_evidence_count > 0 then (
          select max(evidence.observed_at)
          from public.recovery_mastery_evidence evidence
          where evidence.enrollment_id = p_enrollment_id
            and evidence.topic_key = p_topic_key
        )
        else topic.last_evidence_at
      end
  where topic.enrollment_id = p_enrollment_id
    and topic.topic_key = p_topic_key;

  return jsonb_build_object(
    'updated', true,
    'topic_key', p_topic_key,
    'mastery_score', round(v_weighted_score, 2),
    'mastery_state', v_new_state,
    'mastery_confidence', round(v_confidence, 2),
    'reason', v_reason
  );
end;
$$;

create or replace function public.record_recovery_mastery_evidence(
  p_enrollment_id uuid,
  p_topic_key text,
  p_evidence_type text,
  p_score numeric,
  p_evidence_key text,
  p_session_id uuid default null,
  p_exercise_attempt_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_weight numeric;
begin
  if p_score is null or p_score < 0 or p_score > 100 then raise exception 'Invalid mastery evidence score.'; end if;
  if p_evidence_type not in ('diagnostic', 'guided_practice', 'practice', 'school_mode', 'mini_check', 'error_review', 'checkpoint', 'mock') then
    raise exception 'Invalid mastery evidence type.';
  end if;
  if coalesce(length(trim(p_evidence_key)), 0) < 8 then raise exception 'Mastery evidence requires an idempotency key.'; end if;
  if not exists (
    select 1 from public.recovery_student_topics topic
    where topic.enrollment_id = p_enrollment_id
      and topic.topic_key = p_topic_key
      and topic.required
  ) then raise exception 'Recovery topic not found.'; end if;

  v_weight := public.recovery_evidence_weight(p_evidence_type);

  insert into public.recovery_mastery_evidence (
    enrollment_id, topic_key, session_id, exercise_attempt_id,
    evidence_type, score, evidence_weight, evidence_key, metadata, observed_at
  ) values (
    p_enrollment_id, p_topic_key, p_session_id, p_exercise_attempt_id,
    p_evidence_type, round(p_score, 2), v_weight, left(p_evidence_key, 240),
    coalesce(p_metadata, '{}'::jsonb), coalesce(p_observed_at, now())
  )
  on conflict (evidence_key) do nothing;

  return public.recalculate_recovery_topic_mastery(p_enrollment_id, p_topic_key);
end;
$$;

-- Rebuild session synchronization so assessment topic scores use every latest submitted
-- resource attempt, not only the first resource in a multi-resource checkpoint/mock.
create or replace function public.sync_recovery_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.recovery_plan_sessions%rowtype;
  v_resource_total integer;
  v_submitted_total integer;
  v_average_score numeric;
  v_primary_attempt_id uuid;
  v_topic_scores jsonb := '{}'::jsonb;
  v_assessment_type text;
  v_resource record;
  v_phase text;
  v_evidence_type text;
  v_resource_score numeric;
  v_attempt_id uuid;
  v_topic_key text;
  v_topic_score numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select session.* into v_session
  from public.recovery_plan_sessions session
  join public.recovery_enrollments enrollment on enrollment.id = session.enrollment_id
  where session.id = p_session_id and enrollment.user_id = auth.uid();

  if v_session.id is null then raise exception 'Recovery session not found.'; end if;
  if v_session.assignment_id is null then
    return jsonb_build_object('completed', false, 'materialized', false);
  end if;
  if v_session.status = 'completed' then
    return jsonb_build_object('completed', false, 'already_completed', true, 'score', v_session.score);
  end if;

  select count(*) into v_resource_total
  from public.assignment_resources resource
  where resource.assignment_id = v_session.assignment_id
    and resource.resource_type = 'custom_exercise';

  select count(*) into v_submitted_total
  from public.assignment_resources resource
  where resource.assignment_id = v_session.assignment_id
    and resource.resource_type = 'custom_exercise'
    and exists (
      select 1 from public.exercise_builder_attempts attempt
      where attempt.assignment_resource_id = resource.id
        and attempt.learner_id = auth.uid()
        and attempt.status = 'submitted'
    );

  if v_resource_total = 0 or v_submitted_total < v_resource_total then
    return jsonb_build_object(
      'completed', false,
      'materialized', true,
      'submitted_resources', v_submitted_total,
      'total_resources', v_resource_total
    );
  end if;

  select round(avg(latest.score), 2) into v_average_score
  from (
    select distinct on (attempt.assignment_resource_id)
      attempt.assignment_resource_id, attempt.score
    from public.exercise_builder_attempts attempt
    join public.assignment_resources resource on resource.id = attempt.assignment_resource_id
    where resource.assignment_id = v_session.assignment_id
      and attempt.learner_id = auth.uid()
      and attempt.status = 'submitted'
    order by attempt.assignment_resource_id, attempt.submitted_at desc nulls last, attempt.attempt_number desc
  ) latest
  where latest.score is not null;

  -- Aggregate per-topic grading across ALL latest resource attempts.
  with latest_attempts as (
    select distinct on (attempt.assignment_resource_id)
      attempt.id
    from public.exercise_builder_attempts attempt
    join public.assignment_resources resource on resource.id = attempt.assignment_resource_id
    where resource.assignment_id = v_session.assignment_id
      and attempt.learner_id = auth.uid()
      and attempt.status = 'submitted'
    order by attempt.assignment_resource_id, attempt.submitted_at desc nulls last, attempt.attempt_number desc
  ), by_topic as (
    select
      question_version.topic,
      round(
        100.0 * sum(coalesce((attempt_question.grading_result ->> 'earned_points')::numeric, 0))
        / nullif(sum(coalesce((attempt_question.grading_result ->> 'max_points')::numeric, 0)), 0),
        0
      ) as score
    from latest_attempts latest
    join public.exercise_builder_attempt_questions attempt_question on attempt_question.attempt_id = latest.id
    join public.exercise_builder_question_versions question_version on question_version.id = attempt_question.question_version_id
    where attempt_question.grading_result is not null
      and question_version.topic is not null
    group by question_version.topic
    having sum(coalesce((attempt_question.grading_result ->> 'max_points')::numeric, 0)) > 0
  )
  select coalesce(jsonb_object_agg(by_topic.topic, by_topic.score), '{}'::jsonb)
  into v_topic_scores
  from by_topic;

  select attempt.id into v_primary_attempt_id
  from public.exercise_builder_attempts attempt
  join public.assignment_resources resource on resource.id = attempt.assignment_resource_id
  where resource.assignment_id = v_session.assignment_id
    and attempt.learner_id = auth.uid()
    and attempt.status = 'submitted'
  order by attempt.submitted_at desc nulls last, attempt.attempt_number desc
  limit 1;

  -- Record phase-specific evidence for topic/quick-review/error-review resources.
  for v_resource in
    select resource.id, resource.resource_key
    from public.assignment_resources resource
    where resource.assignment_id = v_session.assignment_id
      and resource.resource_type = 'custom_exercise'
    order by resource.sequence_index
  loop
    select attempt.id, attempt.score
    into v_attempt_id, v_resource_score
    from public.exercise_builder_attempts attempt
    where attempt.assignment_resource_id = v_resource.id
      and attempt.learner_id = auth.uid()
      and attempt.status = 'submitted'
    order by attempt.submitted_at desc nulls last, attempt.attempt_number desc
    limit 1;

    if v_attempt_id is null or v_resource_score is null then continue; end if;

    v_phase := split_part(v_resource.resource_key, '-', 2);
    v_evidence_type := case v_phase
      when 'recover' then 'guided_practice'
      when 'practice' then 'practice'
      when 'school' then 'school_mode'
      when 'verify' then 'mini_check'
      when 'error_review' then 'error_review'
      else null
    end;

    if v_session.topic_key is not null and v_evidence_type is not null then
      perform public.record_recovery_mastery_evidence(
        v_session.enrollment_id,
        v_session.topic_key,
        v_evidence_type,
        v_resource_score,
        'session:' || v_session.id::text || ':attempt:' || v_attempt_id::text,
        v_session.id,
        v_attempt_id,
        jsonb_build_object('phase', v_phase, 'resource_id', v_resource.id),
        now()
      );
    end if;
  end loop;

  if v_session.session_type in ('checkpoint', 'mock_intermediate', 'mock_final') then
    v_assessment_type := v_session.session_type;

    insert into public.recovery_assessment_attempts (
      enrollment_id, session_id, assessment_type, exercise_attempt_id,
      score, topic_scores, submitted_at, feedback_released
    ) values (
      v_session.enrollment_id, v_session.id, v_assessment_type, v_primary_attempt_id,
      v_average_score, v_topic_scores, now(), true
    )
    on conflict (session_id, assessment_type) do update set
      exercise_attempt_id = excluded.exercise_attempt_id,
      score = excluded.score,
      topic_scores = excluded.topic_scores,
      submitted_at = excluded.submitted_at,
      feedback_released = true;

    for v_topic_key, v_topic_score in
      select entry.key, entry.value::numeric
      from jsonb_each_text(v_topic_scores) entry
      where exists (
        select 1 from public.recovery_student_topics topic
        where topic.enrollment_id = v_session.enrollment_id
          and topic.topic_key = entry.key
          and topic.required
      )
    loop
      update public.recovery_student_topics topic
      set checkpoint_score = case
            when v_session.session_type = 'checkpoint' then v_topic_score
            else topic.checkpoint_score
          end,
          mock_score = case
            when v_session.session_type in ('mock_intermediate', 'mock_final') then v_topic_score
            else topic.mock_score
          end,
          last_evidence_at = now()
      where topic.enrollment_id = v_session.enrollment_id
        and topic.topic_key = v_topic_key;

      perform public.record_recovery_mastery_evidence(
        v_session.enrollment_id,
        v_topic_key,
        case when v_session.session_type = 'checkpoint' then 'checkpoint' else 'mock' end,
        v_topic_score,
        'assessment:' || v_session.id::text || ':' || v_topic_key,
        v_session.id,
        v_primary_attempt_id,
        jsonb_build_object('assessment_type', v_session.session_type),
        now()
      );
    end loop;
  end if;

  update public.recovery_plan_sessions
  set status = 'completed',
      score = v_average_score,
      completed_at = coalesce(completed_at, now())
  where id = p_session_id;

  -- Ensure a topic with no phase-specific score still receives a state recalculation.
  if v_session.topic_key is not null then
    perform public.recalculate_recovery_topic_mastery(v_session.enrollment_id, v_session.topic_key);
  end if;

  update public.recovery_plan_sessions next_session
  set status = 'available'
  where next_session.id = (
    select queued.id
    from public.recovery_plan_sessions queued
    where queued.enrollment_id = v_session.enrollment_id
      and queued.status = 'planned'
    order by queued.sequence_index
    limit 1
  );

  if not exists (
    select 1
    from public.recovery_plan_sessions remaining
    where remaining.enrollment_id = v_session.enrollment_id
      and remaining.status <> 'completed'
  ) then
    update public.recovery_enrollments
    set status = 'completed', completed_at = now()
    where id = v_session.enrollment_id;
  end if;

  return jsonb_build_object(
    'completed', true,
    'score', v_average_score,
    'topic_scores', v_topic_scores,
    'assessment_type', v_assessment_type
  );
end;
$$;

-- Seed diagnostic evidence for currently required topics once. This does not mark them recovered:
-- diagnostic has intentionally low weight and recovered requires reliable post-diagnostic evidence.
insert into public.recovery_mastery_evidence (
  enrollment_id, topic_key, evidence_type, score, evidence_weight, evidence_key, metadata, observed_at
)
select
  topic.enrollment_id,
  topic.topic_key,
  'diagnostic',
  topic.diagnostic_score,
  public.recovery_evidence_weight('diagnostic'),
  'diagnostic:' || topic.enrollment_id::text || ':' || topic.topic_key,
  jsonb_build_object('seeded_by', 'recovery-mastery-v2'),
  coalesce(topic.last_evidence_at, enrollment.created_at)
from public.recovery_student_topics topic
join public.recovery_enrollments enrollment on enrollment.id = topic.enrollment_id
where topic.required
  and topic.diagnostic_score is not null
on conflict (evidence_key) do nothing;

-- Recalculate existing topic rows after seeding.
do $$
declare
  v_topic record;
begin
  for v_topic in
    select enrollment_id, topic_key
    from public.recovery_student_topics
    where required
  loop
    perform public.recalculate_recovery_topic_mastery(v_topic.enrollment_id, v_topic.topic_key);
  end loop;
end;
$$;

revoke all on function public.recovery_evidence_weight(text) from public;
revoke all on function public.recalculate_recovery_topic_mastery(uuid, text) from public;
revoke all on function public.record_recovery_mastery_evidence(uuid, text, text, numeric, text, uuid, uuid, jsonb, timestamptz) from public;
revoke all on function public.sync_recovery_session(uuid) from public;

grant execute on function public.recovery_evidence_weight(text) to authenticated;
grant execute on function public.recalculate_recovery_topic_mastery(uuid, text) to authenticated;
-- record_recovery_mastery_evidence is intentionally not granted directly to learners;
-- it is called from protected Recovery RPCs.
grant execute on function public.sync_recovery_session(uuid) to authenticated;

notify pgrst, 'reload schema';
