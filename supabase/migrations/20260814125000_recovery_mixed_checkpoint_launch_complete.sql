-- Recovery mixed checkpoint v1 launch-completion tightening.
-- This forward migration deliberately follows 20260814094844. It expands the
-- checkpoint capability to the current live Year 1-3 Recovery catalogue,
-- enforces evidence density, and makes checkpoint -> mastery -> future-plan
-- reprioritisation authoritative inside Postgres.

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
  v_selected_scored_decisions integer := 0;
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
    scored_decisions integer not null,
    topic_priority numeric not null,
    form_rank integer not null
  ) on commit drop;
  truncate pg_temp.recovery_checkpoint_v1_candidates;

  insert into pg_temp.recovery_checkpoint_v1_candidates (
    fragment_id, exercise_id, exercise_version_id, topic_key, primary_axis,
    estimated_minutes, school_task_family, form_family_key, outcome_ids,
    assessment_modes, scored_decisions, topic_priority, form_rank
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
      greatest(1, coalesce((fragment.metadata ->> 'scored_decisions')::integer, 1)) as scored_decisions,
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
       and sum(candidate.scored_decisions) >= 3
  ) eligible_topics;

  with topic_pool as (
    select candidate.topic_key, max(candidate.topic_priority) as topic_priority
    from pg_temp.recovery_checkpoint_v1_candidates candidate
    group by candidate.topic_key
    having count(*) >= 2
       and sum(candidate.scored_decisions) >= 3
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
    coalesce(sum(selected.scored_decisions), 0)::integer,
    coalesce(array_agg(distinct selected.topic_key order by selected.topic_key), '{}'::text[]),
    coalesce(array_agg(selected.fragment_id order by selected.selection_order), '{}'::text[])
  into
    v_selected_fragment_count,
    v_selected_topic_count,
    v_selected_task_family_count,
    v_selected_minutes,
    v_selected_scored_decisions,
    v_selected_topics,
    v_selected_fragments
  from selected;

  v_ready := v_selected_topic_count = 4
    and v_selected_fragment_count = 8
    and v_selected_task_family_count >= 2
    and v_selected_minutes = 24
    and v_selected_scored_decisions between 12 and 16;

  v_reason := case
    when v_ready then 'mixed_checkpoint_pool_ready'
    when v_required_topic_count < 4 then 'fewer_than_four_required_school_topics'
    when v_eligible_topic_count < 4 then 'fewer_than_four_required_topics_with_sufficient_fresh_evidence'
    when v_selected_scored_decisions < 12 then 'insufficient_scored_decisions'
    when v_selected_scored_decisions > 16 then 'checkpoint_evidence_budget_exceeded'
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
    'selected_scored_decisions', v_selected_scored_decisions,
    'estimated_minutes', v_selected_minutes,
    'freshness_policy', 'unused_form_families_only',
    'readiness_v2_active', false
  );
end;
$$;

revoke all on function public.recovery_checkpoint_v1_pool_status_internal(uuid, integer)
  from public, anon, authenticated;

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
       and sum(candidate.scored_decisions) >= 3
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

