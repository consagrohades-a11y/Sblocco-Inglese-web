-- Versioned visual editing for Exercise Builder questions.

create or replace function public.admin_save_exercise_builder_question_version(
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
  v_type text;
  v_prompt text;
  v_level text;
  v_topic text;
  v_primary_skill text;
  v_difficulty text;
  v_content jsonb;
  v_diagnostics jsonb;
  v_correct_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Question payload must be an object.';
  end if;

  v_type := nullif(trim(p_payload ->> 'question_type'), '');
  v_prompt := nullif(trim(p_payload ->> 'prompt'), '');
  v_level := nullif(trim(p_payload ->> 'level'), '');
  v_topic := nullif(trim(p_payload ->> 'topic'), '');
  v_primary_skill := nullif(trim(p_payload ->> 'primary_skill'), '');
  v_difficulty := coalesce(nullif(trim(p_payload ->> 'difficulty'), ''), 'standard');
  v_content := case when jsonb_typeof(p_payload -> 'content') = 'object' then p_payload -> 'content' else '{}'::jsonb end;
  v_diagnostics := case when jsonb_typeof(p_payload -> 'diagnostics') = 'object' then p_payload -> 'diagnostics' else '{}'::jsonb end;

  if v_type not in ('multiple_choice', 'multiple_select', 'gap_fill', 'select_gap', 'translation', 'error_correction', 'word_order', 'content_block') then
    raise exception 'Unsupported question type.';
  end if;
  if v_prompt is null and v_type <> 'content_block' then raise exception 'Prompt is required.'; end if;
  if v_type = 'content_block' and nullif(trim(v_content ->> 'body'), '') is null and v_prompt is null then
    raise exception 'A content block requires body or prompt.';
  end if;
  if v_level not in ('A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed') then
    raise exception 'Invalid CEFR level.';
  end if;
  if v_topic is null or v_primary_skill is null then raise exception 'Topic and primary skill are required.'; end if;
  if v_difficulty not in ('support', 'standard', 'challenge') then raise exception 'Invalid difficulty.'; end if;

  if v_type in ('multiple_choice', 'multiple_select') then
    if jsonb_typeof(v_content -> 'options') <> 'array' or jsonb_array_length(v_content -> 'options') < 2 then
      raise exception 'Multiple-choice questions require at least two options.';
    end if;
    select count(*) into v_correct_count
    from jsonb_array_elements(v_content -> 'options') option_value
    where coalesce((option_value ->> 'is_correct')::boolean, false);
    if v_type = 'multiple_choice' and v_correct_count <> 1 then
      raise exception 'Multiple choice requires exactly one correct option.';
    end if;
    if v_type = 'multiple_select' and v_correct_count < 1 then
      raise exception 'Multiple select requires at least one correct option.';
    end if;
  elsif v_type in ('gap_fill', 'select_gap') then
    if jsonb_typeof(v_content -> 'blanks') <> 'array' or jsonb_array_length(v_content -> 'blanks') < 1 then
      raise exception 'Gap questions require at least one blank.';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(v_content -> 'blanks') blank
      where nullif(trim(blank ->> 'key'), '') is null
        or jsonb_typeof(blank -> 'accepted_answers') <> 'array'
        or jsonb_array_length(blank -> 'accepted_answers') < 1
    ) then raise exception 'Every blank requires a key and accepted answers.'; end if;
  elsif v_type in ('translation', 'error_correction') then
    if jsonb_typeof(v_content -> 'accepted_answers') <> 'array' or jsonb_array_length(v_content -> 'accepted_answers') < 1 then
      raise exception 'This question requires at least one accepted answer.';
    end if;
  elsif v_type = 'word_order' then
    if jsonb_typeof(v_content -> 'tokens') <> 'array' or jsonb_array_length(v_content -> 'tokens') < 2 then
      raise exception 'Word order requires at least two tokens.';
    end if;
    if jsonb_typeof(v_content -> 'correct_order') <> 'array' or jsonb_array_length(v_content -> 'correct_order') < 2 then
      raise exception 'Word order requires a correct order.';
    end if;
  end if;

  if v_type <> 'content_block' and coalesce(jsonb_array_length(v_diagnostics -> 'tested_codes'), 0) < 1 then
    raise exception 'Evaluated questions require at least one tested diagnostic code.';
  end if;

  if v_question_id is null then
    v_public_id := public.next_exercise_builder_public_id('question');
    insert into public.exercise_builder_questions (
      public_id, status, created_by
    ) values (
      v_public_id, 'draft', auth.uid()
    ) returning id into v_question_id;
    v_version_number := 1;
  else
    select public_id into v_public_id
    from public.exercise_builder_questions
    where id = v_question_id
    for update;
    if v_public_id is null then raise exception 'Question not found.'; end if;
    select coalesce(max(version_number), 0) + 1 into v_version_number
    from public.exercise_builder_question_versions
    where question_id = v_question_id;
  end if;

  insert into public.exercise_builder_question_versions (
    question_id, version_number, question_type, title, prompt, instructions,
    instruction_language, level, topic, subtopic, primary_skill,
    learning_objective, difficulty, content, grading, feedback,
    diagnostics, tags, media, review_status, created_by
  ) values (
    v_question_id,
    v_version_number,
    v_type,
    nullif(trim(p_payload ->> 'title'), ''),
    coalesce(v_prompt, nullif(trim(v_content ->> 'body'), ''), 'Content block'),
    nullif(trim(p_payload ->> 'instructions'), ''),
    case when p_payload ->> 'instruction_language' in ('it', 'en') then p_payload ->> 'instruction_language' else 'it' end,
    v_level,
    v_topic,
    nullif(trim(p_payload ->> 'subtopic'), ''),
    v_primary_skill,
    nullif(trim(p_payload ->> 'learning_objective'), ''),
    v_difficulty,
    v_content,
    case when jsonb_typeof(p_payload -> 'grading') = 'object' then p_payload -> 'grading' else '{}'::jsonb end,
    case when jsonb_typeof(p_payload -> 'feedback') = 'object' then p_payload -> 'feedback' else '{}'::jsonb end,
    v_diagnostics,
    public.exercise_builder_jsonb_text_array(coalesce(p_payload -> 'tags', '[]'::jsonb)),
    case when jsonb_typeof(p_payload -> 'media') = 'array' then p_payload -> 'media' else '[]'::jsonb end,
    'in_review',
    auth.uid()
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
    'version_number', v_version_number
  );
