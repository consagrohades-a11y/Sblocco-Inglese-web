-- Convert existing Exercise Builder diagnostic summaries into recovery-plan evidence.
-- This is a read model only: the existing diagnostic event system remains authoritative.

create or replace function public.get_recovery_error_evidence(p_enrollment_id uuid)
returns table (
  topic_key text,
  repeated_errors integer,
  recent_error_rate numeric,
  diagnostic_status text
)
language sql
security definer
stable
set search_path = ''
as $$
  with owned as (
    select enrollment.id, enrollment.user_id
    from public.recovery_enrollments enrollment
    where enrollment.id = p_enrollment_id
      and (enrollment.user_id = auth.uid() or public.is_admin())
  ),
  evidence as (
    select
      student_topic.topic_key,
      coalesce(sum(summary.recent_errors), 0)::integer as repeated_errors,
      case
        when sum(summary.recent_opportunities) > 0
          then round(sum(summary.recent_errors) / sum(summary.recent_opportunities), 5)
        else 0
      end as recent_error_rate,
      case
        when bool_or(summary.diagnostic_status = 'weakness') then 'weakness'
        when bool_or(summary.diagnostic_status = 'emerging_weakness') then 'emerging_weakness'
        when bool_or(summary.diagnostic_status = 'improving') then 'improving'
        when bool_or(summary.diagnostic_status = 'mastered') then 'mastered'
        when bool_or(summary.diagnostic_status = 'stable') then 'stable'
        else 'not_enough_data'
      end as diagnostic_status
    from owned
    join public.recovery_student_topics student_topic on student_topic.enrollment_id = owned.id and student_topic.required
    join public.recovery_topic_catalog catalog on catalog.topic_key = student_topic.topic_key
    left join public.exercise_builder_diagnostic_codes code
      on lower(regexp_replace(code.topic, '[^a-zA-Z0-9]+', '-', 'g')) in (catalog.topic_key, catalog.diagnostic_key)
      and code.status = 'active'
    left join public.exercise_builder_learner_diagnostic_summaries summary
      on summary.learner_id = owned.user_id
      and summary.diagnostic_code = code.code
    group by student_topic.topic_key
  )
  select evidence.topic_key, evidence.repeated_errors, evidence.recent_error_rate, evidence.diagnostic_status
  from evidence
  order by evidence.repeated_errors desc, evidence.topic_key;
$$;

revoke all on function public.get_recovery_error_evidence(uuid) from public;
grant execute on function public.get_recovery_error_evidence(uuid) to authenticated;

notify pgrst, 'reload schema';
