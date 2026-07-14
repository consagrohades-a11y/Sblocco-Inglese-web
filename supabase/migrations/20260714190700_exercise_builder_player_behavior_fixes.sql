-- Keep completed results stable until the learner explicitly starts a new attempt,
-- and treat unread content blocks as unanswered rather than completed.

create or replace function public.open_assigned_exercise_attempt(
  p_assignment_id uuid,
  p_resource_id uuid,
  p_start_new boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learner_id uuid;
  v_allow_retry boolean;
  v_attempt_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select a.learner_id, coalesce((r.exercise_config ->> 'allow_retry')::boolean, true)
    into v_learner_id, v_allow_retry
  from public.assignments a
  join public.assignment_resources r on r.assignment_id = a.id
  where a.id = p_assignment_id
    and r.id = p_resource_id
    and r.resource_type = 'custom_exercise'
    and r.route = '/exercises'
    and a.status in ('published', 'completed')
    and (a.learner_id = auth.uid() or public.is_admin());

  if v_learner_id is null then raise exception 'Assigned exercise not found.'; end if;

  select id into v_attempt_id
  from public.exercise_builder_attempts
  where learner_id = v_learner_id
    and assignment_resource_id = p_resource_id
    and status = 'in_progress'
  limit 1;
  if v_attempt_id is not null then
    return public.exercise_builder_attempt_payload(v_attempt_id);
  end if;

  select id into v_attempt_id
  from public.exercise_builder_attempts
  where learner_id = v_learner_id
    and assignment_resource_id = p_resource_id
    and status = 'submitted'
  order by attempt_number desc
  limit 1;

  if v_attempt_id is not null and (not p_start_new or not v_allow_retry) then
    return public.exercise_builder_attempt_payload(v_attempt_id);
  end if;

  return public.get_or_create_assigned_exercise_attempt(p_assignment_id, p_resource_id);
end;
$$;

revoke all on function public.open_assigned_exercise_attempt(uuid, uuid, boolean) from public;
grant execute on function public.open_assigned_exercise_attempt(uuid, uuid, boolean) to authenticated;

create or replace function public.exercise_builder_grade_answer(p_snapshot jsonb, p_answer jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_type text := p_snapshot ->> 'type';
  v_content jsonb := coalesce(p_snapshot -> 'content', '{}'::jsonb);
  v_grading jsonb := coalesce(p_snapshot -> 'grading', '{}'::jsonb);
  v_weight numeric := greatest(0.001, coalesce((v_grading ->> 'weight')::numeric, 1));
  v_nearly numeric := greatest(0, least(1, coalesce((v_grading ->> 'nearly_correct_multiplier')::numeric, 0.5)));
  v_status text := 'incorrect';
  v_earned numeric := 0;
  v_max numeric := v_weight;
  v_correct jsonb := null;
  v_expected text;
  v_submitted text;
  v_option jsonb;
  v_blank jsonb;
  v_key text;
  v_value text;
  v_accepted text;
  v_blank_points numeric;
  v_blank_earned numeric;
  v_blank_results jsonb := '[]'::jsonb;
  v_correct_count integer := 0;
  v_total_count integer := 0;
  v_nearly_count integer := 0;
  v_expected_array text[];
  v_submitted_array text[];
begin
  if v_type = 'content_block' then
    return jsonb_build_object(
      'status', case when p_answer = 'true'::jsonb then 'correct' else 'unanswered' end,
      'earned_points', 0,
      'max_points', 0,
      'correct_answer', null
    );
  end if;

  if p_answer is null or p_answer = 'null'::jsonb or p_answer = '""'::jsonb or p_answer = '{}'::jsonb or p_answer = '[]'::jsonb then
    return jsonb_build_object('status', 'unanswered', 'earned_points', 0, 'max_points', v_max, 'correct_answer', null);
  end if;

  if v_type = 'multiple_choice' then
    select value into v_option
    from jsonb_array_elements(coalesce(v_content -> 'options', '[]'::jsonb))
    where coalesce((value ->> 'is_correct')::boolean, false)
    limit 1;
    v_expected := coalesce(v_option ->> 'key', v_option ->> 'text');
    v_submitted := trim(both '"' from p_answer::text);
    v_correct := to_jsonb(v_expected);
    if v_submitted = v_expected then v_status := 'correct'; v_earned := v_max; end if;
  elsif v_type = 'multiple_select' then
    select array_agg(value order by value) into v_expected_array
      from (
        select coalesce(value->>'key', value->>'text') value
        from jsonb_array_elements(coalesce(v_content -> 'options', '[]'::jsonb))
        where coalesce((value ->> 'is_correct')::boolean, false)
      ) selected;
    select array_agg(value order by value) into v_submitted_array
      from jsonb_array_elements_text(coalesce(p_answer, '[]'::jsonb));
    v_correct := to_jsonb(coalesce(v_expected_array, '{}'::text[]));
    if coalesce(v_submitted_array, '{}'::text[]) = coalesce(v_expected_array, '{}'::text[]) then
      v_status := 'correct'; v_earned := v_max;
    end if;
  elsif v_type in ('gap_fill', 'select_gap') then
    v_max := 0;
    for v_blank in select value from jsonb_array_elements(coalesce(v_content -> 'blanks', '[]'::jsonb))
    loop
      v_total_count := v_total_count + 1;
      v_key := v_blank ->> 'key';
      v_value := coalesce(p_answer ->> v_key, '');
      v_blank_points := greatest(0.001, coalesce((v_blank ->> 'points')::numeric, 1)) * v_weight;
      v_max := v_max + v_blank_points;
      v_blank_earned := 0;
      v_status := 'incorrect';
      for v_accepted in select value from jsonb_array_elements_text(coalesce(v_blank -> 'accepted_answers', '[]'::jsonb))
      loop
        if public.exercise_builder_normalize_answer(v_value) = public.exercise_builder_normalize_answer(v_accepted) then
          v_status := 'correct'; v_blank_earned := v_blank_points; exit;
        elsif length(public.exercise_builder_normalize_answer(v_value)) >= 4
          and levenshtein(public.exercise_builder_normalize_answer(v_value), public.exercise_builder_normalize_answer(v_accepted)) <= 1 then
          v_status := 'nearly_correct'; v_blank_earned := greatest(v_blank_earned, v_blank_points * v_nearly);
        end if;
      end loop;
      if v_status = 'correct' then v_correct_count := v_correct_count + 1;
      elsif v_status = 'nearly_correct' then v_nearly_count := v_nearly_count + 1; end if;
      v_earned := v_earned + v_blank_earned;
      v_blank_results := v_blank_results || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'status', v_status,
        'earned_points', v_blank_earned,
        'max_points', v_blank_points,
        'correct_answer', coalesce(v_blank -> 'accepted_answers', '[]'::jsonb)
      ));
    end loop;
    if v_correct_count = v_total_count then v_status := 'correct';
    elsif v_correct_count + v_nearly_count = v_total_count and v_nearly_count > 0 then v_status := 'nearly_correct';
    else v_status := 'incorrect'; end if;
    v_correct := v_blank_results;
  elsif v_type in ('translation', 'error_correction') then
    v_submitted := trim(both '"' from p_answer::text);
    v_correct := coalesce(v_content -> 'accepted_answers', '[]'::jsonb);
    for v_accepted in select value from jsonb_array_elements_text(coalesce(v_content -> 'accepted_answers', '[]'::jsonb))
    loop
      if public.exercise_builder_normalize_answer(v_submitted) = public.exercise_builder_normalize_answer(v_accepted) then
        v_status := 'correct'; v_earned := v_max; exit;
      elsif length(public.exercise_builder_normalize_answer(v_submitted)) >= 4
        and levenshtein(public.exercise_builder_normalize_answer(v_submitted), public.exercise_builder_normalize_answer(v_accepted)) <= 1 then
        v_status := 'nearly_correct'; v_earned := greatest(v_earned, v_max * v_nearly);
      end if;
    end loop;
  elsif v_type = 'word_order' then
    select string_agg(value, ' ' order by ordinality) into v_expected
      from jsonb_array_elements_text(coalesce(v_content -> 'correct_order', '[]'::jsonb)) with ordinality;
    if jsonb_typeof(p_answer) = 'array' then
      select string_agg(value, ' ' order by ordinality) into v_submitted
        from jsonb_array_elements_text(p_answer) with ordinality;
    else
      v_submitted := trim(both '"' from p_answer::text);
    end if;
    v_correct := coalesce(v_content -> 'correct_order', '[]'::jsonb);
    if public.exercise_builder_normalize_answer(v_submitted) = public.exercise_builder_normalize_answer(v_expected) then
      v_status := 'correct'; v_earned := v_max;
    end if;
  end if;

  return jsonb_build_object(
    'status', v_status,
    'earned_points', round(v_earned, 3),
    'max_points', round(v_max, 3),
    'correct_answer', v_correct,
    'explanation', coalesce(p_snapshot #> '{feedback,explanation}', p_snapshot #> '{feedback,incorrect}', 'null'::jsonb)
  );
end;
$$;

revoke all on function public.exercise_builder_grade_answer(jsonb, jsonb) from public;