end;
$$;

create or replace function public.admin_get_exercise_builder_question_detail(p_question_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', question.id,
    'public_id', question.public_id,
    'status', question.status,
    'version_id', version.id,
    'version_number', version.version_number,
    'review_status', version.review_status,
    'question_type', version.question_type,
    'title', version.title,
    'prompt', version.prompt,
    'instructions', version.instructions,
    'instruction_language', version.instruction_language,
    'level', version.level,
    'topic', version.topic,
    'subtopic', version.subtopic,
    'primary_skill', version.primary_skill,
    'learning_objective', version.learning_objective,
    'difficulty', version.difficulty,
    'content', version.content,
    'grading', version.grading,
    'feedback', version.feedback,
    'diagnostics', version.diagnostics,
    'tags', to_jsonb(version.tags),
    'media', version.media
  )
  from public.exercise_builder_questions question
  join public.exercise_builder_question_versions version on version.id = question.current_version_id
  where question.id = p_question_id
    and public.is_admin();
$$;

revoke all on function public.admin_save_exercise_builder_question_version(uuid, jsonb) from public;
revoke all on function public.admin_get_exercise_builder_question_detail(uuid) from public;
grant execute on function public.admin_save_exercise_builder_question_version(uuid, jsonb) to authenticated;
grant execute on function public.admin_get_exercise_builder_question_detail(uuid) to authenticated;
