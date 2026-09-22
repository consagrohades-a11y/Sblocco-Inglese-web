-- Count inner comprehension items in learner/admin result summaries without changing scoring.
-- This also improves grouped multiple-choice blocks because they compile through
-- reading_comprehension with per-item grading.

create or replace function public.exercise_builder_result_counts(
  p_snapshot jsonb,
  p_result jsonb
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  with statuses as (
    select element ->> 'status' as status
    from jsonb_array_elements(
      case
        when coalesce(p_snapshot ->> 'type', '') in ('reading_comprehension', 'listening_comprehension')
          and jsonb_typeof(p_result -> 'correct_answer') = 'array'
        then p_result -> 'correct_answer'
        else jsonb_build_array(coalesce(p_result, '{}'::jsonb))
      end
    ) element
  )
  select jsonb_build_object(
    'correct', count(*) filter (where status = 'correct'),
    'nearly_correct', count(*) filter (where status = 'nearly_correct'),
    'incorrect', count(*) filter (where status = 'incorrect'),
    'unanswered', count(*) filter (where status = 'unanswered'),
    'pending_review', count(*) filter (where status = 'pending_review')
  )
  from statuses;
$$;

revoke all on function public.exercise_builder_result_counts(jsonb, jsonb) from public;

create or replace function public.submit_exercise_builder_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_question record;
  v_result jsonb;
  v_counts jsonb;
  v_earned numeric := 0;
  v_max numeric := 0;
  v_score numeric := null;
  v_config jsonb;
  v_complete boolean := false;
  v_correct integer := 0;
  v_nearly integer := 0;
  v_incorrect integer := 0;
  v_unanswered integer := 0;
  v_pending integer := 0;
begin
  select * into v_attempt from public.exercise_builder_attempts
  where id = p_attempt_id and learner_id = auth.uid() and status = 'in_progress';
  if v_attempt.id is null then raise exception 'Open attempt not found.'; end if;

  for v_question in
    select * from public.exercise_builder_attempt_questions where attempt_id = p_attempt_id
  loop
    v_result := public.exercise_builder_grade_answer(v_question.question_snapshot, v_question.answer);
    update public.exercise_builder_attempt_questions
    set grading_result = v_result,
        automatic_grading_result = v_result
    where id = v_question.id;

    v_earned := v_earned + coalesce((v_result ->> 'earned_points')::numeric, 0);
    v_max := v_max + coalesce((v_result ->> 'max_points')::numeric, 0);

    v_counts := public.exercise_builder_result_counts(v_question.question_snapshot, v_result);
    v_correct := v_correct + coalesce((v_counts ->> 'correct')::integer, 0);
    v_nearly := v_nearly + coalesce((v_counts ->> 'nearly_correct')::integer, 0);
    v_incorrect := v_incorrect + coalesce((v_counts ->> 'incorrect')::integer, 0);
    v_unanswered := v_unanswered + coalesce((v_counts ->> 'unanswered')::integer, 0);
    v_pending := v_pending + coalesce((v_counts ->> 'pending_review')::integer, 0);
  end loop;

  if v_pending = 0 then
    v_score := case when v_max > 0 then round((v_earned / v_max) * 100, 3) else 100 end;
  end if;

  update public.exercise_builder_attempt_sections s
  set status = 'completed',
      earned_points = summary.earned,
      max_points = summary.maximum,
      completed_at = coalesce(s.completed_at, now())
  from (
    select attempt_section_id,
      sum(coalesce((grading_result ->> 'earned_points')::numeric, 0)) earned,
      sum(coalesce((grading_result ->> 'max_points')::numeric, 0)) maximum
    from public.exercise_builder_attempt_questions
    where attempt_id = p_attempt_id
    group by attempt_section_id
  ) summary
  where s.id = summary.attempt_section_id;

  update public.exercise_builder_attempts
  set status = 'submitted',
      earned_points = v_earned,
      max_points = v_max,
      score = v_score,
      review_status = case when v_pending > 0 then 'unreviewed' else review_status end,
      result_summary = jsonb_build_object(
        'correct', v_correct,
        'nearly_correct', v_nearly,
        'incorrect', v_incorrect,
        'unanswered', v_unanswered,
        'pending_review', v_pending,
        'review_required', v_pending > 0
      ),
      submitted_at = now()
  where id = p_attempt_id;

  if v_pending = 0 then
    select exercise_config into v_config
    from public.assignment_resources
    where id = v_attempt.assignment_resource_id;

    if coalesce(v_config ->> 'completion_rule', 'passed') = 'submitted' then
      v_complete := true;
    elsif coalesce(v_config ->> 'completion_rule', 'passed') = 'attempts' then
      v_complete := v_attempt.attempt_number >= greatest(
        1,
        coalesce((v_config ->> 'required_attempts')::integer, 1)
      );
    else
      v_complete := v_score >= greatest(
        0,
        least(100, coalesce((v_config ->> 'required_score')::numeric, 70))
      );
    end if;

    if v_complete then
      update public.assignments
      set status = 'completed'
      where id = v_attempt.assignment_id and learner_id = auth.uid();
    end if;
  end if;

  return public.exercise_builder_attempt_payload(p_attempt_id);
end;
$$;

create or replace function public.refresh_exercise_builder_attempt_totals(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_config jsonb;
  v_earned numeric := 0;
  v_max numeric := 0;
  v_score numeric := null;
  v_correct integer := 0;
  v_nearly integer := 0;
  v_incorrect integer := 0;
  v_unanswered integer := 0;
  v_pending integer := 0;
  v_complete boolean := false;
  v_summary jsonb;
begin
  select * into v_attempt
  from public.exercise_builder_attempts
  where id = p_attempt_id
  for update;
  if v_attempt.id is null then raise exception 'Attempt not found.'; end if;

  select
    coalesce(sum(coalesce((question.grading_result ->> 'earned_points')::numeric, 0)), 0),
    coalesce(sum(coalesce((question.grading_result ->> 'max_points')::numeric, 0)), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> 'correct')::integer), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> 'nearly_correct')::integer), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> 'incorrect')::integer), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> 'unanswered')::integer), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> 'pending_review')::integer), 0)
  into v_earned, v_max, v_correct, v_nearly, v_incorrect, v_unanswered, v_pending
  from public.exercise_builder_attempt_questions question
  where question.attempt_id = p_attempt_id;

  if v_pending = 0 then
    v_score := case when v_max > 0 then round((v_earned / v_max) * 100, 2) else 100 end;
  end if;

  v_summary := coalesce(v_attempt.result_summary, '{}'::jsonb) || jsonb_build_object(
    'correct', v_correct,
    'nearly_correct', v_nearly,
    'incorrect', v_incorrect,
    'unanswered', v_unanswered,
    'pending_review', v_pending,
    'review_required', v_pending > 0,
    'teacher_reviewed', v_attempt.review_status <> 'unreviewed'
  );

  update public.exercise_builder_attempts
  set earned_points = v_earned,
      max_points = v_max,
      score = v_score,
      result_summary = v_summary
  where id = p_attempt_id;

  update public.exercise_builder_attempt_sections section
  set earned_points = summary.earned,
      max_points = summary.maximum
  from (
    select attempt_section_id,
      coalesce(sum(coalesce((grading_result ->> 'earned_points')::numeric, 0)), 0) earned,
      coalesce(sum(coalesce((grading_result ->> 'max_points')::numeric, 0)), 0) maximum
    from public.exercise_builder_attempt_questions
    where attempt_id = p_attempt_id
    group by attempt_section_id
  ) summary
  where section.id = summary.attempt_section_id;

  if v_attempt.status = 'submitted' and v_pending = 0 then
    perform public.record_exercise_builder_attempt_diagnostics(p_attempt_id);

    select exercise_config into v_config
    from public.assignment_resources
    where id = v_attempt.assignment_resource_id;

    if coalesce(v_config ->> 'completion_rule', 'passed') = 'submitted' then
      v_complete := true;
    elsif coalesce(v_config ->> 'completion_rule', 'passed') = 'attempts' then
      v_complete := v_attempt.attempt_number >= greatest(
        1,
        coalesce((v_config ->> 'required_attempts')::integer, 1)
      );
    else
      v_complete := v_score >= greatest(
        0,
        least(100, coalesce((v_config ->> 'required_score')::numeric, 70))
      );
    end if;

    if v_complete then
      update public.assignments
      set status = 'completed'
      where id = v_attempt.assignment_id;
    end if;
  end if;

  return jsonb_build_object(
    'earned_points', v_earned,
    'max_points', v_max,
    'score', v_score,
    'correct', v_correct,
    'nearly_correct', v_nearly,
    'incorrect', v_incorrect,
    'unanswered', v_unanswered,
    'pending_review', v_pending
  );
end;
$$;

revoke all on function public.submit_exercise_builder_attempt(uuid) from public;
grant execute on function public.submit_exercise_builder_attempt(uuid) to authenticated;

revoke all on function public.refresh_exercise_builder_attempt_totals(uuid) from public;

notify pgrst, 'reload schema';
