-- Keep section, attempt, and diagnostic totals aligned after teacher review.

create or replace function public.refresh_exercise_builder_attempt_totals(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_earned numeric := 0;
  v_max numeric := 0;
  v_score numeric := 0;
  v_correct integer := 0;
  v_nearly integer := 0;
  v_incorrect integer := 0;
  v_unanswered integer := 0;
  v_summary jsonb;
begin
  select * into v_attempt
  from public.exercise_builder_attempts
  where id = p_attempt_id
  for update;
  if v_attempt.id is null then raise exception 'Attempt not found.'; end if;

  update public.exercise_builder_attempt_sections section
  set earned_points = totals.earned_points,
      max_points = totals.max_points
  from (
    select question.attempt_section_id,
           coalesce(sum(coalesce((question.grading_result ->> 'earned_points')::numeric, 0)), 0) earned_points,
           coalesce(sum(coalesce((question.grading_result ->> 'max_points')::numeric, 0)), 0) max_points
    from public.exercise_builder_attempt_questions question
    where question.attempt_id = p_attempt_id
    group by question.attempt_section_id
  ) totals
  where section.id = totals.attempt_section_id;

  select
    coalesce(sum(coalesce((question.grading_result ->> 'earned_points')::numeric, 0)), 0),
    coalesce(sum(coalesce((question.grading_result ->> 'max_points')::numeric, 0)), 0),
    count(*) filter (where question.grading_result ->> 'status' = 'correct'),
    count(*) filter (where question.grading_result ->> 'status' = 'nearly_correct'),
    count(*) filter (where question.grading_result ->> 'status' = 'incorrect'),
    count(*) filter (where coalesce(question.grading_result ->> 'status', 'unanswered') = 'unanswered')
    into v_earned, v_max, v_correct, v_nearly, v_incorrect, v_unanswered
  from public.exercise_builder_attempt_questions question
  where question.attempt_id = p_attempt_id;

  v_score := case when v_max > 0 then round((v_earned / v_max) * 100, 2) else 100 end;
  v_summary := coalesce(v_attempt.result_summary, '{}'::jsonb) || jsonb_build_object(
    'correct', v_correct,
    'nearly_correct', v_nearly,
    'incorrect', v_incorrect,
    'unanswered', v_unanswered,
    'teacher_reviewed', v_attempt.review_status <> 'unreviewed'
  );

  update public.exercise_builder_attempts
  set earned_points = v_earned,
      max_points = v_max,
      score = v_score,
      result_summary = v_summary
  where id = p_attempt_id;

  if v_attempt.status = 'submitted' then
    perform public.record_exercise_builder_attempt_diagnostics(p_attempt_id);
  end if;

  return jsonb_build_object(
    'earned_points', v_earned,
    'max_points', v_max,
    'score', v_score,
    'correct', v_correct,
    'nearly_correct', v_nearly,
    'incorrect', v_incorrect,
    'unanswered', v_unanswered
  );
end;
$$;
