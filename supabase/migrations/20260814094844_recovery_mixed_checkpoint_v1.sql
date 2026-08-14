-- Recovery H30 mixed checkpoint v1.
-- Adds a checkpoint-only capability gate and materializer without enabling
-- standalone error review, mocks, or learner-facing Readiness v2.

create or replace function public.recovery_checkpoint_v1_pool_status_internal(
  p_enrollment_id uuid,
  p_budget_minutes integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class_year smallint;
  v_required_topic_count integer := 0;
  v_eligible_topic_count integer := 0;
  v_selected_fragment_count integer := 0;
  v_selected_topic_count integer := 0;
  v_selected_task_family_count integer := 0;
  v_selected_minutes integer := 0;
  v_selected_topics text[] := '{}'::text[];
  v_selected_fragments text[] := '{}'::text[];
  v_ready boolean := false;
  v_reason text := 'pool_not_ready';
begin
  if p_budget_minutes < 24 then
    return jsonb_build_object(
      'ready', false,
      'status', 'INSUFFICIENT',
      'reason', 'checkpoint_budget_below_24_minutes',
      'readiness_v2_active', false
    );
  end if;

  select enrollment.class_year into v_class_year
  from public.recovery_enrollments enrollment
  where enrollment.id = p_enrollment_id;

  if v_class_year is null then
    raise exception 'Recovery enrollment not found or class year unavailable.';
  end if;

  select count(*)::integer into v_required_topic_count
  from public.recovery_student_topics topic
  where topic.enrollment_id = p_enrollment_id
    and topic.required;

  create temporary table if not exists recovery_checkpoint_v1_candidates (
    fragment_id text primary key,
    exercise_id uuid not null,
    exercise_version_id uuid not null,
    topic_key text not null,
    primary_axis text not null,
    estimated_minutes integer not null,
    school_task_family text not null,
    form_family_key text not null,
    outcome_ids text[] not null,
    assessment_modes text[] not null,
    topic_priority numeric not null,
    form_rank integer not null
  ) on commit drop;
  truncate pg_temp.recovery_checkpoint_v1_candidates;

  insert into pg_temp.recovery_checkpoint_v1_candidates (
    fragment_id, exercise_id, exercise_version_id, topic_key, primary_axis,
    estimated_minutes, school_task_family, form_family_key, outcome_ids,
    assessment_modes, topic_priority, form_rank
  )
  with eligible as (
    select
      fragment.fragment_id,
      fragment.exercise_id,
      fragment.exercise_version_id,
      fragment.metadata -> 'topic_keys' ->> 0 as topic_key,
      fragment.primary_axis,
      fragment.estimated_minutes,
      fragment.school_task_family,
      fragment.form_family_key,
      coalesce((
        select array_agg(mapped.outcome_id order by mapped.outcome_id)
        from public.recovery_assessment_fragment_outcomes mapped
        where mapped.fragment_id = fragment.fragment_id
      ), '{}'::text[]) as outcome_ids,
      coalesce((
        select array_agg(mode.assessment_mode order by mode.assessment_mode)
        from public.recovery_assessment_fragment_modes mode
        where mode.fragment_id = fragment.fragment_id
      ), '{}'::text[]) as assessment_modes,
      coalesce(topic.priority_score, 0) as topic_priority
    from public.recovery_assessment_fragments fragment
    join public.exercise_builder_exercises exercise
      on exercise.id = fragment.exercise_id
     and exercise.status = 'published'
    join public.exercise_builder_exercise_versions version
      on version.id = fragment.exercise_version_id
     and version.exercise_id = fragment.exercise_id
     and version.review_status = 'approved'
    join public.recovery_student_topics topic
      on topic.enrollment_id = p_enrollment_id
     and topic.required
     and topic.topic_key = fragment.metadata -> 'topic_keys' ->> 0
    where fragment.status = 'approved'
      and fragment.active
      and v_class_year = any(fragment.year_profiles)
      and fragment.metadata ->> 'launch_profile' = 'h30_checkpoint_v1'
      and jsonb_typeof(fragment.metadata -> 'topic_keys') = 'array'
      and jsonb_array_length(fragment.metadata -> 'topic_keys') = 1
      and fragment.estimated_minutes = 3
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
        from public.recovery_outcome_evidence evidence
        where evidence.enrollment_id = p_enrollment_id
          and evidence.form_family_key = fragment.form_family_key
          and evidence.evidence_source = 'checkpoint'
          and evidence.evidence_status <> 'void'
      )
      and not exists (
        select 1
        from public.recovery_plan_sessions prior_session
        join public.assignment_resources resource
          on resource.assignment_id = prior_session.assignment_id
        where prior_session.enrollment_id = p_enrollment_id
          and resource.exercise_config ->> 'recovery_form_family_key' = fragment.form_family_key
      )
  )
  select
    eligible.*,
    row_number() over (
      partition by eligible.topic_key
      order by eligible.fragment_id
    )::integer as form_rank
  from eligible;

  select count(*)::integer into v_eligible_topic_count
  from (
    select candidate.topic_key
    from pg_temp.recovery_checkpoint_v1_candidates candidate
    group by candidate.topic_key
    having count(*) >= 2
  ) eligible_topics;

  with topic_pool as (
    select candidate.topic_key, max(candidate.topic_priority) as topic_priority
    from pg_temp.recovery_checkpoint_v1_candidates candidate
    group by candidate.topic_key
    having count(*) >= 2
  ), chosen_topics as (
    select
      topic_pool.topic_key,
      row_number() over (
        order by topic_pool.topic_priority desc, topic_pool.topic_key
      )::integer as topic_rank
    from topic_pool
    order by topic_pool.topic_priority desc, topic_pool.topic_key
    limit 4
  ), selected as (
    select
      candidate.*,
      chosen_topics.topic_rank,
      ((candidate.form_rank - 1) * 4 + chosen_topics.topic_rank)::integer as selection_order
    from chosen_topics
    join pg_temp.recovery_checkpoint_v1_candidates candidate
      on candidate.topic_key = chosen_topics.topic_key
     and candidate.form_rank <= 2
  )
  select
    count(*)::integer,
    count(distinct selected.topic_key)::integer,
    count(distinct selected.school_task_family)::integer,
    coalesce(sum(selected.estimated_minutes), 0)::integer,
    coalesce(array_agg(distinct selected.topic_key order by selected.topic_key), '{}'::text[]),
    coalesce(array_agg(selected.fragment_id order by selected.selection_order), '{}'::text[])
  into
    v_selected_fragment_count,
    v_selected_topic_count,
    v_selected_task_family_count,
    v_selected_minutes,
    v_selected_topics,
    v_selected_fragments
  from selected;

  v_ready := v_selected_topic_count = 4
    and v_selected_fragment_count = 8
    and v_selected_task_family_count >= 2
    and v_selected_minutes = 24;

  v_reason := case
    when v_ready then 'mixed_checkpoint_pool_ready'
    when v_class_year <> 2 then 'checkpoint_v1_not_available_for_class_year'
    when v_required_topic_count < 4 then 'fewer_than_four_required_school_topics'
    when v_eligible_topic_count < 4 then 'fewer_than_four_required_topics_with_two_fresh_forms'
    when v_selected_task_family_count < 2 then 'insufficient_task_family_breadth'
    else 'insufficient_fresh_checkpoint_fragments'
  end;

  return jsonb_build_object(
    'ready', v_ready,
    'status', case when v_ready then 'READY' else 'INSUFFICIENT' end,
    'reason', v_reason,
    'runtime_profile', 'h30_checkpoint_v1',
    'class_year', v_class_year,
    'required_topic_count', v_required_topic_count,
    'eligible_topic_count', v_eligible_topic_count,
    'selected_topic_count', v_selected_topic_count,
    'selected_topics', to_jsonb(v_selected_topics),
    'selected_fragment_count', v_selected_fragment_count,
    'selected_fragments', to_jsonb(v_selected_fragments),
    'selected_task_family_count', v_selected_task_family_count,
    'estimated_minutes', v_selected_minutes,
    'freshness_policy', 'unused_form_families_only',
    'readiness_v2_active', false
  );
