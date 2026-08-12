-- Voluntary full-topic review for Recupero Debito.
-- A learner may revisit all four published phases of a required topic without
-- inserting work into the adaptive plan or changing Recovery mastery state.

create or replace function public.get_recovery_topic_review_availability(p_enrollment_id uuid)
returns table (
  topic_key text,
  available boolean,
  estimated_minutes integer,
  phase_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.recovery_enrollments enrollment
    where enrollment.id = p_enrollment_id
      and enrollment.user_id = auth.uid()
      and enrollment.status in ('active', 'completed')
  ) then
    raise exception 'Recovery enrollment not found.';
  end if;

  return query
  with ranked_mapping as (
    select
      mapping.topic_key,
      mapping.phase,
      coalesce(mapping.estimated_minutes, version.estimated_minutes, 0) as minutes,
      row_number() over (
        partition by mapping.topic_key, mapping.phase
        order by mapping.sort_order, mapping.created_at desc
      ) as row_rank
    from public.recovery_exercise_map mapping
    join public.exercise_builder_exercises exercise
      on exercise.id = mapping.exercise_id
    join public.exercise_builder_exercise_versions version
      on version.id = mapping.exercise_version_id
    where mapping.active
      and mapping.phase in ('recover', 'practice', 'school', 'verify')
      and exercise.status = 'published'
      and version.review_status = 'approved'
  ), selected_mapping as (
    select ranked.topic_key, ranked.phase, ranked.minutes
    from ranked_mapping ranked
    where ranked.row_rank = 1
  )
  select
    student_topic.topic_key,
    count(selected.phase)::integer = 4 as available,
    coalesce(sum(selected.minutes), 0)::integer as estimated_minutes,
    count(selected.phase)::integer as phase_count
  from public.recovery_student_topics student_topic
  left join selected_mapping selected
    on selected.topic_key = student_topic.topic_key
  where student_topic.enrollment_id = p_enrollment_id
    and student_topic.required
  group by student_topic.topic_key;
end;
$$;

create or replace function public.start_recovery_topic_full_review(
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
  v_topic_label text;
  v_assignment_id uuid;
  v_resource_id uuid;
  v_first_resource_id uuid;
  v_mapping record;
  v_resource_count integer := 0;
  v_total_minutes integer := 0;
  v_phase_count integer := 0;
  v_phase_label text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select enrollment.*
  into v_enrollment
  from public.recovery_enrollments enrollment
  where enrollment.id = p_enrollment_id
    and enrollment.user_id = auth.uid()
    and enrollment.status in ('active', 'completed');

  if v_enrollment.id is null then
    raise exception 'Recovery enrollment not found.';
  end if;

  if not exists (
    select 1
    from public.recovery_student_topics topic
    where topic.enrollment_id = p_enrollment_id
      and topic.topic_key = p_topic_key
      and topic.required
  ) then
    raise exception 'Topic is not part of this Recovery programme.';
  end if;

  select catalog.label
  into v_topic_label
  from public.recovery_topic_catalog catalog
  where catalog.topic_key = p_topic_key;

  with ranked_mapping as (
    select
      mapping.id,
      mapping.phase,
      mapping.exercise_id,
      mapping.exercise_version_id,
      mapping.sort_order,
      coalesce(mapping.estimated_minutes, version.estimated_minutes, 0) as minutes,
      row_number() over (
        partition by mapping.phase
        order by mapping.sort_order, mapping.created_at desc
      ) as row_rank
    from public.recovery_exercise_map mapping
    join public.exercise_builder_exercises exercise
      on exercise.id = mapping.exercise_id
    join public.exercise_builder_exercise_versions version
      on version.id = mapping.exercise_version_id
    where mapping.active
      and mapping.topic_key = p_topic_key
      and mapping.phase in ('recover', 'practice', 'school', 'verify')
      and exercise.status = 'published'
      and version.review_status = 'approved'
  )
  select count(*)::integer, coalesce(sum(minutes), 0)::integer
  into v_phase_count, v_total_minutes
  from ranked_mapping
  where row_rank = 1;

  if v_phase_count <> 4 then
    return jsonb_build_object(
      'ready', false,
      'reason', 'incomplete_topic_content',
      'phase_count', v_phase_count
    );
  end if;

  insert into public.assignments (
    learner_id,
    title,
    reason,
    learner_note,
    status,
    required,
    deadline_at,
    estimated_minutes,
    published_at,
    created_by
  ) values (
    auth.uid(),
    'Ripasso completo — ' || coalesce(v_topic_label, p_topic_key),
    'Ripasso libero · Recupero Debito Inglese',
    'Ripasso volontario dell’intero argomento. Non modifica il piano adattivo o lo stato di consolidamento.',
    'published',
    false,
    case when v_enrollment.exam_date is null then null else v_enrollment.exam_date::timestamptz end,
    greatest(5, v_total_minutes),
    now(),
    auth.uid()
  ) returning id into v_assignment_id;

  for v_mapping in
    with ranked_mapping as (
      select
        mapping.*,
        row_number() over (
          partition by mapping.phase
          order by mapping.sort_order, mapping.created_at desc
        ) as row_rank
      from public.recovery_exercise_map mapping
      join public.exercise_builder_exercises exercise
        on exercise.id = mapping.exercise_id
      join public.exercise_builder_exercise_versions version
        on version.id = mapping.exercise_version_id
      where mapping.active
        and mapping.topic_key = p_topic_key
        and mapping.phase in ('recover', 'practice', 'school', 'verify')
        and exercise.status = 'published'
        and version.review_status = 'approved'
    )
    select ranked.*,
      case ranked.phase
        when 'recover' then 10
        when 'practice' then 20
        when 'school' then 30
        when 'verify' then 40
        else 100
      end as phase_order
    from ranked_mapping ranked
    where ranked.row_rank = 1
    order by phase_order
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
      assignment_id,
      resource_key,
      resource_type,
      title,
      description,
      route,
      sequence_index,
      exercise_config
    ) values (
      v_assignment_id,
      'recovery-full-review-' || v_mapping.phase || '-' || v_mapping.id::text,
      'custom_exercise',
      v_phase_label,
      case
        when v_mapping.phase = 'recover' then 'Riparti dalla spiegazione completa e dagli esempi essenziali.'
        when v_mapping.phase = 'practice' then 'Recupero attivo della forma e del significato in contesti diversi.'
        when v_mapping.phase = 'school' then 'Formati vicini a quelli usati nelle verifiche scolastiche.'
        when v_mapping.phase = 'verify' then 'Verifica finale dell’argomento, senza feedback durante lo svolgimento.'
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
        'allow_retry', true,
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

  return jsonb_build_object(
    'ready', true,
    'assignment_id', v_assignment_id,
    'resource_id', v_first_resource_id,
    'resource_count', v_resource_count,
    'estimated_minutes', v_total_minutes,
    'mastery_unchanged', true
  );
end;
$$;

revoke all on function public.get_recovery_topic_review_availability(uuid) from public;
revoke all on function public.start_recovery_topic_full_review(uuid, text) from public;
grant execute on function public.get_recovery_topic_review_availability(uuid) to authenticated;
grant execute on function public.start_recovery_topic_full_review(uuid, text) to authenticated;

notify pgrst, 'reload schema';
