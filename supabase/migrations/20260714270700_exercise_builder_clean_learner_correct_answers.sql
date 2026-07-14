-- Keep technical grading results intact in storage while returning a clean,
-- human-readable correct answer to the Exercise Builder learner player.

create or replace function public.exercise_builder_correct_answer_display(
  p_question_snapshot jsonb,
  p_grading_result jsonb
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_type text := p_question_snapshot ->> 'type';
  v_content jsonb := coalesce(p_question_snapshot -> 'content', '{}'::jsonb);
  v_display text;
begin
  if p_grading_result is null or p_grading_result = 'null'::jsonb then
    return null;
  end if;

  if v_type = 'multiple_choice' then
    select coalesce(option.value ->> 'text', option.value ->> 'key')
      into v_display
    from jsonb_array_elements(coalesce(v_content -> 'options', '[]'::jsonb))
      with ordinality option(value, position)
    where coalesce((option.value ->> 'is_correct')::boolean, false)
    order by option.position
    limit 1;

  elsif v_type = 'multiple_select' then
    select string_agg(
      coalesce(option.value ->> 'text', option.value ->> 'key'),
      ' · '
      order by option.position
    )
      into v_display
    from jsonb_array_elements(coalesce(v_content -> 'options', '[]'::jsonb))
      with ordinality option(value, position)
    where coalesce((option.value ->> 'is_correct')::boolean, false);

  elsif v_type in ('gap_fill', 'select_gap') then
    select string_agg(answer.answer_text, ' · ' order by answer.blank_position)
      into v_display
    from (
      select
        blank.position as blank_position,
        (
          select accepted.value
          from jsonb_array_elements_text(coalesce(blank.value -> 'accepted_answers', '[]'::jsonb))
            with ordinality accepted(value, position)
          order by accepted.position
          limit 1
        ) as answer_text
      from jsonb_array_elements(coalesce(v_content -> 'blanks', '[]'::jsonb))
        with ordinality blank(value, position)
    ) answer
    where nullif(trim(answer.answer_text), '') is not null;

  elsif v_type in ('translation', 'error_correction') then
    select string_agg(accepted.value, ' / ' order by accepted.position)
      into v_display
    from jsonb_array_elements_text(coalesce(v_content -> 'accepted_answers', '[]'::jsonb))
      with ordinality accepted(value, position)
    where nullif(trim(accepted.value), '') is not null;

  elsif v_type = 'word_order' then
    select string_agg(token.value, ' ' order by token.position)
      into v_display
    from jsonb_array_elements_text(coalesce(v_content -> 'correct_order', '[]'::jsonb))
      with ordinality token(value, position)
    where nullif(trim(token.value), '') is not null;

  elsif jsonb_typeof(p_grading_result -> 'correct_answer') = 'string' then
    v_display := p_grading_result ->> 'correct_answer';
  end if;

  return nullif(trim(v_display), '');
end;
$$;

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

create or replace function public.exercise_builder_attempt_payload(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id,
      'status', a.status,
      'attempt_number', a.attempt_number,
      'current_section_index', a.current_section_index,
      'current_question_index', a.current_question_index,
      'earned_points', a.earned_points,
      'max_points', a.max_points,
      'score', a.score,
      'result_summary', a.result_summary,
      'started_at', a.started_at,
      'submitted_at', a.submitted_at
    ),
    'exercise', a.exercise_snapshot,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'sequence_index', s.sequence_index,
        'title', s.title,
        'instructions', s.instructions,
        'feedback_timing', s.feedback_timing,
        'settings', s.settings,
        'status', s.status,
        'earned_points', s.earned_points,
        'max_points', s.max_points,
        'questions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', q.id,
            'sequence_index', q.sequence_index,
            'question', public.exercise_builder_safe_question_snapshot(q.question_snapshot),
            'answer', q.answer,
            'result', case
              when a.status = 'submitted' then public.exercise_builder_learner_grading_result(q.question_snapshot, q.grading_result)
              when s.status = 'completed' and s.feedback_timing = 'section_end' then public.exercise_builder_learner_grading_result(q.question_snapshot, q.grading_result)
              else null
            end
          ) order by q.sequence_index)
          from public.exercise_builder_attempt_questions q
          where q.attempt_section_id = s.id
        ), '[]'::jsonb)
      ) order by s.sequence_index)
      from public.exercise_builder_attempt_sections s
      where s.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.exercise_builder_attempts a
  where a.id = p_attempt_id
    and (a.learner_id = auth.uid() or public.is_admin());
$$;

revoke all on function public.exercise_builder_correct_answer_display(jsonb, jsonb) from public;
revoke all on function public.exercise_builder_learner_grading_result(jsonb, jsonb) from public;
revoke all on function public.exercise_builder_attempt_payload(uuid) from public;
revoke all on function public.exercise_builder_attempt_payload(uuid) from authenticated;

grant execute on function public.exercise_builder_attempt_payload(uuid) to authenticated;
