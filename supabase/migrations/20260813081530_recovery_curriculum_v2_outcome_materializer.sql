-- Recovery Curriculum v2 cumulative assessment selection/materialization.
-- This migration is rollout-safe and does not activate learner-facing Readiness v2.
--
-- Cumulative behavior:
--   * before Curriculum v2 fragment rollout, existing recovery_exercise_map content remains the fallback;
--   * rollout begins only when the approved authored fragment pool satisfies the per-session axis gate;
--   * once an enrollment has used v2 cumulative fragments, it never silently falls back to legacy evidence;
--   * fresh form families are selected outcome/axis-first within the existing session budget;
--   * final mock must cover every active blocking axis with fresh primary-axis evidence.
--
-- Non-cumulative behavior remains on the existing Recovery mapping path.

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
  v_candidate_axes text[] := '{}'::text[];
  v_active_axis_count integer := 0;
  v_candidate_axis_count integer := 0;
  v_min_distinct_axes integer := 0;
  v_min_rollout_minutes integer := 0;
  v_min_blocking_minutes integer := 0;
  v_final_blocking_coverage boolean := true;
  v_v2_started boolean := false;
  v_ready boolean := false;
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
      filter (where outcome.blocking_candidate), '{}'::text[])
    into v_active_axes, v_blocking_axes
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

  with compatible_fragments as (
    select
      fragment.fragment_id,
      fragment.primary_axis,
      fragment.estimated_minutes
    from public.recovery_assessment_fragments fragment
    join public.exercise_builder_exercises exercise
      on exercise.id = fragment.exercise_id
     and exercise.status = 'published'
    join public.exercise_builder_exercise_versions version
      on version.id = fragment.exercise_version_id
     and version.exercise_id = fragment.exercise_id
     and version.review_status = 'approved'
    where fragment.status = 'approved'
      and fragment.active
      and v_class_year = any(fragment.year_profiles)
      and fragment.estimated_minutes <= p_budget_minutes
      and (p_session_type = 'checkpoint' or fragment.transfer_level = 'transfer')
      and exists (
        select 1
        from public.recovery_assessment_fragment_outcomes mapped
        join public.recovery_enrollment_outcomes scoped
          on scoped.enrollment_id = p_enrollment_id
         and scoped.outcome_id = mapped.outcome_id
         and scoped.required
        where mapped.fragment_id = fragment.fragment_id
          and mapped.evidence_role = 'primary'
      )
      and not exists (
        select 1
        from public.recovery_assessment_fragment_outcomes mapped
        where mapped.fragment_id = fragment.fragment_id
          and mapped.evidence_role = 'primary'
          and not exists (
            select 1
            from public.recovery_enrollment_outcomes scoped
            where scoped.enrollment_id = p_enrollment_id
              and scoped.outcome_id = mapped.outcome_id
              and scoped.required
          )
      )
  ), per_axis as (
    select primary_axis, min(estimated_minutes)::integer as min_minutes
    from compatible_fragments
    group by primary_axis
  ), rollout_axes as (
    select primary_axis, min_minutes
    from per_axis
    order by min_minutes, case when primary_axis = 'grammar_sentence_control' then 1 else 0 end, primary_axis
    limit v_min_distinct_axes
  )
  select
    coalesce((select array_agg(primary_axis order by primary_axis) from per_axis), '{}'::text[]),
    coalesce((select sum(min_minutes)::integer from rollout_axes), 0)
    into v_candidate_axes, v_min_rollout_minutes;

  v_candidate_axis_count := coalesce(cardinality(v_candidate_axes), 0);

  if p_session_type = 'mock_final' and coalesce(cardinality(v_blocking_axes), 0) > 0 then
    v_final_blocking_coverage := v_blocking_axes <@ v_candidate_axes;

    with compatible_fragments as (
      select fragment.primary_axis, fragment.estimated_minutes
      from public.recovery_assessment_fragments fragment
      join public.exercise_builder_exercises exercise
        on exercise.id = fragment.exercise_id
       and exercise.status = 'published'
      join public.exercise_builder_exercise_versions version
        on version.id = fragment.exercise_version_id
       and version.exercise_id = fragment.exercise_id
       and version.review_status = 'approved'
      where fragment.status = 'approved'
        and fragment.active
        and fragment.transfer_level = 'transfer'
        and v_class_year = any(fragment.year_profiles)
        and fragment.estimated_minutes <= p_budget_minutes
        and fragment.primary_axis = any(v_blocking_axes)
        and exists (
          select 1
          from public.recovery_assessment_fragment_outcomes mapped
          join public.recovery_enrollment_outcomes scoped
            on scoped.enrollment_id = p_enrollment_id
           and scoped.outcome_id = mapped.outcome_id
           and scoped.required
          where mapped.fragment_id = fragment.fragment_id
            and mapped.evidence_role = 'primary'
        )
        and not exists (
          select 1
          from public.recovery_assessment_fragment_outcomes mapped
          where mapped.fragment_id = fragment.fragment_id
            and mapped.evidence_role = 'primary'
            and not exists (
              select 1
              from public.recovery_enrollment_outcomes scoped
              where scoped.enrollment_id = p_enrollment_id
                and scoped.outcome_id = mapped.outcome_id
                and scoped.required
            )
        )
    ), per_blocking_axis as (
      select axis, min(fragment.estimated_minutes)::integer as min_minutes
      from unnest(v_blocking_axes) axis
      left join compatible_fragments fragment on fragment.primary_axis = axis
      group by axis
    )
    select coalesce(sum(min_minutes)::integer, 0)
      into v_min_blocking_minutes
    from per_blocking_axis;
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
    and v_candidate_axis_count >= v_min_distinct_axes
    and v_min_rollout_minutes <= p_budget_minutes
    and v_final_blocking_coverage
    and (p_session_type <> 'mock_final' or v_min_blocking_minutes <= p_budget_minutes);

  return jsonb_build_object(
    'ready', v_ready,
    'v2_started', v_v2_started,
    'session_type', p_session_type,
    'class_year', v_class_year,
    'active_axes', to_jsonb(v_active_axes),
    'active_blocking_axes', to_jsonb(v_blocking_axes),
    'candidate_axes', to_jsonb(v_candidate_axes),
    'active_axis_count', v_active_axis_count,
    'candidate_axis_count', v_candidate_axis_count,
    'minimum_distinct_axes', v_min_distinct_axes,
    'minimum_rollout_minutes', v_min_rollout_minutes,
    'minimum_blocking_minutes', v_min_blocking_minutes,
    'final_blocking_axis_coverage', v_final_blocking_coverage,
    'session_budget_minutes', p_budget_minutes,
    'readiness_v2_active', false
  );
