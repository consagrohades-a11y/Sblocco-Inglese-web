-- Prevent learner-visible assignments from being published before their resources
-- and guided SRS scope have been saved successfully.

alter table public.assignments
  add column if not exists pending_status text;

alter table public.assignments
  drop constraint if exists assignments_pending_status_check;
alter table public.assignments
  add constraint assignments_pending_status_check
  check (pending_status is null or pending_status = 'published');

create or replace function public.assignment_has_publishable_content(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.assignment_resources resource
      where resource.assignment_id = p_assignment_id
    )
    or exists (
      select 1
      from public.assignment_study_settings settings
      where settings.assignment_id = p_assignment_id
        and settings.include_in_srs
        and settings.snapshot_item_count > 0
    );
$$;

create or replace function public.finalize_pending_assignment_publish(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_published boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  update public.assignments assignment
  set status = 'published',
      published_at = coalesce(assignment.published_at, now()),
      pending_status = null,
      updated_at = now()
  where assignment.id = p_assignment_id
    and assignment.pending_status = 'published'
    and public.assignment_has_publishable_content(assignment.id);

  get diagnostics v_published = row_count;
  return v_published;
end;
$$;

create or replace function public.admin_update_assignment(
  target_assignment_id uuid,
  assignment_title text,
  learner_message text default null,
  private_admin_note text default null,
  is_required boolean default true,
  deadline_at_value timestamptz default null,
  estimated_minutes_value integer default null,
  next_status text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  v_status text;
  v_pending_status text;
  v_published_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select status, published_at
  into current_status, v_published_at
  from public.assignments
  where id = target_assignment_id;

  if current_status is null then
    raise exception 'Assignment not found.';
  end if;

  if nullif(trim(assignment_title), '') is null then
    raise exception 'Assignment title is required.';
  end if;

  if estimated_minutes_value is not null and estimated_minutes_value <= 0 then
    raise exception 'Estimated minutes must be greater than zero.';
  end if;

  if next_status is not null and next_status not in ('draft', 'published', 'completed', 'archived') then
    raise exception 'Unsupported assignment status.';
  end if;

  if next_status = 'published' and current_status <> 'published' then
    -- The frontend saves resources and guided SRS scope in subsequent RPC calls.
    -- Keep the assignment hidden until the final scope call confirms that at
    -- least one learner-visible content item exists.
    v_status := 'draft';
    v_pending_status := 'published';
    v_published_at := null;
  elsif next_status = 'published' then
    v_status := 'published';
    v_pending_status := null;
    v_published_at := coalesce(v_published_at, now());
  elsif next_status is not null then
    v_status := next_status;
    v_pending_status := null;
    if next_status = 'draft' then
      v_published_at := null;
    end if;
  else
    v_status := current_status;
    v_pending_status := null;
  end if;

  update public.assignments
  set title = trim(assignment_title),
      learner_note = nullif(trim(learner_message), ''),
      reason = nullif(trim(private_admin_note), ''),
      required = is_required,
      deadline_at = deadline_at_value,
      estimated_minutes = estimated_minutes_value,
      status = v_status,
      pending_status = v_pending_status,
      published_at = v_published_at,
      updated_at = now()
  where id = target_assignment_id;
end;
$$;

create or replace function public.admin_replace_assignment_study_scope(
  target_assignment_id uuid,
  p_item_ids uuid[],
  p_deck_ids uuid[],
  p_exercise_modes text[],
  p_include_in_srs boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_ids uuid[];
  v_count integer := 0;
  v_learner_id uuid;
  v_teacher_id uuid;
  v_relationship_id uuid;
  v_pending_status text;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if not exists (select 1 from public.assignments where id = target_assignment_id) then
    raise exception 'Assignment not found.';
  end if;
  if cardinality(coalesce(p_exercise_modes, '{}'::text[])) = 0
    or not (coalesce(p_exercise_modes, '{}'::text[]) <@ array['italian_to_english', 'english_to_italian', 'multiple_choice', 'sentence_completion']::text[]) then
    raise exception 'Invalid exercise modes.';
  end if;

  select coalesce(array_agg(id order by level, item_type, public_id), '{}'::uuid[])
  into v_item_ids
  from public.learning_items
  where id = any(coalesce(p_item_ids, '{}'::uuid[]))
    and status = 'published';

  if cardinality(v_item_ids) <> cardinality(array(select distinct unnest(coalesce(p_item_ids, '{}'::uuid[])))) then
    raise exception 'Every assigned card must be published.';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_deck_ids, '{}'::uuid[])) deck_id
    where not exists (select 1 from public.collections where id = deck_id and status = 'published')
  ) then
    raise exception 'Every selected deck must be published.';
  end if;

  delete from public.assignment_items where assignment_id = target_assignment_id;

  insert into public.assignment_items (
    assignment_id, learning_item_id, sequence_index, required, introduction_state
  )
  select target_assignment_id, item_id, position::integer, true, 'new_unexplained'
  from unnest(v_item_ids) with ordinality selected(item_id, position);
  get diagnostics v_count = row_count;

  if v_count = 0 then
    delete from public.assignment_study_settings where assignment_id = target_assignment_id;

    perform public.finalize_pending_assignment_publish(target_assignment_id);
    select pending_status into v_pending_status
    from public.assignments where id = target_assignment_id;

    if v_pending_status = 'published' then
      raise exception 'Add at least one exercise, trainer, grammar unit, practice session, deck, word, or expression before publishing.';
    end if;

    return 0;
  end if;

  select learner_id, coalesce(teacher_id, auth.uid())
  into v_learner_id, v_teacher_id
  from public.assignments
  where id = target_assignment_id;

  select id into v_relationship_id
  from public.teaching_relationships
  where learner_id = v_learner_id
    and teacher_id = v_teacher_id
    and status = 'active'
    and relationship_type in ('preply', 'private_programme')
  order by created_at desc
  limit 1;

  if v_relationship_id is null then
    insert into public.teaching_relationships (
      learner_id, teacher_id, relationship_type, status, created_by
    ) values (
      v_learner_id, v_teacher_id, 'private_programme', 'active', auth.uid()
    ) returning id into v_relationship_id;
  end if;

  update public.assignments
  set teaching_relationship_id = v_relationship_id,
      teacher_id = v_teacher_id
  where id = target_assignment_id;

  insert into public.assignment_study_settings (
    assignment_id, include_in_srs, exercise_modes, selected_deck_ids,
    selected_item_ids, snapshot_item_count
  ) values (
    target_assignment_id, coalesce(p_include_in_srs, true), p_exercise_modes,
    coalesce(p_deck_ids, '{}'::uuid[]), coalesce(p_item_ids, '{}'::uuid[]), v_count
  )
  on conflict (assignment_id) do update set
    include_in_srs = excluded.include_in_srs,
    exercise_modes = excluded.exercise_modes,
    selected_deck_ids = excluded.selected_deck_ids,
    selected_item_ids = excluded.selected_item_ids,
    snapshot_item_count = excluded.snapshot_item_count,
    updated_at = now();

  perform public.finalize_pending_assignment_publish(target_assignment_id);
  select pending_status into v_pending_status
  from public.assignments where id = target_assignment_id;

  if v_pending_status = 'published' then
    raise exception 'The assignment could not be published because no learner-visible content was saved.';
  end if;

  return v_count;
