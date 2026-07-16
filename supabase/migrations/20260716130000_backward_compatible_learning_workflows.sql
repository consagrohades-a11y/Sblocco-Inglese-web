-- Additive learner/admin workflow improvements. Existing feedback timings, trainer
-- routes, assignments, and group batches retain their previous behaviour.

alter table public.exercise_builder_sections
  drop constraint if exists exercise_builder_sections_feedback_timing_check;
alter table public.exercise_builder_sections
  add constraint exercise_builder_sections_feedback_timing_check
  check (feedback_timing in ('question_end', 'section_end', 'exercise_end', 'hidden'));

create or replace function public.complete_exercise_builder_question(
  p_attempt_id uuid,
  p_attempt_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question public.exercise_builder_attempt_questions%rowtype;
  v_timing text;
  v_result jsonb;
begin
  select q.* into v_question
  from public.exercise_builder_attempt_questions q
  join public.exercise_builder_attempt_sections s on s.id = q.attempt_section_id
  join public.exercise_builder_attempts a on a.id = q.attempt_id
  where q.id = p_attempt_question_id and q.attempt_id = p_attempt_id
    and a.learner_id = auth.uid() and a.status = 'in_progress';

  if v_question.id is null then raise exception 'Open attempt question not found.'; end if;
  select feedback_timing into v_timing from public.exercise_builder_attempt_sections where id = v_question.attempt_section_id;
  if v_timing <> 'question_end' then raise exception 'Question feedback is not enabled for this section.'; end if;

  v_result := public.exercise_builder_grade_answer(v_question.question_snapshot, v_question.answer);
  update public.exercise_builder_attempt_questions
  set grading_result = v_result, automatic_grading_result = v_result
  where id = v_question.id;
  return public.exercise_builder_attempt_payload(p_attempt_id);
end;
$$;

-- Keep the established payload shape and expose a result early only when the
-- section explicitly opts into question-level feedback.
create or replace function public.exercise_builder_attempt_payload(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'status', a.status, 'attempt_number', a.attempt_number,
      'current_section_index', a.current_section_index, 'current_question_index', a.current_question_index,
      'earned_points', case when a.review_status = 'reviewed' then null else a.earned_points end,
      'max_points', a.max_points,
      'score', case when a.review_status = 'reviewed' then null else a.score end,
      'result_summary', case when a.review_status = 'reviewed' then jsonb_build_object('pending_review', 0, 'review_required', true) else a.result_summary end,
      'review_status', a.review_status,
      'teacher_note', case when a.review_status = 'approved' then a.teacher_note else null end,
      'reviewed_at', case when a.review_status = 'approved' then a.reviewed_at else null end,
      'started_at', a.started_at, 'submitted_at', a.submitted_at
    ),
    'exercise', a.exercise_snapshot,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'sequence_index', s.sequence_index, 'title', s.title,
        'instructions', s.instructions, 'feedback_timing', s.feedback_timing,
        'settings', s.settings, 'status', s.status,
        'earned_points', case when a.review_status = 'reviewed' then null else s.earned_points end,
        'max_points', s.max_points,
        'questions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', q.id, 'sequence_index', q.sequence_index,
            'question', public.exercise_builder_safe_question_snapshot(q.question_snapshot),
            'answer', q.answer,
            'teacher_comment', case when a.review_status = 'approved' then q.teacher_comment else null end,
            'teacher_turn_reviews', case when a.review_status = 'approved' then q.teacher_turn_reviews else '{}'::jsonb end,
            'result', case
              when a.status = 'submitted' then public.exercise_builder_learner_grading_result(q.question_snapshot, case when a.review_status = 'approved' then q.grading_result else coalesce(q.automatic_grading_result, q.grading_result) end)
              when s.feedback_timing = 'question_end' and q.grading_result is not null then public.exercise_builder_learner_grading_result(q.question_snapshot, coalesce(q.automatic_grading_result, q.grading_result))
              when s.status = 'completed' and s.feedback_timing = 'section_end' then public.exercise_builder_learner_grading_result(q.question_snapshot, case when a.review_status = 'approved' then q.grading_result else coalesce(q.automatic_grading_result, q.grading_result) end)
              else null end
          ) order by q.sequence_index)
          from public.exercise_builder_attempt_questions q where q.attempt_section_id = s.id
        ), '[]'::jsonb)
      ) order by s.sequence_index)
      from public.exercise_builder_attempt_sections s where s.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.exercise_builder_attempts a
  where a.id = p_attempt_id and (a.learner_id = auth.uid() or public.is_admin());
