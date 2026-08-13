create or replace function pg_temp.run_recovery_retake_case(
  p_user_id uuid,
  p_enrollment_id uuid,
  p_topic_key text,
  p_source_exercise_id uuid,
  p_source_version_id uuid,
  p_expected_retake_version_id uuid,
  p_expected_fresh boolean
)
returns jsonb
language plpgsql
as $$
declare
  v_assignment_id uuid;
  v_resource_id uuid;
  v_session_id uuid;
  v_attempt_id uuid;
  v_source_evidence public.recovery_mastery_evidence%rowtype;
  v_remediation public.recovery_plan_sessions%rowtype;
  v_resource record;
  v_retake public.recovery_mastery_evidence%rowtype;
  v_phase text;
  v_evidence_type text;
  v_score numeric;
  v_state text;
  v_latest_reliable numeric;
begin
  insert into public.assignments (
    learner_id, title, reason, status, required, estimated_minutes, created_by
  ) values (
    p_user_id, 'Canary source Verify A', 'Recovery remediation DB canary',
    'draft', true, 5, p_user_id
  ) returning id into v_assignment_id;

  insert into public.assignment_resources (
    assignment_id, resource_key, resource_type, title, route, sequence_index, exercise_config
  ) values (
    v_assignment_id, 'recovery-verify-canary-source', 'custom_exercise',
    'Verifica argomento', '/exercises', 1,
    jsonb_build_object(
      'exercise_id', p_source_exercise_id,
      'exercise_version_id', p_source_version_id,
      'completion_rule', 'submitted'
    )
  ) returning id into v_resource_id;

  insert into public.recovery_plan_sessions (
    enrollment_id, sequence_index, session_type, topic_key, title, rationale,
    estimated_minutes, priority_score, stages, metadata, status,
    assignment_id, assignment_resource_id, score, completed_at
  ) values (
    p_enrollment_id, 1, 'topic', p_topic_key, 'Canary source Verify A', 'Canary source',
    5, 90, '["mini_verifica"]'::jsonb, '{"canary":true}'::jsonb, 'completed',
    v_assignment_id, v_resource_id, 54, now()
  ) returning id into v_session_id;

  insert into public.exercise_builder_attempts (
    learner_id, assignment_id, assignment_resource_id, exercise_id, exercise_version_id,
    attempt_number, status, exercise_snapshot, earned_points, max_points, score, submitted_at
  ) values (
    p_user_id, v_assignment_id, v_resource_id, p_source_exercise_id, p_source_version_id,
    1, 'submitted', '{}'::jsonb, 54, 100, 54, clock_timestamp()
  ) returning id into v_attempt_id;

  perform public.record_recovery_mastery_evidence(
    p_enrollment_id, p_topic_key, 'mini_check', 54,
    'canary:' || p_topic_key || ':source',
    v_session_id, v_attempt_id, '{"canary":true}'::jsonb, clock_timestamp()
  );

  select * into v_source_evidence
  from public.recovery_mastery_evidence
  where evidence_key = 'canary:' || p_topic_key || ':source';

  if coalesce((v_source_evidence.metadata ->> 'fresh_form')::boolean, false) is not true then
    raise exception 'Initial Verify A must be fresh for %.', p_topic_key;
  end if;

  select * into v_remediation
  from public.recovery_plan_sessions
  where enrollment_id = p_enrollment_id
    and metadata ->> 'source_mastery_evidence_id' = v_source_evidence.id::text
  order by created_at desc
  limit 1;

  if v_remediation.id is null or v_remediation.assignment_id is null then
    raise exception '54%% Verify did not create/materialize remediation for %.', p_topic_key;
  end if;

  for v_resource in
    select * from public.assignment_resources
    where assignment_id = v_remediation.assignment_id
      and resource_type = 'custom_exercise'
    order by sequence_index
  loop
    v_phase := v_resource.exercise_config ->> 'recovery_phase';
    v_evidence_type := case v_phase
      when 'recover' then 'guided_practice'
      when 'practice' then 'practice'
      when 'school' then 'school_mode'
      when 'verify' then 'mini_check'
    end;
    v_score := case when v_phase = 'verify' then 84 else 100 end;

    if v_phase = 'verify'
       and (v_resource.exercise_config ->> 'exercise_version_id')::uuid is distinct from p_expected_retake_version_id then
      raise exception 'Unexpected remediation Verify version for %.', p_topic_key;
    end if;

    insert into public.exercise_builder_attempts (
      learner_id, assignment_id, assignment_resource_id, exercise_id, exercise_version_id,
      attempt_number, status, exercise_snapshot, earned_points, max_points, score, submitted_at
    ) values (
      p_user_id, v_remediation.assignment_id, v_resource.id,
      (v_resource.exercise_config ->> 'exercise_id')::uuid,
      (v_resource.exercise_config ->> 'exercise_version_id')::uuid,
      1, 'submitted', '{}'::jsonb, v_score, 100, v_score, clock_timestamp()
    ) returning id into v_attempt_id;

    perform public.record_recovery_mastery_evidence(
      p_enrollment_id, p_topic_key, v_evidence_type, v_score,
      'canary:' || p_topic_key || ':remediation:' || v_phase,
      v_remediation.id, v_attempt_id,
      jsonb_build_object('phase', v_phase, 'canary', true), clock_timestamp()
    );
  end loop;

  select * into v_retake
  from public.recovery_mastery_evidence
  where evidence_key = 'canary:' || p_topic_key || ':remediation:verify';

  if v_retake.score <> 84
     or coalesce((v_retake.metadata ->> 'fresh_form')::boolean, false) is distinct from p_expected_fresh then
    raise exception 'Unexpected retake freshness/score for %.', p_topic_key;
  end if;

  if v_retake.metadata ->> 'previous_verify_exercise_version_id' is distinct from p_source_version_id::text then
    raise exception 'Previous Verify version was not retained for %.', p_topic_key;
  end if;

  select mastery_state, (mastery_reason ->> 'latest_reliable_score')::numeric
  into v_state, v_latest_reliable
  from public.recovery_student_topics
  where enrollment_id = p_enrollment_id and topic_key = p_topic_key;

  if p_expected_fresh then
    if v_retake.metadata ->> 'freshness_reason' <> 'different_exercise_version'
       or v_latest_reliable <> 84 then
      raise exception 'different-form retake must be fresh';
    end if;
    if v_state <> 'recovered' then
      raise exception 'different-form retake must recover normally';
    end if;
  else
    if v_retake.metadata ->> 'freshness_reason' <> 'same_exercise_version'
       or v_latest_reliable <> 54
       or v_state = 'recovered' then
      raise exception 'same-form retake must not recover';
    end if;
  end if;

  return jsonb_build_object('fresh_form', p_expected_fresh, 'mastery_state', v_state);
end;
$$;
