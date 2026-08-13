-- Recovery Curriculum v2 cumulative fragment selection/materialization.
-- Rollout-safe behavior:
--   * a partial v2 fragment pool does not take over from the legacy cumulative mapping path;
--   * once the v2 pool is sufficient for the learner/session, selection is outcome/axis-first;
--   * used form families are not recycled as fresh transfer evidence;
--   * learner-facing Readiness v2 remains inactive.

create or replace function public.recovery_v2_assessment_pool_status_internal(
  p_enrollment_id uuid,
  p_session_type text
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
  v_candidate_blocking_axes text[] := '{}'::text[];
  v_active_axis_count integer := 0;
  v_active_blocking_axis_count integer := 0;
  v_candidate_axis_count integer := 0;
  v_min_distinct_axes integer := 0;
  v_final_blocking_coverage boolean := true;
  v_ready boolean := false;
begin
  if p_session_type not in ('checkpoint', 'mock_intermediate', 'mock_final') then
    raise exception 'Unsupported cumulative Recovery session type: %', p_session_type;
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
  v_active_blocking_axis_count := coalesce(cardinality(v_blocking_axes), 0);

  with compatible_fragments as (
    select distinct fragment.primary_axis
    from public.recovery_assessment_fragments fragment
    join public.exercise_builder_exercises exercise
      on exercise.id = fragment.exercise_id
      and exercise.status = 'published'
    join public.exercise_builder_exercise_versions exercise_version
      on exercise_version.id = fragment.exercise_version_id
      and exercise_version.exercise_id = fragment.exercise_id
      and exercise_version.review_status = 'approved'
    where fragment.status = 'approved'
      and fragment.active
      and v_class_year = any(fragment.year_profiles)
      and (
        p_session_type = 'checkpoint'
        or fragment.transfer_level = 'transfer'
      )
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
  )
  select coalesce(array_agg(primary_axis order by primary_axis), '{}'::text[])
    into v_candidate_axes
  from compatible_fragments;

  v_candidate_axis_count := coalesce(cardinality(v_candidate_axes), 0);

  select coalesce(array_agg(axis order by axis), '{}'::text[])
    into v_candidate_blocking_axes
  from unnest(v_blocking_axes) axis
  where axis = any(v_candidate_axes);

  v_min_distinct_axes := case p_session_type
    when 'checkpoint' then least(v_active_axis_count, 2)
    else least(v_active_axis_count, 3)
  end;

  if p_session_type = 'mock_final' and v_active_blocking_axis_count > 0 then
    v_final_blocking_coverage := v_blocking_axes <@ v_candidate_axes;
  end if;

  v_ready := v_active_axis_count > 0
    and v_candidate_axis_count >= v_min_distinct_axes
    and v_final_blocking_coverage;

  return jsonb_build_object(
    'ready', v_ready,
    'session_type', p_session_type,
    'class_year', v_class_year,
    'active_axes', to_jsonb(v_active_axes),
    'active_blocking_axes', to_jsonb(v_blocking_axes),
    'candidate_axes', to_jsonb(v_candidate_axes),
    'candidate_blocking_axes', to_jsonb(v_candidate_blocking_axes),
    'active_axis_count', v_active_axis_count,
    'active_blocking_axis_count', v_active_blocking_axis_count,
    'candidate_axis_count', v_candidate_axis_count,
    'minimum_distinct_axes', v_min_distinct_axes,
    'final_blocking_axis_coverage', v_final_blocking_coverage,
    'readiness_v2_active', false
  );
end;
$$;

revoke all on function public.recovery_v2_assessment_pool_status_internal(uuid, text)
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
  v_selected_minutes integer := 0;
  v_grammar_minutes integer := 0;
  v_order integer := 0;
  v_grammar_ceiling numeric := 1;
  v_axis text;
  v_candidate record;
  v_selected_axis_count integer := 0;
begin
  if p_session_type not in ('checkpoint', 'mock_intermediate', 'mock_final') then
    raise exception 'Unsupported cumulative Recovery session type: %', p_session_type;
  end if;
  if p_budget_minutes is null or p_budget_minutes <= 0 then
    raise exception 'Cumulative Recovery budget must be positive';
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
  truncate table pg_temp.recovery_v2_candidate_fragments;

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
  truncate table pg_temp.recovery_v2_selected_fragments;

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
    array_agg(distinct mapped.outcome_id order by mapped.outcome_id) as outcome_ids,
    (
      select array_agg(mode.assessment_mode order by mode.assessment_mode)
      from public.recovery_assessment_fragment_modes mode
      where mode.fragment_id = fragment.fragment_id
    ) as assessment_modes,
    count(*) filter (where outcome.blocking_candidate)::integer as blocking_count,
    count(*) filter (
      where coalesce(evidence_summary.valid_cumulative_count, 0) = 0
        or coalesce(evidence_summary.mean_score, 0) < 70
    )::integer as under_evidenced_count,
    count(*) filter (
      where outcome.blocking_candidate
        and (
          coalesce(evidence_summary.valid_cumulative_count, 0) = 0
          or coalesce(evidence_summary.mean_score, 0) < 70
        )
    )::integer as blocking_under_evidenced_count,
    count(*) filter (where coalesce(evidence_summary.valid_cumulative_count, 0) = 0)::integer as no_evidence_count,
    avg(evidence_summary.mean_score) as mean_prior_score
  from public.recovery_assessment_fragments fragment
  join public.exercise_builder_exercises exercise
    on exercise.id = fragment.exercise_id
    and exercise.status = 'published'
  join public.exercise_builder_exercise_versions exercise_version
    on exercise_version.id = fragment.exercise_version_id
    and exercise_version.exercise_id = fragment.exercise_id
    and exercise_version.review_status = 'approved'
  join public.recovery_assessment_fragment_outcomes mapped
    on mapped.fragment_id = fragment.fragment_id
    and mapped.evidence_role = 'primary'
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
    and (
      p_session_type = 'checkpoint'
      or fragment.transfer_level = 'transfer'
    )
    and not exists (
      select 1
      from public.recovery_assessment_fragment_outcomes other_primary
      where other_primary.fragment_id = fragment.fragment_id
        and other_primary.evidence_role = 'primary'
        and not exists (
          select 1
          from public.recovery_enrollment_outcomes required_scope
          where required_scope.enrollment_id = p_enrollment_id
            and required_scope.outcome_id = other_primary.outcome_id
            and required_scope.required
        )
    )
    and not exists (
      select 1
      from public.recovery_outcome_evidence used_evidence
      where used_evidence.enrollment_id = p_enrollment_id
        and used_evidence.form_family_key = fragment.form_family_key
        and used_evidence.evidence_source in ('checkpoint', 'mock_intermediate', 'mock_final')
        and used_evidence.evidence_status <> 'void'
    )
    and not exists (
      select 1
      from public.recovery_plan_sessions prior_session
      join public.assignment_resources prior_resource
        on prior_resource.assignment_id = prior_session.assignment_id
      where prior_session.enrollment_id = p_enrollment_id
        and prior_session.assignment_id is not null
        and prior_resource.exercise_config ->> 'recovery_form_family_key' = fragment.form_family_key
    )
  group by
    fragment.fragment_id, fragment.exercise_id, fragment.exercise_version_id,
    fragment.primary_axis, fragment.estimated_minutes, fragment.school_task_family,
    fragment.form_family_key, fragment.transfer_level;

  -- Coverage pass. Non-grammar axes are deliberately preferred before grammar so
  -- required reading/writing/listening/communication time cannot be consumed by short grammar items.
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
      and candidate.estimated_minutes <= greatest(p_budget_minutes - v_selected_minutes, 0)
      and not exists (
        select 1 from pg_temp.recovery_v2_selected_fragments selected
        where selected.fragment_id = candidate.fragment_id
          or selected.form_family_key = candidate.form_family_key
      )
      and (
        candidate.primary_axis <> 'grammar_sentence_control'
        or v_active_axis_count <= 1
        or (
          (v_selected_minutes + candidate.estimated_minutes) > 0
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
    insert into pg_temp.recovery_v2_selected_fragments
    select
      v_order,
      v_candidate.fragment_id,
      v_candidate.exercise_id,
      v_candidate.exercise_version_id,
      v_candidate.primary_axis,
      v_candidate.estimated_minutes,
      v_candidate.school_task_family,
      v_candidate.form_family_key,
      v_candidate.transfer_level,
      v_candidate.outcome_ids,
      v_candidate.assessment_modes,
      'axis_coverage';

    v_selected_minutes := v_selected_minutes + v_candidate.estimated_minutes;
    if v_candidate.primary_axis = 'grammar_sentence_control' then
      v_grammar_minutes := v_grammar_minutes + v_candidate.estimated_minutes;
    end if;
    v_selected_axis_count := v_selected_axis_count + 1;
  end loop;

  -- Fill remaining time by under-evidenced/blocking outcomes, while preserving
  -- the configured grammar time-share ceiling whenever multiple axes are active.
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
    if exists (
      select 1 from pg_temp.recovery_v2_selected_fragments selected
      where selected.form_family_key = v_candidate.form_family_key
    ) then
      continue;
    end if;

    v_order := v_order + 1;
    insert into pg_temp.recovery_v2_selected_fragments
    select
      v_order,
      v_candidate.fragment_id,
      v_candidate.exercise_id,
      v_candidate.exercise_version_id,
      v_candidate.primary_axis,
      v_candidate.estimated_minutes,
      v_candidate.school_task_family,
      v_candidate.form_family_key,
      v_candidate.transfer_level,
      v_candidate.outcome_ids,
      v_candidate.assessment_modes,
      'under_evidenced_fill';

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
  v_title text;
  v_reason text;
  v_note text;
  v_phase text;
  v_mapping record;
  v_fragment record;
  v_sequence integer := 0;
  v_resource_count integer := 0;
  v_estimated_minutes integer := 0;
  v_remaining_minutes integer;
  v_has_phase_mapping boolean := false;
  v_is_cumulative boolean := false;
  v_session_budget_minutes integer := 0;
  v_pool_status jsonb := '{}'::jsonb;
  v_use_v2_fragments boolean := false;
  v_selected_axes text[] := '{}'::text[];
  v_min_distinct_axes integer := 0;
  v_required_final_axes text[] := '{}'::text[];
  v_missing_final_axes text[] := '{}'::text[];
begin
  select * into v_session
  from public.recovery_plan_sessions
  where id = p_session_id;

  if v_session.id is null then
    raise exception 'Recovery session not found';
  end if;

  select * into v_enrollment
  from public.recovery_enrollments
  where id = v_session.enrollment_id;

  if v_enrollment.id is null or (not public.is_admin() and v_enrollment.user_id <> auth.uid()) then
    raise exception 'Recovery session not available for this learner';
  end if;

  if v_session.assignment_id is not null then
    return jsonb_build_object(
      'ready', true,
      'assignment_id', v_session.assignment_id,
      'already_materialized', true
    );
  end if;

  v_phase := case v_session.session_type
    when 'topic' then null
    when 'quick_review' then 'verify'
    when 'error_review' then 'error_review'
    when 'checkpoint' then 'checkpoint'
    when 'mock_intermediate' then 'mock_intermediate'
    when 'mock_final' then 'mock_final'
    else null
  end;

  if v_session.session_type not in ('topic', 'quick_review', 'error_review', 'checkpoint', 'mock_intermediate', 'mock_final') then
    return jsonb_build_object('ready', false, 'reason', 'unsupported_session_type');
  end if;

  v_is_cumulative := coalesce(v_phase in ('checkpoint', 'mock_intermediate', 'mock_final'), false);
  v_session_budget_minutes := greatest(1, coalesce(v_session.estimated_minutes, 1));
  v_remaining_minutes := v_session_budget_minutes;

  if v_is_cumulative then
    v_pool_status := public.recovery_v2_assessment_pool_status_internal(
      v_session.enrollment_id,
      v_session.session_type
    );
    v_use_v2_fragments := coalesce((v_pool_status ->> 'ready')::boolean, false);
    v_min_distinct_axes := coalesce((v_pool_status ->> 'minimum_distinct_axes')::integer, 0);
    if v_session.session_type = 'mock_final' then
      select coalesce(array_agg(value order by value), '{}'::text[])
        into v_required_final_axes
      from jsonb_array_elements_text(coalesce(v_pool_status -> 'active_blocking_axes', '[]'::jsonb));
    end if;
  end if;

  if v_session.session_type = 'topic' then
    v_title := 'Recupero Debito · ' || coalesce(v_session.topic_label, initcap(replace(v_session.topic_key, '-', ' ')));
    v_reason := 'Recupero Debito · argomento prioritario';
    v_note := 'Percorso guidato: Recupera → Allenati → Modalità scuola → Verifica argomento.';
  elsif v_session.session_type = 'quick_review' then
    v_title := 'Ripasso rapido · ' || coalesce(v_session.topic_label, initcap(replace(v_session.topic_key, '-', ' ')));
    v_reason := 'Recupero Debito · verifica argomento';
    v_note := 'Argomento già solido: verifica breve senza lezione completa.';
  elsif v_session.session_type = 'error_review' then
    v_title := 'Ripasso errori · ' || coalesce(v_session.topic_label, 'Errori ricorrenti');
    v_reason := 'Recupero Debito · errori ricorrenti';
    v_note := 'Ripasso mirato sugli errori che stanno tornando.';
  elsif v_session.session_type = 'checkpoint' then
    v_title := 'Verifica di percorso';
    v_reason := 'Recupero Debito · controllo intermedio';
    v_note := 'Verifica cumulativa sugli argomenti e le competenze richieste dal tuo programma.';
  elsif v_session.session_type = 'mock_intermediate' then
    v_title := 'Simulazione prova di recupero #1';
    v_reason := 'Recupero Debito · prima simulazione';
    v_note := 'Prova cumulativa senza correzioni durante lo svolgimento.';
  else
    v_title := 'Simulazione finale';
    v_reason := 'Recupero Debito · prova finale';
    v_note := 'Ultima simulazione cumulativa prima del recupero.';
  end if;

  insert into public.assignments (
    teacher_id,
    learner_id,
    title,
    reason,
    note,
    due_at,
    estimated_duration,
    status,
    published_at,
    allow_retry,
    show_score,
    show_correct_answers,
    show_explanations,
    show_diagnostic_summary,
    required
  ) values (
    coalesce(v_enrollment.created_by, v_enrollment.user_id),
    v_enrollment.user_id,
    v_title,
    v_reason,
    v_note,
    case when v_session.scheduled_date is null then null else (v_session.scheduled_date::timestamp + interval '21 hours') end,
    0,
    'published',
    now(),
    true,
    true,
    true,
    true,
    true,
    true
  )
  returning id into v_assignment_id;

  if v_session.session_type = 'topic' then
    for v_mapping in
      select *
      from public.recovery_exercise_map
      where topic_key = v_session.topic_key
        and phase in ('recover', 'practice', 'school', 'verify')
        and active
      order by case phase
        when 'recover' then 10
        when 'practice' then 20
        when 'school' then 30
        when 'verify' then 40
        else sort_order
      end
    loop
      v_sequence := v_sequence + 1;
      v_resource_count := v_resource_count + 1;
      v_estimated_minutes := v_estimated_minutes + v_mapping.estimated_minutes;

      insert into public.assignment_resources (
        assignment_id,
        resource_type,
        resource_key,
        display_label,
        description,
        sequence_index,
        exercise_id,
        exercise_version_id,
        exercise_config,
        show_score,
        show_correct_answers,
        show_explanations,
        show_diagnostic_summary
      ) values (
        v_assignment_id,
        'custom_exercise',
        'recovery-' || v_mapping.phase || '-' || coalesce(v_mapping.exercise_client_key, v_mapping.id::text) || '-' || v_session.id::text,
        case v_mapping.phase
          when 'recover' then 'Recupera'
          when 'practice' then 'Allenati'
          when 'school' then 'Modalità scuola'
          when 'verify' then 'Verifica argomento'
          else v_mapping.display_label
        end,
        case v_mapping.phase
          when 'recover' then 'Spiegazione essenziale + primo check guidato.'
          when 'practice' then 'Esercizi progressivi per fissare il meccanismo.'
          when 'school' then 'Formato verifica, senza aiuti durante lo svolgimento.'
          when 'verify' then 'Verifica finale dell’argomento, senza feedback durante lo svolgimento.'
          else 'Attività del percorso Recupero Debito.'
        end,
        v_sequence,
        v_mapping.exercise_id,
        v_mapping.exercise_version_id,
        jsonb_build_object(
          'exercise_id', v_mapping.exercise_id,
          'exercise_version_id', v_mapping.exercise_version_id,
          'recovery_phase', v_mapping.phase,
          'recovery_mapping_id', v_mapping.id,
          'recovery_session_id', v_session.id,
          'completion_rule', 'submit_exercise_attempt',
          'required', true
        ),
        true,
        true,
        true,
        true
      );
    end loop;
  elsif v_use_v2_fragments then
    for v_fragment in
      select *
      from public.select_recovery_assessment_fragments_internal(
        v_session.enrollment_id,
        v_session.session_type,
        v_session_budget_minutes
      )
      order by selection_order
    loop
      v_sequence := v_sequence + 1;
      v_resource_count := v_resource_count + 1;
      v_estimated_minutes := v_estimated_minutes + v_fragment.estimated_minutes;
      v_remaining_minutes := greatest(v_session_budget_minutes - v_estimated_minutes, 0);
      if not v_fragment.primary_axis = any(v_selected_axes) then
        v_selected_axes := array_append(v_selected_axes, v_fragment.primary_axis);
      end if;

      insert into public.assignment_resources (
        assignment_id,
        resource_type,
        resource_key,
        display_label,
        description,
        sequence_index,
        exercise_id,
        exercise_version_id,
        exercise_config,
        show_score,
        show_correct_answers,
        show_explanations,
        show_diagnostic_summary
      ) values (
        v_assignment_id,
        'custom_exercise',
        'recovery-' || v_session.session_type || '-fragment-' || v_fragment.fragment_id || '-' || v_session.id::text,
        case v_session.session_type
          when 'checkpoint' then 'Verifica di percorso · Parte ' || v_sequence
          when 'mock_intermediate' then 'Simulazione · Parte ' || v_sequence
          else 'Simulazione finale · Parte ' || v_sequence
        end,
        'Attività cumulativa in formato scolastico. La regola o competenza valutata non viene anticipata.',
        v_sequence,
        v_fragment.exercise_id,
        v_fragment.exercise_version_id,
        jsonb_build_object(
          'exercise_id', v_fragment.exercise_id,
          'exercise_version_id', v_fragment.exercise_version_id,
          'recovery_phase', v_session.session_type,
          'recovery_session_id', v_session.id,
          'recovery_fragment_id', v_fragment.fragment_id,
          'recovery_form_family_key', v_fragment.form_family_key,
          'recovery_primary_axis', v_fragment.primary_axis,
          'recovery_outcome_ids', to_jsonb(v_fragment.outcome_ids),
          'recovery_assessment_modes', to_jsonb(v_fragment.assessment_modes),
          'recovery_selection_reason', v_fragment.selection_reason,
          'recovery_materializer', 'curriculum_v2_fragments',
          'completion_rule', 'submit_exercise_attempt',
          'required', true
        ),
        case when v_session.session_type in ('mock_intermediate', 'mock_final') then false else true end,
        case when v_session.session_type in ('mock_intermediate', 'mock_final') then false else true end,
        case when v_session.session_type in ('mock_intermediate', 'mock_final') then false else true end,
        case when v_session.session_type in ('mock_intermediate', 'mock_final') then false else true end
      );
    end loop;

    if v_resource_count = 0
       or coalesce(cardinality(v_selected_axes), 0) < v_min_distinct_axes then
      delete from public.assignments where id = v_assignment_id;
      update public.recovery_plan_sessions
      set status = 'blocked',
          materialization_state = jsonb_build_object(
            'reason', 'insufficient_fresh_v2_fragment_coverage',
            'pool_status', v_pool_status,
            'selected_axes', to_jsonb(v_selected_axes),
            'selected_resources', v_resource_count,
            'selected_minutes', v_estimated_minutes
          )
      where id = p_session_id;
      return jsonb_build_object(
        'ready', false,
        'reason', 'insufficient_fresh_v2_fragment_coverage',
        'pool_status', v_pool_status,
        'selected_axes', to_jsonb(v_selected_axes),
        'resource_count', v_resource_count
      );
    end if;

    if v_session.session_type = 'mock_final' and coalesce(cardinality(v_required_final_axes), 0) > 0 then
      select coalesce(array_agg(axis order by axis), '{}'::text[])
        into v_missing_final_axes
      from unnest(v_required_final_axes) axis
      where not axis = any(v_selected_axes);

      if coalesce(cardinality(v_missing_final_axes), 0) > 0 then
        delete from public.assignments where id = v_assignment_id;
        update public.recovery_plan_sessions
        set status = 'blocked',
            materialization_state = jsonb_build_object(
              'reason', 'final_mock_missing_blocking_axis_coverage',
              'pool_status', v_pool_status,
              'selected_axes', to_jsonb(v_selected_axes),
              'missing_blocking_axes', to_jsonb(v_missing_final_axes)
            )
        where id = p_session_id;
        return jsonb_build_object(
          'ready', false,
          'reason', 'final_mock_missing_blocking_axis_coverage',
          'missing_blocking_axes', to_jsonb(v_missing_final_axes)
        );
      end if;
    end if;
  else
    -- Legacy cumulative/error/quick-review path remains intact until the v2
    -- fragment pool is sufficiently complete for this learner/session.
    for v_mapping in
      select
        mapping.*,
        required_topic.priority as required_topic_priority
      from public.recovery_exercise_map mapping
      left join public.recovery_student_topics required_topic
        on required_topic.enrollment_id = v_session.enrollment_id
        and required_topic.topic_key = mapping.topic_key
        and required_topic.required
      where mapping.phase = coalesce(v_phase, mapping.phase)
        and mapping.active
        and (
          not v_is_cumulative
          or mapping.topic_key is null
          or required_topic.topic_key is not null
        )
        and (
          v_is_cumulative
          or mapping.topic_key is null
          or mapping.topic_key = v_session.topic_key
        )
      order by
        case when v_is_cumulative and required_topic.topic_key is not null then 0 else 1 end,
        required_topic.priority asc nulls last,
        mapping.estimated_minutes asc,
        mapping.sort_order,
        mapping.created_at
    loop
      v_has_phase_mapping := true;
      if v_is_cumulative then
        if v_resource_count > 0 and v_mapping.estimated_minutes > v_remaining_minutes then
          continue;
        end if;
      end if;

      v_sequence := v_sequence + 1;
      v_resource_count := v_resource_count + 1;
      v_estimated_minutes := v_estimated_minutes + v_mapping.estimated_minutes;
      if v_is_cumulative then
        v_remaining_minutes := greatest(v_session_budget_minutes - v_estimated_minutes, 0);
      end if;

      insert into public.assignment_resources (
        assignment_id,
        resource_type,
        resource_key,
        display_label,
        description,
        sequence_index,
        exercise_id,
        exercise_version_id,
        exercise_config,
        show_score,
        show_correct_answers,
        show_explanations,
        show_diagnostic_summary
      ) values (
        v_assignment_id,
        'custom_exercise',
        'recovery-' || coalesce(v_phase, v_mapping.phase) || '-' || coalesce(v_mapping.exercise_client_key, v_mapping.id::text) || '-' || v_session.id::text,
        coalesce(v_mapping.display_label, initcap(replace(coalesce(v_phase, v_mapping.phase), '_', ' '))),
        case
          when v_session.session_type in ('mock_intermediate', 'mock_final') then 'Completa la prova: correzione e risultati si vedono dopo l’invio.'
          else 'Completa l’attività e controlla il risultato alla fine.'
        end,
        v_sequence,
        v_mapping.exercise_id,
        v_mapping.exercise_version_id,
        jsonb_build_object(
          'exercise_id', v_mapping.exercise_id,
          'exercise_version_id', v_mapping.exercise_version_id,
          'recovery_phase', coalesce(v_phase, v_mapping.phase),
          'recovery_mapping_id', v_mapping.id,
          'recovery_session_id', v_session.id,
          'recovery_materializer', 'legacy_mapping_fallback',
          'completion_rule', 'submit_exercise_attempt',
          'required', true
        ),
        case when v_session.session_type in ('mock_intermediate', 'mock_final') then false else true end,
        case when v_session.session_type in ('mock_intermediate', 'mock_final') then false else true end,
        case when v_session.session_type in ('mock_intermediate', 'mock_final') then false else true end,
        case when v_session.session_type in ('mock_intermediate', 'mock_final') then false else true end
      );
    end loop;
  end if;

  if v_resource_count = 0 then
    delete from public.assignments where id = v_assignment_id;

    update public.recovery_plan_sessions
    set status = case
          when status in ('completed', 'skipped') then status
          else 'blocked'
        end,
        materialization_state = jsonb_build_object(
          'reason', 'content_gap',
          'phase', coalesce(v_phase, 'topic'),
          'v2_pool_status', case when v_is_cumulative then v_pool_status else null end
        )
    where id = p_session_id;

    if not v_has_phase_mapping and not v_use_v2_fragments then
      raise exception 'Recovery content not mapped for session % (% / %)', p_session_id, coalesce(v_session.topic_key, 'general'), coalesce(v_phase, 'topic');
    end if;

    return jsonb_build_object('ready', false, 'reason', 'content_gap');
  end if;

  update public.assignments
  set estimated_duration = greatest(1, v_estimated_minutes)
  where id = v_assignment_id;

  update public.recovery_plan_sessions
  set assignment_id = v_assignment_id,
      estimated_minutes = greatest(1, v_estimated_minutes),
      status = case when status = 'planned' then 'available' else status end,
      materialization_state = jsonb_build_object(
        'materialized', true,
        'assignment_id', v_assignment_id,
        'resource_count', v_resource_count,
        'estimated_minutes', v_estimated_minutes,
        'materializer', case when v_use_v2_fragments then 'curriculum_v2_fragments' else 'legacy_mapping_fallback' end,
        'v2_pool_status', case when v_is_cumulative then v_pool_status else null end,
        'selected_axes', case when v_use_v2_fragments then to_jsonb(v_selected_axes) else null end
      )
  where id = p_session_id;

  return jsonb_build_object(
    'ready', true,
    'assignment_id', v_assignment_id,
    'resource_count', v_resource_count,
    'estimated_minutes', v_estimated_minutes,
    'materializer', case when v_use_v2_fragments then 'curriculum_v2_fragments' else 'legacy_mapping_fallback' end,
    'selected_axes', case when v_use_v2_fragments then to_jsonb(v_selected_axes) else null end
  );
end;
$$;

revoke all on function public.materialize_recovery_session(uuid) from public, anon;
grant execute on function public.materialize_recovery_session(uuid) to authenticated;

notify pgrst, 'reload schema';
