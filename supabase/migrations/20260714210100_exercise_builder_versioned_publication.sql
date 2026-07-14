-- Approve and publish the exact versions pinned inside pools and exercises.

create or replace function public.assert_exercise_builder_question_version_publishable(p_question_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version record;
  v_missing_codes text[];
  v_missing_messages text[];
begin
  select * into v_version
  from public.exercise_builder_question_versions
  where id = p_question_version_id;

  if v_version.id is null then raise exception 'Question version not found.'; end if;
  if v_version.question_type = 'content_block' then return; end if;

  if not exists (
    select 1 from public.exercise_builder_question_diagnostic_code_list(v_version.id)
  ) then
    raise exception 'Question version % requires at least one diagnostic code.', v_version.id;
  end if;

  select array_agg(requested.code order by requested.code)
    into v_missing_codes
  from public.exercise_builder_question_diagnostic_code_list(v_version.id) requested
  left join public.exercise_builder_diagnostic_codes registered
    on registered.code = requested.code and registered.status = 'active'
  where registered.code is null;

  if coalesce(array_length(v_missing_codes, 1), 0) > 0 then
    raise exception 'Question version % references unavailable diagnostic codes: %.',
      v_version.id, array_to_string(v_missing_codes, ', ');
  end if;

  select array_agg(requested.code order by requested.code)
    into v_missing_messages
  from public.exercise_builder_question_diagnostic_code_list(v_version.id) requested
  where not exists (
    select 1
    from public.exercise_builder_diagnostic_messages message
    where message.diagnostic_code = requested.code
      and message.language = 'it'
      and nullif(trim(message.message_text), '') is not null
  );

  if coalesce(array_length(v_missing_messages, 1), 0) > 0 then
    raise exception 'Question version % has diagnostic codes without Italian messages: %.',
      v_version.id, array_to_string(v_missing_messages, ', ');
  end if;
end;
$$;

create or replace function public.admin_set_exercise_builder_status(
  p_entity_type text,
  p_entity_id uuid,
  p_next_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_id uuid;
  v_question_version_id uuid;
  v_rule record;
  v_available integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_entity_type not in ('question', 'question_pool', 'exercise') then raise exception 'Unsupported entity type.'; end if;
  if p_next_status not in ('draft', 'in_review', 'approved', 'published', 'archived') then raise exception 'Unsupported status.'; end if;

  if p_entity_type = 'question' then
    select current_version_id into v_version_id
    from public.exercise_builder_questions where id = p_entity_id;
    if v_version_id is null then raise exception 'Question not found.'; end if;

    if p_next_status in ('approved', 'published') then
      perform public.assert_exercise_builder_question_version_publishable(v_version_id);
      update public.exercise_builder_question_versions
      set review_status = 'approved'
      where id = v_version_id;
    end if;

    update public.exercise_builder_questions
    set status = p_next_status,
        approved_by = case when p_next_status in ('approved', 'published') then auth.uid() else approved_by end,
        approved_at = case when p_next_status in ('approved', 'published') then now() else approved_at end
    where id = p_entity_id;

  elsif p_entity_type = 'question_pool' then
    select current_version_id into v_version_id
    from public.exercise_builder_pools where id = p_entity_id;
    if v_version_id is null then raise exception 'Pool not found.'; end if;
    if not exists (
      select 1 from public.exercise_builder_pool_questions where pool_version_id = v_version_id
    ) then raise exception 'A pool must contain at least one question.'; end if;

    if p_next_status in ('approved', 'published') then
      for v_question_version_id in
        select distinct question_version_id
        from public.exercise_builder_pool_questions
        where pool_version_id = v_version_id
      loop
        perform public.assert_exercise_builder_question_version_publishable(v_question_version_id);
      end loop;

      update public.exercise_builder_question_versions
      set review_status = 'approved'
      where id in (
        select question_version_id
        from public.exercise_builder_pool_questions
        where pool_version_id = v_version_id
      );

      update public.exercise_builder_questions question
      set status = p_next_status,
          approved_by = auth.uid(),
          approved_at = now()
      where question.current_version_id in (
        select question_version_id
        from public.exercise_builder_pool_questions
        where pool_version_id = v_version_id
      );

      update public.exercise_builder_pool_versions
      set review_status = 'approved'
      where id = v_version_id;
    end if;

    update public.exercise_builder_pools
    set status = p_next_status,
        approved_by = case when p_next_status in ('approved', 'published') then auth.uid() else approved_by end,
        approved_at = case when p_next_status in ('approved', 'published') then now() else approved_at end
    where id = p_entity_id;

  else
    select current_version_id into v_version_id
    from public.exercise_builder_exercises where id = p_entity_id;
    if v_version_id is null then raise exception 'Exercise not found.'; end if;
    if not exists (
      select 1 from public.exercise_builder_sections where exercise_version_id = v_version_id
    ) then raise exception 'An exercise must contain at least one section.'; end if;

    if p_next_status in ('approved', 'published') then
      for v_question_version_id in
        select distinct fixed.question_version_id
        from public.exercise_builder_section_fixed_questions fixed
        join public.exercise_builder_sections section on section.id = fixed.section_id
        where section.exercise_version_id = v_version_id
        union
        select distinct membership.question_version_id
        from public.exercise_builder_section_pool_rules rule
        join public.exercise_builder_sections section on section.id = rule.section_id
        join public.exercise_builder_pool_questions membership
          on membership.pool_version_id = rule.pool_version_id
        where section.exercise_version_id = v_version_id
      loop
        perform public.assert_exercise_builder_question_version_publishable(v_question_version_id);
      end loop;

      for v_rule in
        select rule.*, section.title section_title
        from public.exercise_builder_section_pool_rules rule
        join public.exercise_builder_sections section on section.id = rule.section_id
        where section.exercise_version_id = v_version_id
      loop
        select count(*) into v_available
        from public.exercise_builder_pool_questions membership
        join public.exercise_builder_question_versions question_version
          on question_version.id = membership.question_version_id
        where membership.pool_version_id = v_rule.pool_version_id
          and (
            not (v_rule.filters ? 'question_types')
            or question_version.question_type in (
              select value from jsonb_array_elements_text(v_rule.filters -> 'question_types')
            )
          )
          and (
            not (v_rule.filters ? 'difficulty')
            or question_version.difficulty in (
              select value from jsonb_array_elements_text(v_rule.filters -> 'difficulty')
            )
          )
          and (
            not (v_rule.filters ? 'tags')
            or question_version.tags && public.exercise_builder_jsonb_text_array(v_rule.filters -> 'tags')
          );
        if v_available < v_rule.question_count then
          raise exception 'Section % requests % questions but pinned pool version can provide only %.',
            v_rule.section_title, v_rule.question_count, v_available;
        end if;
      end loop;

      update public.exercise_builder_question_versions
      set review_status = 'approved'
      where id in (
        select fixed.question_version_id
        from public.exercise_builder_section_fixed_questions fixed
        join public.exercise_builder_sections section on section.id = fixed.section_id
        where section.exercise_version_id = v_version_id
        union
        select membership.question_version_id
        from public.exercise_builder_section_pool_rules rule
        join public.exercise_builder_sections section on section.id = rule.section_id
        join public.exercise_builder_pool_questions membership
          on membership.pool_version_id = rule.pool_version_id
        where section.exercise_version_id = v_version_id
      );

      update public.exercise_builder_questions question
      set status = p_next_status,
          approved_by = auth.uid(),
          approved_at = now()
      where question.current_version_id in (
        select fixed.question_version_id
        from public.exercise_builder_section_fixed_questions fixed
        join public.exercise_builder_sections section on section.id = fixed.section_id
        where section.exercise_version_id = v_version_id
        union
        select membership.question_version_id
        from public.exercise_builder_section_pool_rules rule
        join public.exercise_builder_sections section on section.id = rule.section_id
        join public.exercise_builder_pool_questions membership
          on membership.pool_version_id = rule.pool_version_id
        where section.exercise_version_id = v_version_id
      );

      update public.exercise_builder_pool_versions
      set review_status = 'approved'
      where id in (
        select rule.pool_version_id
        from public.exercise_builder_section_pool_rules rule
        join public.exercise_builder_sections section on section.id = rule.section_id
        where section.exercise_version_id = v_version_id
      );

      update public.exercise_builder_pools pool
      set status = p_next_status,
          approved_by = auth.uid(),
          approved_at = now()
      where pool.current_version_id in (
        select rule.pool_version_id
        from public.exercise_builder_section_pool_rules rule
        join public.exercise_builder_sections section on section.id = rule.section_id
        where section.exercise_version_id = v_version_id
      );

      update public.exercise_builder_exercise_versions
      set review_status = 'approved'
      where id = v_version_id;
    end if;

    update public.exercise_builder_exercises
    set status = p_next_status,
        approved_by = case when p_next_status in ('approved', 'published') then auth.uid() else approved_by end,
        approved_at = case when p_next_status in ('approved', 'published') then now() else approved_at end,
        published_at = case when p_next_status = 'published' then now() else published_at end
    where id = p_entity_id;
  end if;
end;
$$;

revoke all on function public.assert_exercise_builder_question_version_publishable(uuid) from public;