end;
$$;

revoke all on function public.recovery_v2_assessment_pool_status_internal(uuid, text, integer)
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
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class_year smallint;
  v_active_axis_count integer := 0;
  v_target_axis_count integer := 0;
  v_selected_axis_count integer := 0;
  v_selected_minutes integer := 0;
  v_grammar_minutes integer := 0;
  v_grammar_ceiling numeric := 1;
  v_order integer := 0;
  v_axis text;
  v_candidate record;
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

  select count(distinct outcome.competence_axis)
    into v_active_axis_count
  from public.recovery_enrollment_outcomes scoped
  join public.recovery_curriculum_outcomes outcome
    on outcome.outcome_id = scoped.outcome_id
   and outcome.status = 'approved'
  where scoped.enrollment_id = p_enrollment_id
    and scoped.required;

  v_target_axis_count := case p_session_type
    when 'checkpoint' then least(v_active_axis_count, 3)
    else v_active_axis_count
  end;

  v_grammar_ceiling := case p_session_type
    when 'checkpoint' then 0.60
    when 'mock_intermediate' then 0.55
    when 'mock_final' then 0.50
  end;

  create temporary table if not exists recovery_v2_candidate_fragments (
    fragment_id text primary key,
    exercise_id uuid not null,
    exercise_version_id uuid not null,
    primary_axis text not null,
    estimated_minutes integer not null,
    school_task_family text not null,
    form_family_key text not null,
    transfer_level text not null,
    outcome_ids text[] not null,
    assessment_modes text[] not null,
    blocking_count integer not null,
    under_evidenced_count integer not null,
    blocking_under_evidenced_count integer not null,
    no_evidence_count integer not null,
    mean_prior_score numeric
  ) on commit drop;
  truncate pg_temp.recovery_v2_candidate_fragments;

  create temporary table if not exists recovery_v2_selected_fragments (
    selection_order integer primary key,
    fragment_id text unique not null,
    exercise_id uuid not null,
    exercise_version_id uuid not null,
    primary_axis text not null,
    estimated_minutes integer not null,
    school_task_family text not null,
    form_family_key text not null,
    transfer_level text not null,
    outcome_ids text[] not null,
    assessment_modes text[] not null,
    selection_reason text not null
  ) on commit drop;
  truncate pg_temp.recovery_v2_selected_fragments;

  insert into pg_temp.recovery_v2_candidate_fragments (
    fragment_id, exercise_id, exercise_version_id, primary_axis,
    estimated_minutes, school_task_family, form_family_key, transfer_level,
    outcome_ids, assessment_modes, blocking_count, under_evidenced_count,
    blocking_under_evidenced_count, no_evidence_count, mean_prior_score
  )
  with evidence_summary as (
    select
      scoped.outcome_id,
      count(evidence.id) filter (
        where evidence.evidence_status = 'valid'
          and evidence.evidence_source in ('checkpoint', 'mock_intermediate', 'mock_final')
      ) as valid_cumulative_count,
      avg(evidence.score) filter (
        where evidence.evidence_status = 'valid'
          and evidence.evidence_source in ('checkpoint', 'mock_intermediate', 'mock_final')
      ) as mean_score
    from public.recovery_enrollment_outcomes scoped
    left join public.recovery_outcome_evidence evidence
      on evidence.enrollment_id = scoped.enrollment_id
     and evidence.outcome_id = scoped.outcome_id
    where scoped.enrollment_id = p_enrollment_id
      and scoped.required
    group by scoped.outcome_id
  )
  select
    fragment.fragment_id,
    fragment.exercise_id,
    fragment.exercise_version_id,
    fragment.primary_axis,
    fragment.estimated_minutes,
    fragment.school_task_family,
    fragment.form_family_key,
    fragment.transfer_level,
    array_agg(distinct mapped.outcome_id order by mapped.outcome_id),
    coalesce((
      select array_agg(mode.assessment_mode order by mode.assessment_mode)
      from public.recovery_assessment_fragment_modes mode
      where mode.fragment_id = fragment.fragment_id
    ), '{}'::text[]),
    count(*) filter (where outcome.blocking_candidate)::integer,
    count(*) filter (
      where coalesce(evidence_summary.valid_cumulative_count, 0) = 0
         or coalesce(evidence_summary.mean_score, 0) < 70
    )::integer,
    count(*) filter (
      where outcome.blocking_candidate
        and (coalesce(evidence_summary.valid_cumulative_count, 0) = 0
          or coalesce(evidence_summary.mean_score, 0) < 70)
    )::integer,
    count(*) filter (where coalesce(evidence_summary.valid_cumulative_count, 0) = 0)::integer,
    avg(evidence_summary.mean_score)
  from public.recovery_assessment_fragments fragment
  join public.exercise_builder_exercises exercise
    on exercise.id = fragment.exercise_id
   and exercise.status = 'published'
  join public.exercise_builder_exercise_versions version
    on version.id = fragment.exercise_version_id
   and version.exercise_id = fragment.exercise_id
   and version.review_status = 'approved'
  join public.recovery_assessment_fragment_outcomes mapped
    on mapped.fragment_id = fragment.fragment_id
  join public.recovery_curriculum_outcomes outcome
    on outcome.outcome_id = mapped.outcome_id
   and outcome.status = 'approved'
  join public.recovery_enrollment_outcomes scoped
    on scoped.enrollment_id = p_enrollment_id
   and scoped.outcome_id = mapped.outcome_id
   and scoped.required
  left join evidence_summary on evidence_summary.outcome_id = mapped.outcome_id
  where fragment.status = 'approved'
    and fragment.active
    and v_class_year = any(fragment.year_profiles)
    and fragment.estimated_minutes <= p_budget_minutes
    and (p_session_type = 'checkpoint' or fragment.transfer_level = 'transfer')
    and exists (
      select 1
      from public.recovery_assessment_fragment_outcomes primary_mapped
      join public.recovery_enrollment_outcomes primary_scope
        on primary_scope.enrollment_id = p_enrollment_id
       and primary_scope.outcome_id = primary_mapped.outcome_id
       and primary_scope.required
      where primary_mapped.fragment_id = fragment.fragment_id
        and primary_mapped.evidence_role = 'primary'
    )
    and not exists (
      select 1
      from public.recovery_assessment_fragment_outcomes primary_mapped
      where primary_mapped.fragment_id = fragment.fragment_id
        and primary_mapped.evidence_role = 'primary'
        and not exists (
          select 1
          from public.recovery_enrollment_outcomes primary_scope
          where primary_scope.enrollment_id = p_enrollment_id
            and primary_scope.outcome_id = primary_mapped.outcome_id
            and primary_scope.required
        )
    )
    and not exists (
      select 1
      from public.recovery_outcome_evidence used
      where used.enrollment_id = p_enrollment_id
        and used.form_family_key = fragment.form_family_key
        and used.evidence_source in ('checkpoint', 'mock_intermediate', 'mock_final')
        and used.evidence_status <> 'void'
    )
    and not exists (
      select 1
      from public.recovery_plan_sessions prior_session
      join public.assignment_resources prior_resource
        on prior_resource.assignment_id = prior_session.assignment_id
      where prior_session.enrollment_id = p_enrollment_id
        and prior_resource.exercise_config ->> 'recovery_form_family_key' = fragment.form_family_key
    )
  group by
    fragment.fragment_id, fragment.exercise_id, fragment.exercise_version_id,
    fragment.primary_axis, fragment.estimated_minutes, fragment.school_task_family,
    fragment.form_family_key, fragment.transfer_level;

  -- Breadth pass. Grammar is deliberately considered after other active axes.
  for v_axis in
    select candidate.primary_axis
    from pg_temp.recovery_v2_candidate_fragments candidate
    join public.recovery_curriculum_axes axis on axis.axis_key = candidate.primary_axis
    group by candidate.primary_axis, axis.sort_order
    order by
      max(candidate.blocking_under_evidenced_count) desc,
      max(candidate.blocking_count) desc,
      case when candidate.primary_axis = 'grammar_sentence_control' then 1 else 0 end,
      min(candidate.mean_prior_score) asc nulls first,
      axis.sort_order
  loop
    if p_session_type = 'checkpoint' and v_selected_axis_count >= v_target_axis_count then
      exit;
    end if;

    select candidate.* into v_candidate
    from pg_temp.recovery_v2_candidate_fragments candidate
    where candidate.primary_axis = v_axis
      and candidate.estimated_minutes <= p_budget_minutes - v_selected_minutes
      and not exists (
        select 1 from pg_temp.recovery_v2_selected_fragments selected
        where selected.form_family_key = candidate.form_family_key
      )
      and (
        candidate.primary_axis <> 'grammar_sentence_control'
        or v_active_axis_count <= 1
        or (
          v_selected_minutes > 0
          and (v_grammar_minutes + candidate.estimated_minutes)::numeric
              / (v_selected_minutes + candidate.estimated_minutes)::numeric <= v_grammar_ceiling
        )
      )
    order by
      candidate.blocking_under_evidenced_count desc,
      candidate.no_evidence_count desc,
      candidate.under_evidenced_count desc,
      candidate.blocking_count desc,
      candidate.mean_prior_score asc nulls first,
      case when candidate.transfer_level = 'transfer' then 0 else 1 end,
      candidate.estimated_minutes asc,
      candidate.fragment_id
    limit 1;

    if not found then
      continue;
    end if;

    v_order := v_order + 1;
    insert into pg_temp.recovery_v2_selected_fragments values (
      v_order, v_candidate.fragment_id, v_candidate.exercise_id,
      v_candidate.exercise_version_id, v_candidate.primary_axis,
      v_candidate.estimated_minutes, v_candidate.school_task_family,
      v_candidate.form_family_key, v_candidate.transfer_level,
      v_candidate.outcome_ids, v_candidate.assessment_modes, 'axis_coverage'
    );

    v_selected_minutes := v_selected_minutes + v_candidate.estimated_minutes;
    if v_candidate.primary_axis = 'grammar_sentence_control' then
      v_grammar_minutes := v_grammar_minutes + v_candidate.estimated_minutes;
    end if;
    v_selected_axis_count := v_selected_axis_count + 1;
  end loop;

  -- Fill remaining time by evidence need while keeping the grammar ceiling.
  for v_candidate in
    select candidate.*
    from pg_temp.recovery_v2_candidate_fragments candidate
    where not exists (
      select 1 from pg_temp.recovery_v2_selected_fragments selected
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
    if v_selected_minutes + v_candidate.estimated_minutes > p_budget_minutes then
      continue;
    end if;
    if v_candidate.primary_axis = 'grammar_sentence_control'
       and v_active_axis_count > 1
       and (v_grammar_minutes + v_candidate.estimated_minutes)::numeric
           / (v_selected_minutes + v_candidate.estimated_minutes)::numeric > v_grammar_ceiling then
      continue;
    end if;

    v_order := v_order + 1;
    insert into pg_temp.recovery_v2_selected_fragments values (
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
  select
    selected.selection_order,
    selected.fragment_id,
    selected.exercise_id,
    selected.exercise_version_id,
    selected.primary_axis,
    selected.estimated_minutes,
    selected.school_task_family,
    selected.form_family_key,
    selected.transfer_level,
    selected.outcome_ids,
    selected.assessment_modes,
    selected.selection_reason
  from pg_temp.recovery_v2_selected_fragments selected
  order by selected.selection_order;
end;
$$;

revoke all on function public.select_recovery_assessment_fragments_internal(uuid, text, integer)
  from public, anon, authenticated;

create or replace function public.materialize_recovery_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.recovery_plan_sessions%rowtype;
  v_enrollment public.recovery_enrollments%rowtype;
  v_assignment_id uuid;
  v_resource_id uuid;
  v_first_resource_id uuid;
  v_mapping record;
  v_fragment record;
  v_resource_count integer := 0;
  v_phase text;
  v_phase_label text;
  v_is_mock boolean;
  v_phase_order integer;
  v_minutes_used integer := 0;
  v_mapping_minutes integer := 0;
  v_budget_minutes integer := 0;
  v_is_cumulative boolean := false;
  v_pool_status jsonb := '{}'::jsonb;
  v_use_v2_fragments boolean := false;
  v_v2_started boolean := false;
  v_selected_axes text[] := '{}'::text[];
  v_required_blocking_axes text[] := '{}'::text[];
  v_missing_blocking_axes text[] := '{}'::text[];
  v_min_distinct_axes integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select * into v_session
  from public.recovery_plan_sessions
  where id = p_session_id
  for update;
  if v_session.id is null then raise exception 'Recovery session not found.'; end if;

  select * into v_enrollment
  from public.recovery_enrollments
  where id = v_session.enrollment_id
    and user_id = auth.uid()
    and status = 'active';
  if v_enrollment.id is null then raise exception 'Recovery enrollment not found.'; end if;

  if v_session.assignment_id is not null then
    return jsonb_build_object(
      'ready', true,
      'assignment_id', v_session.assignment_id,
      'resource_id', v_session.assignment_resource_id,
      'existing', true
    );
  end if;

  v_is_mock := v_session.session_type in ('mock_intermediate', 'mock_final');
  v_is_cumulative := v_session.session_type in ('checkpoint', 'mock_intermediate', 'mock_final');
  v_budget_minutes := greatest(5, coalesce(v_session.estimated_minutes, 30));

  if v_is_cumulative then
    v_pool_status := public.recovery_v2_assessment_pool_status_internal(
      v_session.enrollment_id,
      v_session.session_type,
      v_budget_minutes
    );
    v_v2_started := coalesce((v_pool_status ->> 'v2_started')::boolean, false);
    v_use_v2_fragments := coalesce((v_pool_status ->> 'ready')::boolean, false) or v_v2_started;
    v_min_distinct_axes := coalesce((v_pool_status ->> 'minimum_distinct_axes')::integer, 0);

    if v_session.session_type = 'mock_final' then
      select coalesce(array_agg(value order by value), '{}'::text[])
      into v_required_blocking_axes
      from jsonb_array_elements_text(coalesce(v_pool_status -> 'active_blocking_axes', '[]'::jsonb));
    end if;
  end if;

  insert into public.assignments (
    learner_id, title, reason, learner_note, status, required,
    deadline_at, estimated_minutes, published_at, created_by
  ) values (
    auth.uid(),
    v_session.title,
    'Recupero Debito Inglese',
    v_session.rationale,
    'published',
    true,
    v_enrollment.exam_date::timestamptz,
    v_session.estimated_minutes,
    now(),
    auth.uid()
  ) returning id into v_assignment_id;

  if v_use_v2_fragments then
    for v_fragment in
      select *
      from public.select_recovery_assessment_fragments_internal(
        v_session.enrollment_id,
        v_session.session_type,
        v_budget_minutes
      )
      order by selection_order
    loop
      v_resource_count := v_resource_count + 1;
      v_minutes_used := v_minutes_used + v_fragment.estimated_minutes;

      if not v_fragment.primary_axis = any(v_selected_axes) then
        v_selected_axes := array_append(v_selected_axes, v_fragment.primary_axis);
      end if;

      insert into public.assignment_resources (
        assignment_id, resource_key, resource_type, title, description,
        route, sequence_index, exercise_config
      ) values (
        v_assignment_id,
        'recovery-' || v_session.session_type || '-fragment-' || v_fragment.fragment_id || '-' || v_session.id::text,
        'custom_exercise',
        case v_session.session_type
          when 'checkpoint' then 'Verifica di percorso · Parte ' || v_resource_count
          when 'mock_intermediate' then 'Simulazione · Parte ' || v_resource_count
          else 'Simulazione finale · Parte ' || v_resource_count
        end,
        'Attività cumulativa in formato scolastico. La regola o competenza valutata non viene anticipata.',
        '/exercises',
        v_resource_count,
        jsonb_build_object(
          'exercise_id', v_fragment.exercise_id,
          'exercise_version_id', v_fragment.exercise_version_id,
          'recovery_phase', v_session.session_type,
          'recovery_topic_key', null,
          'recovery_fragment_id', v_fragment.fragment_id,
          'recovery_form_family_key', v_fragment.form_family_key,
          'recovery_primary_axis', v_fragment.primary_axis,
          'recovery_outcome_ids', to_jsonb(v_fragment.outcome_ids),
          'recovery_assessment_modes', to_jsonb(v_fragment.assessment_modes),
          'recovery_selection_reason', v_fragment.selection_reason,
          'recovery_materializer', 'curriculum_v2_fragments',
          'completion_rule', 'submitted',
          'required_score', 0,
          'required_attempts', 1,
          'allow_retry', not v_is_mock,
          'show_score', not v_is_mock,
          'show_correct_answers', not v_is_mock,
          'show_explanations', not v_is_mock,
          'show_diagnostic_summary', not v_is_mock
        )
      ) returning id into v_resource_id;

      if v_first_resource_id is null then
        v_first_resource_id := v_resource_id;
      end if;
    end loop;

    if v_resource_count = 0
       or coalesce(cardinality(v_selected_axes), 0) < v_min_distinct_axes then
      delete from public.assignments where id = v_assignment_id;
      return jsonb_build_object(
        'ready', false,
        'reason', 'insufficient_fresh_v2_fragment_coverage',
        'pool_status', v_pool_status,
        'selected_axes', to_jsonb(v_selected_axes),
        'resource_count', v_resource_count,
        'session_budget_minutes', v_budget_minutes
      );
    end if;

    if v_session.session_type = 'mock_final'
       and coalesce(cardinality(v_required_blocking_axes), 0) > 0 then
      select coalesce(array_agg(axis order by axis), '{}'::text[])
      into v_missing_blocking_axes
      from unnest(v_required_blocking_axes) axis
      where not axis = any(v_selected_axes);

      if coalesce(cardinality(v_missing_blocking_axes), 0) > 0 then
        delete from public.assignments where id = v_assignment_id;
        return jsonb_build_object(
          'ready', false,
          'reason', 'final_mock_missing_blocking_axis_coverage',
          'missing_blocking_axes', to_jsonb(v_missing_blocking_axes),
          'selected_axes', to_jsonb(v_selected_axes),
          'session_budget_minutes', v_budget_minutes
        );
      end if;
    end if;
  else
    -- Existing path for topic, quick review, error review, and cumulative legacy fallback.
    for v_mapping in
      select mapping.*,
        version.estimated_minutes as version_estimated_minutes,
        coalesce(required_topic.priority_score, 0) as topic_priority,
        case when mapping.topic_key is null then 0 else 1 end as scope_order,
        case mapping.phase
          when 'recover' then 10
          when 'practice' then 20
          when 'school' then 30
          when 'verify' then 40
          when 'error_review' then 10
          when 'checkpoint' then 10
          when 'mock_intermediate' then 10
          when 'mock_final' then 10
          else 100
        end as phase_order
      from public.recovery_exercise_map mapping
      join public.exercise_builder_exercises exercise on exercise.id = mapping.exercise_id
      join public.exercise_builder_exercise_versions version on version.id = mapping.exercise_version_id
      left join public.recovery_student_topics required_topic
        on required_topic.enrollment_id = v_enrollment.id
       and required_topic.topic_key = mapping.topic_key
       and required_topic.required
      where mapping.active
        and exercise.status = 'published'
        and version.review_status = 'approved'
        and (
          (v_session.session_type = 'topic'
            and mapping.topic_key = v_session.topic_key
            and mapping.phase in ('recover', 'practice', 'school', 'verify'))
          or (v_session.session_type = 'quick_review'
            and mapping.topic_key = v_session.topic_key
            and mapping.phase = 'verify')
          or (v_session.session_type = 'error_review'
            and mapping.phase = 'error_review'
            and (mapping.topic_key is null or mapping.topic_key = v_session.topic_key))
          or (v_session.session_type = 'checkpoint'
            and mapping.phase = 'checkpoint'
            and (mapping.topic_key is null or required_topic.topic_key is not null))
          or (v_session.session_type = 'mock_intermediate'
            and mapping.phase = 'mock_intermediate'
            and (mapping.topic_key is null or required_topic.topic_key is not null))
          or (v_session.session_type = 'mock_final'
            and mapping.phase = 'mock_final'
            and (mapping.topic_key is null or required_topic.topic_key is not null))
        )
      order by phase_order, scope_order, topic_priority desc, mapping.sort_order, mapping.created_at
    loop
      v_phase := v_mapping.phase;
      v_phase_order := v_mapping.phase_order;
      v_mapping_minutes := greatest(1, coalesce(v_mapping.estimated_minutes, v_mapping.version_estimated_minutes, 5));

      if v_is_cumulative
         and v_resource_count > 0
         and v_minutes_used + v_mapping_minutes > v_budget_minutes then
        continue;
      end if;

      v_phase_label := case v_phase
        when 'recover' then 'Recupera'
        when 'practice' then 'Allenati'
        when 'school' then 'Modalità scuola'
        when 'verify' then 'Verifica argomento'
        when 'error_review' then 'Ripassa gli errori'
        when 'checkpoint' then 'Verifica di percorso'
        when 'mock_intermediate' then 'Simulazione'
        when 'mock_final' then 'Simulazione finale'
        else 'Attività'
      end;

      v_resource_count := v_resource_count + 1;
      v_minutes_used := v_minutes_used + v_mapping_minutes;

      insert into public.assignment_resources (
        assignment_id, resource_key, resource_type, title, description,
        route, sequence_index, exercise_config
      ) values (
        v_assignment_id,
        'recovery-' || v_phase || '-' || v_mapping.id::text,
        'custom_exercise',
        case
          when v_is_cumulative and v_mapping.topic_key is not null
            then v_phase_label || ' · ' || coalesce(
              (select label from public.recovery_topic_catalog where topic_key = v_mapping.topic_key),
              v_mapping.topic_key
            )
          else v_phase_label
        end,
        case
          when v_phase = 'school' then 'Esercizi in formati simili a quelli usati nelle verifiche scolastiche.'
          when v_phase in ('mock_intermediate', 'mock_final') then 'Durante la simulazione non vengono mostrati suggerimenti o correzioni immediate.'
          when v_phase = 'checkpoint' and v_mapping.topic_key is not null then 'Verifica mirata su un argomento del tuo programma scolastico.'
          else null
        end,
        '/exercises',
        v_resource_count,
        jsonb_build_object(
          'exercise_id', v_mapping.exercise_id,
          'exercise_version_id', v_mapping.exercise_version_id,
          'recovery_phase', v_phase,
          'recovery_topic_key', v_mapping.topic_key,
          'recovery_materializer', case when v_is_cumulative then 'legacy_mapping_fallback' else 'topic_mapping' end,
          'completion_rule', 'submitted',
          'required_score', 0,
          'required_attempts', 1,
          'allow_retry', not v_is_mock,
          'show_score', not v_is_mock,
          'show_correct_answers', not v_is_mock,
          'show_explanations', not v_is_mock,
          'show_diagnostic_summary', not v_is_mock
        )
      ) returning id into v_resource_id;

      if v_first_resource_id is null then
        v_first_resource_id := v_resource_id;
      end if;
    end loop;
  end if;

  if v_resource_count = 0 then
    delete from public.assignments where id = v_assignment_id;
    return jsonb_build_object(
      'ready', false,
      'reason', 'no_content_mapping',
      'pool_status', case when v_is_cumulative then v_pool_status else null end
    );
  end if;

  update public.assignments
  set estimated_minutes = greatest(1, v_minutes_used)
  where id = v_assignment_id;

  update public.recovery_plan_sessions
  set assignment_id = v_assignment_id,
      assignment_resource_id = v_first_resource_id,
      status = case when status = 'available' then 'in_progress' else status end,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'materializer', case when v_use_v2_fragments then 'curriculum_v2_fragments' else 'legacy_mapping_fallback' end,
        'materialized_minutes', v_minutes_used,
        'selected_axes', case when v_use_v2_fragments then to_jsonb(v_selected_axes) else null end
      )
  where id = p_session_id;

  return jsonb_build_object(
    'ready', true,
    'assignment_id', v_assignment_id,
    'resource_id', v_first_resource_id,
    'resource_count', v_resource_count,
    'estimated_materialized_minutes', v_minutes_used,
    'session_budget_minutes', v_budget_minutes,
    'materializer', case when v_use_v2_fragments then 'curriculum_v2_fragments' else 'legacy_mapping_fallback' end,
    'selected_axes', case when v_use_v2_fragments then to_jsonb(v_selected_axes) else null end,
    'existing', false
  );
end;
$$;

revoke all on function public.materialize_recovery_session(uuid) from public, anon;
grant execute on function public.materialize_recovery_session(uuid) to authenticated;

notify pgrst, 'reload schema';
