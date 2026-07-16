-- Complete the additive question-level feedback rollout.
-- Existing section_end, exercise_end, and hidden exercises keep their behaviour.

alter table public.exercise_builder_sections
  drop constraint if exists exercise_builder_sections_feedback_timing_check;
alter table public.exercise_builder_sections
  add constraint exercise_builder_sections_feedback_timing_check
  check (feedback_timing in ('question_end', 'section_end', 'exercise_end', 'hidden'));

alter table public.exercise_builder_attempt_sections
  drop constraint if exists exercise_builder_attempt_sections_feedback_timing_check;
alter table public.exercise_builder_attempt_sections
  add constraint exercise_builder_attempt_sections_feedback_timing_check
  check (feedback_timing in ('question_end', 'section_end', 'exercise_end', 'hidden'));

create or replace function public.admin_save_exercise_builder_exercise_version(
  p_exercise_id uuid,
  p_payload jsonb,
  p_sections jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exercise_id uuid := p_exercise_id;
  v_public_id text;
  v_version_id uuid;
  v_version_number integer;
  v_title text;
  v_level text;
  v_topic text;
  v_section jsonb;
  v_section_id uuid;
  v_section_index integer := 0;
  v_fixed jsonb;
  v_rule jsonb;
  v_question_id uuid;
  v_question_version_id uuid;
  v_pool_id uuid;
  v_pool_version_id uuid;
  v_fixed_index integer;
  v_rule_index integer;
  v_question_count integer;
  v_selection_mode text;
  v_feedback_timing text;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Exercise payload must be an object.';
  end if;
  if p_sections is null or jsonb_typeof(p_sections) <> 'array' or jsonb_array_length(p_sections) = 0 then
    raise exception 'An exercise requires at least one section.';
  end if;

  v_title := nullif(trim(p_payload ->> 'title'), '');
  v_level := nullif(trim(p_payload ->> 'level'), '');
  v_topic := nullif(trim(p_payload ->> 'topic'), '');

  if v_title is null or v_level is null or v_topic is null then
    raise exception 'Title, level, and topic are required.';
  end if;
  if v_level not in ('A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed') then
    raise exception 'Invalid CEFR level.';
  end if;

  if v_exercise_id is null then
    v_public_id := public.next_exercise_builder_public_id('exercise');
    insert into public.exercise_builder_exercises (
      public_id, status, created_by
    ) values (
      v_public_id, 'draft', auth.uid()
    ) returning id into v_exercise_id;
    v_version_number := 1;
  else
    select public_id into v_public_id
    from public.exercise_builder_exercises
    where id = v_exercise_id
    for update;
    if v_public_id is null then raise exception 'Exercise not found.'; end if;
    select coalesce(max(version_number), 0) + 1 into v_version_number
    from public.exercise_builder_exercise_versions
    where exercise_id = v_exercise_id;
  end if;

  insert into public.exercise_builder_exercise_versions (
    exercise_id, version_number, title, description, instructions,
    instruction_language, level, topic, estimated_minutes,
    settings, foundation_links, review_status, created_by
  ) values (
    v_exercise_id,
    v_version_number,
    v_title,
    nullif(trim(p_payload ->> 'description'), ''),
    nullif(trim(p_payload ->> 'instructions'), ''),
    case when p_payload ->> 'instruction_language' in ('it', 'en') then p_payload ->> 'instruction_language' else 'it' end,
    v_level,
    v_topic,
    nullif(p_payload ->> 'estimated_minutes', '')::integer,
    case when jsonb_typeof(p_payload -> 'settings') = 'object' then p_payload -> 'settings' else '{}'::jsonb end,
    case when jsonb_typeof(p_payload -> 'foundation_links') = 'array' then p_payload -> 'foundation_links' else '[]'::jsonb end,
    'in_review',
    auth.uid()
  ) returning id into v_version_id;

  for v_section in select value from jsonb_array_elements(p_sections)
  loop
    v_section_index := v_section_index + 1;
    v_selection_mode := coalesce(nullif(v_section ->> 'selection_mode', ''), 'fixed');
    v_feedback_timing := coalesce(nullif(v_section ->> 'feedback_timing', ''), 'section_end');

    if v_selection_mode not in ('fixed', 'pool', 'mixed') then
      raise exception 'Unsupported section selection mode: %.', v_selection_mode;
    end if;
    if v_feedback_timing not in ('question_end', 'section_end', 'exercise_end', 'hidden') then
      raise exception 'Unsupported feedback timing: %.', v_feedback_timing;
    end if;

    insert into public.exercise_builder_sections (
      exercise_version_id, sequence_index, title, instructions,
      selection_mode, feedback_timing, settings
    ) values (
      v_version_id,
      v_section_index,
      nullif(trim(v_section ->> 'title'), ''),
      nullif(trim(v_section ->> 'instructions'), ''),
      v_selection_mode,
      v_feedback_timing,
      case when jsonb_typeof(v_section -> 'settings') = 'object' then v_section -> 'settings' else '{}'::jsonb end
    ) returning id into v_section_id;

    v_fixed_index := 0;
    for v_fixed in
      select value from jsonb_array_elements(coalesce(v_section -> 'fixed_questions', '[]'::jsonb))
    loop
      v_question_id := nullif(v_fixed ->> 'question_id', '')::uuid;
      v_question_version_id := nullif(v_fixed ->> 'question_version_id', '')::uuid;
      if v_question_id is null then raise exception 'A fixed question requires question_id.'; end if;
      if v_question_version_id is null then
        select current_version_id into v_question_version_id
        from public.exercise_builder_questions where id = v_question_id;
      end if;
      if not exists (
        select 1 from public.exercise_builder_question_versions
        where id = v_question_version_id and question_id = v_question_id
      ) then raise exception 'Invalid fixed question version.'; end if;
      v_fixed_index := v_fixed_index + 1;
      insert into public.exercise_builder_section_fixed_questions (
        section_id, question_id, question_version_id, sequence_index
      ) values (
        v_section_id, v_question_id, v_question_version_id, v_fixed_index
      );
    end loop;

    v_rule_index := 0;
    for v_rule in
      select value from jsonb_array_elements(coalesce(v_section -> 'pool_rules', '[]'::jsonb))
    loop
      v_pool_id := nullif(v_rule ->> 'pool_id', '')::uuid;
      v_pool_version_id := nullif(v_rule ->> 'pool_version_id', '')::uuid;
      v_question_count := coalesce((v_rule ->> 'question_count')::integer, 0);
      if v_pool_id is null then raise exception 'A pool rule requires pool_id.'; end if;
      if v_pool_version_id is null then
        select current_version_id into v_pool_version_id
        from public.exercise_builder_pools where id = v_pool_id;
      end if;
      if not exists (
        select 1 from public.exercise_builder_pool_versions
        where id = v_pool_version_id and pool_id = v_pool_id
      ) then raise exception 'Invalid pool version.'; end if;
      if v_question_count < 1 then raise exception 'Pool question count must be greater than zero.'; end if;
      if coalesce(v_rule ->> 'selection_strategy', 'balanced') not in ('random', 'avoid_recent', 'unseen_first', 'balanced') then
        raise exception 'Unsupported pool selection strategy.';
      end if;
      v_rule_index := v_rule_index + 1;
      insert into public.exercise_builder_section_pool_rules (
        section_id, pool_id, pool_version_id, sequence_index,
        question_count, selection_strategy, filters, distribution_rules
      ) values (
        v_section_id,
        v_pool_id,
        v_pool_version_id,
        v_rule_index,
        v_question_count,
        coalesce(nullif(v_rule ->> 'selection_strategy', ''), 'balanced'),
        case when jsonb_typeof(v_rule -> 'filters') = 'object' then v_rule -> 'filters' else '{}'::jsonb end,
        case when jsonb_typeof(v_rule -> 'distribution_rules') = 'object' then v_rule -> 'distribution_rules' else '{}'::jsonb end
      );
    end loop;

    if v_selection_mode = 'fixed' and v_fixed_index = 0 then
      raise exception 'A fixed section requires at least one question.';
    end if;
    if v_selection_mode = 'pool' and v_rule_index = 0 then
      raise exception 'A pool section requires at least one pool rule.';
    end if;
    if v_selection_mode = 'mixed' and v_fixed_index + v_rule_index = 0 then
      raise exception 'A mixed section requires questions or pool rules.';
    end if;
  end loop;

  update public.exercise_builder_exercises
  set current_version_id = v_version_id,
      status = 'draft',
      approved_by = null,
      approved_at = null
  where id = v_exercise_id;

  return jsonb_build_object(
    'id', v_exercise_id,
    'public_id', v_public_id,
    'version_id', v_version_id,
    'version_number', v_version_number,
    'section_count', jsonb_array_length(p_sections)
  );
end;
$$;
