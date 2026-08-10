-- Recupero Debito exercise bridge.
-- Recovery maps approved Exercise Builder versions; it does not duplicate exercise content.

create table public.recovery_exercise_map (
  id uuid primary key default gen_random_uuid(),
  topic_key text references public.recovery_topic_catalog(topic_key) on delete cascade,
  phase text not null check (phase in ('recover', 'practice', 'school', 'verify', 'error_review', 'checkpoint', 'mock_intermediate', 'mock_final')),
  exercise_id uuid not null references public.exercise_builder_exercises(id) on delete cascade,
  exercise_version_id uuid not null references public.exercise_builder_exercise_versions(id) on delete restrict,
  school_test_type text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 5 and 120),
  active boolean not null default true,
  sort_order integer not null default 100 check (sort_order > 0),
  created_at timestamptz not null default now(),
  unique (topic_key, phase, exercise_version_id)
);

create index recovery_exercise_map_lookup_idx
  on public.recovery_exercise_map(topic_key, phase, active, sort_order);

create or replace function public.validate_recovery_exercise_map()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.exercise_builder_exercises exercise
    join public.exercise_builder_exercise_versions version on version.id = new.exercise_version_id
    where exercise.id = new.exercise_id
      and version.exercise_id = exercise.id
      and exercise.status = 'published'
      and version.review_status = 'approved'
  ) then
    raise exception 'Recovery exercises must reference an approved published Exercise Builder version.';
  end if;

  if new.phase in ('recover', 'practice', 'school', 'verify') and new.topic_key is null then
    raise exception 'Topic phases require a recovery topic.';
  end if;

  if new.phase = 'checkpoint' and exists (
    select 1 from public.exercise_builder_sections section
    where section.exercise_version_id = new.exercise_version_id
      and section.feedback_timing not in ('exercise_end', 'hidden')
  ) then
    raise exception 'Recovery checkpoints may only use exercise_end or hidden section feedback.';
  end if;

  if new.phase in ('mock_intermediate', 'mock_final') and exists (
    select 1 from public.exercise_builder_sections section
    where section.exercise_version_id = new.exercise_version_id
      and section.feedback_timing <> 'hidden'
  ) then
    raise exception 'Recovery mock exams require hidden feedback for every section.';
  end if;

  return new;
end;
$$;

create trigger recovery_exercise_map_validate
before insert or update on public.recovery_exercise_map
for each row execute function public.validate_recovery_exercise_map();

alter table public.recovery_exercise_map enable row level security;
create policy recovery_exercise_map_admin_all
on public.recovery_exercise_map for all to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.recovery_exercise_map to authenticated;

