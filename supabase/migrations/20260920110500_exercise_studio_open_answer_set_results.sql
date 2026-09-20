create or replace function public.exercise_builder_learner_grading_result(
  p_question_snapshot jsonb,
  p_grading_result jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_display text;
begin
  if p_grading_result is null or p_grading_result = 'null'::jsonb then
    return null;
  end if;

  if p_question_snapshot #>> '{content,presentation}' in ('choice_set', 'open_answer_set')
    and jsonb_typeof(p_grading_result -> 'correct_answer') = 'array' then
    return p_grading_result;
  end if;

  v_display := public.exercise_builder_correct_answer_display(
    p_question_snapshot,
    p_grading_result
  );

  if v_display is null then
    return p_grading_result - 'correct_answer';
  end if;

  return (p_grading_result - 'correct_answer')
    || jsonb_build_object('correct_answer', v_display);
end;
$$;