create or replace function public.recovery_checkpoint_v1_reprioritize_future_internal(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.recovery_plan_sessions%rowtype;
  v_enrollment public.recovery_enrollments%rowtype;
  v_attempt public.recovery_assessment_attempts%rowtype;
  v_topic record;
  v_score numeric;
  v_sequence integer;
  v_new_plan_version integer;
  v_day_index integer := 0;
  v_day record;
  v_day_id uuid;
  v_daily_order integer;
  v_inserted integer := 0;
  v_stable jsonb := '[]'::jsonb;
  v_consolidate jsonb := '[]'::jsonb;
  v_priority jsonb := '[]'::jsonb;
  v_summary jsonb;
  v_changed_message text;
begin
  select session.* into v_session
  from public.recovery_plan_sessions session
  where session.id = p_session_id
  for update;

  if v_session.id is null or v_session.session_type <> 'checkpoint' or v_session.status <> 'completed' then
    raise exception 'Completed Recovery checkpoint not found.';
  end if;

  if v_session.metadata ? 'checkpoint_server_reprioritized_at' then
    return jsonb_build_object(
      'recalculated', true,
      'existing', true,
      'summary', v_session.metadata -> 'checkpoint_plan_update_summary'
    );
  end if;

  select enrollment.* into v_enrollment
  from public.recovery_enrollments enrollment
  where enrollment.id = v_session.enrollment_id
  for update;
  if v_enrollment.id is null then raise exception 'Recovery enrollment not found.'; end if;

  select attempt.* into v_attempt
  from public.recovery_assessment_attempts attempt
  where attempt.session_id = p_session_id
    and attempt.assessment_type = 'checkpoint'
  order by attempt.created_at desc
  limit 1;
  if v_attempt.id is null or jsonb_typeof(v_attempt.topic_scores) <> 'object' then
    raise exception 'Checkpoint assessment evidence is unavailable.';
  end if;

  create temporary table if not exists recovery_checkpoint_v1_future_snapshot (
    topic_key text primary key,
    source_session_type text,
    title text,
    rationale text,
    estimated_minutes integer,
    stages jsonb,
    metadata jsonb,
    scheduled_for date,
    checkpoint_score numeric
  ) on commit drop;
  truncate pg_temp.recovery_checkpoint_v1_future_snapshot;

  insert into pg_temp.recovery_checkpoint_v1_future_snapshot (
    topic_key, source_session_type, title, rationale, estimated_minutes,
    stages, metadata, scheduled_for, checkpoint_score
  )
  select distinct on (future.topic_key)
    future.topic_key,
    future.session_type,
    future.title,
    future.rationale,
    future.estimated_minutes,
    future.stages,
    future.metadata,
    future.scheduled_for,
    null::numeric
  from public.recovery_plan_sessions future
  where future.enrollment_id = v_session.enrollment_id
    and future.status in ('planned', 'available')
    and future.session_type in ('topic', 'quick_review')
    and future.topic_key is not null
    and not coalesce((future.metadata ->> 'recovery_cycle')::boolean, false)
  order by future.topic_key, future.sequence_index;

  for v_topic in
    select scores.key as topic_key, scores.value::numeric as score
    from jsonb_each_text(v_attempt.topic_scores) scores
  loop
    v_score := greatest(0, least(100, v_topic.score));

    update public.recovery_student_topics topic
    set priority_score = case
          when v_score < 70 then greatest(topic.priority_score, 75)
          when v_score < 85 then greatest(topic.priority_score, 55)
          else least(topic.priority_score, 40)
        end,
        priority_band = case
          when v_score < 70 then 'high'
          when v_score < 85 then 'medium'
          else 'low'
        end,
        verification_only = v_score >= 85,
        last_evidence_at = greatest(coalesce(topic.last_evidence_at, '-infinity'::timestamptz), coalesce(v_attempt.submitted_at, now()))
    where topic.enrollment_id = v_session.enrollment_id
      and topic.topic_key = v_topic.topic_key
      and topic.required;

    if v_score < 85 then
      insert into pg_temp.recovery_checkpoint_v1_future_snapshot (
        topic_key, source_session_type, title, rationale, estimated_minutes,
        stages, metadata, scheduled_for, checkpoint_score
      ) values (
        v_topic.topic_key, null, null, null, null,
        null, '{}'::jsonb, null, v_score
      )
      on conflict (topic_key) do update set checkpoint_score = excluded.checkpoint_score;
    else
      delete from pg_temp.recovery_checkpoint_v1_future_snapshot snapshot
      where snapshot.topic_key = v_topic.topic_key;
    end if;
  end loop;

  -- Mandatory topic-cycle remediation is preserved. Every other not-started
  -- future queue row can be replaced; completed/in-progress history is untouched.
  delete from public.recovery_plan_sessions future
  where future.enrollment_id = v_session.enrollment_id
    and future.status in ('planned', 'available')
    and (
      future.session_type in ('checkpoint', 'mock_intermediate', 'mock_final', 'error_review')
      or (
        future.session_type in ('topic', 'quick_review')
        and not coalesce((future.metadata ->> 'recovery_cycle')::boolean, false)
      )
    );

  delete from public.recovery_plan_days day
  where day.enrollment_id = v_session.enrollment_id
    and not exists (
      select 1 from public.recovery_plan_sessions remaining
      where remaining.plan_day_id = day.id
    );

  update public.recovery_enrollments enrollment
  set plan_version = enrollment.plan_version + 1,
      last_planned_at = now()
  where enrollment.id = v_session.enrollment_id
  returning enrollment.plan_version into v_new_plan_version;

  -- Checkpoint-affected topics are deliberately brought forward, one per day,
  -- while unassessed future topics keep their previous date when possible.
  with affected as (
    select
      snapshot.topic_key,
      row_number() over (
        order by topic.priority_score desc, snapshot.topic_key
      )::integer as affected_rank
    from pg_temp.recovery_checkpoint_v1_future_snapshot snapshot
    join public.recovery_student_topics topic
      on topic.enrollment_id = v_session.enrollment_id
     and topic.topic_key = snapshot.topic_key
    where snapshot.checkpoint_score is not null
  )
  update pg_temp.recovery_checkpoint_v1_future_snapshot snapshot
  set scheduled_for = least(
    v_enrollment.exam_date,
    current_date + greatest(0, affected.affected_rank - 1)
  )
  from affected
  where affected.topic_key = snapshot.topic_key;

  update pg_temp.recovery_checkpoint_v1_future_snapshot snapshot
  set scheduled_for = coalesce(snapshot.scheduled_for, current_date)
  where snapshot.scheduled_for is null;

  -- Never duplicate a mandatory remediation cycle already queued for the topic.
  delete from pg_temp.recovery_checkpoint_v1_future_snapshot snapshot
  where exists (
    select 1
    from public.recovery_plan_sessions cycle
    where cycle.enrollment_id = v_session.enrollment_id
      and cycle.topic_key = snapshot.topic_key
      and cycle.status in ('planned', 'available', 'in_progress')
      and coalesce((cycle.metadata ->> 'recovery_cycle')::boolean, false)
  );

  select coalesce(max(existing.sequence_index), 0) into v_sequence
  from public.recovery_plan_sessions existing
  where existing.enrollment_id = v_session.enrollment_id;

  for v_day in
    select
      snapshot.scheduled_for,
      sum(
        coalesce(
          snapshot.estimated_minutes,
          case v_enrollment.mode when 'complete' then 42 when 'intensive' then 34 else 30 end
        )
      )::integer as target_minutes
    from pg_temp.recovery_checkpoint_v1_future_snapshot snapshot
    group by snapshot.scheduled_for
    order by snapshot.scheduled_for
  loop
    v_day_index := v_day_index + 1;
    insert into public.recovery_plan_days (
      enrollment_id, plan_version, day_index, scheduled_for, target_minutes, status
    ) values (
      v_session.enrollment_id,
      v_new_plan_version,
      v_day_index,
      v_day.scheduled_for,
      greatest(5, v_day.target_minutes),
      'planned'
    ) returning id into v_day_id;

    v_daily_order := 0;
    for v_topic in
      select
        snapshot.*,
        topic.priority_score,
        topic.priority_band,
        catalog.label
      from pg_temp.recovery_checkpoint_v1_future_snapshot snapshot
      join public.recovery_student_topics topic
        on topic.enrollment_id = v_session.enrollment_id
       and topic.topic_key = snapshot.topic_key
      join public.recovery_topic_catalog catalog on catalog.topic_key = snapshot.topic_key
      where snapshot.scheduled_for = v_day.scheduled_for
      order by topic.priority_score desc, snapshot.topic_key
    loop
      v_sequence := v_sequence + 1;
      v_daily_order := v_daily_order + 1;
      insert into public.recovery_plan_sessions (
        enrollment_id, sequence_index, session_type, topic_key, title, rationale,
        estimated_minutes, priority_score, stages, metadata, status,
        plan_day_id, scheduled_for, daily_order
      ) values (
        v_session.enrollment_id,
        v_sequence,
        case
          when v_topic.checkpoint_score is not null then 'topic'
          when v_topic.source_session_type in ('topic', 'quick_review') then v_topic.source_session_type
          when v_topic.priority_band = 'low' then 'quick_review'
          else 'topic'
        end,
        v_topic.topic_key,
        coalesce(v_topic.title, v_topic.label || ' — consolidamento'),
        case
          when v_topic.checkpoint_score < 70 then
            'La verifica mista ha mostrato che questo argomento non è ancora stabile: torna tra le priorità con lavoro nuovo.'
          when v_topic.checkpoint_score < 85 then
            'La verifica mista ha mostrato che questo argomento va consolidato prima di ridurne la priorità.'
          else coalesce(v_topic.rationale, 'Continua il lavoro previsto dal tuo programma scolastico.')
        end,
        coalesce(
          v_topic.estimated_minutes,
          case v_enrollment.mode when 'complete' then 42 when 'intensive' then 34 else 30 end
        ),
        v_topic.priority_score,
        case
          when v_topic.checkpoint_score is not null then '["recupera","allenati","modalita_scuola","mini_verifica"]'::jsonb
          else coalesce(v_topic.stages, '["recupera","allenati","modalita_scuola","mini_verifica"]'::jsonb)
        end,
        coalesce(v_topic.metadata, '{}'::jsonb)
          || jsonb_build_object(
            'server_reprioritized_after_checkpoint', true,
            'source_checkpoint_session_id', p_session_id,
            'checkpoint_score', v_topic.checkpoint_score,
            'plan_version', v_new_plan_version
          ),
        'planned',
        v_day_id,
        v_day.scheduled_for,
        v_daily_order
      );
      v_inserted := v_inserted + 1;
    end loop;
  end loop;

  select coalesce(jsonb_agg(item order by (item ->> 'label')), '[]'::jsonb)
    into v_stable
  from (
    select jsonb_build_object(
      'topicKey', scores.key,
      'label', catalog.label,
      'score', round(scores.value::numeric)
    ) as item
    from jsonb_each_text(v_attempt.topic_scores) scores
    join public.recovery_topic_catalog catalog on catalog.topic_key = scores.key
    where scores.value::numeric >= 85
  ) rows;

  select coalesce(jsonb_agg(item order by (item ->> 'label')), '[]'::jsonb)
    into v_consolidate
  from (
    select jsonb_build_object(
      'topicKey', scores.key,
      'label', catalog.label,
      'score', round(scores.value::numeric)
    ) as item
    from jsonb_each_text(v_attempt.topic_scores) scores
    join public.recovery_topic_catalog catalog on catalog.topic_key = scores.key
    where scores.value::numeric >= 70 and scores.value::numeric < 85
  ) rows;

  select coalesce(jsonb_agg(item order by (item ->> 'label')), '[]'::jsonb)
    into v_priority
  from (
    select jsonb_build_object(
      'topicKey', scores.key,
      'label', catalog.label,
      'score', round(scores.value::numeric)
    ) as item
    from jsonb_each_text(v_attempt.topic_scores) scores
    join public.recovery_topic_catalog catalog on catalog.topic_key = scores.key
    where scores.value::numeric < 70
  ) rows;

  v_changed_message := case
    when jsonb_array_length(v_priority) > 0 then
      'Il piano è già stato aggiornato: gli argomenti ancora instabili tornano tra le priorità con lavoro nuovo.'
    when jsonb_array_length(v_consolidate) > 0 then
      'Il piano è già stato aggiornato: gli argomenti da consolidare restano nel lavoro futuro, mentre quelli stabili non vengono ripetuti subito.'
    else
      'Il piano è già stato aggiornato: gli argomenti stabili non vengono ripetuti subito e il percorso continua con il lavoro ancora necessario.'
  end;

  v_summary := jsonb_build_object(
    'overallScore', case when v_attempt.score is null then null else round(v_attempt.score) end,
    'stable', v_stable,
    'consolidate', v_consolidate,
    'priority', v_priority,
    'changedMessage', v_changed_message,
    'serverAuthoritative', true,
    'futureSessionsRebuilt', v_inserted,
    'planVersion', v_new_plan_version
  );

  update public.recovery_plan_sessions checkpoint
  set metadata = coalesce(checkpoint.metadata, '{}'::jsonb) || jsonb_build_object(
    'checkpoint_server_reprioritized_at', now(),
    'checkpoint_plan_recalculated_at', now(),
    'checkpoint_plan_update_summary', v_summary,
    'checkpoint_server_plan_version', v_new_plan_version
  )
  where checkpoint.id = p_session_id;

  return jsonb_build_object(
    'recalculated', true,
    'existing', false,
    'future_sessions_rebuilt', v_inserted,
    'plan_version', v_new_plan_version,
    'summary', v_summary
  );
end;
$$;

revoke all on function public.recovery_checkpoint_v1_reprioritize_future_internal(uuid)
  from public, anon, authenticated;

create or replace function public.recovery_checkpoint_v1_after_completion_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.session_type = 'checkpoint'
     and new.status = 'completed'
     and old.status is distinct from 'completed' then
    perform public.recovery_checkpoint_v1_reprioritize_future_internal(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.recovery_checkpoint_v1_after_completion_trigger()
  from public, anon, authenticated;

drop trigger if exists recovery_checkpoint_v1_reprioritize_after_completion on public.recovery_plan_sessions;
create trigger recovery_checkpoint_v1_reprioritize_after_completion
after update of status on public.recovery_plan_sessions
for each row execute function public.recovery_checkpoint_v1_after_completion_trigger();

create or replace function public.recovery_checkpoint_v1_sync_on_attempt_submit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session_id uuid;
begin
  if new.status <> 'submitted' or old.status is not distinct from new.status then
    return new;
  end if;

  select session.id into v_session_id
  from public.recovery_plan_sessions session
  join public.recovery_enrollments enrollment on enrollment.id = session.enrollment_id
  where session.assignment_id = new.assignment_id
    and session.session_type = 'checkpoint'
    and session.status <> 'completed'
    and enrollment.user_id = new.learner_id
  order by session.sequence_index
  limit 1;

  if v_session_id is not null then
    -- The existing sync remains the single evidence/mastery completion path.
    -- For resources 1-7 it returns incomplete. Resource 8 completes the session,
    -- which fires the completion trigger above in the same transaction.
    perform public.sync_recovery_session(v_session_id);
  end if;

  return new;
end;
$$;

revoke all on function public.recovery_checkpoint_v1_sync_on_attempt_submit_trigger()
  from public, anon, authenticated;

drop trigger if exists recovery_checkpoint_v1_sync_on_attempt_submit on public.exercise_builder_attempts;
create trigger recovery_checkpoint_v1_sync_on_attempt_submit
after update of status on public.exercise_builder_attempts
for each row
when (new.status = 'submitted' and old.status is distinct from new.status)
execute function public.recovery_checkpoint_v1_sync_on_attempt_submit_trigger();

-- Keep the learner-callable marker for compatibility, but after this migration
-- normal checkpoint completion has already stored the authoritative summary.
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
  select session.* into v_session
  from public.recovery_plan_sessions session
  join public.recovery_enrollments enrollment on enrollment.id = session.enrollment_id
  where session.id = p_session_id
    and session.session_type = 'checkpoint'
    and session.status = 'completed'
    and enrollment.user_id = auth.uid()
  for update of session;
  if v_session.id is null then raise exception 'Completed Recovery checkpoint not found.'; end if;

  if v_session.metadata ? 'checkpoint_server_reprioritized_at' then
    return jsonb_build_object(
      'recorded', true,
      'existing', true,
      'server_authoritative', true,
      'summary', v_session.metadata -> 'checkpoint_plan_update_summary'
    );
  end if;

  raise exception 'Checkpoint server reprioritisation has not completed; client-side plan mutation is disabled.';
end;
$$;

revoke all on function public.mark_recovery_checkpoint_plan_update(uuid, jsonb) from public, anon;
grant execute on function public.mark_recovery_checkpoint_plan_update(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
