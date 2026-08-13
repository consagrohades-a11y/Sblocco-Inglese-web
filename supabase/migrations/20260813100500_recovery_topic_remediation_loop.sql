-- Recovery topic remediation / verify retry loop.
-- Scope is deliberately topic-local: no Curriculum v2 outcome evidence, cumulative
-- assessment materializer, readiness, gamification or generic Exercise Builder changes.
-- This migration is source-only in this PR and must not be applied to production here.

create or replace function public.recovery_topic_remediation_band(p_score numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_score is null then 'unknown'
    when p_score < 60 then 'insufficient'
    when p_score < 70 then 'weak'
    when p_score < 80 then 'almost_recovered'
    when p_score < 90 then 'recovered'
    else 'strong'
  end;
$$;

create or replace function public.recovery_topic_remediation_stages(p_score numeric)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when p_score is null then '[]'::jsonb
    when p_score < 60 then '["recupera","allenati","modalita_scuola","mini_verifica"]'::jsonb
    when p_score < 70 then '["allenati","modalita_scuola","mini_verifica"]'::jsonb
    when p_score < 80 then '["modalita_scuola","mini_verifica"]'::jsonb
    else '[]'::jsonb
  end;
$$;

-- One active remediation may originate from one mastery-evidence row. The source
-- evidence itself is immutable and already has its own idempotency key.
create unique index if not exists recovery_plan_sessions_cycle_source_evidence_uidx
  on public.recovery_plan_sessions ((metadata ->> 'source_mastery_evidence_id'))
  where session_type = 'topic'
    and status <> 'skipped'
    and nullif(metadata ->> 'source_mastery_evidence_id', '') is not null;

create index if not exists recovery_plan_sessions_active_topic_cycle_idx
  on public.recovery_plan_sessions(enrollment_id, topic_key, status, sequence_index)
  where session_type = 'topic'
    and coalesce(metadata ->> 'recovery_cycle', 'false') = 'true';

-- Create the assignment/resources for one real Recovery topic cycle using exactly
-- the stages declared by the session. This intentionally does NOT replace the shared
-- materialize_recovery_session() function used by checkpoint/mock work.
create or replace function public.materialize_recovery_topic_cycle_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.recovery_plan_sessions%rowtype;
  v_enrollment public.recovery_enrollments%rowtype;
  v_assignment_id uuid;
  v_resource_id uuid;
  v_first_resource_id uuid;
  v_mapping record;
  v_requested_count integer := 0;
  v_mapping_count integer := 0;
  v_total_minutes integer := 0;
  v_resource_count integer := 0;
  v_phase_label text;
begin
  select session.* into v_session
  from public.recovery_plan_sessions session
  where session.id = p_session_id
  for update;

  if v_session.id is null then
    return jsonb_build_object('ready', false, 'reason', 'session_not_found');
  end if;
  if v_session.session_type <> 'topic'
     or coalesce(v_session.metadata ->> 'recovery_cycle', 'false') <> 'true' then
    return jsonb_build_object('ready', false, 'reason', 'not_topic_cycle');
  end if;
  if v_session.assignment_id is not null then
    return jsonb_build_object(
      'ready', true,
      'session_id', v_session.id,
      'assignment_id', v_session.assignment_id,
      'resource_id', v_session.assignment_resource_id,
      'existing', true
    );
  end if;

  select enrollment.* into v_enrollment
  from public.recovery_enrollments enrollment
  where enrollment.id = v_session.enrollment_id
    and enrollment.status in ('active', 'completed');

  if v_enrollment.id is null then
    return jsonb_build_object('ready', false, 'reason', 'enrollment_not_found');
  end if;

  if jsonb_typeof(v_session.stages) <> 'array'
     or jsonb_array_length(v_session.stages) = 0 then
    return jsonb_build_object('ready', false, 'reason', 'missing_stages');
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(v_session.stages) stage
    where stage.value not in ('recupera', 'recupera_essenziale', 'allenati', 'modalita_scuola', 'mini_verifica')
  ) then
    return jsonb_build_object('ready', false, 'reason', 'invalid_stage');
  end if;

  with requested as (
    select
      stage.value as stage_key,
      stage.ordinality as stage_order,
      case stage.value
        when 'recupera' then 'recover'
        when 'recupera_essenziale' then 'recover'
        when 'allenati' then 'practice'
        when 'modalita_scuola' then 'school'
        when 'mini_verifica' then 'verify'
      end as phase
    from jsonb_array_elements_text(v_session.stages) with ordinality stage(value, ordinality)
  ), ranked as (
    select
      requested.phase,
      requested.stage_order,
      coalesce(mapping.estimated_minutes, version.estimated_minutes, 0) as minutes,
      row_number() over (
        partition by requested.phase
        order by mapping.sort_order, mapping.created_at desc
      ) as row_rank
    from requested
    join public.recovery_exercise_map mapping
      on mapping.topic_key = v_session.topic_key
     and mapping.phase = requested.phase
     and mapping.active
    join public.exercise_builder_exercises exercise
      on exercise.id = mapping.exercise_id
     and exercise.status = 'published'
    join public.exercise_builder_exercise_versions version
      on version.id = mapping.exercise_version_id
     and version.review_status = 'approved'
  )
  select
    jsonb_array_length(v_session.stages),
    count(*) filter (where row_rank = 1)::integer,
    coalesce(sum(minutes) filter (where row_rank = 1), 0)::integer
  into v_requested_count, v_mapping_count, v_total_minutes
  from ranked;

  if v_mapping_count <> v_requested_count then
    return jsonb_build_object(
      'ready', false,
      'reason', 'incomplete_topic_content',
      'required_stage_count', v_requested_count,
      'mapped_stage_count', v_mapping_count
    );
  end if;

  insert into public.assignments (
    learner_id, title, reason, learner_note, status, required,
    deadline_at, estimated_minutes, published_at, created_by
  ) values (
    v_enrollment.user_id,
    v_session.title,
    case
      when coalesce(v_session.metadata ->> 'mandatory_remediation', 'false') = 'true'
        then 'Recupero Debito Inglese · nuovo ciclo mirato'
      else 'Recupero Debito Inglese · nuovo ciclo volontario'
    end,
    v_session.rationale,
    'published',
    true,
    case when v_enrollment.exam_date is null then null else v_enrollment.exam_date::timestamptz end,
    greatest(5, v_total_minutes),
    now(),
    v_enrollment.user_id
  ) returning id into v_assignment_id;

  for v_mapping in
    with requested as (
      select
        stage.value as stage_key,
        stage.ordinality as stage_order,
        case stage.value
          when 'recupera' then 'recover'
          when 'recupera_essenziale' then 'recover'
          when 'allenati' then 'practice'
          when 'modalita_scuola' then 'school'
          when 'mini_verifica' then 'verify'
        end as phase
      from jsonb_array_elements_text(v_session.stages) with ordinality stage(value, ordinality)
    ), ranked as (
      select
        requested.stage_key,
        requested.stage_order,
        requested.phase,
        mapping.*,
        row_number() over (
          partition by requested.phase
          order by mapping.sort_order, mapping.created_at desc
        ) as row_rank
      from requested
      join public.recovery_exercise_map mapping
        on mapping.topic_key = v_session.topic_key
       and mapping.phase = requested.phase
       and mapping.active
      join public.exercise_builder_exercises exercise
        on exercise.id = mapping.exercise_id
       and exercise.status = 'published'
      join public.exercise_builder_exercise_versions version
        on version.id = mapping.exercise_version_id
       and version.review_status = 'approved'
    )
    select ranked.*
    from ranked
    where ranked.row_rank = 1
    order by ranked.stage_order
  loop
    v_phase_label := case v_mapping.phase
      when 'recover' then 'Recupera'
      when 'practice' then 'Allenati'
      when 'school' then 'Modalità scuola'
      when 'verify' then 'Verifica argomento'
      else 'Attività'
    end;

    v_resource_count := v_resource_count + 1;

    insert into public.assignment_resources (
      assignment_id, resource_key, resource_type, title, description,
      route, sequence_index, exercise_config
    ) values (
      v_assignment_id,
      'recovery-' || v_mapping.phase || '-' || v_mapping.id::text,
      'custom_exercise',
      v_phase_label,
      case
        when v_mapping.phase = 'recover' then 'Riparti dai punti essenziali prima di tornare alla pratica.'
        when v_mapping.phase = 'practice' then 'Recupero attivo della forma e del significato in contesti diversi.'
        when v_mapping.phase = 'school' then 'Formati vicini a quelli usati nelle verifiche scolastiche.'
        when v_mapping.phase = 'verify' then 'Nuova verifica dell’argomento, senza feedback durante lo svolgimento.'
        else null
      end,
      '/exercises',
      v_resource_count,
      jsonb_build_object(
        'exercise_id', v_mapping.exercise_id,
        'exercise_version_id', v_mapping.exercise_version_id,
        'recovery_phase', v_mapping.phase,
        'recovery_topic_key', v_session.topic_key,
        'recovery_cycle_session_id', v_session.id,
        'recovery_cycle', coalesce((v_session.metadata ->> 'cycle')::integer, 1),
        'completion_rule', 'submitted',
        'required_score', 0,
        'required_attempts', 1,
        -- A verify result closes this cycle. A new verify attempt belongs to a new
        -- Recovery cycle/evidence row instead of best-score shopping in one resource.
        'allow_retry', v_mapping.phase <> 'verify',
        'show_score', true,
        'show_correct_answers', true,
        'show_explanations', true,
        'show_diagnostic_summary', true
      )
    ) returning id into v_resource_id;

    if v_first_resource_id is null then
      v_first_resource_id := v_resource_id;
    end if;
  end loop;

  update public.recovery_plan_sessions session
  set assignment_id = v_assignment_id,
      assignment_resource_id = v_first_resource_id,
      estimated_minutes = greatest(5, v_total_minutes),
      metadata = session.metadata || jsonb_build_object(
        'materialized_stage_count', v_resource_count,
        'materialized_at', now()
      )
  where session.id = v_session.id;

  return jsonb_build_object(
    'ready', true,
    'session_id', v_session.id,
    'assignment_id', v_assignment_id,
    'resource_id', v_first_resource_id,
    'resource_count', v_resource_count,
    'estimated_minutes', v_total_minutes,
    'existing', false
  );
