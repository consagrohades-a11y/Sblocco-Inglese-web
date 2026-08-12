-- Scope Recovery checkpoints/mocks to the learner's required topics and session time budget.
-- Existing topic/quick-review/error-review behavior remains unchanged.

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
  v_minutes_used integer := 0;
  v_mapping_minutes integer := 0;
  v_budget_minutes integer := 0;
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
  v_budget_minutes := greatest(5, coalesce(v_session.estimated_minutes, 30));

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
      version.estimated_minutes as version_estimated_minutes,
      coalesce(required_topic.priority_score, 0) as topic_priority,
      case when mapping.topic_key is null then 0 else 1 end as scope_order,
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
    left join public.recovery_student_topics required_topic
      on required_topic.enrollment_id = v_enrollment.id
      and required_topic.topic_key = mapping.topic_key
      and required_topic.required
    where mapping.active
      and exercise.status = 'published'
      and version.review_status = 'approved'
      and (
        (v_session.session_type = 'topic' and mapping.topic_key = v_session.topic_key and mapping.phase in ('recover', 'practice', 'school', 'verify'))
        or (v_session.session_type = 'quick_review' and mapping.topic_key = v_session.topic_key and mapping.phase = 'verify')
        or (v_session.session_type = 'error_review' and mapping.phase = 'error_review' and (mapping.topic_key is null or mapping.topic_key = v_session.topic_key))
        or (
          v_session.session_type = 'checkpoint'
          and mapping.phase = 'checkpoint'
          and (mapping.topic_key is null or required_topic.topic_key is not null)
        )
        or (
          v_session.session_type = 'mock_intermediate'
          and mapping.phase = 'mock_intermediate'
          and (mapping.topic_key is null or required_topic.topic_key is not null)
        )
        or (
          v_session.session_type = 'mock_final'
          and mapping.phase = 'mock_final'
          and (mapping.topic_key is null or required_topic.topic_key is not null)
        )
      )
    order by phase_order, scope_order, topic_priority desc, mapping.sort_order, mapping.created_at
  loop
    v_phase := v_mapping.phase;
    v_phase_order := v_mapping.phase_order;
    v_mapping_minutes := greatest(1, coalesce(v_mapping.estimated_minutes, v_mapping.version_estimated_minutes, 5));

    if v_session.session_type in ('checkpoint', 'mock_intermediate', 'mock_final')
       and v_resource_count > 0
       and v_minutes_used + v_mapping_minutes > v_budget_minutes then
      continue;
    end if;

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
    v_minutes_used := v_minutes_used + v_mapping_minutes;

    insert into public.assignment_resources (
      assignment_id, resource_key, resource_type, title, description,
      route, sequence_index, exercise_config
    ) values (
      v_assignment_id,
      'recovery-' || v_phase || '-' || v_mapping.id::text,
      'custom_exercise',
      case
        when v_session.session_type in ('checkpoint', 'mock_intermediate', 'mock_final') and v_mapping.topic_key is not null
          then v_phase_label || ' · ' || coalesce((select label from public.recovery_topic_catalog where topic_key = v_mapping.topic_key), v_mapping.topic_key)
        else v_phase_label
      end,
      case
        when v_phase = 'school' then 'Esercizi in formati simili a quelli usati nelle verifiche scolastiche.'
        when v_phase in ('mock_intermediate', 'mock_final') then 'Durante la simulazione non vengono mostrati suggerimenti o correzioni immediate.'
        when v_phase = 'checkpoint' and v_mapping.topic_key is not null then 'Verifica mirata su un argomento del tuo programma scolastico.'
        else null
      end,
      '/exercises',
      v_resource_count,
      jsonb_build_object(
        'exercise_id', v_mapping.exercise_id,
        'exercise_version_id', v_mapping.exercise_version_id,
        'recovery_phase', v_phase,
        'recovery_topic_key', v_mapping.topic_key,
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
    'estimated_materialized_minutes', v_minutes_used,
    'session_budget_minutes', v_budget_minutes,
    'existing', false
  );
end;
$$;

revoke all on function public.materialize_recovery_session(uuid) from public, anon;
grant execute on function public.materialize_recovery_session(uuid) to authenticated;

notify pgrst, 'reload schema';