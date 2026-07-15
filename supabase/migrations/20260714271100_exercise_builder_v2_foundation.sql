-- Exercise Builder schema v2 foundation.
-- Existing schema_version = 1 questions remain valid and unchanged.
-- New manual-production types use the existing immutable question/version and
-- teacher-review systems instead of creating a parallel workflow.

alter table public.exercise_builder_question_versions
  drop constraint if exists exercise_builder_question_versions_question_type_check;
alter table public.exercise_builder_question_versions
  add constraint exercise_builder_question_versions_question_type_check
  check (question_type in (
    'multiple_choice',
    'multiple_select',
    'gap_fill',
    'select_gap',
    'translation',
    'error_correction',
    'word_order',
    'content_block',
    'written_response',
    'dialogue_roleplay',
    'audio_response',
    'reading_comprehension'
  ));

alter table public.exercise_builder_question_versions
  drop constraint if exists exercise_builder_question_versions_primary_skill_check;
alter table public.exercise_builder_question_versions
  add constraint exercise_builder_question_versions_primary_skill_check
  check (primary_skill in (
    'grammar', 'vocabulary', 'reading', 'writing', 'functional_language',
    'spelling', 'word_order', 'speaking', 'listening', 'interaction'
  ));

create or replace function public.exercise_builder_question_requires_manual_review(p_snapshot jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    coalesce(p_snapshot #>> '{grading,mode}', '') = 'manual_review'
    or coalesce(p_snapshot ->> 'type', '') in ('written_response', 'dialogue_roleplay', 'audio_response');
$$;

create or replace function public.exercise_builder_safe_question_snapshot(p_snapshot jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_type text := p_snapshot ->> 'type';
  v_content jsonb := coalesce(p_snapshot -> 'content', '{}'::jsonb);
  v_options jsonb;
  v_blanks jsonb;
  v_items jsonb;
begin
  if v_type in ('multiple_choice', 'multiple_select') then
    select coalesce(jsonb_agg(jsonb_build_object('key', value->>'key', 'text', value->>'text')), '[]'::jsonb)
      into v_options
    from jsonb_array_elements(coalesce(v_content -> 'options', '[]'::jsonb));
    v_content := (v_content - 'correct_answer') || jsonb_build_object('options', v_options);
  elsif v_type in ('gap_fill', 'select_gap') then
    select coalesce(jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'key', value->>'key',
        'options', case when v_type = 'select_gap' then value->'options' else null end,
        'points', value->'points'
      ))
    ), '[]'::jsonb) into v_blanks
    from jsonb_array_elements(coalesce(v_content -> 'blanks', '[]'::jsonb));
    v_content := v_content || jsonb_build_object('blanks', v_blanks);
  elsif v_type in ('translation', 'error_correction') then
    v_content := v_content - 'accepted_answers';
  elsif v_type = 'word_order' then
    v_content := v_content - 'correct_order';
  elsif v_type = 'written_response' then
    v_content := v_content - 'model_answer' - 'teacher_notes';
  elsif v_type = 'dialogue_roleplay' then
    v_content := v_content - 'model_responses' - 'teacher_notes';
  elsif v_type = 'audio_response' then
    v_content := v_content - 'model_transcript' - 'teacher_notes';
  elsif v_type = 'reading_comprehension' then
    select coalesce(jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'key', item->>'key',
        'type', item->>'type',
        'prompt', item->>'prompt',
        'points', item->'points',
        'options', case
          when item->>'type' in ('multiple_choice', 'multiple_select', 'true_false') then (
            select coalesce(jsonb_agg(jsonb_build_object('key', option->>'key', 'text', option->>'text')), '[]'::jsonb)
            from jsonb_array_elements(coalesce(item->'options', '[]'::jsonb)) option
          )
          else null
        end
      )) order by position
    ), '[]'::jsonb)
      into v_items
    from jsonb_array_elements(coalesce(v_content -> 'items', '[]'::jsonb)) with ordinality source(item, position);
    v_content := (v_content - 'model_summary' - 'teacher_notes') || jsonb_build_object('items', v_items);
  end if;

  return (p_snapshot - 'feedback' - 'diagnostics' - 'grading') || jsonb_build_object('content', v_content);
end;
$$;

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
      'key', p_item ->> 'key', 'status', 'unanswered',
      'earned_points', 0, 'max_points', v_points, 'correct_answer', null
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
    'correct_answer', v_correct
  );
