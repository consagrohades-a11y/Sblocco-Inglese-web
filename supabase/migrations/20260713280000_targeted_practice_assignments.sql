-- Directly connect an assignment to a filtered practice session and its attempts.

alter table public.assignment_resources
  add column if not exists practice_config jsonb;

alter table public.assignment_resources
  drop constraint if exists assignment_resources_resource_type_check;
alter table public.assignment_resources
  add constraint assignment_resources_resource_type_check
  check (resource_type in ('grammar_unit', 'trainer', 'practice_session'));

alter table public.assignment_resources
  drop constraint if exists assignment_resources_route_check;
alter table public.assignment_resources
  add constraint assignment_resources_route_check
  check (
    route in (
      '/levels/a1/be-basic-sentences',
      '/levels/a1/present-simple-normal-verbs',
      '/trainers/business-expression',
      '/trainers/general-expression',
      '/trainers/hospitality-expression',
      '/trainers/word-trainer',
      '/practice'
    )
  );

alter table public.assignment_resources
  drop constraint if exists assignment_resources_practice_config_check;
alter table public.assignment_resources
  add constraint assignment_resources_practice_config_check
  check (resource_type <> 'practice_session' or jsonb_typeof(practice_config) = 'object');

alter table public.applied_practice_attempts
  add column if not exists assignment_id uuid references public.assignments(id) on delete set null,
  add column if not exists assignment_resource_id uuid references public.assignment_resources(id) on delete set null;

create index if not exists applied_practice_attempts_assignment_idx
  on public.applied_practice_attempts(learner_id, assignment_id, assignment_resource_id, created_at);

