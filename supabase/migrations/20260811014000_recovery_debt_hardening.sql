-- Recovery hardening: authenticated diagnostics attach immediately and session sync
-- reads the owned recovery row without relying on a mixed composite SELECT target.

create or replace function public.submit_public_recovery_diagnostic(
  p_answers jsonb,
  p_source text default 'test-recupero-inglese'
)
returns table (id uuid, result_token uuid, overall_score numeric, topic_scores jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer_count integer;
  v_overall numeric;
  v_scores jsonb;
  v_id uuid;
  v_token uuid;
  v_user_id uuid := auth.uid();
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Invalid answers.';
  end if;

  select count(*) into v_answer_count
  from public.recovery_diagnostic_answer_keys k
  where nullif(p_answers ->> k.question_key, '') is not null;

  if v_answer_count <> (select count(*) from public.recovery_diagnostic_answer_keys) then
    raise exception 'Complete all diagnostic questions before submitting.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_answers) answer_key
    where not exists (select 1 from public.recovery_diagnostic_answer_keys k where k.question_key = answer_key)
  ) then
    raise exception 'Unknown diagnostic question.';
  end if;

  select round(100.0 * avg(case when p_answers ->> k.question_key = k.correct_option then 1 else 0 end), 0)
  into v_overall
  from public.recovery_diagnostic_answer_keys k;

  select coalesce(jsonb_object_agg(scores.diagnostic_key, scores.score), '{}'::jsonb)
  into v_scores
  from (
    select
      k.diagnostic_key,
      round(100.0 * avg(case when p_answers ->> k.question_key = k.correct_option then 1 else 0 end), 0) as score
    from public.recovery_diagnostic_answer_keys k
    group by k.diagnostic_key
    order by k.diagnostic_key
  ) scores;

  insert into public.recovery_diagnostic_attempts (
    user_id, answers, topic_scores, overall_score, source, claimed_at
  ) values (
    v_user_id,
    p_answers,
    v_scores,
    v_overall,
    left(coalesce(nullif(trim(p_source), ''), 'test-recupero-inglese'), 120),
    case when v_user_id is null then null else now() end
  )
  returning recovery_diagnostic_attempts.id, recovery_diagnostic_attempts.result_token into v_id, v_token;

  return query select v_id, v_token, v_overall, v_scores;
end;
$$;

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

  select attempt.id into v_primary_attempt_id
  from public.exercise_builder_attempts attempt
  where attempt.assignment_resource_id = v_session.assignment_resource_id
    and attempt.learner_id = auth.uid()
    and attempt.status = 'submitted'
  order by attempt.submitted_at desc nulls last, attempt.attempt_number desc
  limit 1;

  if v_primary_attempt_id is not null then
    select coalesce(jsonb_object_agg(by_topic.topic, by_topic.score), '{}'::jsonb)
    into v_topic_scores
    from (
      select
        question_version.topic,
        round(
          100.0 * sum(coalesce((attempt_question.grading_result ->> 'earned_points')::numeric, 0))
          / nullif(sum(coalesce((attempt_question.grading_result ->> 'max_points')::numeric, 0)), 0),
          0
        ) as score
      from public.exercise_builder_attempt_questions attempt_question
      join public.exercise_builder_question_versions question_version on question_version.id = attempt_question.question_version_id
      where attempt_question.attempt_id = v_primary_attempt_id
        and attempt_question.grading_result is not null
      group by question_version.topic
      having sum(coalesce((attempt_question.grading_result ->> 'max_points')::numeric, 0)) > 0
    ) by_topic;
  end if;

  update public.recovery_plan_sessions
  set status = 'completed',
      score = v_average_score,
      completed_at = coalesce(completed_at, now())
  where id = p_session_id;

  if v_session.topic_key is not null and v_average_score is not null then
    update public.recovery_student_topics topic
    set mastery_score = case
          when topic.mastery_score is null then v_average_score
          else round((topic.mastery_score * 0.5) + (v_average_score * 0.5), 2)
        end,
        last_evidence_at = now()
    where topic.enrollment_id = v_session.enrollment_id
      and topic.topic_key = v_session.topic_key;
  end if;

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

    update public.recovery_student_topics topic
    set checkpoint_score = case
          when v_session.session_type = 'checkpoint'
            then coalesce((v_topic_scores ->> topic.topic_key)::numeric, topic.checkpoint_score)
          else topic.checkpoint_score
        end,
        mock_score = case
          when v_session.session_type in ('mock_intermediate', 'mock_final')
            then coalesce((v_topic_scores ->> topic.topic_key)::numeric, topic.mock_score)
          else topic.mock_score
        end,
        last_evidence_at = now()
    where topic.enrollment_id = v_session.enrollment_id
      and topic.required;
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

revoke all on function public.submit_public_recovery_diagnostic(jsonb, text) from public;
revoke all on function public.sync_recovery_session(uuid) from public;
grant execute on function public.submit_public_recovery_diagnostic(jsonb, text) to anon, authenticated;
grant execute on function public.sync_recovery_session(uuid) to authenticated;

notify pgrst, 'reload schema';