$$;

-- Optional assignment scope. The two-argument function is left untouched for
-- old trainer links and continues to aggregate all active assignments.
create or replace function public.get_learner_srs_scope(
  p_item_type text,
  p_domain text,
  p_assignment_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select a.id
    from public.assignments a
    where a.id = p_assignment_id and a.learner_id = auth.uid()
      and a.status in ('published', 'completed')
      and (a.published_at is null or a.published_at <= now())
      and (a.access_ends_at is null or a.access_ends_at > now())
  ), assigned as (
    select distinct coalesce(ai.learning_item_id, ci.learning_item_id) learning_item_id
    from requested a
    join public.assignment_study_settings settings on settings.assignment_id = a.id and settings.include_in_srs
    join public.assignment_items ai on ai.assignment_id = a.id
    left join public.collection_items ci on ci.collection_id = ai.collection_id
  ), scoped as (
    select li.id from assigned join public.learning_items li on li.id = assigned.learning_item_id
    where li.status = 'published'
      and (p_item_type = 'mixed' or li.item_type = p_item_type)
      and (p_domain is null or li.primary_domain = p_domain)
  )
  select jsonb_build_object(
    'guided', true,
    'assignment_id', p_assignment_id,
    'item_ids', coalesce((select jsonb_agg(id order by id) from scoped), '[]'::jsonb),
    'states', coalesce((select jsonb_agg(jsonb_build_object(
      'learning_item_id', state.learning_item_id, 'state', state.state,
      'due_at', state.due_at, 'interval_days', state.interval_days,
      'ease_factor', state.ease_factor, 'repetitions', state.repetitions,
      'lapses', state.lapses, 'last_reviewed_at', state.last_reviewed_at
    )) from public.learner_srs_state state
      where state.learner_id = auth.uid() and state.learning_item_id in (select id from scoped)), '[]'::jsonb)
  );
$$;