create or replace function public.admin_replace_assignment_resources(
  target_assignment_id uuid,
  resources jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  resource jsonb;
  config jsonb;
  inserted_count integer := 0;
  resource_route text;
  resource_type_value text;
  resource_key_value text;
  resource_title_value text;
  sequence_value integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  if not exists (select 1 from public.assignments where id = target_assignment_id) then
    raise exception 'Assignment not found.';
  end if;
  if resources is null or jsonb_typeof(resources) <> 'array' then
    raise exception 'Resources must be a JSON array.';
  end if;

  delete from public.assignment_resources where assignment_id = target_assignment_id;

  for resource in select value from jsonb_array_elements(resources)
  loop
    resource_key_value := nullif(trim(resource ->> 'key'), '');
    resource_type_value := nullif(trim(resource ->> 'type'), '');
    resource_title_value := nullif(trim(resource ->> 'title'), '');
    resource_route := nullif(trim(resource ->> 'route'), '');
    sequence_value := (resource ->> 'sequence_index')::integer;
    config := resource -> 'practice_config';

    if resource_key_value is null or resource_title_value is null or resource_route is null then
      raise exception 'Every resource requires key, title, and route.';
    end if;
    if resource_type_value not in ('grammar_unit', 'trainer', 'practice_session') then
      raise exception 'Unsupported resource type.';
    end if;
    if resource_route not in (
      '/levels/a1/be-basic-sentences', '/levels/a1/present-simple-normal-verbs',
      '/trainers/business-expression', '/trainers/general-expression',
      '/trainers/hospitality-expression', '/trainers/word-trainer', '/practice'
    ) then
      raise exception 'Unsupported resource route.';
    end if;
    if sequence_value is null or sequence_value <= 0 then
      raise exception 'Invalid resource sequence.';
    end if;
    if resource_type_value = 'practice_session' then
      if resource_route <> '/practice' or jsonb_typeof(config) <> 'object' then
        raise exception 'Invalid practice session.';
      end if;
      if config ->> 'trainer_id' not in ('word', 'mixed', 'general', 'business', 'hospitality') then
        raise exception 'Invalid practice trainer.';
      end if;
      if coalesce((config ->> 'question_count')::integer, 0) not between 1 and 50 then
        raise exception 'Invalid question count.';
      end if;
      if jsonb_typeof(config -> 'modes') <> 'array' or jsonb_array_length(config -> 'modes') = 0 then
        raise exception 'At least one exercise mode is required.';
      end if;
      if exists (
        select 1 from jsonb_array_elements_text(config -> 'modes') mode
        where mode not in ('italian_to_english', 'english_to_italian', 'multiple_choice', 'sentence_completion')
      ) then
        raise exception 'Invalid exercise mode.';
      end if;
    else
      config := null;
    end if;

    insert into public.assignment_resources (
      assignment_id, resource_key, resource_type, title, description,
      route, sequence_index, practice_config
    ) values (
      target_assignment_id, resource_key_value, resource_type_value,
      resource_title_value, nullif(trim(resource ->> 'description'), ''),
      resource_route, sequence_value, config
    );
    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.admin_replace_assignment_resources(uuid, jsonb) from public;
grant execute on function public.admin_replace_assignment_resources(uuid, jsonb) to authenticated;

create or replace function public.get_assignment_practice_session(
  p_assignment_id uuid,
  p_resource_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'assignment_id', a.id,
    'assignment_title', a.title,
    'assignment_status', a.status,
    'resource_id', r.id,
    'resource_title', r.title,
    'resource_description', r.description,
    'practice_config', r.practice_config
  )
  from public.assignments a
  join public.assignment_resources r on r.assignment_id = a.id
  where a.id = p_assignment_id
    and r.id = p_resource_id
    and r.resource_type = 'practice_session'
    and r.route = '/practice'
    and a.status in ('published', 'completed')
    and (a.learner_id = auth.uid() or public.is_admin())
  limit 1;
$$;

revoke all on function public.get_assignment_practice_session(uuid, uuid) from public;
grant execute on function public.get_assignment_practice_session(uuid, uuid) to authenticated;

drop function if exists public.record_practice_attempt(uuid, text, text, numeric, text, text, integer);
drop function if exists public.record_practice_attempt(uuid, text, text, numeric, text, text, integer, uuid, uuid);

create function public.record_practice_attempt(
  p_learning_item_id uuid,
  p_exercise_type text,
  p_result text,
  p_score numeric,
  p_context text default null,
  p_submitted_response text default null,
  p_response_time_ms integer default null,
  p_assignment_id uuid default null,
  p_assignment_resource_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
  v_required integer;
  v_attempt_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_result not in ('correct', 'nearly_correct', 'incorrect', 'skipped') then raise exception 'Invalid practice result.'; end if;
  if p_score is null or p_score < 0 or p_score > 100 then raise exception 'Invalid practice score.'; end if;
  if p_response_time_ms is not null and p_response_time_ms < 0 then raise exception 'Invalid response time.'; end if;
  if not exists (select 1 from public.learning_items where id = p_learning_item_id and status = 'published') then
    raise exception 'Published learning item not found.';
  end if;
  if (p_assignment_id is null) <> (p_assignment_resource_id is null) then
    raise exception 'Assignment and resource must be supplied together.';
  end if;

  if p_assignment_id is not null then
    select coalesce((r.practice_config ->> 'question_count')::integer, 0)
      into v_required
    from public.assignments a
    join public.assignment_resources r on r.assignment_id = a.id
    where a.id = p_assignment_id
      and r.id = p_assignment_resource_id
      and r.resource_type = 'practice_session'
      and a.learner_id = auth.uid()
      and a.status in ('published', 'completed');
    if v_required is null or v_required <= 0 then raise exception 'Assigned practice session not found.'; end if;
  end if;

  insert into public.applied_practice_attempts (
    learner_id, learning_item_id, exercise_type, context, submitted_response,
    result, score, response_time_ms, assignment_id, assignment_resource_id
  ) values (
    auth.uid(), p_learning_item_id, p_exercise_type, p_context, p_submitted_response,
    p_result, p_score, p_response_time_ms, p_assignment_id, p_assignment_resource_id
  ) returning id into v_attempt_id;

  if p_assignment_id is not null then
    select count(*) into v_attempt_count
    from public.applied_practice_attempts
    where learner_id = auth.uid() and assignment_id = p_assignment_id
      and assignment_resource_id = p_assignment_resource_id;
    if v_attempt_count >= v_required then
      update public.assignments set status = 'completed' where id = p_assignment_id and learner_id = auth.uid();
    end if;
  end if;

  return v_attempt_id;
end;
$$;

revoke all on function public.record_practice_attempt(uuid, text, text, numeric, text, text, integer, uuid, uuid) from public;
grant execute on function public.record_practice_attempt(uuid, text, text, numeric, text, text, integer, uuid, uuid) to authenticated;