create or replace function public.materialize_recovery_session(p_session_id uuid)
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
  v_mapping record;
  v_resource_count integer := 0;
  v_phase text;
  v_phase_label text;
  v_is_mock boolean;
  v_phase_order integer;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select * into v_session
  from public.recovery_plan_sessions
  where id = p_session_id
  for update;
  if v_session.id is null then raise exception 'Recovery session not found.'; end if;

  select * into v_enrollment
  from public.recovery_enrollments
  where id = v_session.enrollment_id and user_id = auth.uid() and status = 'active';
  if v_enrollment.id is null then raise exception 'Recovery enrollment not found.'; end if;

  if v_session.assignment_id is not null then
    return jsonb_build_object('ready', true, 'assignment_id', v_session.assignment_id, 'resource_id', v_session.assignment_resource_id, 'existing', true);
  end if;

  v_is_mock := v_session.session_type in ('mock_intermediate', 'mock_final');

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

  for v_mapping in
    select mapping.*,
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
    where mapping.active
      and exercise.status = 'published'
      and version.review_status = 'approved'
      and (
        (v_session.session_type = 'topic' and mapping.topic_key = v_session.topic_key and mapping.phase in ('recover', 'practice', 'school', 'verify'))
        or (v_session.session_type = 'quick_review' and mapping.topic_key = v_session.topic_key and mapping.phase = 'verify')
        or (v_session.session_type = 'error_review' and mapping.phase = 'error_review' and (mapping.topic_key is null or mapping.topic_key = v_session.topic_key))
        or (v_session.session_type = 'checkpoint' and mapping.phase = 'checkpoint')
        or (v_session.session_type = 'mock_intermediate' and mapping.phase = 'mock_intermediate')
        or (v_session.session_type = 'mock_final' and mapping.phase = 'mock_final')
      )
    order by phase_order, mapping.sort_order
  loop
    v_phase := v_mapping.phase;
    v_phase_order := v_mapping.phase_order;
    v_phase_label := case v_phase
      when 'recover' then 'Recupera'
      when 'practice' then 'Allenati'
      when 'school' then 'Modalità scuola'
      when 'verify' then 'Mini-verifica'
      when 'error_review' then 'Ripassa gli errori'
      when 'checkpoint' then 'Verifica di percorso'
      when 'mock_intermediate' then 'Simulazione'
      when 'mock_final' then 'Simulazione finale'
      else 'Attività'
    end;

    v_resource_count := v_resource_count + 1;
    insert into public.assignment_resources (
      assignment_id, resource_key, resource_type, title, description,
      route, sequence_index, exercise_config
    ) values (
      v_assignment_id,
      'recovery-' || v_phase || '-' || v_mapping.id::text,
      'custom_exercise',
      v_phase_label,
      case
        when v_phase = 'school' then 'Esercizi in formati simili a quelli usati nelle verifiche scolastiche.'
        when v_phase in ('mock_intermediate', 'mock_final') then 'Durante la simulazione non vengono mostrati suggerimenti o correzioni immediate.'
        else null
      end,
      '/exercises',
      v_resource_count,
      jsonb_build_object(
        'exercise_id', v_mapping.exercise_id,
        'exercise_version_id', v_mapping.exercise_version_id,
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

    if v_resource_count = 1 then
      update public.recovery_plan_sessions
      set assignment_id = v_assignment_id,
          assignment_resource_id = v_resource_id,
          status = case when status = 'available' then 'in_progress' else status end
      where id = p_session_id;
    end if;
  end loop;

  if v_resource_count = 0 then
    delete from public.assignments where id = v_assignment_id;
    return jsonb_build_object('ready', false, 'reason', 'no_content_mapping');
  end if;

  return jsonb_build_object(
    'ready', true,
    'assignment_id', v_assignment_id,
    'resource_id', v_resource_id,
    'resource_count', v_resource_count,
    'existing', false
  );
end;
$$;

create or replace function public.sync_recovery_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.recovery_plan_sessions%rowtype;
  v_user_id uuid;
  v_resource_total integer;
  v_submitted_total integer;
  v_average_score numeric;
  v_primary_attempt_id uuid;
  v_topic_scores jsonb := '{}'::jsonb;
  v_assessment_type text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select session.*, enrollment.user_id into v_session, v_user_id
  from public.recovery_plan_sessions session
  join public.recovery_enrollments enrollment on enrollment.id = session.enrollment_id
  where session.id = p_session_id and enrollment.user_id = auth.uid();

  if v_session.id is null then raise exception 'Recovery session not found.'; end if;
  if v_session.assignment_id is null then return jsonb_build_object('completed', false, 'materialized', false); end if;

  select count(*) into v_resource_total
  from public.assignment_resources resource
  where resource.assignment_id = v_session.assignment_id
    and resource.resource_type = 'custom_exercise';

  select count(*) into v_submitted_total
  from public.assignment_resources resource
  where resource.assignment_id = v_session.assignment_id
    and resource.resource_type = 'custom_exercise'
    and exists (
      select 1 from public.exercise_builder_attempts attempt
      where attempt.assignment_resource_id = resource.id
        and attempt.learner_id = auth.uid()
        and attempt.status = 'submitted'
    );

  if v_resource_total = 0 or v_submitted_total < v_resource_total then
    return jsonb_build_object('completed', false, 'materialized', true, 'submitted_resources', v_submitted_total, 'total_resources', v_resource_total);
  end if;

  select round(avg(latest.score), 2) into v_average_score
  from (
    select distinct on (attempt.assignment_resource_id)
      attempt.assignment_resource_id, attempt.score
    from public.exercise_builder_attempts attempt
    join public.assignment_resources resource on resource.id = attempt.assignment_resource_id
    where resource.assignment_id = v_session.assignment_id
      and attempt.learner_id = auth.uid()
      and attempt.status = 'submitted'
    order by attempt.assignment_resource_id, attempt.submitted_at desc nulls last, attempt.attempt_number desc
  ) latest
  where latest.score is not null;

  select attempt.id into v_primary_attempt_id
  from public.exercise_builder_attempts attempt
  where attempt.assignment_resource_id = v_session.assignment_resource_id
    and attempt.learner_id = auth.uid()
    and attempt.status = 'submitted'
  order by attempt.submitted_at desc nulls last, attempt.attempt_number desc
  limit 1;

  if v_primary_attempt_id is not null then
    select coalesce(jsonb_object_agg(by_topic.topic, by_topic.score), '{}'::jsonb)
    into v_topic_scores
    from (
      select
        question_version.topic,
        round(
          100.0 * sum(coalesce((attempt_question.grading_result ->> 'earned_points')::numeric, 0))
          / nullif(sum(coalesce((attempt_question.grading_result ->> 'max_points')::numeric, 0)), 0),
          0
        ) as score
      from public.exercise_builder_attempt_questions attempt_question
      join public.exercise_builder_question_versions question_version on question_version.id = attempt_question.question_version_id
      where attempt_question.attempt_id = v_primary_attempt_id
        and attempt_question.grading_result is not null
      group by question_version.topic
      having sum(coalesce((attempt_question.grading_result ->> 'max_points')::numeric, 0)) > 0
    ) by_topic;
  end if;

  update public.recovery_plan_sessions
  set status = 'completed',
      score = v_average_score,
      completed_at = coalesce(completed_at, now())
  where id = p_session_id;

  if v_session.topic_key is not null and v_average_score is not null then
    update public.recovery_student_topics topic
    set mastery_score = case
          when topic.mastery_score is null then v_average_score
          else round((topic.mastery_score * 0.5) + (v_average_score * 0.5), 2)
        end,
        last_evidence_at = now()
    where topic.enrollment_id = v_session.enrollment_id
      and topic.topic_key = v_session.topic_key;
  end if;

  if v_session.session_type in ('checkpoint', 'mock_intermediate', 'mock_final') then
    v_assessment_type := v_session.session_type;
    insert into public.recovery_assessment_attempts (
      enrollment_id, session_id, assessment_type, exercise_attempt_id,
      score, topic_scores, submitted_at, feedback_released
    ) values (
      v_session.enrollment_id, v_session.id, v_assessment_type, v_primary_attempt_id,
      v_average_score, v_topic_scores, now(), true
    )
    on conflict (session_id, assessment_type) do update set
      exercise_attempt_id = excluded.exercise_attempt_id,
      score = excluded.score,
      topic_scores = excluded.topic_scores,
      submitted_at = excluded.submitted_at,
      feedback_released = true;

    update public.recovery_student_topics topic
    set checkpoint_score = case when v_session.session_type = 'checkpoint'
          then coalesce((v_topic_scores ->> topic.topic_key)::numeric, topic.checkpoint_score)
          else topic.checkpoint_score end,
        mock_score = case when v_session.session_type in ('mock_intermediate', 'mock_final')
          then coalesce((v_topic_scores ->> topic.topic_key)::numeric, topic.mock_score)
          else topic.mock_score end,
        last_evidence_at = now()
    where topic.enrollment_id = v_session.enrollment_id
      and topic.required;
  end if;

  update public.recovery_plan_sessions next_session
  set status = 'available'
  where next_session.id = (
    select queued.id
    from public.recovery_plan_sessions queued
    where queued.enrollment_id = v_session.enrollment_id
      and queued.status = 'planned'
    order by queued.sequence_index
    limit 1
  );

  if not exists (
    select 1 from public.recovery_plan_sessions remaining
    where remaining.enrollment_id = v_session.enrollment_id
      and remaining.status <> 'completed'
  ) then
    update public.recovery_enrollments
    set status = 'completed', completed_at = now()
    where id = v_session.enrollment_id;
  end if;

  return jsonb_build_object(
    'completed', true,
    'score', v_average_score,
    'topic_scores', v_topic_scores,
    'assessment_type', v_assessment_type
  );
end;
$$;

revoke all on function public.materialize_recovery_session(uuid) from public;
revoke all on function public.sync_recovery_session(uuid) from public;
grant execute on function public.materialize_recovery_session(uuid) to authenticated;
grant execute on function public.sync_recovery_session(uuid) to authenticated;

notify pgrst, 'reload schema';