-- Create a real group batch without borrowing another learner's assignment.
-- The returned representative assignment is edited with the normal composer.
create or replace function public.admin_create_empty_group_assignment_batch(
  p_group_id uuid,
  p_title text,
  p_learner_note text default null,
  p_admin_note text default null,
  p_required boolean default true,
  p_deadline_at timestamptz default null,
  p_estimated_minutes integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid; v_assignment_id uuid; v_first_assignment uuid; v_first_learner uuid;
  v_member record; v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'Batch title is required.'; end if;
  if p_estimated_minutes is not null and p_estimated_minutes <= 0 then raise exception 'Estimated minutes must be positive.'; end if;
  if not exists (select 1 from public.learner_groups where id = p_group_id and status <> 'archived') then raise exception 'Active group not found.'; end if;

  insert into public.assignment_group_batches(group_id, title, status, required, deadline_at, estimated_minutes, learner_note, admin_note, created_by)
  values (p_group_id, trim(p_title), 'draft', p_required, p_deadline_at, p_estimated_minutes,
    nullif(trim(p_learner_note), ''), nullif(trim(p_admin_note), ''), auth.uid()) returning id into v_batch_id;

  for v_member in select member.learner_id from public.learner_group_members member
    join public.profiles profile on profile.id = member.learner_id
    where member.group_id = p_group_id and member.membership_status = 'active' and profile.status = 'active'
    order by member.created_at
  loop
    insert into public.assignments(learner_id, teacher_id, title, reason, learner_note, status, required,
      deadline_at, estimated_minutes, created_by, group_batch_id)
    values(v_member.learner_id, auth.uid(), trim(p_title), nullif(trim(p_admin_note), ''),
      nullif(trim(p_learner_note), ''), 'draft', p_required, p_deadline_at, p_estimated_minutes, auth.uid(), v_batch_id)
    returning id into v_assignment_id;
    v_count := v_count + 1;
    if v_first_assignment is null then v_first_assignment := v_assignment_id; v_first_learner := v_member.learner_id; end if;
  end loop;
  if v_count = 0 then raise exception 'Group has no active learners.'; end if;
  return jsonb_build_object('batch_id', v_batch_id, 'assignment_count', v_count,
    'editor_assignment_id', v_first_assignment, 'editor_learner_id', v_first_learner);
end;
$$;

create or replace function public.admin_sync_group_assignment_batch_from_assignment(p_source_assignment_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.assignments%rowtype; v_target record; v_resource record;
  v_new_resource_id uuid; v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  select * into v_source from public.assignments where id = p_source_assignment_id;
  if v_source.id is null or v_source.group_batch_id is null then return 0; end if;

  create temporary table if not exists pg_temp.group_resource_map(old_id uuid primary key, new_id uuid not null) on commit drop;
  for v_target in select * from public.assignments where group_batch_id = v_source.group_batch_id and id <> v_source.id
  loop
    update public.assignments set status = 'draft', pending_status = null, published_at = null where id = v_target.id;
    delete from public.assignment_resources where assignment_id = v_target.id;
    delete from public.assignment_items where assignment_id = v_target.id;
    delete from public.assignment_study_settings where assignment_id = v_target.id;
    truncate pg_temp.group_resource_map;

    insert into public.assignment_items(assignment_id, learning_item_id, collection_id, sequence_index, required, introduction_state)
    select v_target.id, learning_item_id, collection_id, sequence_index, required, introduction_state
    from public.assignment_items where assignment_id = v_source.id;
    insert into public.assignment_study_settings(assignment_id, include_in_srs, exercise_modes, selected_deck_ids, selected_item_ids, snapshot_item_count)
    select v_target.id, include_in_srs, exercise_modes, selected_deck_ids, selected_item_ids, snapshot_item_count
    from public.assignment_study_settings where assignment_id = v_source.id;

    for v_resource in select * from public.assignment_resources where assignment_id = v_source.id and collection_parent_resource_id is null order by sequence_index
    loop
      insert into public.assignment_resources(assignment_id, resource_key, resource_type, title, description, route,
        sequence_index, practice_config, exercise_config, collection_config, collection_snapshot, collection_parent_resource_id, collection_item_id)
      values(v_target.id, v_resource.resource_key, v_resource.resource_type, v_resource.title, v_resource.description, v_resource.route,
        v_resource.sequence_index, v_resource.practice_config, v_resource.exercise_config, v_resource.collection_config,
        v_resource.collection_snapshot, null, v_resource.collection_item_id) returning id into v_new_resource_id;
      insert into pg_temp.group_resource_map values(v_resource.id, v_new_resource_id);
    end loop;
    for v_resource in select * from public.assignment_resources where assignment_id = v_source.id and collection_parent_resource_id is not null order by sequence_index
    loop
      insert into public.assignment_resources(assignment_id, resource_key, resource_type, title, description, route,
        sequence_index, practice_config, exercise_config, collection_config, collection_snapshot, collection_parent_resource_id, collection_item_id)
      values(v_target.id, v_resource.resource_key, v_resource.resource_type, v_resource.title, v_resource.description, v_resource.route,
        v_resource.sequence_index, v_resource.practice_config, v_resource.exercise_config, v_resource.collection_config,
        v_resource.collection_snapshot, (select new_id from pg_temp.group_resource_map where old_id = v_resource.collection_parent_resource_id), v_resource.collection_item_id);
    end loop;

    update public.assignments set title = v_source.title, reason = v_source.reason, learner_note = v_source.learner_note,
      required = v_source.required, deadline_at = v_source.deadline_at, estimated_minutes = v_source.estimated_minutes,
      status = v_source.status, published_at = case when v_source.status = 'published' then coalesce(v_source.published_at, now()) else null end
    where id = v_target.id;
    v_count := v_count + 1;
  end loop;
  update public.assignment_group_batches set source_assignment_id = v_source.id, title = v_source.title,
    status = case when v_source.status = 'published' then 'published' else 'draft' end,
    required = v_source.required, deadline_at = v_source.deadline_at, estimated_minutes = v_source.estimated_minutes,
    learner_note = v_source.learner_note, admin_note = v_source.reason
  where id = v_source.group_batch_id;
  return v_count;
end;
$$;

revoke all on function public.complete_exercise_builder_question(uuid, uuid) from public;
revoke all on function public.get_learner_srs_scope(text, text, uuid) from public;
revoke all on function public.admin_create_empty_group_assignment_batch(uuid, text, text, text, boolean, timestamptz, integer) from public;
revoke all on function public.admin_sync_group_assignment_batch_from_assignment(uuid) from public;
grant execute on function public.complete_exercise_builder_question(uuid, uuid) to authenticated;
grant execute on function public.get_learner_srs_scope(text, text, uuid) to authenticated;
grant execute on function public.admin_create_empty_group_assignment_batch(uuid, text, text, text, boolean, timestamptz, integer) to authenticated;
grant execute on function public.admin_sync_group_assignment_batch_from_assignment(uuid) to authenticated;
notify pgrst, 'reload schema';