end;
$$;

create or replace function public.assert_published_assignment_has_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
begin
  if tg_table_name = 'assignments' then
    v_assignment_id := new.id;
  elsif tg_op = 'DELETE' then
    v_assignment_id := old.assignment_id;
  else
    v_assignment_id := new.assignment_id;
  end if;

  if exists (
    select 1
    from public.assignments assignment
    where assignment.id = v_assignment_id
      and assignment.status = 'published'
      and not public.assignment_has_publishable_content(assignment.id)
  ) then
    raise exception 'A published assignment must contain at least one learner-visible activity.';
  end if;

  return null;
end;
$$;

drop trigger if exists assignments_require_content_when_published on public.assignments;
create constraint trigger assignments_require_content_when_published
after insert or update on public.assignments
deferrable initially deferred
for each row execute function public.assert_published_assignment_has_content();

drop trigger if exists assignment_resources_preserve_published_content on public.assignment_resources;
create constraint trigger assignment_resources_preserve_published_content
after insert or update or delete on public.assignment_resources
deferrable initially deferred
for each row execute function public.assert_published_assignment_has_content();

drop trigger if exists assignment_study_settings_preserve_published_content on public.assignment_study_settings;
create constraint trigger assignment_study_settings_preserve_published_content
after insert or update or delete on public.assignment_study_settings
deferrable initially deferred
for each row execute function public.assert_published_assignment_has_content();

-- Repair existing learner-visible empty assignments. They return to draft and
-- can be reopened, linked to content, and published through the safe flow.
update public.assignments assignment
set status = 'draft',
    pending_status = null,
    published_at = null,
    updated_at = now()
where assignment.status = 'published'
  and not public.assignment_has_publishable_content(assignment.id);

revoke all on function public.assignment_has_publishable_content(uuid) from public;
revoke all on function public.finalize_pending_assignment_publish(uuid) from public;
revoke all on function public.assert_published_assignment_has_content() from public;
revoke all on function public.admin_update_assignment(uuid, text, text, text, boolean, timestamptz, integer, text) from public;
revoke all on function public.admin_replace_assignment_study_scope(uuid, uuid[], uuid[], text[], boolean) from public;

grant execute on function public.admin_update_assignment(uuid, text, text, text, boolean, timestamptz, integer, text) to authenticated;
grant execute on function public.admin_replace_assignment_study_scope(uuid, uuid[], uuid[], text[], boolean) to authenticated;
