\set ON_ERROR_STOP on

begin;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$
declare
  v_learner_same uuid := '00000000-0000-0000-0000-0000000000a1';
  v_learner_fresh uuid := '00000000-0000-0000-0000-0000000000a2';
  v_enrollment_same uuid := '00000000-0000-0000-0000-0000000000b1';
  v_enrollment_fresh uuid := '00000000-0000-0000-0000-0000000000b2';
  v_exercise_a uuid := '00000000-0000-0000-0000-0000000000c1';
  v_exercise_b uuid := '00000000-0000-0000-0000-0000000000c2';
  v_version_a uuid := '00000000-0000-0000-0000-0000000000d1';
  v_version_b uuid := '00000000-0000-0000-0000-0000000000d2';
  v_source_session_same uuid := '00000000-0000-0000-0000-0000000000e1';
  v_source_session_fresh uuid := '00000000-0000-0000-0000-0000000000e2';
  v_source_assignment_same uuid := '00000000-0000-0000-0000-0000000000f1';
  v_source_assignment_fresh uuid := '00000000-0000-0000-0000-0000000000f2';
  v_source_resource_same uuid := '00000000-0000-0000-0001-0000000000a1';
  v_source_resource_fresh uuid := '00000000-0000-0000-0001-0000000000a2';
  v_source_attempt_same uuid := '00000000-0000-0000-0001-0000000000b1';
  v_source_attempt_fresh uuid := '00000000-0000-0000-0001-0000000000b2';
  v_remediation public.recovery_plan_sessions%rowtype;
  v_evidence public.recovery_mastery_evidence%rowtype;
  v_resource record;
  v_phase text;
  v_score numeric;
  v_verify_version uuid;
  v_state text;
  v_count integer;
