-- Expose the assignment completion goal (rule + required score/attempts) in the
-- learner attempt payload, so the player can show "Obiettivo: 70%" instead of
-- keeping the passing threshold implicit. Additive: the payload keeps its shape
-- and only gains an optional attempt.completion object.

create or replace function public.exercise_builder_attempt_payload(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'status', a.status, 'attempt_number', a.attempt_number,
      'current_section_index', a.current_section_index, 'current_question_index', a.current_question_index,
      'earned_points', case when a.review_status = 'reviewed' then null else a.earned_points end,
      'max_points', a.max_points,
      'score', case when a.review_status = 'reviewed' then null else a.score end,
      'result_summary', case when a.review_status = 'reviewed' then jsonb_build_object('pending_review', 0, 'review_required', true) else a.result_summary end,
      'review_status', a.review_status,
      'teacher_note', case when a.review_status = 'approved' then a.teacher_note else null end,
      'reviewed_at', case when a.review_status = 'approved' then a.reviewed_at else null end,
      'started_at', a.started_at, 'submitted_at', a.submitted_at,
      'completion', (
        select jsonb_build_object(
          'rule', coalesce(r.exercise_config ->> 'completion_rule', 'passed'),
          'required_score', case
            when coalesce(r.exercise_config ->> 'completion_rule', 'passed') = 'passed'
            then greatest(0, least(100, coalesce((r.exercise_config ->> 'required_score')::numeric, 70)))
            else null end,
          'required_attempts', case
            when coalesce(r.exercise_config ->> 'completion_rule', 'passed') = 'attempts'
            then greatest(1, coalesce((r.exercise_config ->> 'required_attempts')::integer, 1))
            else null end
        )
        from public.assignment_resources r
        where r.id = a.assignment_resource_id
      )
    ),
    'exercise', a.exercise_snapshot,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'sequence_index', s.sequence_index, 'title', s.title,
        'instructions', s.instructions, 'feedback_timing', s.feedback_timing,
        'settings', s.settings, 'status', s.status,
        'earned_points', case when a.review_status = 'reviewed' then null else s.earned_points end,
        'max_points', s.max_points,
        'questions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', q.id, 'sequence_index', q.sequence_index,
            'question', public.exercise_builder_safe_question_snapshot(q.question_snapshot),
            'answer', q.answer,
            'teacher_comment', case when a.review_status = 'approved' then q.teacher_comment else null end,
            'teacher_turn_reviews', case when a.review_status = 'approved' then q.teacher_turn_reviews else '{}'::jsonb end,
            'result', case
              when a.status = 'submitted' then public.exercise_builder_learner_grading_result(q.question_snapshot, case when a.review_status = 'approved' then q.grading_result else coalesce(q.automatic_grading_result, q.grading_result) end)
              when s.feedback_timing = 'question_end' and q.grading_result is not null then public.exercise_builder_learner_grading_result(q.question_snapshot, coalesce(q.automatic_grading_result, q.grading_result))
              when s.status = 'completed' and s.feedback_timing = 'section_end' then public.exercise_builder_learner_grading_result(q.question_snapshot, case when a.review_status = 'approved' then q.grading_result else coalesce(q.automatic_grading_result, q.grading_result) end)
              else null end
          ) order by q.sequence_index)
          from public.exercise_builder_attempt_questions q where q.attempt_section_id = s.id
        ), '[]'::jsonb)
      ) order by s.sequence_index)
      from public.exercise_builder_attempt_sections s where s.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.exercise_builder_attempts a
  where a.id = p_attempt_id and (a.learner_id = auth.uid() or public.is_admin());
$$;

notify pgrst, 'reload schema';