end;
$$;

-- Internal constructor for a real topic cycle. It appends work without replacing
-- the rest of the learner's future plan. If a current plan day exists it joins it;
-- otherwise it creates a current-day slot only when the enrollment already uses
-- recovery_plan_days.
create or replace function public.create_recovery_topic_cycle_session(
  p_enrollment_id uuid,
  p_topic_key text,
  p_stages jsonb,
  p_metadata jsonb,
  p_title text,
  p_rationale text,
  p_priority_score numeric default 95,
  p_make_available boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.recovery_enrollments%rowtype;
  v_topic_label text;
  v_sequence integer;
  v_plan_day_id uuid;
  v_day_index integer;
  v_daily_order integer;
  v_session_id uuid;
  v_session_status text := 'planned';
  v_created_plan_day boolean := false;
  v_result jsonb;
  v_estimated_minutes integer := 30;
begin
  select enrollment.* into v_enrollment
  from public.recovery_enrollments enrollment
  where enrollment.id = p_enrollment_id
    and enrollment.status = 'active'
  for update;

  if v_enrollment.id is null then
    return jsonb_build_object('ready', false, 'reason', 'active_enrollment_not_found');
  end if;

  if not exists (
    select 1
    from public.recovery_student_topics topic
    where topic.enrollment_id = p_enrollment_id
      and topic.topic_key = p_topic_key
      and topic.required
  ) then
    return jsonb_build_object('ready', false, 'reason', 'topic_not_required');
  end if;

  if jsonb_typeof(p_stages) <> 'array' or jsonb_array_length(p_stages) = 0 then
    return jsonb_build_object('ready', false, 'reason', 'missing_stages');
  end if;

  select catalog.label into v_topic_label
  from public.recovery_topic_catalog catalog
  where catalog.topic_key = p_topic_key;

  select coalesce(max(session.sequence_index), 0) + 1
  into v_sequence
  from public.recovery_plan_sessions session
  where session.enrollment_id = p_enrollment_id;

  select day.id, day.day_index
  into v_plan_day_id, v_day_index
  from public.recovery_plan_days day
  where day.enrollment_id = p_enrollment_id
    and day.plan_version = v_enrollment.plan_version
    and day.scheduled_for = current_date
  order by day.day_index
  limit 1
  for update;

  if v_plan_day_id is null and exists (
    select 1
    from public.recovery_plan_days day
    where day.enrollment_id = p_enrollment_id
      and day.plan_version = v_enrollment.plan_version
  ) then
    select coalesce(max(day.day_index), 0) + 1
    into v_day_index
    from public.recovery_plan_days day
    where day.enrollment_id = p_enrollment_id
      and day.plan_version = v_enrollment.plan_version;

    insert into public.recovery_plan_days (
      enrollment_id, plan_version, day_index, scheduled_for, target_minutes, status
    ) values (
      p_enrollment_id, v_enrollment.plan_version, v_day_index, current_date, 5, 'planned'
    )
    returning id into v_plan_day_id;
    v_created_plan_day := true;
  end if;

  if v_plan_day_id is not null then
    select coalesce(max(session.daily_order), 0) + 1
    into v_daily_order
    from public.recovery_plan_sessions session
    where session.plan_day_id = v_plan_day_id;
  else
    v_daily_order := null;
  end if;

  insert into public.recovery_plan_sessions (
    enrollment_id, sequence_index, session_type, topic_key, title, rationale,
    estimated_minutes, priority_score, stages, metadata, status,
    plan_day_id, scheduled_for, daily_order
  ) values (
    p_enrollment_id,
    v_sequence,
    'topic',
    p_topic_key,
    left(coalesce(nullif(trim(p_title), ''), coalesce(v_topic_label, p_topic_key) || ' — nuovo ciclo'), 180),
    nullif(trim(p_rationale), ''),
    30,
    greatest(0, least(100, coalesce(p_priority_score, 95))),
    p_stages,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'recovery_cycle', true,
      'created_by', 'recovery-topic-remediation-v1',
      'stages', p_stages
    ),
    'planned',
    v_plan_day_id,
    current_date,
    v_daily_order
  ) returning id into v_session_id;

  v_result := public.materialize_recovery_topic_cycle_session(v_session_id);

  if coalesce((v_result ->> 'ready')::boolean, false) = false then
    update public.recovery_plan_sessions session
    set metadata = session.metadata || jsonb_build_object(
      'materialization_ready', false,
      'materialization_reason', coalesce(v_result ->> 'reason', 'unknown')
    )
    where session.id = v_session_id;

    return v_result || jsonb_build_object('session_id', v_session_id, 'cycle_created', true);
  end if;

  v_estimated_minutes := greatest(5, coalesce((v_result ->> 'estimated_minutes')::integer, 30));

  if v_plan_day_id is not null then
    update public.recovery_plan_days day
    set target_minutes = case
      when v_created_plan_day then greatest(5, v_estimated_minutes)
      else least(1440, greatest(5, day.target_minutes + v_estimated_minutes))
    end
    where day.id = v_plan_day_id;
  end if;

  -- Mandatory remediation pre-empts another not-started due session, but never
  -- cancels or rewrites it. It simply returns that session to planned.
  if coalesce(p_metadata ->> 'mandatory_remediation', 'false') = 'true' then
    update public.recovery_plan_sessions session
    set status = 'planned'
    where session.enrollment_id = p_enrollment_id
      and session.id <> v_session_id
      and session.status = 'available'
      and coalesce(session.metadata ->> 'mandatory_remediation', 'false') <> 'true'
      and (session.scheduled_for is null or session.scheduled_for <= current_date);
  end if;

  if p_make_available then
    v_session_status := 'available';
    update public.recovery_plan_sessions
    set status = 'available'
    where id = v_session_id;
  end if;

  return v_result || jsonb_build_object(
    'session_id', v_session_id,
    'status', v_session_status,
    'cycle_created', true
  );