end;
$$;

revoke all on function public.recovery_checkpoint_v1_pool_status_internal(uuid, integer)
  from public, anon, authenticated;

create or replace function public.get_recovery_checkpoint_capability(
  p_enrollment_id uuid,
  p_budget_minutes integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not exists (
    select 1 from public.recovery_enrollments enrollment
    where enrollment.id = p_enrollment_id
      and enrollment.user_id = auth.uid()
      and enrollment.status = 'active'
  ) then
    raise exception 'Recovery enrollment not found.';
  end if;
  return public.recovery_checkpoint_v1_pool_status_internal(p_enrollment_id, p_budget_minutes);
end;
$$;

revoke all on function public.get_recovery_checkpoint_capability(uuid, integer) from public, anon;
grant execute on function public.get_recovery_checkpoint_capability(uuid, integer) to authenticated;

create or replace function public.select_recovery_checkpoint_v1_fragments_internal(
  p_enrollment_id uuid,
  p_budget_minutes integer default 24
)
returns table (
  selection_order integer,
  fragment_id text,
  exercise_id uuid,
  exercise_version_id uuid,
  topic_key text,
  primary_axis text,
  estimated_minutes integer,
  school_task_family text,
  form_family_key text,
  outcome_ids text[],
  assessment_modes text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status jsonb;
begin
  v_status := public.recovery_checkpoint_v1_pool_status_internal(p_enrollment_id, p_budget_minutes);
  if not coalesce((v_status ->> 'ready')::boolean, false) then return; end if;

  return query
  with topic_pool as (
    select candidate.topic_key, max(candidate.topic_priority) as topic_priority
    from pg_temp.recovery_checkpoint_v1_candidates candidate
    group by candidate.topic_key
    having count(*) >= 2
  ), chosen_topics as (
    select
      topic_pool.topic_key,
      row_number() over (
        order by topic_pool.topic_priority desc, topic_pool.topic_key
      )::integer as topic_rank
    from topic_pool
    order by topic_pool.topic_priority desc, topic_pool.topic_key
    limit 4
  )
  select
    ((candidate.form_rank - 1) * 4 + chosen_topics.topic_rank)::integer,
    candidate.fragment_id,
    candidate.exercise_id,
    candidate.exercise_version_id,
    candidate.topic_key,
    candidate.primary_axis,
    candidate.estimated_minutes,
    candidate.school_task_family,
    candidate.form_family_key,
    candidate.outcome_ids,
    candidate.assessment_modes
  from chosen_topics
  join pg_temp.recovery_checkpoint_v1_candidates candidate
    on candidate.topic_key = chosen_topics.topic_key
   and candidate.form_rank <= 2
  order by 1;
end;
$$;

revoke all on function public.select_recovery_checkpoint_v1_fragments_internal(uuid, integer)
  from public, anon, authenticated;

create or replace function public.materialize_recovery_checkpoint_v1(p_session_id uuid)
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
  v_fragment record;
  v_resource_count integer := 0;
  v_minutes_used integer := 0;
  v_pool_status jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select session.* into v_session
  from public.recovery_plan_sessions session
  where session.id = p_session_id
  for update;
  if v_session.id is null or v_session.session_type <> 'checkpoint' then
    raise exception 'Recovery checkpoint not found.';
  end if;

  select enrollment.* into v_enrollment
  from public.recovery_enrollments enrollment
  where enrollment.id = v_session.enrollment_id
    and enrollment.user_id = auth.uid()
    and enrollment.status = 'active';
  if v_enrollment.id is null then raise exception 'Recovery enrollment not found.'; end if;

  if v_session.assignment_id is not null then
    return jsonb_build_object(
      'ready', true,
      'assignment_id', v_session.assignment_id,
      'resource_id', v_session.assignment_resource_id,
      'existing', true
    );
  end if;

  v_pool_status := public.recovery_checkpoint_v1_pool_status_internal(v_session.enrollment_id, 24);
  if not coalesce((v_pool_status ->> 'ready')::boolean, false) then
    return jsonb_build_object(
      'ready', false,
      'reason', v_pool_status ->> 'reason',
      'pool_status', v_pool_status
    );
  end if;

  insert into public.assignments (
    learner_id, title, reason, learner_note, status, required,
    deadline_at, estimated_minutes, published_at, created_by
  ) values (
    auth.uid(),
    'Verifica mista',
    'Recupero Debito Inglese',
    'Le strutture sono mescolate intenzionalmente. Le correzioni compaiono soltanto dopo la consegna finale.',
    'published',
    true,
    v_enrollment.exam_date::timestamptz,
    24,
    now(),
    auth.uid()
  ) returning id into v_assignment_id;

  for v_fragment in
    select *
    from public.select_recovery_checkpoint_v1_fragments_internal(v_session.enrollment_id, 24)
    order by selection_order
  loop
    v_resource_count := v_resource_count + 1;
    v_minutes_used := v_minutes_used + v_fragment.estimated_minutes;

    insert into public.assignment_resources (
      assignment_id, resource_key, resource_type, title, description,
      route, sequence_index, exercise_config
    ) values (
      v_assignment_id,
      'recovery-checkpoint-v1-' || v_fragment.fragment_id || '-' || v_session.id::text,
      'custom_exercise',
      'Verifica mista · Parte ' || v_resource_count,
      'Decidi quale struttura è adatta al contesto. Il nome dell’argomento non viene mostrato.',
      '/exercises',
      v_resource_count,
      jsonb_build_object(
        'exercise_id', v_fragment.exercise_id,
        'exercise_version_id', v_fragment.exercise_version_id,
        'recovery_phase', 'checkpoint',
        'recovery_topic_key', v_fragment.topic_key,
        'recovery_fragment_id', v_fragment.fragment_id,
        'recovery_form_family_key', v_fragment.form_family_key,
        'recovery_primary_axis', v_fragment.primary_axis,
        'recovery_outcome_ids', to_jsonb(v_fragment.outcome_ids),
        'recovery_assessment_modes', to_jsonb(v_fragment.assessment_modes),
        'recovery_materializer', 'mixed_checkpoint_v1',
        'completion_rule', 'submitted',
        'required_score', 0,
        'required_attempts', 1,
        'allow_retry', false,
        'feedback_timing', 'hidden',
        'show_score', false,
        'show_correct_answers', false,
        'show_explanations', false,
        'show_diagnostic_summary', false
      )
    ) returning id into v_resource_id;

    if v_first_resource_id is null then v_first_resource_id := v_resource_id; end if;
  end loop;

  if v_resource_count <> 8 or v_minutes_used <> 24 then
    delete from public.assignments assignment where assignment.id = v_assignment_id;
    return jsonb_build_object(
      'ready', false,
      'reason', 'checkpoint_composition_changed_during_materialization',
      'resource_count', v_resource_count,
      'estimated_minutes', v_minutes_used
    );
  end if;

  update public.recovery_plan_sessions session
  set assignment_id = v_assignment_id,
      assignment_resource_id = v_first_resource_id,
      status = case when session.status = 'available' then 'in_progress' else session.status end,
      metadata = coalesce(session.metadata, '{}'::jsonb) || jsonb_build_object(
        'materializer', 'mixed_checkpoint_v1',
        'materialized_minutes', v_minutes_used,
        'checkpoint_topics', v_pool_status -> 'selected_topics',
        'checkpoint_guidance_version', 1
      )
  where session.id = p_session_id;

  return jsonb_build_object(
    'ready', true,
    'assignment_id', v_assignment_id,
    'resource_id', v_first_resource_id,
    'resource_count', v_resource_count,
    'estimated_materialized_minutes', v_minutes_used,
    'materializer', 'mixed_checkpoint_v1',
    'pool_status', v_pool_status,
    'existing', false
  );
end;
$$;

revoke all on function public.materialize_recovery_checkpoint_v1(uuid)
  from public, anon, authenticated;

-- Preserve the battle-tested topic/quick-review implementation and wrap it so
-- checkpoint sessions can never reach the old cumulative legacy fallback.
do $$
begin
  if to_regprocedure('public.materialize_recovery_session_without_checkpoint_v1(uuid)') is null then
    alter function public.materialize_recovery_session(uuid)
      rename to materialize_recovery_session_without_checkpoint_v1;
  end if;
end;
$$;

revoke all on function public.materialize_recovery_session_without_checkpoint_v1(uuid)
  from public, anon, authenticated;

create or replace function public.materialize_recovery_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session_type text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select session.session_type into v_session_type
  from public.recovery_plan_sessions session
  where session.id = p_session_id;
  if v_session_type = 'checkpoint' then
    return public.materialize_recovery_checkpoint_v1(p_session_id);
  end if;
  return public.materialize_recovery_session_without_checkpoint_v1(p_session_id);
end;
$$;

revoke all on function public.materialize_recovery_session(uuid) from public, anon;
grant execute on function public.materialize_recovery_session(uuid) to authenticated;

create or replace function public.mark_recovery_checkpoint_plan_update(
  p_session_id uuid,
  p_summary jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.recovery_plan_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if jsonb_typeof(coalesce(p_summary, 'null'::jsonb)) <> 'object' then
    raise exception 'Checkpoint plan update summary must be an object.';
  end if;

  select session.* into v_session
  from public.recovery_plan_sessions session
  join public.recovery_enrollments enrollment on enrollment.id = session.enrollment_id
  where session.id = p_session_id
    and session.session_type = 'checkpoint'
    and session.status = 'completed'
    and enrollment.user_id = auth.uid()
  for update of session;

  if v_session.id is null then raise exception 'Completed Recovery checkpoint not found.'; end if;

  if v_session.metadata ? 'checkpoint_plan_recalculated_at' then
    return jsonb_build_object(
      'recorded', true,
      'existing', true,
      'summary', v_session.metadata -> 'checkpoint_plan_update_summary'
    );
  end if;

  update public.recovery_plan_sessions session
  set metadata = coalesce(session.metadata, '{}'::jsonb) || jsonb_build_object(
    'checkpoint_plan_recalculated_at', now(),
    'checkpoint_plan_update_summary', p_summary
  )
  where session.id = p_session_id;

  return jsonb_build_object('recorded', true, 'existing', false, 'summary', p_summary);
end;
$$;

revoke all on function public.mark_recovery_checkpoint_plan_update(uuid, jsonb) from public, anon;
grant execute on function public.mark_recovery_checkpoint_plan_update(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
