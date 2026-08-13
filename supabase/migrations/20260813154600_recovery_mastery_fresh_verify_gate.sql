-- Recovery Mastery v2 freshness gate. Same-form mini-checks remain historical evidence,
-- but only fresh mini-checks, checkpoint, or mock evidence may satisfy the reliable recovery gate.

create or replace function public.recalculate_recovery_topic_mastery(
  p_enrollment_id uuid,
  p_topic_key text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_topic public.recovery_student_topics%rowtype;
  v_weighted_score numeric;
  v_weight_sum numeric;
  v_evidence_count integer := 0;
  v_reliable_latest numeric;
  v_reliable_latest_at timestamptz;
  v_reliable_latest_type text;
  v_new_state text;
  v_confidence numeric;
  v_reason jsonb;
  v_had_recovered boolean;
  v_fresh_mini_checks integer := 0;
  v_nonfresh_mini_checks integer := 0;
begin
  select * into v_topic
  from public.recovery_student_topics topic
  where topic.enrollment_id = p_enrollment_id
    and topic.topic_key = p_topic_key
    and topic.required;

  if v_topic.enrollment_id is null then
    return jsonb_build_object('updated', false, 'reason', 'topic_not_found');
  end if;

  v_had_recovered := v_topic.mastery_state = 'recovered';

  with recent as (
    select evidence.score,
           evidence.evidence_weight,
           evidence.evidence_type,
           evidence.observed_at,
           case
             when evidence.observed_at >= now() - interval '3 days' then 1.00
             when evidence.observed_at >= now() - interval '7 days' then 0.90
             when evidence.observed_at >= now() - interval '14 days' then 0.75
             else 0.60
           end as recency_factor
    from public.recovery_mastery_evidence evidence
    where evidence.enrollment_id = p_enrollment_id
      and evidence.topic_key = p_topic_key
    order by evidence.observed_at desc
    limit 12
  )
  select
    round(sum(score * evidence_weight * recency_factor) / nullif(sum(evidence_weight * recency_factor), 0), 2),
    sum(evidence_weight * recency_factor),
    count(*)
  into v_weighted_score, v_weight_sum, v_evidence_count
  from recent;

  if v_evidence_count = 0 and v_topic.diagnostic_score is not null then
    v_weighted_score := v_topic.diagnostic_score;
    v_weight_sum := 0.20;
  end if;

  select evidence.score, evidence.observed_at, evidence.evidence_type
  into v_reliable_latest, v_reliable_latest_at, v_reliable_latest_type
  from public.recovery_mastery_evidence evidence
  where evidence.enrollment_id = p_enrollment_id
    and evidence.topic_key = p_topic_key
    and (
      evidence.evidence_type in ('checkpoint', 'mock')
      or (
        evidence.evidence_type = 'mini_check'
        and coalesce(evidence.metadata -> 'fresh_form', 'true'::jsonb) = 'true'::jsonb
      )
    )
  order by evidence.observed_at desc, evidence.created_at desc, evidence.id desc
  limit 1;

  select
    count(*) filter (
      where evidence.evidence_type = 'mini_check'
        and coalesce(evidence.metadata -> 'fresh_form', 'true'::jsonb) = 'true'::jsonb
    ),
    count(*) filter (
      where evidence.evidence_type = 'mini_check'
        and evidence.metadata -> 'fresh_form' = 'false'::jsonb
    )
  into v_fresh_mini_checks, v_nonfresh_mini_checks
  from public.recovery_mastery_evidence evidence
  where evidence.enrollment_id = p_enrollment_id
    and evidence.topic_key = p_topic_key;

  v_weighted_score := greatest(0, least(100, coalesce(v_weighted_score, 0)));
  v_confidence := greatest(0, least(100, round(coalesce(v_weight_sum, 0) * 30, 2)));

  if (v_had_recovered and (
        coalesce(v_reliable_latest, 100) < 70
        or v_topic.repeated_errors >= 3
      ))
     or (v_reliable_latest is not null and v_reliable_latest < 60 and coalesce(v_topic.mastery_score, 0) >= 80) then
    v_new_state := 'needs_recheck';
  elsif v_weighted_score >= 80
        and v_reliable_latest is not null
        and v_reliable_latest >= 80 then
    v_new_state := 'recovered';
  elsif v_weighted_score >= 70
        or (v_topic.verification_only and v_reliable_latest is null and coalesce(v_topic.diagnostic_score, 0) >= 85) then
    v_new_state := 'almost_ready';
  elsif v_weighted_score >= 45 then
    v_new_state := 'training';
  else
    v_new_state := 'needs_recovery';
  end if;

  v_reason := jsonb_build_object(
    'weighted_score', round(v_weighted_score, 2),
    'evidence_count', v_evidence_count,
    'confidence', round(v_confidence, 2),
    'latest_reliable_score', v_reliable_latest,
    'latest_reliable_at', v_reliable_latest_at,
    'latest_reliable_type', v_reliable_latest_type,
    'fresh_mini_check_count', v_fresh_mini_checks,
    'nonfresh_mini_check_count', v_nonfresh_mini_checks,
    'repeated_errors', v_topic.repeated_errors,
    'diagnostic_score', v_topic.diagnostic_score,
    'verification_only', v_topic.verification_only,
    'rule_version', 'recovery-mastery-v2-retake-freshness'
  );

  update public.recovery_student_topics topic
  set mastery_score = round(v_weighted_score, 2),
      mastery_state = v_new_state,
      mastery_confidence = round(v_confidence, 2),
      mastery_reason = v_reason,
      last_evidence_at = case
        when v_evidence_count > 0 then (
          select max(evidence.observed_at)
          from public.recovery_mastery_evidence evidence
          where evidence.enrollment_id = p_enrollment_id
            and evidence.topic_key = p_topic_key
        )
        else topic.last_evidence_at
      end
  where topic.enrollment_id = p_enrollment_id
    and topic.topic_key = p_topic_key;

  return jsonb_build_object(
    'updated', true,
    'topic_key', p_topic_key,
    'mastery_score', round(v_weighted_score, 2),
    'mastery_state', v_new_state,
    'mastery_confidence', round(v_confidence, 2),
    'reason', v_reason
  );
end;
$$;

alter function public.recalculate_recovery_topic_mastery(uuid, text) security definer;

notify pgrst, 'reload schema';
