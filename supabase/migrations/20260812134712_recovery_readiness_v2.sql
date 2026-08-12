-- Recupero Debito Readiness Engine v2.
-- Readiness measures current preparation on the selected school programme.
-- It is not a predicted school grade or pass probability.

create table public.recovery_readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.recovery_enrollments(id) on delete cascade,
  snapshot_key text not null unique check (length(snapshot_key) between 8 and 240),
  readiness_score numeric(5,2) not null check (readiness_score between 0 and 100),
  confidence_score numeric(5,2) not null check (confidence_score between 0 and 100),
  readiness_band text not null check (readiness_band in (
    'da_costruire', 'in_consolidamento', 'quasi_solido', 'buona_preparazione', 'molto_solido'
  )),
  confidence_band text not null check (confidence_band in (
    'prime_evidenze', 'evidenze_parziali', 'evidenze_buone', 'evidenze_solide'
  )),
  mastery_component numeric(5,2) not null check (mastery_component between 0 and 100),
  coverage_component numeric(5,2) not null check (coverage_component between 0 and 100),
  assessment_component numeric(5,2) not null check (assessment_component between 0 and 100),
  error_stability_component numeric(5,2) not null check (error_stability_component between 0 and 100),
  plan_completion numeric(5,2) not null check (plan_completion between 0 and 100),
  required_topics_count integer not null default 0 check (required_topics_count >= 0),
  recovered_topics_count integer not null default 0 check (recovered_topics_count >= 0),
  reliable_topics_count integer not null default 0 check (reliable_topics_count >= 0),
  checkpoint_score numeric(5,2) check (checkpoint_score is null or checkpoint_score between 0 and 100),
  mock_score numeric(5,2) check (mock_score is null or mock_score between 0 and 100),
  mock_type text,
  reason jsonb not null default '{}'::jsonb check (jsonb_typeof(reason) = 'object'),
  captured_at timestamptz not null default now()
);

create index recovery_readiness_snapshots_enrollment_idx
  on public.recovery_readiness_snapshots(enrollment_id, captured_at desc);

alter table public.recovery_readiness_snapshots enable row level security;

create policy recovery_readiness_snapshots_owner_read
on public.recovery_readiness_snapshots for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.recovery_enrollments enrollment
    where enrollment.id = enrollment_id
      and enrollment.user_id = (select auth.uid())
  )
);

revoke all privileges on table public.recovery_readiness_snapshots from anon, authenticated;
grant select on table public.recovery_readiness_snapshots to authenticated;