end;
$$;

create or replace function public.ensure_recovery_topic_cycle_from_evidence(
  p_evidence_id uuid,
  p_trigger text,
  p_force_targeted boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evidence public.recovery_mastery_evidence%rowtype;
  v_existing public.recovery_plan_sessions%rowtype;
  v_stages jsonb;
  v_band text;
  v_cycle integer;
  v_title text;
  v_rationale text;
  v_priority numeric;
  v_topic_label text;
begin
  select evidence.* into v_evidence
  from public.recovery_mastery_evidence evidence
  where evidence.id = p_evidence_id;

  if v_evidence.id is null then
    return jsonb_build_object('ready', false, 'reason', 'evidence_not_found');
  end if;

  select session.* into v_existing
  from public.recovery_plan_sessions session
  where session.enrollment_id = v_evidence.enrollment_id
    and session.topic_key = v_evidence.topic_key
    and session.status <> 'skipped'
    and session.metadata ->> 'source_mastery_evidence_id' = v_evidence.id::text
  order by session.created_at desc
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'ready', true,
      'existing', true,
      'session_id', v_existing.id,
      'cycle', coalesce((v_existing.metadata ->> 'cycle')::integer, 1)
    );
  end if;

  if not p_force_targeted and v_evidence.score >= 80 then
    return jsonb_build_object('ready', false, 'reason', 'remediation_not_required');
  end if;

  if p_force_targeted then
    v_band := 'needs_recheck';
    v_stages := '["modalita_scuola","mini_verifica"]'::jsonb;
    v_priority := 99;
  else
    v_band := public.recovery_topic_remediation_band(v_evidence.score);
    v_stages := public.recovery_topic_remediation_stages(v_evidence.score);
    v_priority := case
      when v_evidence.score < 60 then 100
      when v_evidence.score < 70 then 98
      else 96
    end;
  end if;

  if jsonb_array_length(v_stages) = 0 then
    return jsonb_build_object('ready', false, 'reason', 'no_remediation_stages');
  end if;

  select catalog.label into v_topic_label
  from public.recovery_topic_catalog catalog
  where catalog.topic_key = v_evidence.topic_key;

  select count(*) + 1
  into v_cycle
  from public.recovery_mastery_evidence evidence
  where evidence.enrollment_id = v_evidence.enrollment_id
    and evidence.topic_key = v_evidence.topic_key
    and evidence.evidence_type = 'mini_check';

  v_title := case v_band
    when 'insufficient' then coalesce(v_topic_label, v_evidence.topic_key) || ' — recupero mirato'
    when 'weak' then coalesce(v_topic_label, v_evidence.topic_key) || ' — allenamento mirato'
    when 'almost_recovered' then coalesce(v_topic_label, v_evidence.topic_key) || ' — ripasso e nuova verifica'
    when 'needs_recheck' then coalesce(v_topic_label, v_evidence.topic_key) || ' — ricontrollo mirato'
    else coalesce(v_topic_label, v_evidence.topic_key) || ' — nuovo ciclo'
  end;

  v_rationale := case v_band
    when 'insufficient' then 'La verifica mostra che l’argomento non è ancora stabile: ripartiamo dai punti essenziali prima di riprovare.'
    when 'weak' then 'La base c’è, ma serve ancora pratica prima di considerare l’argomento recuperato.'
    when 'almost_recovered' then 'Sei vicino alla soglia: lavoriamo in formato scuola e poi riproviamo la verifica.'
    when 'needs_recheck' then 'Una prova successiva ha riaperto un dubbio su questo argomento: facciamo un ricontrollo mirato.'
    else 'Nuovo ciclo mirato sullo stesso argomento.'
  end;

  return public.create_recovery_topic_cycle_session(
    v_evidence.enrollment_id,
    v_evidence.topic_key,
    v_stages,
    jsonb_build_object(
      'remediation', true,
      'mandatory_remediation', true,
      'voluntary_redo', false,
      'trigger', p_trigger,
      'trigger_score', round(v_evidence.score, 2),
      'trigger_evidence_type', v_evidence.evidence_type,
      'source_mastery_evidence_id', v_evidence.id,
      'source_evidence_key', v_evidence.evidence_key,
      'source_session_id', v_evidence.session_id,
      'source_attempt_id', v_evidence.exercise_attempt_id,
      'remediation_level', v_band,
      'cycle', v_cycle
    ),
    v_title,
    v_rationale,
    v_priority,
    true
  );
