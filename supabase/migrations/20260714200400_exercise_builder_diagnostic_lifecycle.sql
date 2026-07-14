-- Support concise answer mappings and prevent archiving codes used by published questions.

create or replace function public.exercise_builder_diagnostic_mapping_matches(
  p_mapping jsonb,
  p_answer jsonb
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_type text := coalesce(
    nullif(p_mapping ->> 'matcher_type', ''),
    case
      when jsonb_typeof(p_mapping -> 'matches') = 'array' then 'one_of'
      when nullif(p_mapping ->> 'match', '') is not null then 'normalized_exact'
      else 'normalized_exact'
    end
  );
  v_key text := nullif(p_mapping ->> 'answer_key', '');
  v_config jsonb := coalesce(p_mapping -> 'matcher_config', '{}'::jsonb);
  v_answer text := public.exercise_builder_diagnostic_answer_text(p_answer, v_key);
  v_expected text;
  v_values jsonb;
begin
  if v_type = 'option' then
    v_expected := coalesce(v_config ->> 'option_key', p_mapping ->> 'option_key', v_key);
    if jsonb_typeof(p_answer) = 'array' then
      return exists (select 1 from jsonb_array_elements_text(p_answer) selected where selected = v_expected);
    end if;
    return v_answer = v_expected;
  elsif v_type = 'exact' then
    v_expected := coalesce(v_config ->> 'value', p_mapping ->> 'match', v_key, '');
    return v_answer = v_expected;
  elsif v_type = 'normalized_exact' then
    v_expected := coalesce(v_config ->> 'value', p_mapping ->> 'match', v_key, '');
    return public.exercise_builder_normalize_answer(v_answer) = public.exercise_builder_normalize_answer(v_expected);
  elsif v_type = 'one_of' then
    v_values := case
      when jsonb_typeof(v_config -> 'values') = 'array' then v_config -> 'values'
      when jsonb_typeof(p_mapping -> 'matches') = 'array' then p_mapping -> 'matches'
      else '[]'::jsonb
    end;
    return exists (
      select 1 from jsonb_array_elements_text(v_values) expected
      where public.exercise_builder_normalize_answer(v_answer) = public.exercise_builder_normalize_answer(expected)
    );
  elsif v_type = 'regex' then
    return v_answer ~ coalesce(nullif(v_config ->> 'pattern', ''), nullif(p_mapping ->> 'pattern', ''), 'a^');
  end if;
  return false;
end;
$$;

create or replace function public.admin_set_exercise_builder_diagnostic_code_status(
  p_code text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_status not in ('active', 'archived') then raise exception 'Invalid diagnostic status.'; end if;
  if not exists (select 1 from public.exercise_builder_diagnostic_codes where code = p_code) then
    raise exception 'Diagnostic code not found.';
  end if;

  if p_status = 'archived' and exists (
    select 1
    from public.exercise_builder_questions question
    join public.exercise_builder_question_versions version on version.id = question.current_version_id
    where question.status = 'published'
      and p_code in (
        select requested.code
        from public.exercise_builder_question_diagnostic_code_list(version.id) requested
      )
  ) then
    raise exception 'This code is used by a published question. Withdraw or replace that content before archiving the code.';
  end if;

  if p_status = 'active' and not exists (
    select 1
    from public.exercise_builder_diagnostic_messages message
    where message.diagnostic_code = p_code
      and message.language = 'it'
      and nullif(trim(message.message_text), '') is not null
  ) then
    raise exception 'Add at least one Italian message before reactivating this code.';
  end if;

  update public.exercise_builder_diagnostic_codes
  set status = p_status
  where code = p_code;
end;
$$;

revoke all on function public.admin_set_exercise_builder_diagnostic_code_status(text, text) from public;
grant execute on function public.admin_set_exercise_builder_diagnostic_code_status(text, text) to authenticated;