create or replace function public.compute_recovery_readiness_internal(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_topic_count integer := 0;
  v_recovered_count integer := 0;
  v_reliable_count integer := 0;
  v_mastery numeric := 0;
  v_coverage numeric := 0;
  v_error_stability numeric := 100;
  v_checkpoint numeric;
  v_mock numeric;
  v_mock_type text;
  v_assessment_raw numeric := 0;
  v_assessment numeric := 0;
  v_assessment_coverage numeric := 0;
  v_plan_completion numeric := 0;
  v_readiness numeric := 0;
  v_confidence numeric := 0;
  v_readiness_band text;
  v_confidence_band text;
  v_next_action text;
  v_reason jsonb;
begin
  if not exists (
    select 1 from public.recovery_enrollments enrollment where enrollment.id = p_enrollment_id
  ) then
    return jsonb_build_object('available', false, 'reason', 'enrollment_not_found');
  end if;

  with topic_data as (
    select
      topic.topic_key,
      topic.mastery_state,
      coalesce(topic.mastery_score, topic.diagnostic_score, 0)::numeric as base_score,
      topic.repeated_errors,
      case topic.mastery_state
        when 'needs_recovery' then 44::numeric
        when 'training' then 69::numeric
        when 'almost_ready' then 84::numeric
        when 'needs_recheck' then 64::numeric
        when 'recovered' then 100::numeric
        else 44::numeric
      end as state_cap,
      exists (
        select 1
        from public.recovery_mastery_evidence evidence
        where evidence.enrollment_id = topic.enrollment_id
          and evidence.topic_key = topic.topic_key
          and evidence.evidence_type in ('mini_check', 'checkpoint', 'mock')
      ) as has_reliable,
      case
        when exists (
          select 1 from public.recovery_mastery_evidence evidence
          where evidence.enrollment_id = topic.enrollment_id
            and evidence.topic_key = topic.topic_key
            and evidence.evidence_type in ('checkpoint', 'mock')
        ) then 100::numeric
        when exists (
          select 1 from public.recovery_mastery_evidence evidence
          where evidence.enrollment_id = topic.enrollment_id
            and evidence.topic_key = topic.topic_key
            and evidence.evidence_type = 'mini_check'
        ) then 85::numeric
        when exists (
          select 1 from public.recovery_mastery_evidence evidence
          where evidence.enrollment_id = topic.enrollment_id
            and evidence.topic_key = topic.topic_key
            and evidence.evidence_type = 'school_mode'
        ) then 65::numeric
        when exists (
          select 1 from public.recovery_mastery_evidence evidence
          where evidence.enrollment_id = topic.enrollment_id
            and evidence.topic_key = topic.topic_key
            and evidence.evidence_type in ('practice', 'error_review')
        ) then 45::numeric
        when exists (
          select 1 from public.recovery_mastery_evidence evidence
          where evidence.enrollment_id = topic.enrollment_id
            and evidence.topic_key = topic.topic_key
            and evidence.evidence_type in ('diagnostic', 'guided_practice')
        ) or topic.diagnostic_score is not null then 25::numeric
        else 0::numeric
      end as evidence_coverage
    from public.recovery_student_topics topic
    where topic.enrollment_id = p_enrollment_id
      and topic.required
  )
  select
    count(*),
    count(*) filter (where mastery_state = 'recovered'),
    count(*) filter (where has_reliable),
    coalesce(round(avg(least(base_score, state_cap)), 2), 0),
    coalesce(round(avg(evidence_coverage), 2), 0),
    coalesce(round(avg(greatest(0, 100 - least(100, greatest(0, repeated_errors) * 20))), 2), 100)
  into v_topic_count, v_recovered_count, v_reliable_count, v_mastery, v_coverage, v_error_stability
  from topic_data;

  select assessment.score
  into v_checkpoint
  from public.recovery_assessment_attempts assessment
  where assessment.enrollment_id = p_enrollment_id
    and assessment.assessment_type = 'checkpoint'
    and assessment.score is not null
  order by assessment.submitted_at desc nulls last, assessment.created_at desc
  limit 1;

  select assessment.score, assessment.assessment_type
  into v_mock, v_mock_type
  from public.recovery_assessment_attempts assessment
  where assessment.enrollment_id = p_enrollment_id
    and assessment.assessment_type in ('mock_intermediate', 'mock_final')
    and assessment.score is not null
  order by assessment.submitted_at desc nulls last, assessment.created_at desc
  limit 1;

  if v_mock is not null then
    v_assessment_raw := case
      when v_checkpoint is not null then (v_mock * 0.75) + (v_checkpoint * 0.25)
      else v_mock
    end;
    if v_mock_type = 'mock_final' then
      v_assessment := v_assessment_raw;
      v_assessment_coverage := 100;
    else
      v_assessment := v_assessment_raw * 0.85;
      v_assessment_coverage := 80;
    end if;
  elsif v_checkpoint is not null then
    v_assessment_raw := v_checkpoint;
    v_assessment := v_checkpoint * 0.65;
    v_assessment_coverage := 45;
  else
    v_assessment_raw := 0;
    v_assessment := 0;
    v_assessment_coverage := 0;
  end if;

  select
    case
      when count(*) = 0 then 0
      else round(100.0 * count(*) filter (where session.status in ('completed', 'skipped')) / count(*), 2)
    end
  into v_plan_completion
  from public.recovery_plan_sessions session
  where session.enrollment_id = p_enrollment_id;

  if v_topic_count = 0 then
    v_readiness := 0;
    v_confidence := 0;
  else
    v_readiness := round(
      (v_mastery * 0.60)
      + (v_coverage * 0.10)
      + (v_assessment * 0.20)
      + (v_error_stability * 0.10),
      2
    );
    v_confidence := round(
      (v_coverage * 0.70)
      + (v_assessment_coverage * 0.30),
      2
    );
  end if;

  v_readiness := greatest(0, least(100, coalesce(v_readiness, 0)));
  v_confidence := greatest(0, least(100, coalesce(v_confidence, 0)));

  v_readiness_band := case
    when v_readiness < 45 then 'da_costruire'
    when v_readiness < 65 then 'in_consolidamento'
    when v_readiness < 80 then 'quasi_solido'
    when v_readiness < 90 then 'buona_preparazione'
    else 'molto_solido'
  end;

  v_confidence_band := case
    when v_confidence < 35 then 'prime_evidenze'
    when v_confidence < 65 then 'evidenze_parziali'
    when v_confidence < 85 then 'evidenze_buone'
    else 'evidenze_solide'
  end;

  v_next_action := case
    when v_topic_count = 0 then 'configure_program'
    when exists (
      select 1
      from public.recovery_student_topics topic
      where topic.enrollment_id = p_enrollment_id
        and topic.required
        and topic.mastery_state in ('needs_recovery', 'needs_recheck')
    ) then 'consolidate_priority'
    when v_reliable_count < v_topic_count then 'verify_remaining_topics'
    when v_checkpoint is null then 'take_checkpoint'
    when v_mock is null then 'take_mock'
    when v_mock_type <> 'mock_final' then 'take_final_mock'
    else 'continue_targeted_review'
  end;

  v_reason := jsonb_build_object(
    'rule_version', 'recovery-readiness-v2',
    'weights', jsonb_build_object(
      'mastery', 0.60,
      'coverage', 0.10,
      'assessment', 0.20,
      'error_stability', 0.10
    ),
    'state_caps', jsonb_build_object(
      'needs_recovery', 44,
      'training', 69,
      'almost_ready', 84,
      'recovered', 100,
      'needs_recheck', 64
    ),
    'assessment_raw_score', round(v_assessment_raw, 2),
    'assessment_coverage', round(v_assessment_coverage, 2),
    'required_topics', v_topic_count,
    'recovered_topics', v_recovered_count,
    'reliable_topics', v_reliable_count,
    'disclaimer', 'current_preparation_not_grade_prediction'
  );

  return jsonb_build_object(
    'available', true,
    'enrollment_id', p_enrollment_id,
    'readiness_score', round(v_readiness, 2),
    'confidence_score', round(v_confidence, 2),
    'readiness_band', v_readiness_band,
    'confidence_band', v_confidence_band,
    'components', jsonb_build_object(
      'mastery', round(v_mastery, 2),
      'coverage', round(v_coverage, 2),
      'assessment', round(v_assessment, 2),
      'error_stability', round(v_error_stability, 2)
    ),
    'plan_completion', round(v_plan_completion, 2),
    'required_topics_count', v_topic_count,
    'recovered_topics_count', v_recovered_count,
    'reliable_topics_count', v_reliable_count,
    'checkpoint_score', case when v_checkpoint is null then null else round(v_checkpoint, 2) end,
    'mock_score', case when v_mock is null then null else round(v_mock, 2) end,
    'mock_type', v_mock_type,
    'next_action', v_next_action,
    'reason', v_reason,
    'calculated_at', now()
  );
end;
$$;

create or replace function public.get_recovery_readiness(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_current jsonb;
  v_history jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not exists (
    select 1
    from public.recovery_enrollments enrollment
    where enrollment.id = p_enrollment_id
      and (enrollment.user_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'Recovery enrollment not found.';
  end if;

  v_current := public.compute_recovery_readiness_internal(p_enrollment_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', snapshot.id,
    'snapshot_key', snapshot.snapshot_key,
    'readiness_score', snapshot.readiness_score,
    'confidence_score', snapshot.confidence_score,
    'readiness_band', snapshot.readiness_band,
    'confidence_band', snapshot.confidence_band,
    'components', jsonb_build_object(
      'mastery', snapshot.mastery_component,
      'coverage', snapshot.coverage_component,
      'assessment', snapshot.assessment_component,
      'error_stability', snapshot.error_stability_component
    ),
    'plan_completion', snapshot.plan_completion,
    'required_topics_count', snapshot.required_topics_count,
    'recovered_topics_count', snapshot.recovered_topics_count,
    'reliable_topics_count', snapshot.reliable_topics_count,
    'checkpoint_score', snapshot.checkpoint_score,
    'mock_score', snapshot.mock_score,
    'mock_type', snapshot.mock_type,
    'captured_at', snapshot.captured_at
  ) order by snapshot.captured_at desc), '[]'::jsonb)
  into v_history
  from (
    select *
    from public.recovery_readiness_snapshots snapshot
    where snapshot.enrollment_id = p_enrollment_id
    order by snapshot.captured_at desc
    limit 30
  ) snapshot;

  return jsonb_build_object('current', v_current, 'history', coalesce(v_history, '[]'::jsonb));
end;
$$;

create or replace function public.capture_recovery_readiness(
  p_enrollment_id uuid,
  p_snapshot_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_components jsonb;
  v_reason jsonb;
begin
  if coalesce(length(trim(p_snapshot_key)), 0) < 8 then
    raise exception 'Readiness snapshot requires an idempotency key.';
  end if;

  v_payload := public.compute_recovery_readiness_internal(p_enrollment_id);
  if coalesce((v_payload ->> 'available')::boolean, false) is false then
    return v_payload;
  end if;

  v_components := coalesce(v_payload -> 'components', '{}'::jsonb);
  v_reason := coalesce(v_payload -> 'reason', '{}'::jsonb);

  insert into public.recovery_readiness_snapshots (
    enrollment_id, snapshot_key, readiness_score, confidence_score,
    readiness_band, confidence_band,
    mastery_component, coverage_component, assessment_component, error_stability_component,
    plan_completion, required_topics_count, recovered_topics_count, reliable_topics_count,
    checkpoint_score, mock_score, mock_type, reason, captured_at
  ) values (
    p_enrollment_id,
    left(p_snapshot_key, 240),
    (v_payload ->> 'readiness_score')::numeric,
    (v_payload ->> 'confidence_score')::numeric,
    v_payload ->> 'readiness_band',
    v_payload ->> 'confidence_band',
    coalesce((v_components ->> 'mastery')::numeric, 0),
    coalesce((v_components ->> 'coverage')::numeric, 0),
    coalesce((v_components ->> 'assessment')::numeric, 0),
    coalesce((v_components ->> 'error_stability')::numeric, 100),
    coalesce((v_payload ->> 'plan_completion')::numeric, 0),
    coalesce((v_payload ->> 'required_topics_count')::integer, 0),
    coalesce((v_payload ->> 'recovered_topics_count')::integer, 0),
    coalesce((v_payload ->> 'reliable_topics_count')::integer, 0),
    nullif(v_payload ->> 'checkpoint_score', '')::numeric,
    nullif(v_payload ->> 'mock_score', '')::numeric,
    nullif(v_payload ->> 'mock_type', ''),
    v_reason,
    now()
  )
  on conflict (snapshot_key) do nothing;

  return v_payload;
end;
$$;

create or replace function public.capture_recovery_readiness_on_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.plan_version is distinct from old.plan_version and new.plan_version > 0 then
    perform public.capture_recovery_readiness(
      new.id,
      'plan:' || new.id::text || ':v' || new.plan_version::text
    );
  end if;
  return new;
end;
$$;

create or replace function public.capture_recovery_readiness_on_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    perform public.capture_recovery_readiness(
      new.enrollment_id,
      'session:' || new.id::text || ':completed'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists recovery_enrollments_capture_readiness on public.recovery_enrollments;
create trigger recovery_enrollments_capture_readiness
after update of plan_version on public.recovery_enrollments
for each row execute function public.capture_recovery_readiness_on_plan();

drop trigger if exists recovery_plan_sessions_capture_readiness on public.recovery_plan_sessions;
create trigger recovery_plan_sessions_capture_readiness
after update of status on public.recovery_plan_sessions
for each row execute function public.capture_recovery_readiness_on_session();

revoke all on function public.compute_recovery_readiness_internal(uuid) from public, anon, authenticated;
revoke all on function public.capture_recovery_readiness(uuid, text) from public, anon, authenticated;
revoke all on function public.capture_recovery_readiness_on_plan() from public, anon, authenticated;
revoke all on function public.capture_recovery_readiness_on_session() from public, anon, authenticated;
revoke all on function public.get_recovery_readiness(uuid) from public, anon, authenticated;
grant execute on function public.get_recovery_readiness(uuid) to authenticated;

notify pgrst, 'reload schema';