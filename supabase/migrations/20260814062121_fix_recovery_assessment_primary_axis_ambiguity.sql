-- Fix the cumulative Recovery selector without changing its rollout policy.
-- The RETURNS TABLE output column primary_axis is also a PL/pgSQL variable, so
-- the candidate-pool aggregate must qualify the physical temporary-table column.

create or replace function public.select_recovery_assessment_fragment_policy_internal(
  p_enrollment_id uuid,
  p_session_type text,
  p_budget_minutes integer
)
returns table (
  selection_order integer,
  fragment_id text,
  exercise_id uuid,
  exercise_version_id uuid,
  primary_axis text,
  estimated_minutes integer,
  school_task_family text,
  form_family_key text,
  transfer_level text,
  outcome_ids text[],
  assessment_modes text[],
  selection_reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_axis text;
  v_candidate record;
  v_order integer := 0;
  v_selected_minutes integer := 0;
  v_grammar_minutes integer := 0;
  v_active_axis_count integer := 0;
  v_grammar_ceiling numeric := 1;
  v_grammar_exception_applies boolean := false;
  v_target_axis_count integer := 0;
begin
  -- Executing the original B2b selector materializes its vetted candidate pool
  -- in pg_temp.recovery_v2_candidate_fragments. Its greedy result is discarded.
  perform count(*)
  from public.select_recovery_assessment_fragment_candidates_internal(
    p_enrollment_id,
    p_session_type,
    p_budget_minutes
  );

  create temporary table if not exists recovery_v2_policy_selection (
    selection_order integer primary key,
    fragment_id text unique not null,
    exercise_id uuid not null,
    exercise_version_id uuid not null,
    primary_axis text not null,
    estimated_minutes integer not null,
    school_task_family text not null,
    form_family_key text not null unique,
    transfer_level text not null,
    outcome_ids text[] not null,
    assessment_modes text[] not null,
    selection_reason text not null
  ) on commit drop;
  truncate pg_temp.recovery_v2_policy_selection;

  select case
    when p_session_type = 'checkpoint' then least(count(distinct candidate.primary_axis), 3)
    else count(distinct candidate.primary_axis)
  end::integer
  into v_target_axis_count
  from pg_temp.recovery_v2_candidate_fragments candidate;

  select count(distinct outcome.competence_axis)::integer
  into v_active_axis_count
  from public.recovery_enrollment_outcomes scoped
  join public.recovery_curriculum_outcomes outcome
    on outcome.outcome_id = scoped.outcome_id and outcome.status = 'approved'
  where scoped.enrollment_id = p_enrollment_id and scoped.required;

  v_grammar_ceiling := case p_session_type
    when 'checkpoint' then 0.60
    when 'mock_intermediate' then 0.55
    when 'mock_final' then 0.50
  end;
  v_grammar_exception_applies := case
    when p_session_type = 'checkpoint' and v_active_axis_count = 1 then true
    when p_session_type = 'mock_intermediate' and v_active_axis_count < 3 then true
    when p_session_type = 'mock_final' and v_active_axis_count = 1 then true
    else false
  end;

  -- Blocking axes are reserved first for intermediate/final mocks. All other
  -- axes follow in canonical curriculum order, with grammar last.
  for v_axis in
    select candidate.primary_axis
    from pg_temp.recovery_v2_candidate_fragments candidate
    join public.recovery_curriculum_axes axis on axis.axis_key = candidate.primary_axis
    left join (
      select outcome.competence_axis, bool_or(outcome.blocking_candidate) as blocking
      from public.recovery_enrollment_outcomes scoped
      join public.recovery_curriculum_outcomes outcome
        on outcome.outcome_id = scoped.outcome_id
       and outcome.status = 'approved'
      where scoped.enrollment_id = p_enrollment_id and scoped.required
      group by outcome.competence_axis
    ) scope on scope.competence_axis = candidate.primary_axis
    group by candidate.primary_axis, axis.sort_order, scope.blocking
    order by
      case
        when p_session_type in ('mock_intermediate', 'mock_final') and coalesce(scope.blocking, false) then 0
        else 1
      end,
      case when candidate.primary_axis = 'grammar_sentence_control' then 1 else 0 end,
      axis.sort_order,
      candidate.primary_axis
  loop
    exit when v_order >= v_target_axis_count;

    select candidate.* into v_candidate
    from pg_temp.recovery_v2_candidate_fragments candidate
    where candidate.primary_axis = v_axis
      and candidate.estimated_minutes <= p_budget_minutes - v_selected_minutes
      and not exists (
        select 1 from pg_temp.recovery_v2_policy_selection selected
        where selected.form_family_key = candidate.form_family_key
      )
      and (
        candidate.primary_axis <> 'grammar_sentence_control'
        or v_grammar_exception_applies
        or (
          v_selected_minutes > 0
          and (v_grammar_minutes + candidate.estimated_minutes)::numeric
              / (v_selected_minutes + candidate.estimated_minutes)::numeric <= v_grammar_ceiling
        )
      )
    order by
      candidate.estimated_minutes asc,
      candidate.blocking_under_evidenced_count desc,
      candidate.no_evidence_count desc,
      candidate.under_evidenced_count desc,
      candidate.blocking_count desc,
      candidate.mean_prior_score asc nulls first,
      case when candidate.transfer_level = 'transfer' then 0 else 1 end,
      candidate.estimated_minutes asc,
      candidate.fragment_id
    limit 1;

    if found then
      v_order := v_order + 1;
      insert into pg_temp.recovery_v2_policy_selection values (
        v_order, v_candidate.fragment_id, v_candidate.exercise_id,
        v_candidate.exercise_version_id, v_candidate.primary_axis,
        v_candidate.estimated_minutes, v_candidate.school_task_family,
        v_candidate.form_family_key, v_candidate.transfer_level,
        v_candidate.outcome_ids, v_candidate.assessment_modes,
        case when p_session_type in ('mock_intermediate', 'mock_final')
          and exists (
            select 1
            from public.recovery_enrollment_outcomes scoped
            join public.recovery_curriculum_outcomes outcome on outcome.outcome_id = scoped.outcome_id
            where scoped.enrollment_id = p_enrollment_id
              and scoped.required
              and outcome.status = 'approved'
              and outcome.competence_axis = v_candidate.primary_axis
              and outcome.blocking_candidate
          ) then 'blocking_axis_reservation'
          else 'axis_coverage'
        end
      );
      v_selected_minutes := v_selected_minutes + v_candidate.estimated_minutes;
      if v_candidate.primary_axis = 'grammar_sentence_control' then
        v_grammar_minutes := v_grammar_minutes + v_candidate.estimated_minutes;
      end if;
    end if;
  end loop;

  -- Deterministic evidence-need fill. No random choice and no repeated family.
  for v_candidate in
    select candidate.*
    from pg_temp.recovery_v2_candidate_fragments candidate
    where not exists (
      select 1 from pg_temp.recovery_v2_policy_selection selected
      where selected.fragment_id = candidate.fragment_id
         or selected.form_family_key = candidate.form_family_key
    )
    order by
      candidate.blocking_under_evidenced_count desc,
      candidate.no_evidence_count desc,
      candidate.under_evidenced_count desc,
      candidate.blocking_count desc,
      candidate.mean_prior_score asc nulls first,
      case when candidate.primary_axis = 'grammar_sentence_control' then 1 else 0 end,
      case when candidate.transfer_level = 'transfer' then 0 else 1 end,
      candidate.estimated_minutes asc,
      candidate.fragment_id
  loop
    continue when v_selected_minutes + v_candidate.estimated_minutes > p_budget_minutes;
    continue when v_candidate.primary_axis = 'grammar_sentence_control'
      and not v_grammar_exception_applies
      and (v_grammar_minutes + v_candidate.estimated_minutes)::numeric
          / (v_selected_minutes + v_candidate.estimated_minutes)::numeric > v_grammar_ceiling;
    v_order := v_order + 1;
    insert into pg_temp.recovery_v2_policy_selection values (
      v_order, v_candidate.fragment_id, v_candidate.exercise_id,
      v_candidate.exercise_version_id, v_candidate.primary_axis,
      v_candidate.estimated_minutes, v_candidate.school_task_family,
      v_candidate.form_family_key, v_candidate.transfer_level,
      v_candidate.outcome_ids, v_candidate.assessment_modes, 'under_evidenced_fill'
    );
    v_selected_minutes := v_selected_minutes + v_candidate.estimated_minutes;
    if v_candidate.primary_axis = 'grammar_sentence_control' then
      v_grammar_minutes := v_grammar_minutes + v_candidate.estimated_minutes;
    end if;
  end loop;

  return query
  select selected.*
  from pg_temp.recovery_v2_policy_selection selected
  order by selected.selection_order;
end;
$$;

revoke all on function public.select_recovery_assessment_fragment_policy_internal(uuid, text, integer)
  from public, anon, authenticated;

notify pgrst, 'reload schema';