end;
$$;

-- A newly inserted topic verification below 80 creates exactly one next cycle.
-- record_recovery_mastery_evidence() is already idempotent by evidence_key, so the
-- same verify attempt cannot fire this trigger twice.
create or replace function public.schedule_recovery_topic_cycle_after_mini_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.evidence_type = 'mini_check' and new.score < 80 then
    perform public.ensure_recovery_topic_cycle_from_evidence(
      new.id,
      'topic_verify_below_threshold',
      false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists recovery_mastery_evidence_schedule_topic_cycle
  on public.recovery_mastery_evidence;
create trigger recovery_mastery_evidence_schedule_topic_cycle
after insert on public.recovery_mastery_evidence
for each row execute function public.schedule_recovery_topic_cycle_after_mini_check();

-- Reuse the existing needs_recheck mastery state. No checkpoint/mock function is
-- changed: when authoritative topic mastery transitions to needs_recheck, this
-- trigger looks up the latest reliable evidence and exposes a school+verify recheck.
create or replace function public.schedule_recovery_topic_cycle_on_needs_recheck()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evidence_id uuid;
begin
  if new.mastery_state = 'needs_recheck'
     and old.mastery_state is distinct from new.mastery_state then
    select evidence.id into v_evidence_id
    from public.recovery_mastery_evidence evidence
    where evidence.enrollment_id = new.enrollment_id
      and evidence.topic_key = new.topic_key
      and evidence.evidence_type in ('mini_check', 'checkpoint', 'mock')
    order by evidence.observed_at desc, evidence.created_at desc, evidence.id desc
    limit 1;

    if v_evidence_id is not null then
      perform public.ensure_recovery_topic_cycle_from_evidence(
        v_evidence_id,
        'mastery_needs_recheck',
        true
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists recovery_student_topics_schedule_needs_recheck
  on public.recovery_student_topics;
create trigger recovery_student_topics_schedule_needs_recheck
after update of mastery_state on public.recovery_student_topics
for each row execute function public.schedule_recovery_topic_cycle_on_needs_recheck();

-- Keep mandatory remediation ahead of a normal due session if legacy
-- sync_recovery_session() tries to unlock the next sequence row. The normal row is
-- not deleted or rescheduled; it simply remains planned until the remediation closes.
create or replace function public.guard_recovery_session_availability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'available'
     and new.scheduled_for is not null
     and new.scheduled_for > current_date then
    new.status := 'planned';
    return new;
  end if;

  if new.status = 'available'
     and coalesce(new.metadata ->> 'mandatory_remediation', 'false') <> 'true'
     and exists (
       select 1
       from public.recovery_plan_sessions remediation
       where remediation.enrollment_id = new.enrollment_id
         and remediation.id <> new.id
         and remediation.status in ('planned', 'available', 'in_progress')
         and coalesce(remediation.metadata ->> 'mandatory_remediation', 'false') = 'true'
         and (remediation.scheduled_for is null or remediation.scheduled_for <= current_date)
     ) then
    new.status := 'planned';
  end if;

  return new;
end;
$$;

-- Opening a pre-materialized topic cycle marks only that new session in progress.
create or replace function public.start_recovery_topic_cycle_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.recovery_plan_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select session.* into v_session
  from public.recovery_plan_sessions session
  join public.recovery_enrollments enrollment on enrollment.id = session.enrollment_id
  where session.id = p_session_id
    and enrollment.user_id = auth.uid()
    and coalesce(session.metadata ->> 'recovery_cycle', 'false') = 'true'
  for update of session;

  if v_session.id is null then raise exception 'Recovery topic cycle not found.'; end if;
  if v_session.assignment_id is null then
    return jsonb_build_object(
      'ready', false,
      'reason', coalesce(v_session.metadata ->> 'materialization_reason', 'assignment_not_ready'),
      'session_id', v_session.id
    );
  end if;

  if v_session.status in ('planned', 'available') then
    update public.recovery_plan_sessions
    set status = 'in_progress'
    where id = v_session.id;
  end if;

  return jsonb_build_object(
    'ready', true,
    'session_id', v_session.id,
    'assignment_id', v_session.assignment_id,
    'resource_id', v_session.assignment_resource_id,
    'status', case when v_session.status in ('planned', 'available') then 'in_progress' else v_session.status end
  );
end;
$$;

-- True voluntary redo. Unlike "Rivedi tutto", this is a real plan session and its
-- attempts flow through sync_recovery_session(), therefore creating new mastery evidence.
-- If a mandatory remediation is waiting and not yet started, choosing "Rifai tutto"
-- upgrades that same cycle to the full four stages instead of creating a parallel loop.
create or replace function public.start_recovery_topic_redo(
  p_enrollment_id uuid,
  p_topic_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.recovery_enrollments%rowtype;
  v_existing public.recovery_plan_sessions%rowtype;
  v_topic_label text;
  v_cycle integer;
  v_result jsonb;
  v_old_assignment_id uuid;
  v_has_attempt boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select enrollment.* into v_enrollment
  from public.recovery_enrollments enrollment
  where enrollment.id = p_enrollment_id
    and enrollment.user_id = auth.uid()
    and enrollment.status = 'active'
  for update;

  if v_enrollment.id is null then raise exception 'Active Recovery enrollment not found.'; end if;

  if not exists (
    select 1
    from public.recovery_student_topics topic
    where topic.enrollment_id = p_enrollment_id
      and topic.topic_key = p_topic_key
      and topic.required
  ) then raise exception 'Topic is not part of this Recovery programme.'; end if;

  -- First, reuse/upgrade a not-started mandatory cycle after a failed verify.
  select session.* into v_existing
  from public.recovery_plan_sessions session
  where session.enrollment_id = p_enrollment_id
    and session.topic_key = p_topic_key
    and session.session_type = 'topic'
    and session.status in ('planned', 'available', 'in_progress')
    and coalesce(session.metadata ->> 'mandatory_remediation', 'false') = 'true'
  order by session.created_at desc
  limit 1
  for update;

  if v_existing.id is not null then
    if v_existing.assignment_id is not null then
      select exists (
        select 1
        from public.exercise_builder_attempts attempt
        where attempt.assignment_id = v_existing.assignment_id
      ) into v_has_attempt;
    end if;

    if v_existing.status = 'in_progress' or v_has_attempt then
      return jsonb_build_object(
        'ready', true,
        'existing', true,
        'upgraded_to_full', false,
        'reason', 'active_cycle_already_started',
        'session_id', v_existing.id,
        'assignment_id', v_existing.assignment_id
      );
    end if;

    v_old_assignment_id := v_existing.assignment_id;
    if v_old_assignment_id is not null then
      delete from public.assignments assignment
      where assignment.id = v_old_assignment_id;
    end if;

    update public.recovery_plan_sessions session
    set stages = '["recupera","allenati","modalita_scuola","mini_verifica"]'::jsonb,
        title = left(coalesce((select label from public.recovery_topic_catalog where topic_key = p_topic_key), p_topic_key) || ' — recupero completo', 180),
        rationale = 'Hai scelto di rifare l’intero percorso: ripartiamo dalla spiegazione, poi pratica, modalità scuola e nuova verifica.',
        assignment_id = null,
        assignment_resource_id = null,
        metadata = session.metadata || jsonb_build_object(
          'manual_full_path', true,
          'voluntary_redo_requested', true,
          'stages', '["recupera","allenati","modalita_scuola","mini_verifica"]'::jsonb
        )
    where session.id = v_existing.id;

    v_result := public.materialize_recovery_topic_cycle_session(v_existing.id);
    return v_result || jsonb_build_object(
      'session_id', v_existing.id,
      'existing', true,
      'upgraded_to_full', true
    );
  end if;

  -- Do not create duplicate voluntary cycles on a double click.
  select session.* into v_existing
  from public.recovery_plan_sessions session
  where session.enrollment_id = p_enrollment_id
    and session.topic_key = p_topic_key
    and session.session_type = 'topic'
    and session.status in ('planned', 'available', 'in_progress')
    and coalesce(session.metadata ->> 'voluntary_redo', 'false') = 'true'
  order by session.created_at desc
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'ready', true,
      'existing', true,
      'session_id', v_existing.id,
      'assignment_id', v_existing.assignment_id,
      'cycle', coalesce((v_existing.metadata ->> 'cycle')::integer, 1)
    );
  end if;

  select catalog.label into v_topic_label
  from public.recovery_topic_catalog catalog
  where catalog.topic_key = p_topic_key;

  select count(*) + 1 into v_cycle
  from public.recovery_mastery_evidence evidence
  where evidence.enrollment_id = p_enrollment_id
    and evidence.topic_key = p_topic_key
    and evidence.evidence_type = 'mini_check';

  return public.create_recovery_topic_cycle_session(
    p_enrollment_id,
    p_topic_key,
    '["recupera","allenati","modalita_scuola","mini_verifica"]'::jsonb,
    jsonb_build_object(
      'remediation', false,
      'mandatory_remediation', false,
      'voluntary_redo', true,
      'trigger', 'voluntary_redo',
      'remediation_level', 'full_voluntary',
      'cycle', v_cycle
    ),
    coalesce(v_topic_label, p_topic_key) || ' — rifai il percorso',
    'Nuovo ciclo completo scelto da te. A differenza di “Rivedi tutto”, questa verifica genera nuove evidenze e può aggiornare il consolidamento.',
    90,
    true
  );
end;
$$;

-- Semantic payload for the Recovery-specific result screen. Copy remains in the
-- learner UI; the database returns score band, current mastery and the concrete next cycle.
create or replace function public.get_recovery_topic_followup(p_session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_session public.recovery_plan_sessions%rowtype;
  v_topic public.recovery_student_topics%rowtype;
  v_evidence public.recovery_mastery_evidence%rowtype;
  v_next public.recovery_plan_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select session.* into v_session
  from public.recovery_plan_sessions session
  join public.recovery_enrollments enrollment on enrollment.id = session.enrollment_id
  where session.id = p_session_id
    and enrollment.user_id = auth.uid();

  if v_session.id is null then raise exception 'Recovery session not found.'; end if;
  if v_session.topic_key is null then
    return jsonb_build_object('ready', false, 'reason', 'not_topic_session');
  end if;

  select topic.* into v_topic
  from public.recovery_student_topics topic
  where topic.enrollment_id = v_session.enrollment_id
    and topic.topic_key = v_session.topic_key;

  select evidence.* into v_evidence
  from public.recovery_mastery_evidence evidence
  where evidence.session_id = v_session.id
    and evidence.topic_key = v_session.topic_key
    and evidence.evidence_type = 'mini_check'
  order by evidence.observed_at desc, evidence.created_at desc, evidence.id desc
  limit 1;

  if v_evidence.id is null then
    return jsonb_build_object(
      'ready', false,
      'reason', 'verify_evidence_not_available',
      'topic_key', v_session.topic_key,
      'mastery_state', v_topic.mastery_state
    );
  end if;

  select session.* into v_next
  from public.recovery_plan_sessions session
  where session.enrollment_id = v_session.enrollment_id
    and session.topic_key = v_session.topic_key
    and session.status <> 'skipped'
    and session.metadata ->> 'source_mastery_evidence_id' = v_evidence.id::text
  order by session.created_at desc
  limit 1;

  return jsonb_build_object(
    'ready', true,
    'topic_key', v_session.topic_key,
    'verify_score', round(v_evidence.score, 2),
    'band', public.recovery_topic_remediation_band(v_evidence.score),
    'mastery_state', v_topic.mastery_state,
    'mastery_score', v_topic.mastery_score,
    'mastery_confidence', v_topic.mastery_confidence,
    'remediation_required', v_evidence.score < 80,
    'next_session_id', v_next.id,
    'next_session_status', v_next.status,
    'next_stages', v_next.stages,
    'cycle', case when v_next.id is null then null else (v_next.metadata ->> 'cycle')::integer end,
    'remediation_level', v_next.metadata ->> 'remediation_level'
  );
end;
$$;

revoke all on function public.recovery_topic_remediation_band(numeric) from public;
revoke all on function public.recovery_topic_remediation_stages(numeric) from public;
revoke all on function public.materialize_recovery_topic_cycle_session(uuid) from public;
revoke all on function public.create_recovery_topic_cycle_session(uuid, text, jsonb, jsonb, text, text, numeric, boolean) from public;
revoke all on function public.ensure_recovery_topic_cycle_from_evidence(uuid, text, boolean) from public;
revoke all on function public.schedule_recovery_topic_cycle_after_mini_check() from public;
revoke all on function public.schedule_recovery_topic_cycle_on_needs_recheck() from public;
revoke all on function public.start_recovery_topic_cycle_session(uuid) from public;
revoke all on function public.start_recovery_topic_redo(uuid, text) from public;
revoke all on function public.get_recovery_topic_followup(uuid) from public;

grant execute on function public.start_recovery_topic_cycle_session(uuid) to authenticated;
grant execute on function public.start_recovery_topic_redo(uuid, text) to authenticated;
grant execute on function public.get_recovery_topic_followup(uuid) to authenticated;

notify pgrst, 'reload schema';