end;
$$;

create or replace function public.exercise_builder_grade_answer(p_snapshot jsonb, p_answer jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
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
  v_item jsonb;
  v_item_answer jsonb;
  v_item_result jsonb;
  v_item_results jsonb := '[]'::jsonb;
begin
  if v_type = 'content_block' then
    return jsonb_build_object('status', 'correct', 'earned_points', 0, 'max_points', 0, 'correct_answer', null);
  end if;

  if p_answer is null or p_answer = 'null'::jsonb or p_answer = '""'::jsonb or p_answer = '{}'::jsonb or p_answer = '[]'::jsonb then
    return jsonb_build_object('status', 'unanswered', 'earned_points', 0, 'max_points', v_max, 'correct_answer', null);
  end if;

  if public.exercise_builder_question_requires_manual_review(p_snapshot) then
    return jsonb_build_object(
      'status', 'pending_review',
      'earned_points', 0,
      'max_points', v_weight,
      'correct_answer', null,
      'review_required', true,
      'explanation', null
    );
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
        'key', v_key, 'status', v_status,
        'earned_points', v_blank_earned, 'max_points', v_blank_points,
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
  elsif v_type = 'reading_comprehension' then
    v_earned := 0;
    v_max := 0;
    v_correct_count := 0;
    v_nearly_count := 0;
    v_total_count := 0;
    for v_item in select value from jsonb_array_elements(coalesce(v_content -> 'items', '[]'::jsonb))
    loop
      v_total_count := v_total_count + 1;
      v_item_answer := p_answer -> (v_item ->> 'key');
      v_item_result := public.exercise_builder_grade_reading_item(v_item, v_item_answer, v_weight, v_nearly);
      v_item_results := v_item_results || jsonb_build_array(v_item_result);
      v_earned := v_earned + coalesce((v_item_result ->> 'earned_points')::numeric, 0);
      v_max := v_max + coalesce((v_item_result ->> 'max_points')::numeric, 0);
      if v_item_result ->> 'status' = 'correct' then v_correct_count := v_correct_count + 1;
      elsif v_item_result ->> 'status' = 'nearly_correct' then v_nearly_count := v_nearly_count + 1; end if;
    end loop;
    if v_correct_count = v_total_count then v_status := 'correct';
    elsif v_correct_count + v_nearly_count = v_total_count and v_nearly_count > 0 then v_status := 'nearly_correct';
    elsif v_earned > 0 then v_status := 'nearly_correct';
    else v_status := 'incorrect'; end if;
    v_correct := v_item_results;
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

create or replace function public.complete_exercise_builder_section(
  p_attempt_id uuid,
  p_section_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question record;
  v_earned numeric := 0;
  v_max numeric := 0;
  v_result jsonb;
begin
  if not exists (
    select 1 from public.exercise_builder_attempts a
    join public.exercise_builder_attempt_sections s on s.attempt_id = a.id
    where a.id = p_attempt_id and a.learner_id = auth.uid()
      and a.status = 'in_progress' and s.id = p_section_id
  ) then raise exception 'Open section not found.'; end if;

  for v_question in
    select * from public.exercise_builder_attempt_questions
    where attempt_id = p_attempt_id and attempt_section_id = p_section_id
  loop
    v_result := public.exercise_builder_grade_answer(v_question.question_snapshot, v_question.answer);
    update public.exercise_builder_attempt_questions
    set grading_result = v_result,
        automatic_grading_result = v_result
    where id = v_question.id;
    v_earned := v_earned + coalesce((v_result ->> 'earned_points')::numeric, 0);
    v_max := v_max + coalesce((v_result ->> 'max_points')::numeric, 0);
  end loop;

  update public.exercise_builder_attempt_sections
  set status = 'completed', earned_points = v_earned, max_points = v_max, completed_at = now()
  where id = p_section_id and attempt_id = p_attempt_id;
  return public.exercise_builder_attempt_payload(p_attempt_id);
end;
$$;

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

  for v_question in select * from public.exercise_builder_attempt_questions where attempt_id = p_attempt_id
  loop
    v_result := public.exercise_builder_grade_answer(v_question.question_snapshot, v_question.answer);
    update public.exercise_builder_attempt_questions
    set grading_result = v_result,
        automatic_grading_result = v_result
    where id = v_question.id;
    v_earned := v_earned + coalesce((v_result ->> 'earned_points')::numeric, 0);
    v_max := v_max + coalesce((v_result ->> 'max_points')::numeric, 0);
    case v_result ->> 'status'
      when 'correct' then v_correct := v_correct + 1;
      when 'nearly_correct' then v_nearly := v_nearly + 1;
      when 'unanswered' then v_unanswered := v_unanswered + 1;
      when 'pending_review' then v_pending := v_pending + 1;
      else v_incorrect := v_incorrect + 1;
    end case;
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

    if coalesce(v_config ->> 'completion_rule', 'passed') = 'submitted' then v_complete := true;
    elsif coalesce(v_config ->> 'completion_rule', 'passed') = 'attempts' then
      v_complete := v_attempt.attempt_number >= greatest(1, coalesce((v_config ->> 'required_attempts')::integer, 1));
    else
      v_complete := v_score >= greatest(0, least(100, coalesce((v_config ->> 'required_score')::numeric, 70)));
    end if;

    if v_complete then
      update public.assignments set status = 'completed'
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
    count(*) filter (where question.grading_result ->> 'status' = 'correct'),
    count(*) filter (where question.grading_result ->> 'status' = 'nearly_correct'),
    count(*) filter (where question.grading_result ->> 'status' = 'incorrect'),
    count(*) filter (where coalesce(question.grading_result ->> 'status', 'unanswered') = 'unanswered'),
    count(*) filter (where question.grading_result ->> 'status' = 'pending_review')
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

    if coalesce(v_config ->> 'completion_rule', 'passed') = 'submitted' then v_complete := true;
    elsif coalesce(v_config ->> 'completion_rule', 'passed') = 'attempts' then
      v_complete := v_attempt.attempt_number >= greatest(1, coalesce((v_config ->> 'required_attempts')::integer, 1));
    else
      v_complete := v_score >= greatest(0, least(100, coalesce((v_config ->> 'required_score')::numeric, 70)));
    end if;

    if v_complete then
      update public.assignments set status = 'completed'
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

create or replace function public.admin_save_exercise_builder_attempt_review(
  p_attempt_id uuid,
  p_reviews jsonb,
  p_teacher_note text default null,
  p_review_status text default 'reviewed'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_review jsonb;
  v_question record;
  v_question_id uuid;
  v_clear boolean;
  v_status text;
  v_points numeric;
  v_max numeric;
  v_auto jsonb;
  v_effective jsonb;
  v_totals jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_review_status not in ('unreviewed', 'reviewed', 'approved') then
    raise exception 'Invalid review status.';
  end if;
  if p_reviews is null or jsonb_typeof(p_reviews) <> 'array' then
    raise exception 'Reviews must be an array.';
  end if;

  select * into v_attempt
  from public.exercise_builder_attempts
  where id = p_attempt_id
  for update;
  if v_attempt.id is null then raise exception 'Attempt not found.'; end if;
  if v_attempt.status <> 'submitted' then raise exception 'Only submitted attempts can be reviewed.'; end if;

  for v_review in select value from jsonb_array_elements(p_reviews)
  loop
    v_question_id := nullif(v_review ->> 'attempt_question_id', '')::uuid;
    v_clear := coalesce((v_review ->> 'clear_override')::boolean, false);

    select * into v_question
    from public.exercise_builder_attempt_questions
    where id = v_question_id and attempt_id = p_attempt_id
    for update;
    if v_question.id is null then raise exception 'Attempt question not found.'; end if;

    v_auto := coalesce(v_question.automatic_grading_result, v_question.grading_result, '{}'::jsonb);
    v_max := coalesce((v_auto ->> 'max_points')::numeric, 0);

    if v_clear then
      update public.exercise_builder_attempt_questions
      set grading_result = v_auto,
          automatic_grading_result = v_auto,
          teacher_status_override = null,
          teacher_points_override = null,
          teacher_comment = null,
          reviewed_by = auth.uid(),
          reviewed_at = now()
      where id = v_question_id;
    else
      v_status := nullif(v_review ->> 'status', '');
      v_points := nullif(v_review ->> 'earned_points', '')::numeric;
      if v_status is null or v_status = 'pending_review' then
        v_status := case when v_points is not null and v_points >= v_max then 'correct'
          when v_points is not null and v_points > 0 then 'nearly_correct'
          else 'incorrect' end;
      end if;
      if v_status not in ('correct', 'nearly_correct', 'incorrect', 'unanswered') then
        raise exception 'Invalid teacher result.';
      end if;
      if v_points is null then
        v_points := case
          when v_status = 'correct' then v_max
          when v_status = 'nearly_correct' then round(v_max * 0.5, 3)
          else 0
        end;
      end if;
      if v_points < 0 or v_points > v_max then
        raise exception 'Teacher points must be between 0 and %.', v_max;
      end if;

      v_effective := v_auto || jsonb_build_object(
        'status', v_status,
        'earned_points', v_points,
        'teacher_overridden', true,
        'review_required', false
      );

      update public.exercise_builder_attempt_questions
      set automatic_grading_result = v_auto,
          grading_result = v_effective,
          teacher_status_override = v_status,
          teacher_points_override = v_points,
          teacher_comment = nullif(trim(v_review ->> 'comment'), ''),
          reviewed_by = auth.uid(),
          reviewed_at = now()
      where id = v_question_id;
    end if;
  end loop;

  update public.exercise_builder_attempts
  set teacher_note = nullif(trim(p_teacher_note), ''),
      review_status = p_review_status,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_attempt_id;

  v_totals := public.refresh_exercise_builder_attempt_totals(p_attempt_id);
  if p_review_status = 'approved' and coalesce((v_totals ->> 'pending_review')::integer, 0) > 0 then
    raise exception 'All manual productions must be evaluated before approving the review.';
  end if;

  return public.admin_get_exercise_builder_attempt_detail(p_attempt_id)
    || jsonb_build_object('totals', v_totals);
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
      'review_status', a.review_status,
      'teacher_note', case when a.review_status in ('reviewed', 'approved') then a.teacher_note else null end,
      'reviewed_at', case when a.review_status in ('reviewed', 'approved') then a.reviewed_at else null end,
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
            'teacher_comment', case when a.review_status in ('reviewed', 'approved') then q.teacher_comment else null end,
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

-- Replace the latest legacy implementation used by the identity-safe wrapper.
create or replace function public.admin_save_exercise_builder_question_version_legacy(
  p_question_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_id uuid := p_question_id;
  v_public_id text;
  v_version_id uuid;
  v_version_number integer;
  v_schema_version integer;
  v_type text;
  v_prompt text;
  v_level text;
  v_topic text;
  v_primary_skill text;
  v_difficulty text;
  v_content jsonb;
  v_grading jsonb;
  v_diagnostics jsonb;
  v_correct_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Question payload must be an object.';
  end if;

  v_schema_version := greatest(1, least(2, coalesce((p_payload ->> 'schema_version')::integer, 2)));
  v_type := nullif(trim(p_payload ->> 'question_type'), '');
  v_prompt := nullif(trim(p_payload ->> 'prompt'), '');
  v_level := nullif(trim(p_payload ->> 'level'), '');
  v_topic := nullif(trim(p_payload ->> 'topic'), '');
  v_primary_skill := nullif(trim(p_payload ->> 'primary_skill'), '');
  v_difficulty := coalesce(nullif(trim(p_payload ->> 'difficulty'), ''), 'standard');
  v_content := case when jsonb_typeof(p_payload -> 'content') = 'object' then p_payload -> 'content' else '{}'::jsonb end;
  v_grading := case when jsonb_typeof(p_payload -> 'grading') = 'object' then p_payload -> 'grading' else '{}'::jsonb end;
  v_diagnostics := case when jsonb_typeof(p_payload -> 'diagnostics') = 'object' then p_payload -> 'diagnostics' else '{}'::jsonb end;

  if v_type not in (
    'multiple_choice', 'multiple_select', 'gap_fill', 'select_gap',
    'translation', 'error_correction', 'word_order', 'content_block',
    'written_response', 'dialogue_roleplay', 'audio_response', 'reading_comprehension'
  ) then raise exception 'Unsupported question type.'; end if;
  if v_prompt is null and v_type <> 'content_block' then raise exception 'Prompt is required.'; end if;
  if v_type = 'content_block' and nullif(trim(v_content ->> 'body'), '') is null and v_prompt is null then
    raise exception 'A content block requires body or prompt.';
  end if;
  if v_level not in ('A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed') then
    raise exception 'Invalid CEFR level.';
  end if;
  if v_topic is null or v_primary_skill is null then raise exception 'Topic and primary skill are required.'; end if;
  if v_primary_skill not in (
    'grammar', 'vocabulary', 'reading', 'writing', 'functional_language',
    'spelling', 'word_order', 'speaking', 'listening', 'interaction'
  ) then raise exception 'Invalid primary skill.'; end if;
  if v_difficulty not in ('support', 'standard', 'challenge') then raise exception 'Invalid difficulty.'; end if;

  if v_type in ('multiple_choice', 'multiple_select') then
    if jsonb_typeof(v_content -> 'options') <> 'array' or jsonb_array_length(v_content -> 'options') < 2 then
      raise exception 'Multiple-choice questions require at least two options.';
    end if;
    select count(*) into v_correct_count
    from jsonb_array_elements(v_content -> 'options') option_value
    where coalesce((option_value ->> 'is_correct')::boolean, false);
    if v_type = 'multiple_choice' and v_correct_count <> 1 then raise exception 'Multiple choice requires exactly one correct option.'; end if;
    if v_type = 'multiple_select' and v_correct_count < 1 then raise exception 'Multiple select requires at least one correct option.'; end if;
  elsif v_type in ('gap_fill', 'select_gap') then
    if jsonb_typeof(v_content -> 'blanks') <> 'array' or jsonb_array_length(v_content -> 'blanks') < 1 then
      raise exception 'Gap questions require at least one blank.';
    end if;
    if exists (
      select 1 from jsonb_array_elements(v_content -> 'blanks') blank
      where nullif(trim(blank ->> 'key'), '') is null
        or jsonb_typeof(blank -> 'accepted_answers') <> 'array'
        or jsonb_array_length(blank -> 'accepted_answers') < 1
    ) then raise exception 'Every blank requires a key and accepted answers.'; end if;
  elsif v_type in ('translation', 'error_correction') then
    if jsonb_typeof(v_content -> 'accepted_answers') <> 'array' or jsonb_array_length(v_content -> 'accepted_answers') < 1 then
      raise exception 'This question requires at least one accepted answer.';
    end if;
  elsif v_type = 'word_order' then
    if jsonb_typeof(v_content -> 'tokens') <> 'array' or jsonb_array_length(v_content -> 'tokens') < 2
      or jsonb_typeof(v_content -> 'correct_order') <> 'array'
      or jsonb_array_length(v_content -> 'correct_order') < 2 then
      raise exception 'Word order requires tokens and a correct order.';
    end if;
  elsif v_type = 'written_response' then
    if coalesce((v_content ->> 'min_words')::integer, 0) < 1 then raise exception 'Written production requires min_words.'; end if;
    if coalesce((v_content ->> 'max_words')::integer, 0) < coalesce((v_content ->> 'min_words')::integer, 0) then
      raise exception 'Written production max_words must be at least min_words.';
    end if;
    if jsonb_typeof(v_content -> 'rubric') <> 'array' or jsonb_array_length(v_content -> 'rubric') < 1 then
      raise exception 'Written production requires a rubric.';
    end if;
    v_grading := v_grading || jsonb_build_object('mode', 'manual_review');
  elsif v_type = 'dialogue_roleplay' then
    if jsonb_typeof(v_content -> 'characters') <> 'array' or jsonb_array_length(v_content -> 'characters') < 2
      or jsonb_typeof(v_content -> 'turns') <> 'array' or jsonb_array_length(v_content -> 'turns') < 2 then
      raise exception 'Dialogue roleplay requires at least two characters and two turns.';
    end if;
    if not exists (
      select 1 from jsonb_array_elements(v_content -> 'characters') character
      where coalesce((character ->> 'selectable')::boolean, true)
    ) then raise exception 'At least one dialogue character must be selectable.'; end if;
    v_grading := v_grading || jsonb_build_object('mode', 'manual_review');
  elsif v_type = 'audio_response' then
    if coalesce((v_content ->> 'max_seconds')::integer, 0) < 5 then raise exception 'Audio response requires max_seconds of at least 5.'; end if;
    if jsonb_typeof(v_content -> 'rubric') <> 'array' or jsonb_array_length(v_content -> 'rubric') < 1 then
      raise exception 'Audio response requires a rubric.';
    end if;
    v_grading := v_grading || jsonb_build_object('mode', 'manual_review');
  elsif v_type = 'reading_comprehension' then
    if nullif(trim(v_content ->> 'passage'), '') is null then raise exception 'Reading comprehension requires a passage.'; end if;
    if jsonb_typeof(v_content -> 'items') <> 'array' or jsonb_array_length(v_content -> 'items') < 1 then
      raise exception 'Reading comprehension requires at least one item.';
    end if;
    if exists (
      select 1 from jsonb_array_elements(v_content -> 'items') item
      where nullif(trim(item ->> 'key'), '') is null
        or nullif(trim(item ->> 'prompt'), '') is null
        or coalesce(item ->> 'type', '') not in ('multiple_choice', 'multiple_select', 'true_false', 'short_answer')
    ) then raise exception 'Every reading item requires a key, prompt, and supported type.'; end if;
  end if;

  if v_type <> 'content_block' and coalesce(jsonb_array_length(v_diagnostics -> 'tested_codes'), 0) < 1 then
    raise exception 'Evaluated questions require at least one tested diagnostic code.';
  end if;

  select public_id into v_public_id
  from public.exercise_builder_questions
  where id = v_question_id
  for update;
  if v_public_id is null then raise exception 'Question not found.'; end if;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.exercise_builder_question_versions
  where question_id = v_question_id;

  insert into public.exercise_builder_question_versions (
    question_id, version_number, schema_version, question_type, title, prompt, instructions,
    instruction_language, level, topic, subtopic, primary_skill,
    learning_objective, difficulty, content, grading, feedback,
    diagnostics, tags, media, review_status, created_by
  ) values (
    v_question_id, v_version_number, v_schema_version, v_type,
    nullif(trim(p_payload ->> 'title'), ''),
    coalesce(v_prompt, nullif(trim(v_content ->> 'body'), ''), 'Content block'),
    nullif(trim(p_payload ->> 'instructions'), ''),
    case when p_payload ->> 'instruction_language' in ('it', 'en') then p_payload ->> 'instruction_language' else 'it' end,
    v_level, v_topic, nullif(trim(p_payload ->> 'subtopic'), ''), v_primary_skill,
    nullif(trim(p_payload ->> 'learning_objective'), ''), v_difficulty,
    v_content, v_grading,
    case when jsonb_typeof(p_payload -> 'feedback') = 'object' then p_payload -> 'feedback' else '{}'::jsonb end,
    v_diagnostics,
    public.exercise_builder_jsonb_text_array(coalesce(p_payload -> 'tags', '[]'::jsonb)),
    case when jsonb_typeof(p_payload -> 'media') = 'array' then p_payload -> 'media' else '[]'::jsonb end,
    'in_review', auth.uid()
  ) returning id into v_version_id;

  update public.exercise_builder_questions
  set current_version_id = v_version_id,
      status = 'draft',
      approved_by = null,
      approved_at = null
  where id = v_question_id;

  return jsonb_build_object(
    'id', v_question_id,
    'public_id', v_public_id,
    'version_id', v_version_id,
    'version_number', v_version_number,
    'schema_version', v_schema_version
  );
end;
$$;

revoke all on function public.exercise_builder_question_requires_manual_review(jsonb) from public;
revoke all on function public.exercise_builder_grade_reading_item(jsonb, jsonb, numeric, numeric) from public;
revoke all on function public.exercise_builder_safe_question_snapshot(jsonb) from public;
revoke all on function public.exercise_builder_grade_answer(jsonb, jsonb) from public;
revoke all on function public.complete_exercise_builder_section(uuid, uuid) from public;
revoke all on function public.submit_exercise_builder_attempt(uuid) from public;
revoke all on function public.refresh_exercise_builder_attempt_totals(uuid) from public;
revoke all on function public.admin_save_exercise_builder_attempt_review(uuid, jsonb, text, text) from public;
revoke all on function public.exercise_builder_attempt_payload(uuid) from public;
revoke all on function public.exercise_builder_attempt_payload(uuid) from authenticated;
revoke all on function public.admin_save_exercise_builder_question_version_legacy(uuid, jsonb) from public;

grant execute on function public.complete_exercise_builder_section(uuid, uuid) to authenticated;
grant execute on function public.submit_exercise_builder_attempt(uuid) to authenticated;
grant execute on function public.admin_save_exercise_builder_attempt_review(uuid, jsonb, text, text) to authenticated;
grant execute on function public.exercise_builder_attempt_payload(uuid) to authenticated;
