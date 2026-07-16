-- Give learner assignment pages a single, backwards-compatible progress view.
-- Existing assignment resources and attempts are not rewritten.

create or replace function public.learner_assignment_progress(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_resource record;
  v_state text;
  v_attempt record;
  v_attempt_count integer;
  v_required integer;
  v_total integer := 0;
  v_done integer := 0;
  v_resources jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select id, learner_id, status into v_assignment
  from public.assignments
  where id = p_assignment_id
    and (learner_id = auth.uid() or public.is_admin());
  if not found then raise exception 'Assignment not found.'; end if;

  for v_resource in
    select resource.*,
      progress.completed_items as collection_completed_items,
      progress.total_items as collection_total_items,
      progress.completed_at as collection_completed_at
    from public.assignment_resources resource
    left join public.assignment_collection_progress progress on progress.parent_resource_id = resource.id
    where resource.assignment_id = p_assignment_id
      and resource.collection_parent_resource_id is null
    order by resource.sequence_index, resource.created_at
  loop
    v_total := v_total + 1;
    v_state := 'not_started';

    if v_resource.resource_type = 'custom_exercise' then
      select attempt.* into v_attempt
      from public.exercise_builder_attempts attempt
      where attempt.assignment_resource_id = v_resource.id
        and attempt.learner_id = v_assignment.learner_id
      order by attempt.attempt_number desc
      limit 1;

      if v_attempt.id is not null and v_attempt.status = 'submitted' then
        if coalesce((v_attempt.result_summary ->> 'pending_review')::integer, 0) > 0 then
          v_state := 'review';
        elsif coalesce(v_resource.exercise_config ->> 'completion_rule', 'passed') = 'submitted' then
          v_state := 'completed';
        elsif coalesce(v_resource.exercise_config ->> 'completion_rule', 'passed') = 'attempts'
          and v_attempt.attempt_number >= greatest(1, coalesce((v_resource.exercise_config ->> 'required_attempts')::integer, 1)) then
          v_state := 'completed';
        elsif coalesce(v_resource.exercise_config ->> 'completion_rule', 'passed') = 'passed'
          and v_attempt.score >= greatest(0, least(100, coalesce((v_resource.exercise_config ->> 'required_score')::numeric, 70))) then
          v_state := 'completed';
        else
          v_state := 'in_progress';
        end if;
      elsif v_attempt.id is not null then
        v_state := 'in_progress';
      end if;
    elsif v_resource.resource_type = 'practice_session' then
      select count(*) into v_attempt_count
      from public.applied_practice_attempts attempt
      where attempt.assignment_resource_id = v_resource.id
        and attempt.learner_id = v_assignment.learner_id;
      v_required := greatest(1, coalesce((v_resource.practice_config ->> 'question_count')::integer, 1));
      if v_attempt_count >= v_required then v_state := 'completed';
      elsif v_attempt_count > 0 then v_state := 'in_progress';
      end if;
    elsif v_resource.resource_type = 'exercise_collection' then
      if v_resource.collection_completed_at is not null then v_state := 'completed';
      elsif coalesce(v_resource.collection_completed_items, 0) > 0 then v_state := 'in_progress';
      end if;
    end if;

    if v_state in ('completed', 'review') then v_done := v_done + 1; end if;
    v_resources := v_resources || jsonb_build_array(jsonb_build_object(
      'resource_id', v_resource.id,
      'resource_type', v_resource.resource_type,
      'state', v_state,
      'score', case when v_resource.resource_type = 'custom_exercise' then v_attempt.score else null end,
      'completed_items', coalesce(v_resource.collection_completed_items, 0),
      'total_items', coalesce(v_resource.collection_total_items, 0)
    ));
  end loop;

  return jsonb_build_object(
    'total_activities', v_total,
    'completed_activities', v_done,
    'remaining_activities', greatest(v_total - v_done, 0),
    'resources', v_resources
  );
end;
$$;

revoke all on function public.learner_assignment_progress(uuid) from public;
grant execute on function public.learner_assignment_progress(uuid) to authenticated;
