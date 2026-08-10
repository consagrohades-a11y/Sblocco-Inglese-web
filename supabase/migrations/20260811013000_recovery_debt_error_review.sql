-- Friendly Recupero Debito error-review feed backed by the existing Exercise Builder diagnostics.

create or replace function public.get_recovery_error_review(p_enrollment_id uuid)
returns table (
  diagnostic_code text,
  label text,
  topic_key text,
  subtopic text,
  recent_errors numeric,
  recent_error_rate numeric,
  diagnostic_status text,
  message text
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
  required as (
    select student_topic.topic_key, catalog.diagnostic_key
    from owned
    join public.recovery_student_topics student_topic on student_topic.enrollment_id = owned.id and student_topic.required
    join public.recovery_topic_catalog catalog on catalog.topic_key = student_topic.topic_key
  )
  select
    code.code,
    code.label,
    required.topic_key,
    code.subtopic,
    summary.recent_errors,
    summary.recent_error_rate,
    summary.diagnostic_status,
    coalesce(message.message_text, code.label)
  from owned
  join public.exercise_builder_learner_diagnostic_summaries summary on summary.learner_id = owned.user_id
  join public.exercise_builder_diagnostic_codes code on code.code = summary.diagnostic_code and code.category = 'learning' and code.status = 'active'
  join required on lower(regexp_replace(code.topic, '[^a-zA-Z0-9]+', '-', 'g')) in (required.topic_key, required.diagnostic_key)
  left join lateral (
    select diagnostic_message.message_text
    from public.exercise_builder_diagnostic_messages diagnostic_message
    where diagnostic_message.diagnostic_code = code.code
      and diagnostic_message.language = 'it'
    order by case diagnostic_message.message_level
      when 'weakness' then 1
      when 'reminder' then 2
      when 'subtopic_review' then 3
      else 4
    end
    limit 1
  ) message on true
  where summary.recent_errors > 0
  order by summary.recent_errors desc, summary.recent_error_rate desc, code.severity desc, code.code;
$$;

revoke all on function public.get_recovery_error_review(uuid) from public;
grant execute on function public.get_recovery_error_review(uuid) to authenticated;

notify pgrst, 'reload schema';
