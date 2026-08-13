do $$
declare
  v_user_same uuid := '00000000-0000-0000-0000-0000000000a1';
  v_user_fresh uuid := '00000000-0000-0000-0000-0000000000a2';
  v_enrollment_same uuid := '00000000-0000-0000-0000-0000000000b1';
  v_enrollment_fresh uuid := '00000000-0000-0000-0000-0000000000b2';
  v_exercise_id uuid := '00000000-0000-0000-0000-0000000000c1';
  v_version_a uuid := '00000000-0000-0000-0000-0000000000d1';
  v_version_b uuid := '00000000-0000-0000-0000-0000000000d2';
  v_state text;
begin
  -- 54% form A -> remediation -> 84% form A = non-fresh recovery evidence.
  perform pg_temp.run_recovery_retake_case(
    v_user_same, v_enrollment_same, 'present-simple',
    v_exercise_id, v_version_a, v_version_a, false
  );

  -- Fresh checkpoint/mock evidence must still be able to consolidate the topic.
  perform public.record_recovery_mastery_evidence(
    v_enrollment_same, 'present-simple', 'checkpoint', 100,
    'canary:present-simple:checkpoint', null, null,
    '{"canary":true}'::jsonb, now() + interval '1 second'
  );

  select mastery_state into v_state
  from public.recovery_student_topics
  where enrollment_id = v_enrollment_same and topic_key = 'present-simple';

  if v_state <> 'recovered' then
    raise exception 'checkpoint must still consolidate after non-fresh retake';
  end if;

  -- 54% form A -> remediation -> 84% form B = fresh evidence normale.
  perform pg_temp.run_recovery_retake_case(
    v_user_fresh, v_enrollment_fresh, 'past-simple',
    v_exercise_id, v_version_a, v_version_b, true
  );

  raise notice 'Recovery remediation DB canary passed.';
end;
$$;

rollback;
