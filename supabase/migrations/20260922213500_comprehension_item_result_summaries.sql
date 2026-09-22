-- Count inner comprehension items in learner/admin result summaries without changing scoring.
-- This also improves existing grouped multiple-choice blocks because they compile
-- through reading_comprehension with per-item grading.

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

do $$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.submit_exercise_builder_attempt(uuid)'::regprocedure)
    into v_definition;

  if position('v_counts jsonb;' in v_definition) = 0 then
    if position('v_result jsonb;' in v_definition) = 0 then
      raise exception 'Unexpected submit_exercise_builder_attempt declaration.';
    end if;
    v_definition := replace(
      v_definition,
      'v_result jsonb;',
      'v_result jsonb;
  v_counts jsonb;'
    );
  end if;

  v_old := 'case v_result ->> ''status''
      when ''correct'' then v_correct := v_correct + 1;
      when ''nearly_correct'' then v_nearly := v_nearly + 1;
      when ''unanswered'' then v_unanswered := v_unanswered + 1;
      when ''pending_review'' then v_pending := v_pending + 1;
      when ''ungraded'' then null;
      else v_incorrect := v_incorrect + 1;
    end case;';

  v_new := 'v_counts := public.exercise_builder_result_counts(v_question.question_snapshot, v_result);
    v_correct := v_correct + coalesce((v_counts ->> ''correct'')::integer, 0);
    v_nearly := v_nearly + coalesce((v_counts ->> ''nearly_correct'')::integer, 0);
    v_incorrect := v_incorrect + coalesce((v_counts ->> ''incorrect'')::integer, 0);
    v_unanswered := v_unanswered + coalesce((v_counts ->> ''unanswered'')::integer, 0);
    v_pending := v_pending + coalesce((v_counts ->> ''pending_review'')::integer, 0);';

  if position(v_new in v_definition) = 0 then
    if position(v_old in v_definition) = 0 then
      raise exception 'Unexpected submit_exercise_builder_attempt result-count block.';
    end if;
    execute replace(v_definition, v_old, v_new);
  end if;
end;
$$;

do $$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.refresh_exercise_builder_attempt_totals(uuid)'::regprocedure)
    into v_definition;

  v_old := 'select
    coalesce(sum(coalesce((question.grading_result ->> ''earned_points'')::numeric, 0)), 0),
    coalesce(sum(coalesce((question.grading_result ->> ''max_points'')::numeric, 0)), 0),
    count(*) filter (where question.grading_result ->> ''status'' = ''correct''),
    count(*) filter (where question.grading_result ->> ''status'' = ''nearly_correct''),
    count(*) filter (where question.grading_result ->> ''status'' = ''incorrect''),
    count(*) filter (where coalesce(question.grading_result ->> ''status'', ''unanswered'') = ''unanswered''),
    count(*) filter (where question.grading_result ->> ''status'' = ''pending_review'')
  into v_earned, v_max, v_correct, v_nearly, v_incorrect, v_unanswered, v_pending
  from public.exercise_builder_attempt_questions question
  where question.attempt_id = p_attempt_id;';

  v_new := 'select
    coalesce(sum(coalesce((question.grading_result ->> ''earned_points'')::numeric, 0)), 0),
    coalesce(sum(coalesce((question.grading_result ->> ''max_points'')::numeric, 0)), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> ''correct'')::integer), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> ''nearly_correct'')::integer), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> ''incorrect'')::integer), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> ''unanswered'')::integer), 0),
    coalesce(sum((public.exercise_builder_result_counts(question.question_snapshot, question.grading_result) ->> ''pending_review'')::integer), 0)
  into v_earned, v_max, v_correct, v_nearly, v_incorrect, v_unanswered, v_pending
  from public.exercise_builder_attempt_questions question
  where question.attempt_id = p_attempt_id;';

  if position(v_new in v_definition) = 0 then
    if position(v_old in v_definition) = 0 then
      raise exception 'Unexpected refresh_exercise_builder_attempt_totals result-count block.';
    end if;
    execute replace(v_definition, v_old, v_new);
  end if;
end;
$$;

notify pgrst, 'reload schema';
