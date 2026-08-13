-- Harden the Recovery Curriculum v2 cumulative materializer rollout gate.
--
-- The outcome-first selector introduced in 20260813081530 remains the candidate
-- ranking engine. This migration wraps it with the complete blueprint gates so a
-- small or one-sided fragment pool cannot take over from the legacy materializer.
-- Learner-facing Readiness v2 remains inactive.

alter function public.select_recovery_assessment_fragments_internal(uuid, text, integer)
  rename to select_recovery_assessment_fragment_candidates_internal;

revoke all on function public.select_recovery_assessment_fragment_candidates_internal(uuid, text, integer)
  from public, anon, authenticated;

-- Re-order the already-compatible, already-fresh candidate pool by programme
-- policy. The B2b selector remains the sole compatibility/freshness source; this
-- layer only prevents a short grammar item from crowding out a blocking skill
-- axis. Axis keys stay data-driven, so reading and future lexical fragments work
-- without hard-coded registrations.
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
    when p_session_type = 'checkpoint' then least(count(distinct primary_axis), 3)
    else count(distinct primary_axis)
  end::integer
  into v_target_axis_count
  from pg_temp.recovery_v2_candidate_fragments;

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

-- Evaluate a whole fresh composition for one blocking axis. This is deliberately
-- independent from the chosen greedy result so diagnostics can tell an actual
-- content-pool gap from a feasible axis that the selector omitted.
create or replace function public.recovery_v2_blocking_axis_feasible_internal(
  p_required_axes text[],
  p_budget_minutes integer,
  p_min_fragment_count integer,
  p_min_distinct_axes integer,
  p_grammar_ceiling numeric,
  p_grammar_exception_applies boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_feasible boolean := false;
begin
  with recursive ordered as materialized (
    select
      row_number() over (
        order by estimated_minutes, primary_axis, form_family_key, fragment_id
      )::integer as ord,
      fragment_id,
      primary_axis,
      estimated_minutes,
      form_family_key
    from pg_temp.recovery_v2_candidate_fragments
  ), compositions as (
    select
      0::integer as last_ord,
      0::integer as fragment_count,
      0::integer as total_minutes,
      0::integer as grammar_minutes,
      '{}'::text[] as axes,
      '{}'::text[] as form_families
    union all
    select
      candidate.ord,
      composition.fragment_count + 1,
      composition.total_minutes + candidate.estimated_minutes,
      composition.grammar_minutes + case
        when candidate.primary_axis = 'grammar_sentence_control' then candidate.estimated_minutes
        else 0
      end,
      case
        when candidate.primary_axis = any(composition.axes) then composition.axes
        else array_append(composition.axes, candidate.primary_axis)
      end,
      array_append(composition.form_families, candidate.form_family_key)
    from compositions composition
    join ordered candidate on candidate.ord > composition.last_ord
    where composition.fragment_count < 10
      and composition.total_minutes + candidate.estimated_minutes <= p_budget_minutes
      and not candidate.form_family_key = any(composition.form_families)
  )
  select exists (
    select 1
    from compositions composition
    where composition.fragment_count >= p_min_fragment_count
      and cardinality(composition.axes) >= p_min_distinct_axes
      and p_required_axes <@ composition.axes
      and (
        p_grammar_exception_applies
        or composition.total_minutes = 0
        or composition.grammar_minutes::numeric / composition.total_minutes::numeric <= p_grammar_ceiling
      )
  ) into v_feasible;
  return v_feasible;
end;
$$;

revoke all on function public.recovery_v2_blocking_axis_feasible_internal(text[], integer, integer, integer, numeric, boolean)
  from public, anon, authenticated;

create or replace function public.select_recovery_assessment_fragments_internal(
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
language sql
security definer
set search_path = public, pg_temp
as $$
  select selected.*
  from public.select_recovery_assessment_fragment_policy_internal(
    p_enrollment_id,
    p_session_type,
    p_budget_minutes
  ) selected
  order by selected.selection_order;
$$;

revoke all on function public.select_recovery_assessment_fragments_internal(uuid, text, integer)
  from public, anon, authenticated;

create or replace function public.recovery_v2_assessment_pool_status_internal(
  p_enrollment_id uuid,
  p_session_type text,
  p_budget_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class_year smallint;
  v_active_axes text[] := '{}'::text[];
  v_blocking_axes text[] := '{}'::text[];
  v_required_outcomes text[] := '{}'::text[];
  v_selected_axes text[] := '{}'::text[];
  v_selected_fragments text[] := '{}'::text[];
  v_missing_blocking_axes text[] := '{}'::text[];
  v_candidate_axes text[] := '{}'::text[];
  v_infeasible_blocking_axes text[] := '{}'::text[];
  v_selector_omitted_blocking_axes text[] := '{}'::text[];
  v_active_axis_count integer := 0;
  v_min_distinct_axes integer := 0;
  v_min_fragment_count integer := 0;
  v_fragment_count integer := 0;
  v_selected_minutes integer := 0;
  v_grammar_minutes integer := 0;
  v_grammar_ceiling numeric := 1;
  v_grammar_share numeric := 0;
  v_min_blocking_minutes integer := 0;
  v_grammar_exception_applies boolean := false;
  v_grammar_exception_reason text := null;
  v_v2_started boolean := false;
  v_ready boolean := false;
  v_status text;
  v_warnings jsonb := '[]'::jsonb;
  v_coverage jsonb := '{}'::jsonb;
begin
  if p_session_type not in ('checkpoint', 'mock_intermediate', 'mock_final') then
    raise exception 'Unsupported cumulative Recovery session type: %', p_session_type;
  end if;
  if p_budget_minutes is null or p_budget_minutes < 5 then
    raise exception 'Cumulative Recovery budget must be at least 5 minutes';
  end if;

  select class_year into v_class_year
  from public.recovery_enrollments
  where id = p_enrollment_id;
  if v_class_year is null then
    raise exception 'Recovery enrollment not found or class_year unavailable';
  end if;

  select
    coalesce(array_agg(distinct outcome.competence_axis order by outcome.competence_axis), '{}'::text[]),
    coalesce(array_agg(distinct outcome.competence_axis order by outcome.competence_axis)
      filter (where outcome.blocking_candidate), '{}'::text[]),
    coalesce(array_agg(scoped.outcome_id order by scoped.outcome_id), '{}'::text[])
  into v_active_axes, v_blocking_axes, v_required_outcomes
  from public.recovery_enrollment_outcomes scoped
  join public.recovery_curriculum_outcomes outcome
    on outcome.outcome_id = scoped.outcome_id
   and outcome.status = 'approved'
  where scoped.enrollment_id = p_enrollment_id
    and scoped.required;

  v_active_axis_count := coalesce(cardinality(v_active_axes), 0);
  v_min_distinct_axes := case p_session_type
    when 'checkpoint' then least(v_active_axis_count, 2)
    else least(v_active_axis_count, 3)
  end;
  v_min_fragment_count := case p_session_type when 'checkpoint' then 3 else 4 end;
  v_grammar_ceiling := case p_session_type
    when 'checkpoint' then 0.60
    when 'mock_intermediate' then 0.55
    when 'mock_final' then 0.50
  end;

  create temporary table if not exists recovery_v2_gated_selection (
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
  ) on commit drop;
  truncate pg_temp.recovery_v2_gated_selection;

  insert into pg_temp.recovery_v2_gated_selection
  select * from public.select_recovery_assessment_fragment_policy_internal(
    p_enrollment_id,
    p_session_type,
    p_budget_minutes
  );

  select
    count(*)::integer,
    coalesce(sum(estimated_minutes), 0)::integer,
    coalesce(sum(estimated_minutes) filter (
      where primary_axis = 'grammar_sentence_control'
    ), 0)::integer,
    coalesce(array_agg(distinct primary_axis order by primary_axis), '{}'::text[]),
    coalesce(array_agg(fragment_id order by selection_order), '{}'::text[])
  into v_fragment_count, v_selected_minutes, v_grammar_minutes, v_selected_axes, v_selected_fragments
  from pg_temp.recovery_v2_gated_selection;

  -- The policy selector populated the canonical fresh compatible pool in pg_temp.
  select coalesce(array_agg(distinct primary_axis order by primary_axis), '{}'::text[])
  into v_candidate_axes
  from pg_temp.recovery_v2_candidate_fragments;

  if v_selected_minutes > 0 then
    v_grammar_share := round(v_grammar_minutes::numeric / v_selected_minutes::numeric, 4);
  end if;

  select coalesce(jsonb_object_agg(primary_axis, fragment_count), '{}'::jsonb)
  into v_coverage
  from (
    select primary_axis, count(*)::integer as fragment_count
    from pg_temp.recovery_v2_gated_selection
    group by primary_axis
  ) coverage;

  if p_session_type in ('mock_intermediate', 'mock_final') then
    select coalesce(array_agg(axis order by axis), '{}'::text[])
    into v_missing_blocking_axes
    from unnest(v_blocking_axes) axis
    where not axis = any(v_selected_axes);

    select coalesce(sum(axis_minimum.min_minutes), 0)::integer
    into v_min_blocking_minutes
    from (
      select blocking_axis.axis,
        min(candidate.estimated_minutes)::integer as min_minutes
      from unnest(v_blocking_axes) blocking_axis(axis)
      left join pg_temp.recovery_v2_candidate_fragments candidate
        on candidate.primary_axis = blocking_axis.axis
      group by blocking_axis.axis
    ) axis_minimum;

  end if;

  v_grammar_exception_applies := case
    when p_session_type = 'checkpoint'
      and v_active_axis_count = 1
      and v_active_axes = array['grammar_sentence_control']::text[] then true
    when p_session_type = 'mock_intermediate'
      and v_active_axis_count < 3 then true
    when p_session_type = 'mock_final'
      and v_active_axis_count = 1
      and v_active_axes = array['grammar_sentence_control']::text[] then true
    else false
  end;
  v_grammar_exception_reason := case
    when not v_grammar_exception_applies then null
    when p_session_type = 'mock_intermediate' then 'fewer_than_three_active_axes'
    else 'canonical_required_scope_is_grammar_only'
  end;

  if p_session_type in ('mock_intermediate', 'mock_final') then
    select coalesce(array_agg(missing.axis order by missing.axis), '{}'::text[])
    into v_infeasible_blocking_axes
    from unnest(v_missing_blocking_axes) missing(axis)
    where not public.recovery_v2_blocking_axis_feasible_internal(
      case when p_session_type = 'mock_final' then v_blocking_axes else array[missing.axis]::text[] end,
      p_budget_minutes,
      v_min_fragment_count,
      v_min_distinct_axes,
      v_grammar_ceiling,
      v_grammar_exception_applies
    );

    select coalesce(array_agg(missing.axis order by missing.axis), '{}'::text[])
    into v_selector_omitted_blocking_axes
    from unnest(v_missing_blocking_axes) missing(axis)
    where public.recovery_v2_blocking_axis_feasible_internal(
      case when p_session_type = 'mock_final' then v_blocking_axes else array[missing.axis]::text[] end,
      p_budget_minutes,
      v_min_fragment_count,
      v_min_distinct_axes,
      v_grammar_ceiling,
      v_grammar_exception_applies
    );
  end if;

  select exists (
    select 1
    from public.recovery_plan_sessions session
    join public.assignment_resources resource
      on resource.assignment_id = session.assignment_id
    where session.enrollment_id = p_enrollment_id
      and session.session_type in ('checkpoint', 'mock_intermediate', 'mock_final')
      and resource.exercise_config ->> 'recovery_materializer' = 'curriculum_v2_fragments'
  ) or exists (
    select 1
    from public.recovery_outcome_evidence evidence
    where evidence.enrollment_id = p_enrollment_id
      and evidence.fragment_id is not null
      and evidence.evidence_source in ('checkpoint', 'mock_intermediate', 'mock_final')
  ) into v_v2_started;

  v_ready := v_active_axis_count > 0
    and v_fragment_count >= v_min_fragment_count
    and cardinality(v_selected_axes) >= v_min_distinct_axes
    and cardinality(v_missing_blocking_axes) = 0
    and v_selected_minutes <= p_budget_minutes
    and (v_grammar_exception_applies or v_grammar_share <= v_grammar_ceiling);

  if v_ready then
    v_status := 'curriculum_v2_ready';
  elsif v_v2_started then
    v_status := 'insufficient_fresh_evidence';
    v_warnings := v_warnings || jsonb_build_array('pool_exhausted_or_no_valid_fresh_composition');
  else
    v_status := 'legacy_fallback';
    v_warnings := v_warnings || jsonb_build_array('v2_pool_is_not_yet_sufficient');
  end if;

  if cardinality(v_missing_blocking_axes) > 0 then
    v_warnings := v_warnings || jsonb_build_array('missing_required_blocking_axis_coverage');
  end if;
  if cardinality(v_infeasible_blocking_axes) > 0 then
    v_warnings := v_warnings || jsonb_build_array(
      'CONTENT POOL INSUFFICIENT',
      'blocking_axis_not_feasible_with_current_pool'
    );
  end if;
  if cardinality(v_selector_omitted_blocking_axes) > 0 then
    v_warnings := v_warnings || jsonb_build_array('blocking_axis_selector_omission');
  end if;

  if v_active_axis_count = 0 then
    v_warnings := v_warnings || jsonb_build_array('no_active_required_axes');
  end if;
  if v_fragment_count < v_min_fragment_count then
    v_warnings := v_warnings || jsonb_build_array('minimum_fragment_count_not_met');
  end if;
  if cardinality(v_selected_axes) < v_min_distinct_axes then
    v_warnings := v_warnings || jsonb_build_array('minimum_distinct_axis_count_not_met');
  end if;
  if v_selected_minutes > p_budget_minutes then
    v_warnings := v_warnings || jsonb_build_array('session_budget_exceeded');
  end if;
  if not v_grammar_exception_applies and v_grammar_share > v_grammar_ceiling then
    v_warnings := v_warnings || jsonb_build_array('grammar_share_ceiling_exceeded');
    v_warnings := v_warnings || jsonb_build_array('grammar_ceiling_exception_profile_provenance_unavailable');
  end if;

  return jsonb_build_object(
    'ready', v_ready,
    'status', v_status,
    'v2_started', v_v2_started,
    'engine', case
      when v_ready then 'curriculum_v2'
      when v_v2_started then 'curriculum_v2_blocked'
      else 'legacy'
    end,
    'session_type', p_session_type,
    'class_year', v_class_year,
    'active_axes', to_jsonb(v_active_axes),
    'active_blocking_axes', to_jsonb(v_blocking_axes),
    'candidate_axes', to_jsonb(v_candidate_axes),
    'required_outcomes', to_jsonb(v_required_outcomes),
    'selected_axes', to_jsonb(v_selected_axes),
    'selected_fragments', to_jsonb(v_selected_fragments),
    'coverage', v_coverage,
    'missing_blocking_axes', to_jsonb(v_missing_blocking_axes),
    'blocking_axis_feasibility', jsonb_build_object(
      'minimum_joint_blocking_minutes', v_min_blocking_minutes,
      'infeasible_axes', to_jsonb(v_infeasible_blocking_axes),
      'selector_omitted_axes', to_jsonb(v_selector_omitted_blocking_axes),
      'semantic_reason', case
        when cardinality(v_selector_omitted_blocking_axes) > 0 then 'blocking_axis_selector_omission'
        when cardinality(v_infeasible_blocking_axes) > 0 then 'blocking_axis_not_feasible_with_current_pool'
        else 'all_required_blocking_axes_selected'
      end
    ),
    'active_axis_count', v_active_axis_count,
    'selected_axis_count', cardinality(v_selected_axes),
    'minimum_distinct_axes', v_min_distinct_axes,
    'minimum_fragment_count', v_min_fragment_count,
    'selected_fragment_count', v_fragment_count,
    'session_budget_minutes', p_budget_minutes,
    'estimated_minutes', v_selected_minutes,
    'grammar_minutes', v_grammar_minutes,
    'grammar_share', v_grammar_share,
    'grammar_ceiling', v_grammar_ceiling,
    'grammar_ceiling_exception', jsonb_build_object(
      'applies', v_grammar_exception_applies,
      'reason', v_grammar_exception_reason,
      'school_profile_provenance_available', false
    ),
    'freshness', jsonb_build_object(
      'policy', 'unused_form_families_only',
      'status', case when v_ready then 'fresh' else v_status end
    ),
    'warnings', v_warnings,
    'rollout_reason', case
      when v_ready then 'curriculum_v2_composition_valid'
      when cardinality(v_selector_omitted_blocking_axes) > 0 then 'invalid_selector_result'
      when cardinality(v_infeasible_blocking_axes) > 0 then 'content_pool_insufficient'
      when v_v2_started then 'freshness_or_composition_exhausted_after_v2_start'
      else 'legacy_retained_until_v2_pool_is_sufficient'
    end,
    'readiness_v2_active', false
  );
end;
$$;

revoke all on function public.recovery_v2_assessment_pool_status_internal(uuid, text, integer)
  from public, anon, authenticated;

-- Rebind the public selector after the status function exists. PostgreSQL
-- resolves function references when CREATE FUNCTION runs, so this final body
-- avoids a forward-reference while keeping status as the single rollout gate.
create or replace function public.select_recovery_assessment_fragments_internal(
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
  v_status jsonb;
begin
  v_status := public.recovery_v2_assessment_pool_status_internal(
    p_enrollment_id,
    p_session_type,
    p_budget_minutes
  );
  if not coalesce((v_status ->> 'ready')::boolean, false) then return; end if;

  return query
  select selected.*
  from public.select_recovery_assessment_fragment_policy_internal(
    p_enrollment_id,
    p_session_type,
    p_budget_minutes
  ) selected
  order by selected.selection_order;
end;
$$;

revoke all on function public.select_recovery_assessment_fragments_internal(uuid, text, integer)
  from public, anon, authenticated;

create or replace function public.admin_preview_recovery_v2_cumulative_materialization(
  p_enrollment_id uuid,
  p_session_type text,
  p_budget_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pool_status jsonb;
  v_selected jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  v_pool_status := public.recovery_v2_assessment_pool_status_internal(
    p_enrollment_id,
    p_session_type,
    p_budget_minutes
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'selection_order', selected.selection_order,
    'fragment_id', selected.fragment_id,
    'exercise_id', selected.exercise_id,
    'exercise_version_id', selected.exercise_version_id,
    'primary_axis', selected.primary_axis,
    'outcome_ids', to_jsonb(selected.outcome_ids),
    'assessment_modes', to_jsonb(selected.assessment_modes),
    'school_task_family', selected.school_task_family,
    'form_family_key', selected.form_family_key,
    'transfer_level', selected.transfer_level,
    'estimated_minutes', selected.estimated_minutes,
    'selection_reason', selected.selection_reason
  ) order by selected.selection_order), '[]'::jsonb)
  into v_selected
  from public.select_recovery_assessment_fragment_policy_internal(
    p_enrollment_id,
    p_session_type,
    p_budget_minutes
  ) selected;

  return v_pool_status || jsonb_build_object(
    'selected_fragment_details', v_selected,
    'rollout_decision', case
      when coalesce((v_pool_status ->> 'ready')::boolean, false) then 'curriculum_v2'
      when coalesce((v_pool_status ->> 'v2_started')::boolean, false) then 'block_for_fresh_content'
      else 'legacy_fallback'
    end
  );
end;
$$;

revoke all on function public.admin_preview_recovery_v2_cumulative_materialization(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.admin_preview_recovery_v2_cumulative_materialization(uuid, text, integer)
  to authenticated;

notify pgrst, 'reload schema';
