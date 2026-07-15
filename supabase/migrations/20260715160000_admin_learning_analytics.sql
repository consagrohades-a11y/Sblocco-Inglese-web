-- Operational learner analytics for assignments, SRS and Exercise Builder.

create index if not exists learner_review_history_created_learner_idx
  on public.learner_review_history(created_at desc, learner_id);
create index if not exists exercise_builder_attempts_submitted_learner_idx
  on public.exercise_builder_attempts(submitted_at desc, learner_id)
  where status = 'submitted';
create index if not exists assignments_status_deadline_idx
  on public.assignments(status, deadline_at);
create index if not exists exercise_builder_diagnostic_events_created_idx
  on public.exercise_builder_diagnostic_events(created_at desc, diagnostic_code);

create or replace function public.admin_get_learning_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := case when p_days in (7, 30, 90, 3650) then p_days else 30 end;
  v_since timestamptz;
  v_chart_days integer;
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  v_since := now() - make_interval(days => v_days);
  v_chart_days := least(v_days, 30);

  with
  period_reviews as (
    select history.*
    from public.learner_review_history history
    where history.created_at >= v_since
  ),
  period_attempts as (
    select attempt.*,
      coalesce(nullif(resource.exercise_config ->> 'required_score', '')::numeric, 70) required_score,
      coalesce(attempt.submitted_at, attempt.started_at) activity_at
    from public.exercise_builder_attempts attempt
    left join public.assignment_resources resource on resource.id = attempt.assignment_resource_id
    where coalesce(attempt.submitted_at, attempt.started_at) >= v_since
  ),
  submitted_attempts as (
    select * from period_attempts where status = 'submitted'
  ),
  active_learners as (
    select learner_id from period_reviews
    union
    select learner_id from period_attempts
  ),
  overview as (
    select jsonb_build_object(
      'period_days', v_days,
      'learner_count', (select count(*) from public.profiles where role = 'learner' and status = 'active'),
      'active_learners', (select count(*) from active_learners),
      'srs_reviews', (select count(*) from period_reviews),
      'srs_success_rate', coalesce((select round(
        100.0 * count(*) filter (where objective_result in ('correct', 'nearly_correct'))
        / nullif(count(*) filter (where objective_result <> 'skipped'), 0), 1
      ) from period_reviews), 0),
      'exercise_attempts', (select count(*) from submitted_attempts),
      'average_exercise_score', coalesce((select round(avg(score), 1) from submitted_attempts where score is not null), 0),
      'exercise_pass_rate', coalesce((select round(
        100.0 * count(*) filter (where score >= required_score)
        / nullif(count(*) filter (where score is not null), 0), 1
      ) from submitted_attempts), 0),
      'pending_reviews', (select count(*) from public.exercise_builder_attempts attempt
        where attempt.status = 'submitted'
          and (attempt.review_status = 'reviewed' or coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) > 0)),
      'open_assignments', (select count(*) from public.assignments where status = 'published'),
      'overdue_assignments', (select count(*) from public.assignments
        where status = 'published' and deadline_at is not null and deadline_at < now()),
      'completed_assignments', (select count(*) from public.assignments
        where status = 'completed' and updated_at >= v_since)
    ) payload
  ),
  calendar_days as (
    select generate_series(
      current_date - (v_chart_days - 1),
      current_date,
      interval '1 day'
    )::date activity_date
  ),
  daily_activity as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'date', calendar.activity_date,
      'srs_reviews', (select count(*) from period_reviews review where review.created_at >= calendar.activity_date and review.created_at < calendar.activity_date + 1),
      'exercise_attempts', (select count(*) from submitted_attempts attempt where attempt.submitted_at >= calendar.activity_date and attempt.submitted_at < calendar.activity_date + 1),
      'active_learners', (
        select count(distinct activity.learner_id)
        from (
          select review.learner_id from period_reviews review where review.created_at >= calendar.activity_date and review.created_at < calendar.activity_date + 1
          union all
          select attempt.learner_id from period_attempts attempt where attempt.activity_at >= calendar.activity_date and attempt.activity_at < calendar.activity_date + 1
        ) activity
      )
    ) order by calendar.activity_date), '[]'::jsonb) payload
    from calendar_days calendar
  ),
  learner_rows as (
    select
      profile.id,
      coalesce(nullif(trim(profile.display_name), ''), auth_user.email::text, 'Studente') learner_name,
      auth_user.email::text learner_email,
      profile.status,
      profile.created_at,
      coalesce(review_stats.review_count, 0) srs_reviews,
      coalesce(review_stats.success_rate, 0) srs_success_rate,
      coalesce(state_stats.introduced_cards, 0) introduced_cards,
      coalesce(state_stats.due_cards, 0) due_cards,
      coalesce(state_stats.struggling_cards, 0) struggling_cards,
      coalesce(assignment_stats.open_assignments, 0) open_assignments,
      coalesce(assignment_stats.completed_assignments, 0) completed_assignments,
      coalesce(assignment_stats.overdue_assignments, 0) overdue_assignments,
      coalesce(attempt_stats.exercise_attempts, 0) exercise_attempts,
      attempt_stats.average_score,
      coalesce(attempt_stats.pending_reviews, 0) pending_reviews,
      coalesce(collection_stats.collection_paths, 0) collection_paths,
      coalesce(collection_stats.collection_progress, 0) collection_progress,
      greatest(review_stats.last_activity, attempt_stats.last_activity) last_activity
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.id
    left join lateral (
      select
        count(*) review_count,
        coalesce(round(
          100.0 * count(*) filter (where history.objective_result in ('correct', 'nearly_correct'))
          / nullif(count(*) filter (where history.objective_result <> 'skipped'), 0), 1
        ), 0) success_rate,
        max(history.created_at) last_activity
      from period_reviews history
      where history.learner_id = profile.id
    ) review_stats on true
    left join lateral (
      select
        count(*) introduced_cards,
        count(*) filter (where state.due_at <= now() and state.state not in ('mastered', 'suspended')) due_cards,
        count(*) filter (where state.state = 'lapsed' or state.lapses > 0 or state.last_rating in ('again', 'hard')) struggling_cards
      from public.learner_srs_state state
      where state.learner_id = profile.id
    ) state_stats on true
    left join lateral (
      select
        count(*) filter (where assignment.status = 'published') open_assignments,
        count(*) filter (where assignment.status = 'completed' and assignment.updated_at >= v_since) completed_assignments,
        count(*) filter (where assignment.status = 'published' and assignment.deadline_at < now()) overdue_assignments
      from public.assignments assignment
      where assignment.learner_id = profile.id
    ) assignment_stats on true
    left join lateral (
      select
        count(*) filter (where attempt.status = 'submitted') exercise_attempts,
        round(avg(attempt.score) filter (where attempt.status = 'submitted' and attempt.score is not null), 1) average_score,
        count(*) filter (where attempt.status = 'submitted' and (
          attempt.review_status = 'reviewed'
          or coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) > 0
        )) pending_reviews,
        max(attempt.activity_at) last_activity
      from period_attempts attempt
      where attempt.learner_id = profile.id
    ) attempt_stats on true
    left join lateral (
      select
        count(*) collection_paths,
        round(avg(progress.progress_percent), 1) collection_progress
      from public.assignment_collection_progress progress
      where progress.learner_id = profile.id
    ) collection_stats on true
    where profile.role = 'learner'
  ),
  learners as (
    select coalesce(jsonb_agg(to_jsonb(learner_rows) order by
      overdue_assignments desc,
      pending_reviews desc,
      last_activity desc nulls last,
      learner_name
    ), '[]'::jsonb) payload
    from learner_rows
  ),
  card_rows as (
    select
      item.id,
      item.public_id,
      item.display_target,
      item.item_type,
      item.primary_domain,
      item.level,
      count(*) review_count,
      count(distinct history.learner_id) learner_count,
      count(*) filter (where history.objective_result = 'incorrect') incorrect_count,
      count(*) filter (where history.objective_result = 'nearly_correct') nearly_correct_count,
      round(100.0 * (
        count(*) filter (where history.objective_result in ('incorrect', 'skipped'))
        + 0.5 * count(*) filter (where history.objective_result = 'nearly_correct')
      ) / nullif(count(*), 0), 1) difficulty_rate,
      round(avg(history.response_time_ms) filter (where history.response_time_ms is not null) / 1000.0, 1) average_seconds,
      max(history.created_at) last_reviewed_at
    from period_reviews history
    join public.learning_items item on item.id = history.learning_item_id
    group by item.id
    having count(*) >= 2
    order by difficulty_rate desc, review_count desc, item.display_target
    limit 15
  ),
  difficult_cards as (
    select coalesce(jsonb_agg(to_jsonb(card_rows) order by difficulty_rate desc, review_count desc), '[]'::jsonb) payload
    from card_rows
  ),
  exercise_rows as (
    select
      attempt.exercise_id,
      max(attempt.exercise_snapshot ->> 'public_id') exercise_public_id,
      max(attempt.exercise_snapshot ->> 'title') exercise_title,
      count(*) attempt_count,
      count(distinct attempt.learner_id) learner_count,
      round(avg(attempt.score) filter (where attempt.score is not null), 1) average_score,
      coalesce(round(
        100.0 * count(*) filter (where attempt.score >= attempt.required_score)
        / nullif(count(*) filter (where attempt.score is not null), 0), 1
      ), 0) pass_rate,
      count(*) filter (where attempt.review_status = 'reviewed' or coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) > 0) pending_reviews,
      max(attempt.submitted_at) last_attempt_at
    from submitted_attempts attempt
    group by attempt.exercise_id
    order by attempt_count desc, last_attempt_at desc
    limit 15
  ),
  exercises as (
    select coalesce(jsonb_agg(to_jsonb(exercise_rows) order by attempt_count desc, last_attempt_at desc), '[]'::jsonb) payload
    from exercise_rows
  ),
  diagnostic_rows as (
    select
      event.diagnostic_code,
      coalesce(max(code.label), event.diagnostic_code) label,
      coalesce(max(code.primary_skill), 'other') primary_skill,
      count(distinct event.learner_id) learner_count,
      sum(event.opportunity_count) opportunity_count,
      sum(event.error_count) error_count,
      coalesce(round(100.0 * sum(event.error_count) / nullif(sum(event.opportunity_count), 0), 1), 0) error_rate,
      max(event.created_at) last_detected_at
    from public.exercise_builder_diagnostic_events event
    left join public.exercise_builder_diagnostic_codes code on code.code = event.diagnostic_code
    where event.created_at >= v_since
    group by event.diagnostic_code
    having sum(event.opportunity_count) > 0
    order by error_rate desc, error_count desc
    limit 15
  ),
  diagnostics as (
    select coalesce(jsonb_agg(to_jsonb(diagnostic_rows) order by error_rate desc, error_count desc), '[]'::jsonb) payload
    from diagnostic_rows
  )
  select jsonb_build_object(
    'generated_at', now(),
    'overview', overview.payload,
    'daily_activity', daily_activity.payload,
    'learners', learners.payload,
    'difficult_cards', difficult_cards.payload,
    'exercises', exercises.payload,
    'diagnostics', diagnostics.payload
  ) into v_result
  from overview, daily_activity, learners, difficult_cards, exercises, diagnostics;

  return v_result;
