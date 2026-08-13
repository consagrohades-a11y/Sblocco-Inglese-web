begin;

do $$
declare
  v_user_same uuid := '00000000-0000-0000-0000-0000000000a1';
  v_user_fresh uuid := '00000000-0000-0000-0000-0000000000a2';
  v_enrollment_same uuid := '00000000-0000-0000-0000-0000000000b1';
  v_enrollment_fresh uuid := '00000000-0000-0000-0000-0000000000b2';
  v_exercise_id uuid := '00000000-0000-0000-0000-0000000000c1';
  v_version_a uuid := '00000000-0000-0000-0000-0000000000d1';
  v_version_b uuid := '00000000-0000-0000-0000-0000000000d2';
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_user_same, 'recovery-retake-same@example.test', '{"display_name":"Recovery Retake Same"}'::jsonb),
    (v_user_fresh, 'recovery-retake-fresh@example.test', '{"display_name":"Recovery Retake Fresh"}'::jsonb);

  insert into public.exercise_builder_exercises (
    id, status, created_by, approved_by, approved_at, published_at
  ) values (v_exercise_id, 'published', v_user_same, v_user_same, now(), now());

  insert into public.exercise_builder_exercise_versions (
    id, exercise_id, version_number, title, instructions, level, topic,
    estimated_minutes, review_status, created_by
  ) values
    (v_version_a, v_exercise_id, 1, 'Canary Verify Form A', 'Canary', 'A2', 'recovery-canary', 5, 'approved', v_user_same),
    (v_version_b, v_exercise_id, 2, 'Canary Verify Form B', 'Canary', 'A2', 'recovery-canary', 5, 'approved', v_user_same);

  update public.exercise_builder_exercises set current_version_id = v_version_b where id = v_exercise_id;

  delete from public.recovery_exercise_map where topic_key in ('present-simple', 'past-simple');
  insert into public.recovery_exercise_map (
    topic_key, phase, exercise_id, exercise_version_id, estimated_minutes, sort_order, active
  ) values
    ('present-simple', 'recover', v_exercise_id, v_version_a, 5, 10, true),
    ('present-simple', 'practice', v_exercise_id, v_version_a, 5, 10, true),
    ('present-simple', 'school', v_exercise_id, v_version_a, 5, 10, true),
    ('present-simple', 'verify', v_exercise_id, v_version_a, 5, 10, true),
    ('past-simple', 'recover', v_exercise_id, v_version_a, 5, 10, true),
    ('past-simple', 'practice', v_exercise_id, v_version_a, 5, 10, true),
    ('past-simple', 'school', v_exercise_id, v_version_a, 5, 10, true),
    ('past-simple', 'verify', v_exercise_id, v_version_b, 5, 10, true);

  insert into public.recovery_enrollments (
    id, user_id, class_year, exam_date, mode, status, plan_version
  ) values
    (v_enrollment_same, v_user_same, 1, current_date + 14, 'complete', 'active', 1),
    (v_enrollment_fresh, v_user_fresh, 1, current_date + 14, 'complete', 'active', 1);

  insert into public.recovery_student_topics (enrollment_id, topic_key, required, priority_score) values
    (v_enrollment_same, 'present-simple', true, 90),
    (v_enrollment_fresh, 'past-simple', true, 90);
end;
$$;
