-- Hardening for Exercise Builder publishing and learner-visible feedback.

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
  v_missing_diagnostics integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_entity_type not in ('question', 'question_pool', 'exercise') then raise exception 'Unsupported entity type.'; end if;
  if p_next_status not in ('draft', 'in_review', 'approved', 'published', 'archived') then raise exception 'Unsupported status.'; end if;

  if p_entity_type = 'question' then
    select current_version_id into v_version_id from public.exercise_builder_questions where id = p_entity_id;
    if v_version_id is null then raise exception 'Question not found.'; end if;
    if p_next_status in ('approved', 'published') and not exists (
      select 1
      from public.exercise_builder_question_versions
      where id = v_version_id
        and (
          question_type = 'content_block'
          or coalesce(jsonb_array_length(diagnostics -> 'tested_codes'), 0) > 0
        )
    ) then
      raise exception 'Evaluated questions require at least one diagnostic target before approval.';
    end if;
    update public.exercise_builder_question_versions
      set review_status = case when p_next_status in ('approved', 'published') then 'approved' else review_status end
      where id = v_version_id;
    update public.exercise_builder_questions
      set status = p_next_status,
          approved_by = case when p_next_status in ('approved', 'published') then auth.uid() else approved_by end,
          approved_at = case when p_next_status in ('approved', 'published') then now() else approved_at end
      where id = p_entity_id;
  elsif p_entity_type = 'question_pool' then
    select current_version_id into v_version_id from public.exercise_builder_pools where id = p_entity_id;
    if v_version_id is null then raise exception 'Pool not found.'; end if;
    if p_next_status in ('approved', 'published') and not exists (
      select 1 from public.exercise_builder_pool_questions where pool_version_id = v_version_id
    ) then raise exception 'A pool must contain at least one question.'; end if;
    update public.exercise_builder_pools
      set status = p_next_status,
          approved_by = case when p_next_status in ('approved', 'published') then auth.uid() else approved_by end,
          approved_at = case when p_next_status in ('approved', 'published') then now() else approved_at end
      where id = p_entity_id;
  else
    select current_version_id into v_version_id from public.exercise_builder_exercises where id = p_entity_id;
    if v_version_id is null then raise exception 'Exercise not found.'; end if;
    if p_next_status in ('approved', 'published') and not exists (
      select 1 from public.exercise_builder_sections where exercise_version_id = v_version_id
    ) then raise exception 'An exercise must contain at least one section.'; end if;

    if p_next_status in ('approved', 'published') then
      select count(*) into v_missing_diagnostics
      from public.exercise_builder_questions q
      join public.exercise_builder_question_versions qv on qv.id = q.current_version_id
      where q.id in (
        select fq.question_id
        from public.exercise_builder_section_fixed_questions fq
        join public.exercise_builder_sections s on s.id = fq.section_id
        where s.exercise_version_id = v_version_id
        union
        select pq.question_id
        from public.exercise_builder_pool_questions pq
        join public.exercise_builder_pools p on p.current_version_id = pq.pool_version_id
        join public.exercise_builder_section_pool_rules pr on pr.pool_id = p.id
        join public.exercise_builder_sections s on s.id = pr.section_id
        where s.exercise_version_id = v_version_id
      )
        and qv.question_type <> 'content_block'
        and coalesce(jsonb_array_length(qv.diagnostics -> 'tested_codes'), 0) = 0;
      if v_missing_diagnostics > 0 then
        raise exception '% evaluated questions still lack diagnostic targets.', v_missing_diagnostics;
      end if;

      update public.exercise_builder_question_versions qv
        set review_status = 'approved'
      where qv.id in (
        select q.current_version_id
        from public.exercise_builder_questions q
        where q.id in (
          select fq.question_id
          from public.exercise_builder_section_fixed_questions fq
          join public.exercise_builder_sections s on s.id = fq.section_id
          where s.exercise_version_id = v_version_id
          union
          select pq.question_id
          from public.exercise_builder_pool_questions pq
          join public.exercise_builder_pools p on p.current_version_id = pq.pool_version_id
          join public.exercise_builder_section_pool_rules pr on pr.pool_id = p.id
          join public.exercise_builder_sections s on s.id = pr.section_id
          where s.exercise_version_id = v_version_id
        )
      );
      update public.exercise_builder_questions
        set status = p_next_status,
            approved_by = auth.uid(),
            approved_at = now()
      where id in (
        select fq.question_id
        from public.exercise_builder_section_fixed_questions fq
        join public.exercise_builder_sections s on s.id = fq.section_id
        where s.exercise_version_id = v_version_id
        union
        select pq.question_id
        from public.exercise_builder_pool_questions pq
        join public.exercise_builder_pools p on p.current_version_id = pq.pool_version_id
        join public.exercise_builder_section_pool_rules pr on pr.pool_id = p.id
        join public.exercise_builder_sections s on s.id = pr.section_id
        where s.exercise_version_id = v_version_id
      );
      update public.exercise_builder_pools
        set status = p_next_status,
            approved_by = auth.uid(),
            approved_at = now()
      where id in (
        select pr.pool_id
        from public.exercise_builder_section_pool_rules pr
        join public.exercise_builder_sections s on s.id = pr.section_id
        where s.exercise_version_id = v_version_id
      );
      update public.exercise_builder_exercise_versions set review_status = 'approved' where id = v_version_id;
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
              when s.feedback_timing = 'hidden' then null
              when a.status = 'submitted' or (s.status = 'completed' and s.feedback_timing = 'section_end') then
                case
                  when coalesce((a.exercise_snapshot #>> '{settings,show_correct_answers}')::boolean, true)
                    and coalesce((a.exercise_snapshot #>> '{settings,show_explanations}')::boolean, true) then q.grading_result
                  when coalesce((a.exercise_snapshot #>> '{settings,show_correct_answers}')::boolean, true) then q.grading_result - 'explanation'
                  when coalesce((a.exercise_snapshot #>> '{settings,show_explanations}')::boolean, true) then q.grading_result - 'correct_answer'
                  else q.grading_result - 'correct_answer' - 'explanation'
                end
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