end;
$$;

revoke all on function public.admin_get_learning_analytics(integer) from public;
grant execute on function public.admin_get_learning_analytics(integer) to authenticated;

create or replace function public.admin_get_learner_analytics(
  p_learner_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := case when p_days in (7, 30, 90, 3650) then p_days else 30 end;
  v_since timestamptz;
  v_chart_days integer;
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if not exists (select 1 from public.profiles where id = p_learner_id and role = 'learner') then
    raise exception 'Learner not found.';
  end if;

  v_since := now() - make_interval(days => v_days);
  v_chart_days := least(v_days, 30);

  with
  period_reviews as (
    select history.*
    from public.learner_review_history history
    where history.learner_id = p_learner_id
      and history.created_at >= v_since
  ),
  period_attempts as (
    select attempt.*,
      coalesce(nullif(resource.exercise_config ->> 'required_score', '')::numeric, 70) required_score,
      coalesce(attempt.submitted_at, attempt.started_at) activity_at
    from public.exercise_builder_attempts attempt
    left join public.assignment_resources resource on resource.id = attempt.assignment_resource_id
    where attempt.learner_id = p_learner_id
      and coalesce(attempt.submitted_at, attempt.started_at) >= v_since
  ),
  profile_payload as (
    select jsonb_build_object(
      'id', profile.id,
      'learner_name', coalesce(nullif(trim(profile.display_name), ''), auth_user.email::text, 'Studente'),
      'learner_email', auth_user.email::text,
      'status', profile.status,
      'created_at', profile.created_at
    ) payload
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.id
    where profile.id = p_learner_id
  ),
  overview as (
    select jsonb_build_object(
      'period_days', v_days,
      'srs_reviews', (select count(*) from period_reviews),
      'srs_success_rate', coalesce((select round(
        100.0 * count(*) filter (where objective_result in ('correct', 'nearly_correct'))
        / nullif(count(*) filter (where objective_result <> 'skipped'), 0), 1
      ) from period_reviews), 0),
      'introduced_cards', (select count(*) from public.learner_srs_state where learner_id = p_learner_id),
      'due_cards', (select count(*) from public.learner_srs_state
        where learner_id = p_learner_id and due_at <= now() and state not in ('mastered', 'suspended')),
      'struggling_cards', (select count(*) from public.learner_srs_state
        where learner_id = p_learner_id and (state = 'lapsed' or lapses > 0 or last_rating in ('again', 'hard'))),
      'exercise_attempts', (select count(*) from period_attempts where status = 'submitted'),
      'average_exercise_score', (select round(avg(score), 1) from period_attempts where status = 'submitted' and score is not null),
      'exercise_pass_rate', coalesce((select round(
        100.0 * count(*) filter (where status = 'submitted' and score >= required_score)
        / nullif(count(*) filter (where status = 'submitted' and score is not null), 0), 1
      ) from period_attempts), 0),
      'pending_reviews', (select count(*) from public.exercise_builder_attempts attempt
        where attempt.learner_id = p_learner_id
          and attempt.status = 'submitted'
          and (attempt.review_status = 'reviewed' or coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) > 0)),
      'open_assignments', (select count(*) from public.assignments where learner_id = p_learner_id and status = 'published'),
      'overdue_assignments', (select count(*) from public.assignments
        where learner_id = p_learner_id and status = 'published' and deadline_at is not null and deadline_at < now()),
      'completed_assignments', (select count(*) from public.assignments
        where learner_id = p_learner_id and status = 'completed' and updated_at >= v_since),
      'collection_progress', coalesce((select round(avg(progress_percent), 1)
        from public.assignment_collection_progress where learner_id = p_learner_id), 0),
      'last_activity', greatest(
        (select max(created_at) from period_reviews),
        (select max(activity_at) from period_attempts)
      )
    ) payload
  ),
  calendar_days as (
    select generate_series(
      current_date - (v_chart_days - 1),
      current_date,
      interval '1 day'
    )::date activity_date
  ),
  daily_activity as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'date', calendar.activity_date,
      'srs_reviews', (select count(*) from period_reviews review where review.created_at >= calendar.activity_date and review.created_at < calendar.activity_date + 1),
      'exercise_attempts', (select count(*) from period_attempts attempt where attempt.status = 'submitted' and attempt.submitted_at >= calendar.activity_date and attempt.submitted_at < calendar.activity_date + 1)
    ) order by calendar.activity_date), '[]'::jsonb) payload
    from calendar_days calendar
  ),
  card_rows as (
    select
      item.id,
      item.public_id,
      item.display_target,
      item.item_type,
      item.primary_domain,
      item.level,
      count(*) review_count,
      count(*) filter (where history.objective_result = 'incorrect') incorrect_count,
      count(*) filter (where history.objective_result = 'nearly_correct') nearly_correct_count,
      round(100.0 * (
        count(*) filter (where history.objective_result in ('incorrect', 'skipped'))
        + 0.5 * count(*) filter (where history.objective_result = 'nearly_correct')
      ) / nullif(count(*), 0), 1) difficulty_rate,
      max(history.created_at) last_reviewed_at
    from period_reviews history
    join public.learning_items item on item.id = history.learning_item_id
    group by item.id
    order by difficulty_rate desc, review_count desc, item.display_target
    limit 12
  ),
  difficult_cards as (
    select coalesce(jsonb_agg(to_jsonb(card_rows) order by difficulty_rate desc, review_count desc), '[]'::jsonb) payload
    from card_rows
  ),
  exercise_rows as (
    select
      attempt.exercise_id,
      max(attempt.exercise_snapshot ->> 'public_id') exercise_public_id,
      max(attempt.exercise_snapshot ->> 'title') exercise_title,
      count(*) attempt_count,
      round(avg(attempt.score) filter (where attempt.score is not null), 1) average_score,
      coalesce(round(
        100.0 * count(*) filter (where attempt.score >= attempt.required_score)
        / nullif(count(*) filter (where attempt.score is not null), 0), 1
      ), 0) pass_rate,
      count(*) filter (where attempt.review_status = 'reviewed' or coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) > 0) pending_reviews,
      max(attempt.submitted_at) last_attempt_at
    from period_attempts attempt
    where attempt.status = 'submitted'
    group by attempt.exercise_id
    order by last_attempt_at desc
    limit 12
  ),
  exercises as (
    select coalesce(jsonb_agg(to_jsonb(exercise_rows) order by last_attempt_at desc), '[]'::jsonb) payload
    from exercise_rows
  ),
  diagnostic_rows as (
    select
      event.diagnostic_code,
      coalesce(max(code.label), event.diagnostic_code) label,
      coalesce(max(code.primary_skill), 'other') primary_skill,
      sum(event.opportunity_count) opportunity_count,
      sum(event.error_count) error_count,
      coalesce(round(100.0 * sum(event.error_count) / nullif(sum(event.opportunity_count), 0), 1), 0) error_rate,
      max(event.created_at) last_detected_at
    from public.exercise_builder_diagnostic_events event
    left join public.exercise_builder_diagnostic_codes code on code.code = event.diagnostic_code
    where event.learner_id = p_learner_id
      and event.created_at >= v_since
    group by event.diagnostic_code
    having sum(event.opportunity_count) > 0
    order by error_rate desc, error_count desc
    limit 12
  ),
  diagnostics as (
    select coalesce(jsonb_agg(to_jsonb(diagnostic_rows) order by error_rate desc, error_count desc), '[]'::jsonb) payload
    from diagnostic_rows
  ),
  assignment_rows as (
    select
      assignment.id,
      assignment.title,
      assignment.status,
      assignment.required,
      assignment.deadline_at,
      assignment.updated_at,
      coalesce(attempt_stats.attempt_count, 0) attempt_count,
      attempt_stats.latest_score,
      coalesce(collection_stats.progress_percent, 0) collection_progress
    from public.assignments assignment
    left join lateral (
      select count(*) filter (where attempt.status = 'submitted') attempt_count,
        (array_agg(attempt.score order by attempt.submitted_at desc nulls last) filter (where attempt.status = 'submitted'))[1] latest_score
      from public.exercise_builder_attempts attempt
      where attempt.assignment_id = assignment.id
    ) attempt_stats on true
    left join lateral (
      select round(avg(progress.progress_percent), 1) progress_percent
      from public.assignment_collection_progress progress
      where progress.assignment_id = assignment.id
    ) collection_stats on true
    where assignment.learner_id = p_learner_id
    order by
      case assignment.status when 'published' then 0 when 'draft' then 1 when 'completed' then 2 else 3 end,
      assignment.deadline_at asc nulls last,
      assignment.updated_at desc
    limit 20
  ),
  assignments as (
    select coalesce(jsonb_agg(to_jsonb(assignment_rows)), '[]'::jsonb) payload
    from assignment_rows
  ),
  activity_rows as (
    select * from (
      select
        history.created_at,
        'srs_review'::text activity_type,
        item.display_target title,
        history.objective_result outcome,
        null::numeric score,
        history.id reference_id,
        null::uuid assignment_id
      from period_reviews history
      join public.learning_items item on item.id = history.learning_item_id
      union all
      select
        attempt.submitted_at created_at,
        'exercise_attempt'::text activity_type,
        coalesce(nullif(attempt.exercise_snapshot ->> 'title', ''), 'Esercizio') title,
        case
          when attempt.review_status = 'reviewed' or coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) > 0 then 'pending_review'
          when attempt.score >= attempt.required_score then 'passed'
          else 'not_passed'
        end outcome,
        attempt.score,
        attempt.id reference_id,
        attempt.assignment_id
      from period_attempts attempt
      where attempt.status = 'submitted'
    ) combined_activity
    order by created_at desc
    limit 40
  ),
  recent_activity as (
    select coalesce(jsonb_agg(to_jsonb(activity_rows) order by created_at desc), '[]'::jsonb) payload
    from activity_rows
  )
  select jsonb_build_object(
    'generated_at', now(),
    'profile', profile_payload.payload,
    'overview', overview.payload,
    'daily_activity', daily_activity.payload,
    'difficult_cards', difficult_cards.payload,
    'exercises', exercises.payload,
    'diagnostics', diagnostics.payload,
    'assignments', assignments.payload,
    'recent_activity', recent_activity.payload
  ) into v_result
  from profile_payload, overview, daily_activity, difficult_cards, exercises, diagnostics, assignments, recent_activity;

  return v_result;
end;
$$;

revoke all on function public.admin_get_learner_analytics(uuid, integer) from public;
grant execute on function public.admin_get_learner_analytics(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