begin
  insert into auth.users (id, email) values
    (v_learner_same, 'recovery-retake-same@example.test'),
    (v_learner_fresh, 'recovery-retake-fresh@example.test')
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name, role, status) values
    (v_learner_same, 'Recovery Retake Same', 'student', 'active'),
    (v_learner_fresh, 'Recovery Retake Fresh', 'student', 'active')
  on conflict (id) do update set status = 'active';

  insert into public.exercise_builder_exercises (
    id, status, created_by, approved_by, approved_at, published_at
  ) values
    (v_exercise_a, 'published', v_learner_same, v_learner_same, now(), now()),
    (v_exercise_b, 'published', v_learner_same, v_learner_same, now(), now());

  insert into public.exercise_builder_exercise_versions (
    id, exercise_id, version_number, title, instructions, instruction_language,
    level, topic, estimated_minutes, settings, review_status, created_by
  ) values
    (
      v_version_a, v_exercise_a, 1, 'Canary Verify Form A', 'Complete the canary.', 'it',
      'A2', 'recovery-canary', 5,
      '{"display_mode":"one_at_a_time","feedback_timing":"exercise_end","show_score":true,"show_correct_answers":true,"show_explanations":false,"show_diagnostic_summary":false,"allow_retry":false}'::jsonb,
      'approved', v_learner_same
    ),
    (
      v_version_b, v_exercise_b, 1, 'Canary Verify Form B', 'Complete the canary.', 'it',
      'A2', 'recovery-canary', 5,
      '{"display_mode":"one_at_a_time","feedback_timing":"exercise_end","show_score":true,"show_correct_answers":true,"show_explanations":false,"show_diagnostic_summary":false,"allow_retry":false}'::jsonb,
      'approved', v_learner_same
    );

  update public.exercise_builder_exercises
  set current_version_id = case id when v_exercise_a then v_version_a else v_version_b end
  where id in (v_exercise_a, v_exercise_b);

  delete from public.recovery_exercise_map
  where topic_key in ('present-simple', 'past-simple');

  -- Same-form scenario: all four phases, including Verify, resolve to form A.
  insert into public.recovery_exercise_map (
    topic_key, phase, exercise_id, exercise_version_id, estimated_minutes, sort_order, active
  ) values
    ('present-simple', 'recover', v_exercise_a, v_version_a, 5, 10, true),
    ('present-simple', 'practice', v_exercise_a, v_version_a, 5, 10, true),
    ('present-simple', 'school', v_exercise_a, v_version_a, 5, 10, true),
    ('present-simple', 'verify', v_exercise_a, v_version_a, 5, 10, true),
    -- Different-form scenario: remediation Verify resolves to form B while source Verify was A.
    ('past-simple', 'recover', v_exercise_a, v_version_a, 5, 10, true),
    ('past-simple', 'practice', v_exercise_a, v_version_a, 5, 10, true),
    ('past-simple', 'school', v_exercise_a, v_version_a, 5, 10, true),
    ('past-simple', 'verify', v_exercise_b, v_version_b, 5, 10, true);

  insert into public.recovery_enrollments (
    id, user_id, class_year, exam_date, mode, status, plan_version
  ) values
    (v_enrollment_same, v_learner_same, 1, current_date + 14, 'complete', 'active', 1),
    (v_enrollment_fresh, v_learner_fresh, 1, current_date + 14, 'complete', 'active', 1);

  insert into public.recovery_student_topics (enrollment_id, topic_key, required, priority_score) values
    (v_enrollment_same, 'present-simple', true, 90),
    (v_enrollment_fresh, 'past-simple', true, 90);

  insert into public.assignments (
    id, learner_id, title, reason, status, required, estimated_minutes, published_at, created_by
  ) values
    (v_source_assignment_same, v_learner_same, 'Source Verify A', 'DB canary', 'published', true, 5, now(), v_learner_same),
    (v_source_assignment_fresh, v_learner_fresh, 'Source Verify A', 'DB canary', 'published', true, 5, now(), v_learner_fresh);

  insert into public.assignment_resources (
    id, assignment_id, resource_key, resource_type, title, route, sequence_index, exercise_config
  ) values
    (
      v_source_resource_same, v_source_assignment_same, 'recovery-verify-canary-source-a',
      'custom_exercise', 'Verifica argomento', '/exercises', 1,
      jsonb_build_object('exercise_id', v_exercise_a, 'exercise_version_id', v_version_a, 'completion_rule', 'submitted')
    ),
    (
      v_source_resource_fresh, v_source_assignment_fresh, 'recovery-verify-canary-source-a',
      'custom_exercise', 'Verifica argomento', '/exercises', 1,
      jsonb_build_object('exercise_id', v_exercise_a, 'exercise_version_id', v_version_a, 'completion_rule', 'submitted')
    );

  insert into public.recovery_plan_sessions (
    id, enrollment_id, sequence_index, session_type, topic_key, title, rationale,
    estimated_minutes, priority_score, stages, metadata, status,
    assignment_id, assignment_resource_id, score, completed_at
  ) values
    (
      v_source_session_same, v_enrollment_same, 1, 'topic', 'present-simple', 'Source Verify A', 'Canary source',
      5, 90, '["mini_verifica"]'::jsonb, '{"canary":true}'::jsonb, 'completed',
      v_source_assignment_same, v_source_resource_same, 54, now()
    ),
    (
      v_source_session_fresh, v_enrollment_fresh, 1, 'topic', 'past-simple', 'Source Verify A', 'Canary source',
      5, 90, '["mini_verifica"]'::jsonb, '{"canary":true}'::jsonb, 'completed',
      v_source_assignment_fresh, v_source_resource_fresh, 54, now()
    );

  insert into public.exercise_builder_attempts (
    id, learner_id, assignment_id, assignment_resource_id, exercise_id, exercise_version_id,
    attempt_number, status, exercise_snapshot, earned_points, max_points, score, submitted_at
  ) values
    (
      v_source_attempt_same, v_learner_same, v_source_assignment_same, v_source_resource_same,
      v_exercise_a, v_version_a, 1, 'submitted', '{}'::jsonb, 54, 100, 54, now()
    ),
    (
      v_source_attempt_fresh, v_learner_fresh, v_source_assignment_fresh, v_source_resource_fresh,
      v_exercise_a, v_version_a, 1, 'submitted', '{}'::jsonb, 54, 100, 54, now()
    );

  -- Scenario 1: 54% form A -> remediation -> 84% form A.
  perform public.record_recovery_mastery_evidence(
    v_enrollment_same, 'present-simple', 'mini_check', 54, 'canary:same:initial',
    v_source_session_same, v_source_attempt_same, '{"canary":true}'::jsonb, now()
  );

  select * into v_evidence
  from public.recovery_mastery_evidence
  where evidence_key = 'canary:same:initial';
  if coalesce((v_evidence.metadata ->> 'fresh_form')::boolean, false) is not true then
    raise exception 'Initial Verify A should be fresh.';
  end if;

  select * into v_remediation
  from public.recovery_plan_sessions
  where enrollment_id = v_enrollment_same
    and metadata ->> 'source_mastery_evidence_id' = v_evidence.id::text
  order by created_at desc
  limit 1;
  if v_remediation.id is null then
    raise exception '54%% Verify did not create remediation.';
  end if;

  select (exercise_config ->> 'exercise_version_id')::uuid into v_verify_version
  from public.assignment_resources
  where assignment_id = v_remediation.assignment_id
    and exercise_config ->> 'recovery_phase' = 'verify';
  if v_verify_version is distinct from v_version_a then
    raise exception 'Same-form canary expected remediation Verify form A.';
  end if;

  for v_resource in
    select * from public.assignment_resources
    where assignment_id = v_remediation.assignment_id
      and resource_type = 'custom_exercise'
    order by sequence_index
  loop
    v_phase := v_resource.exercise_config ->> 'recovery_phase';
    v_score := case when v_phase = 'verify' then 84 else 100 end;
    insert into public.exercise_builder_attempts (
      learner_id, assignment_id, assignment_resource_id, exercise_id, exercise_version_id,
      attempt_number, status, exercise_snapshot, earned_points, max_points, score, submitted_at
    ) values (
      v_learner_same, v_remediation.assignment_id, v_resource.id,
      (v_resource.exercise_config ->> 'exercise_id')::uuid,
      (v_resource.exercise_config ->> 'exercise_version_id')::uuid,
      1, 'submitted', '{}'::jsonb, v_score, 100, v_score, now()
    );
  end loop;

  perform set_config('request.jwt.claim.sub', v_learner_same::text, true);
  perform public.sync_recovery_session(v_remediation.id);

  select * into v_evidence
  from public.recovery_mastery_evidence
  where enrollment_id = v_enrollment_same
    and topic_key = 'present-simple'
    and evidence_type = 'mini_check'
  order by observed_at desc, created_at desc, id desc
  limit 1;

  if v_evidence.score <> 84 or coalesce((v_evidence.metadata ->> 'fresh_form')::boolean, true) is not false then
    raise exception 'same-form retake must not recover: 84%% form A was not marked non-fresh.';
  end if;
  if v_evidence.metadata ->> 'freshness_reason' <> 'same_exercise_version' then
    raise exception 'Same-form retake reason was not persisted.';
  end if;

  select mastery_state into v_state
  from public.recovery_student_topics
  where enrollment_id = v_enrollment_same and topic_key = 'present-simple';
  if v_state = 'recovered' then
    raise exception 'same-form retake must not recover';
  end if;

  select count(*) into v_count
  from public.recovery_mastery_evidence
  where enrollment_id = v_enrollment_same and topic_key = 'present-simple' and evidence_type = 'mini_check';
  if v_count <> 2 then
    raise exception 'Same-form attempt/evidence history was not preserved.';
  end if;

  -- Fresh cumulative evidence must still be able to consolidate the topic.
  perform public.record_recovery_mastery_evidence(
    v_enrollment_same, 'present-simple', 'checkpoint', 90, 'canary:same:checkpoint',
    null, null, '{"canary":true}'::jsonb, now() + interval '1 second'
  );
  select mastery_state into v_state
  from public.recovery_student_topics
  where enrollment_id = v_enrollment_same and topic_key = 'present-simple';
  if v_state <> 'recovered' then
    raise exception 'checkpoint must still consolidate after non-fresh retake';
  end if;

  -- Scenario 2: 54% form A -> remediation -> 84% form B.
  perform public.record_recovery_mastery_evidence(
    v_enrollment_fresh, 'past-simple', 'mini_check', 54, 'canary:fresh:initial',
    v_source_session_fresh, v_source_attempt_fresh, '{"canary":true}'::jsonb, now()
  );

  select * into v_evidence
  from public.recovery_mastery_evidence
  where evidence_key = 'canary:fresh:initial';

  select * into v_remediation
  from public.recovery_plan_sessions
  where enrollment_id = v_enrollment_fresh
    and metadata ->> 'source_mastery_evidence_id' = v_evidence.id::text
  order by created_at desc
  limit 1;
  if v_remediation.id is null then
    raise exception 'Fresh-form scenario did not create remediation.';
  end if;

  select (exercise_config ->> 'exercise_version_id')::uuid into v_verify_version
  from public.assignment_resources
  where assignment_id = v_remediation.assignment_id
    and exercise_config ->> 'recovery_phase' = 'verify';
  if v_verify_version is distinct from v_version_b then
    raise exception 'Different-form canary expected remediation Verify form B.';
  end if;

  for v_resource in
    select * from public.assignment_resources
    where assignment_id = v_remediation.assignment_id
      and resource_type = 'custom_exercise'
    order by sequence_index
  loop
    v_phase := v_resource.exercise_config ->> 'recovery_phase';
    v_score := case when v_phase = 'verify' then 84 else 100 end;
    insert into public.exercise_builder_attempts (
      learner_id, assignment_id, assignment_resource_id, exercise_id, exercise_version_id,
      attempt_number, status, exercise_snapshot, earned_points, max_points, score, submitted_at
    ) values (
      v_learner_fresh, v_remediation.assignment_id, v_resource.id,
      (v_resource.exercise_config ->> 'exercise_id')::uuid,
      (v_resource.exercise_config ->> 'exercise_version_id')::uuid,
      1, 'submitted', '{}'::jsonb, v_score, 100, v_score, now()
    );
  end loop;

  perform set_config('request.jwt.claim.sub', v_learner_fresh::text, true);
  perform public.sync_recovery_session(v_remediation.id);

  select * into v_evidence
  from public.recovery_mastery_evidence
  where enrollment_id = v_enrollment_fresh
    and topic_key = 'past-simple'
    and evidence_type = 'mini_check'
  order by observed_at desc, created_at desc, id desc
  limit 1;

  if v_evidence.score <> 84 or coalesce((v_evidence.metadata ->> 'fresh_form')::boolean, false) is not true then
    raise exception 'different-form retake must be fresh';
  end if;
  if v_evidence.metadata ->> 'freshness_reason' <> 'different_exercise_version' then
    raise exception 'Different-form freshness reason was not persisted.';
  end if;

  select mastery_state into v_state
  from public.recovery_student_topics
  where enrollment_id = v_enrollment_fresh and topic_key = 'past-simple';
  if v_state <> 'recovered' then
    raise exception 'different-form retake must recover normally';
  end if;

  raise notice 'Recovery remediation DB canary passed: same-form blocked, checkpoint consolidates, different-form recovers.';
end;
$$;

rollback;
