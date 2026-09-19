create or replace function public.exercise_builder_grade_reading_item(
  p_item jsonb,
  p_answer jsonb,
  p_weight numeric default 1,
  p_nearly numeric default 0.5
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_type text := coalesce(p_item ->> 'type', 'short_answer');
  v_points numeric := greatest(0.001, coalesce((p_item ->> 'points')::numeric, 1)) * greatest(0.001, p_weight);
  v_status text := 'incorrect';
  v_earned numeric := 0;
  v_expected text;
  v_submitted text;
  v_expected_array text[];
  v_submitted_array text[];
  v_option jsonb;
  v_accepted text;
  v_correct jsonb := null;
begin
  if p_answer is null or p_answer = 'null'::jsonb or p_answer = '""'::jsonb or p_answer = '[]'::jsonb then
    return jsonb_build_object(
      'key', p_item ->> 'key',
      'status', 'unanswered',
      'earned_points', 0,
      'max_points', v_points,
      'correct_answer', null,
      'explanation', nullif(p_item ->> 'feedback', '')
    );
  end if;

  if v_type in ('multiple_choice', 'true_false') then
    select value into v_option
    from jsonb_array_elements(coalesce(p_item -> 'options', '[]'::jsonb))
    where coalesce((value ->> 'is_correct')::boolean, false)
    limit 1;
    v_expected := coalesce(v_option ->> 'key', v_option ->> 'text');
    v_submitted := trim(both '"' from p_answer::text);
    v_correct := to_jsonb(v_expected);
    if v_submitted = v_expected then v_status := 'correct'; v_earned := v_points; end if;
  elsif v_type = 'multiple_select' then
    select array_agg(value order by value) into v_expected_array
    from (
      select coalesce(value->>'key', value->>'text') value
      from jsonb_array_elements(coalesce(p_item -> 'options', '[]'::jsonb))
      where coalesce((value ->> 'is_correct')::boolean, false)
    ) selected;
    select array_agg(value order by value) into v_submitted_array
    from jsonb_array_elements_text(coalesce(p_answer, '[]'::jsonb));
    v_correct := to_jsonb(coalesce(v_expected_array, '{}'::text[]));
    if coalesce(v_submitted_array, '{}'::text[]) = coalesce(v_expected_array, '{}'::text[]) then
      v_status := 'correct'; v_earned := v_points;
    end if;
  else
    v_submitted := trim(both '"' from p_answer::text);
    v_correct := coalesce(p_item -> 'accepted_answers', '[]'::jsonb);
    for v_accepted in select value from jsonb_array_elements_text(coalesce(p_item -> 'accepted_answers', '[]'::jsonb))
    loop
      if public.exercise_builder_normalize_answer(v_submitted) = public.exercise_builder_normalize_answer(v_accepted) then
        v_status := 'correct'; v_earned := v_points; exit;
      elsif length(public.exercise_builder_normalize_answer(v_submitted)) >= 4
        and levenshtein(public.exercise_builder_normalize_answer(v_submitted), public.exercise_builder_normalize_answer(v_accepted)) <= 1 then
        v_status := 'nearly_correct'; v_earned := greatest(v_earned, v_points * greatest(0, least(1, p_nearly)));
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'key', p_item ->> 'key',
    'status', v_status,
    'earned_points', round(v_earned, 3),
    'max_points', round(v_points, 3),
    'correct_answer', v_correct,
    'explanation', nullif(p_item ->> 'feedback', '')
  );
end;
$$;
