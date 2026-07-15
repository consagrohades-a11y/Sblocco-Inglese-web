-- Publishable Exercise Builder collections, immutable assignment snapshots,
-- and learner collection paths with aggregate completion tracking.

alter table public.exercise_builder_collections
  drop constraint if exists exercise_builder_collections_catalog_status_check;
update public.exercise_builder_collections
set catalog_status = case catalog_status when 'active' then 'draft' else catalog_status end;
alter table public.exercise_builder_collections
  add constraint exercise_builder_collections_catalog_status_check
  check (catalog_status in ('draft', 'in_review', 'published', 'archived'));

alter table public.exercise_builder_collections
  add column if not exists completion_rule text not null default 'all_items',
  add column if not exists required_percent numeric(7,3) not null default 100,
  add column if not exists published_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.exercise_builder_collections
  drop constraint if exists exercise_builder_collections_completion_rule_check;
alter table public.exercise_builder_collections
  add constraint exercise_builder_collections_completion_rule_check
  check (completion_rule in ('all_items', 'percentage'));
alter table public.exercise_builder_collections
  drop constraint if exists exercise_builder_collections_required_percent_check;
alter table public.exercise_builder_collections
  add constraint exercise_builder_collections_required_percent_check
  check (required_percent > 0 and required_percent <= 100);

create table if not exists public.exercise_builder_collection_versions (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.exercise_builder_collections(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title text not null,
  description text,
  color_key text not null,
  completion_rule text not null check (completion_rule in ('all_items', 'percentage')),
  required_percent numeric(7,3) not null check (required_percent > 0 and required_percent <= 100),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (collection_id, version_number)
);

alter table public.exercise_builder_collections
  add column if not exists current_version_id uuid;
alter table public.exercise_builder_collections
  drop constraint if exists exercise_builder_collections_current_version_fk;
alter table public.exercise_builder_collections
  add constraint exercise_builder_collections_current_version_fk
  foreign key (current_version_id)
  references public.exercise_builder_collection_versions(id)
  on delete set null;

alter table public.exercise_builder_exercises
  add column if not exists generated_from_collection boolean not null default false,
  add column if not exists source_collection_version_id uuid references public.exercise_builder_collection_versions(id) on delete set null;

create table if not exists public.exercise_builder_collection_version_items (
  id uuid primary key default gen_random_uuid(),
  collection_version_id uuid not null references public.exercise_builder_collection_versions(id) on delete cascade,
  sequence_index integer not null check (sequence_index > 0),
  source_entity_type text not null check (source_entity_type in ('question', 'question_pool', 'exercise')),
  source_entity_id uuid not null,
  source_version_id uuid not null,
  runnable_exercise_id uuid not null references public.exercise_builder_exercises(id) on delete restrict,
  runnable_exercise_version_id uuid not null references public.exercise_builder_exercise_versions(id) on delete restrict,
  title text not null,
  description text,
  unique (collection_version_id, sequence_index),
  unique (collection_version_id, source_entity_type, source_entity_id)
);

create index if not exists exercise_builder_collection_version_items_version_idx
  on public.exercise_builder_collection_version_items(collection_version_id, sequence_index);

alter table public.exercise_builder_collection_versions enable row level security;
alter table public.exercise_builder_collection_version_items enable row level security;

drop policy if exists exercise_builder_collection_versions_admin_all on public.exercise_builder_collection_versions;
create policy exercise_builder_collection_versions_admin_all
on public.exercise_builder_collection_versions for all to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists exercise_builder_collection_version_items_admin_all on public.exercise_builder_collection_version_items;
create policy exercise_builder_collection_version_items_admin_all
on public.exercise_builder_collection_version_items for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.exercise_builder_collection_versions to authenticated;
grant select, insert, update, delete on public.exercise_builder_collection_version_items to authenticated;

create or replace function public.admin_save_exercise_builder_collection(
  p_collection_id uuid,
  p_payload jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection_id uuid := p_collection_id;
  v_public_id text;
  v_title text;
  v_status text;
  v_color text;
  v_completion_rule text;
  v_required_percent numeric;
  v_item jsonb;
  v_entity_type text;
  v_entity_id uuid;
  v_sequence integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Collection payload must be an object.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Collection items must be an array.';
  end if;

  v_title := nullif(trim(p_payload ->> 'title'), '');
  v_status := coalesce(nullif(p_payload ->> 'catalog_status', ''), 'draft');
  v_color := coalesce(nullif(p_payload ->> 'color_key', ''), 'emerald');
  v_completion_rule := coalesce(nullif(p_payload ->> 'completion_rule', ''), 'all_items');
  v_required_percent := greatest(1, least(100, coalesce(nullif(p_payload ->> 'required_percent', '')::numeric, 100)));

  if v_title is null then raise exception 'Collection title is required.'; end if;
  if v_status not in ('draft', 'in_review', 'archived') then raise exception 'Save the draft, then publish it explicitly.'; end if;
  if v_color not in ('emerald', 'violet', 'cyan', 'amber', 'rose', 'slate') then raise exception 'Invalid collection color.'; end if;
  if v_completion_rule not in ('all_items', 'percentage') then raise exception 'Invalid collection completion rule.'; end if;

  if v_collection_id is null then
    insert into public.exercise_builder_collections (
      title, name, description, catalog_status, status, color_key,
      completion_rule, required_percent, created_by
    ) values (
      v_title, v_title, nullif(trim(p_payload ->> 'description'), ''), v_status,
      case when v_status = 'archived' then 'archived' else 'active' end,
      v_color, v_completion_rule, v_required_percent, auth.uid()
    ) returning id, public_id into v_collection_id, v_public_id;
  else
    select public_id into v_public_id
    from public.exercise_builder_collections
    where id = v_collection_id
    for update;
    if v_public_id is null then raise exception 'Collection not found.'; end if;

    update public.exercise_builder_collections
    set title = v_title,
        name = v_title,
        description = nullif(trim(p_payload ->> 'description'), ''),
        catalog_status = v_status,
        status = case when v_status = 'archived' then 'archived' else 'active' end,
        color_key = v_color,
        completion_rule = v_completion_rule,
        required_percent = v_required_percent
    where id = v_collection_id;

    delete from public.exercise_builder_collection_items
    where collection_id = v_collection_id
      and entity_type is not null
      and entity_id is not null;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_entity_type := nullif(v_item ->> 'entity_type', '');
    v_entity_id := nullif(v_item ->> 'entity_id', '')::uuid;
    if v_entity_type not in ('question', 'question_pool', 'exercise') or v_entity_id is null then
      raise exception 'Every collection item requires a supported entity type and ID.';
    end if;
    if not public.exercise_builder_collection_entity_exists(v_entity_type, v_entity_id) then
      raise exception 'Collection item does not exist: % %.', v_entity_type, v_entity_id;
    end if;
    v_sequence := v_sequence + 1;
    insert into public.exercise_builder_collection_items (
      collection_id, entity_type, entity_id, sequence_index
    ) values (v_collection_id, v_entity_type, v_entity_id, v_sequence);
  end loop;

  return jsonb_build_object(
    'id', v_collection_id,
    'public_id', v_public_id,
    'item_count', jsonb_array_length(p_items)
  );
end;
$$;

create or replace function public.admin_get_exercise_builder_collection_detail(p_collection_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', collection.id,
    'public_id', collection.public_id,
    'title', collection.title,
    'description', collection.description,
    'catalog_status', collection.catalog_status,
    'color_key', collection.color_key,
    'completion_rule', collection.completion_rule,
    'required_percent', collection.required_percent,
    'current_version_id', collection.current_version_id,
    'version_number', version.version_number,
    'published_at', collection.published_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'entity_type', item.entity_type,
        'entity_id', item.entity_id,
        'sequence_index', item.sequence_index
      ) order by item.sequence_index)
      from public.exercise_builder_collection_items item
      where item.collection_id = collection.id
        and item.entity_type is not null
        and item.entity_id is not null
    ), '[]'::jsonb)
  )
  from public.exercise_builder_collections collection
  left join public.exercise_builder_collection_versions version on version.id = collection.current_version_id
  where collection.id = p_collection_id
    and public.is_admin();
$$;

drop function if exists public.admin_set_exercise_builder_collection_status(uuid, text);
create function public.admin_set_exercise_builder_collection_status(
  p_collection_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection public.exercise_builder_collections%rowtype;
  v_version_id uuid;
  v_version_number integer;
  v_item record;
  v_source_version_id uuid;
  v_exercise_id uuid;
  v_exercise_version_id uuid;
  v_section_id uuid;
  v_title text;
  v_description text;
  v_level text;
  v_topic text;
  v_instructions text;
  v_question_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_status not in ('draft', 'in_review', 'published', 'archived') then raise exception 'Invalid collection status.'; end if;

  select * into v_collection
  from public.exercise_builder_collections
  where id = p_collection_id
  for update;
  if not found then raise exception 'Collection not found.'; end if;

  if p_status <> 'published' then
    update public.exercise_builder_collections
    set catalog_status = p_status,
        status = case when p_status = 'archived' then 'archived' else 'active' end
    where id = p_collection_id;
    return jsonb_build_object('id', p_collection_id, 'status', p_status, 'version_id', v_collection.current_version_id);
  end if;

  if not exists (
    select 1 from public.exercise_builder_collection_items
    where collection_id = p_collection_id and entity_type is not null and entity_id is not null
  ) then raise exception 'Add at least one item before publishing the collection.'; end if;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.exercise_builder_collection_versions
  where collection_id = p_collection_id;

  insert into public.exercise_builder_collection_versions (
    collection_id, version_number, title, description, color_key,
    completion_rule, required_percent, created_by
  ) values (
    p_collection_id, v_version_number, v_collection.title, v_collection.description,
    v_collection.color_key, v_collection.completion_rule, v_collection.required_percent, auth.uid()
  ) returning id into v_version_id;

  for v_item in
    select entity_type, entity_id, sequence_index
    from public.exercise_builder_collection_items
    where collection_id = p_collection_id and entity_type is not null and entity_id is not null
    order by sequence_index, created_at
  loop
    v_source_version_id := null;
    v_exercise_id := null;
    v_exercise_version_id := null;
    v_section_id := null;
    v_title := null;
    v_description := null;
    v_level := null;
    v_topic := null;
    v_instructions := null;

    if v_item.entity_type = 'exercise' then
      select exercise.id, version.id, version.id, version.title, version.description
      into v_exercise_id, v_exercise_version_id, v_source_version_id, v_title, v_description
      from public.exercise_builder_exercises exercise
      join public.exercise_builder_exercise_versions version on version.id = exercise.current_version_id
      where exercise.id = v_item.entity_id
        and exercise.status = 'published'
        and version.review_status = 'approved';
      if v_exercise_id is null then raise exception 'Every exercise must be published and approved before publishing the collection.'; end if;

    elsif v_item.entity_type = 'question' then
      select version.id, coalesce(nullif(version.title, ''), version.prompt), version.prompt,
             version.level, version.topic, coalesce(nullif(version.instructions, ''), 'Completa la domanda.')
      into v_source_version_id, v_title, v_description, v_level, v_topic, v_instructions
      from public.exercise_builder_questions question
      join public.exercise_builder_question_versions version on version.id = question.current_version_id
      where question.id = v_item.entity_id
        and question.status = 'published'
        and version.review_status = 'approved';
      if v_source_version_id is null then raise exception 'Every question must be published and approved before publishing the collection.'; end if;

      insert into public.exercise_builder_exercises (
        status, current_version_id, created_by, approved_by, approved_at, published_at,
        generated_from_collection, source_collection_version_id
      ) values ('published', null, auth.uid(), auth.uid(), now(), now(), true, v_version_id)
      returning id into v_exercise_id;
      insert into public.exercise_builder_exercise_versions (
        exercise_id, version_number, schema_version, title, description, instructions,
        instruction_language, level, topic, estimated_minutes, settings, tags,
        foundation_links, review_status, created_by
      ) values (
        v_exercise_id, 1, 2, v_title, v_description, v_instructions,
        'it', v_level, v_topic, 3,
        '{"display_mode":"one_at_a_time","feedback_timing":"section_end","show_score":true,"show_correct_answers":true,"show_explanations":true,"show_diagnostic_summary":true,"allow_retry":true}'::jsonb,
        array['collection-generated'], '[]'::jsonb, 'approved', auth.uid()
      ) returning id into v_exercise_version_id;
      update public.exercise_builder_exercises set current_version_id = v_exercise_version_id where id = v_exercise_id;
      insert into public.exercise_builder_sections (
        exercise_version_id, sequence_index, title, instructions, selection_mode, feedback_timing
      ) values (v_exercise_version_id, 0, v_title, v_instructions, 'fixed', 'section_end')
      returning id into v_section_id;
      insert into public.exercise_builder_section_fixed_questions (
        section_id, question_id, question_version_id, sequence_index, required
      ) values (v_section_id, v_item.entity_id, v_source_version_id, 0, true);

    else
      select version.id, version.title, version.description, version.level, version.topic
      into v_source_version_id, v_title, v_description, v_level, v_topic
      from public.exercise_builder_pools pool
      join public.exercise_builder_pool_versions version on version.id = pool.current_version_id
      where pool.id = v_item.entity_id
        and pool.status = 'published'
        and version.review_status = 'approved';
      if v_source_version_id is null then raise exception 'Every pool must be published and approved before publishing the collection.'; end if;
      select count(*) into v_question_count
      from public.exercise_builder_pool_questions
      where pool_version_id = v_source_version_id;
      if v_question_count = 0 then raise exception 'A collection pool cannot be empty.'; end if;

      insert into public.exercise_builder_exercises (
        status, current_version_id, created_by, approved_by, approved_at, published_at,
        generated_from_collection, source_collection_version_id
      ) values ('published', null, auth.uid(), auth.uid(), now(), now(), true, v_version_id)
      returning id into v_exercise_id;
      insert into public.exercise_builder_exercise_versions (
        exercise_id, version_number, schema_version, title, description, instructions,
        instruction_language, level, topic, estimated_minutes, settings, tags,
        foundation_links, review_status, created_by
      ) values (
        v_exercise_id, 1, 2, v_title, v_description, 'Completa le domande della pool.',
        'it', v_level, v_topic, greatest(3, v_question_count * 2),
        '{"display_mode":"one_at_a_time","feedback_timing":"section_end","show_score":true,"show_correct_answers":true,"show_explanations":true,"show_diagnostic_summary":true,"allow_retry":true}'::jsonb,
        array['collection-generated'], '[]'::jsonb, 'approved', auth.uid()
      ) returning id into v_exercise_version_id;
      update public.exercise_builder_exercises set current_version_id = v_exercise_version_id where id = v_exercise_id;
      insert into public.exercise_builder_sections (
        exercise_version_id, sequence_index, title, instructions, selection_mode, feedback_timing
      ) values (v_exercise_version_id, 0, v_title, 'Completa le domande della pool.', 'pool', 'section_end')
      returning id into v_section_id;
      insert into public.exercise_builder_section_pool_rules (
        section_id, pool_id, pool_version_id, question_count, selection_strategy,
        prevent_duplicate_questions, sequence_index
      ) values (v_section_id, v_item.entity_id, v_source_version_id, v_question_count, 'balanced', true, 0);
    end if;

    insert into public.exercise_builder_collection_version_items (
      collection_version_id, sequence_index, source_entity_type, source_entity_id,
      source_version_id, runnable_exercise_id, runnable_exercise_version_id, title, description
    ) values (
      v_version_id, v_item.sequence_index, v_item.entity_type, v_item.entity_id,
      v_source_version_id, v_exercise_id, v_exercise_version_id, v_title, v_description
    );
  end loop;

  update public.exercise_builder_collections
  set current_version_id = v_version_id,
      catalog_status = 'published',
      status = 'active',
      approved_by = auth.uid(),
      approved_at = now(),
      published_at = now()
  where id = p_collection_id;

  return jsonb_build_object('id', p_collection_id, 'status', 'published', 'version_id', v_version_id, 'version_number', v_version_number);
end;
$$;

alter table public.assignment_resources
  add column if not exists collection_config jsonb,
  add column if not exists collection_snapshot jsonb,
  add column if not exists collection_parent_resource_id uuid references public.assignment_resources(id) on delete cascade,
  add column if not exists collection_item_id uuid references public.exercise_builder_collection_version_items(id) on delete restrict;

alter table public.assignment_resources
  drop constraint if exists assignment_resources_resource_type_check;
alter table public.assignment_resources
  add constraint assignment_resources_resource_type_check
  check (resource_type in ('grammar_unit', 'trainer', 'practice_session', 'custom_exercise', 'exercise_collection'));
alter table public.assignment_resources
  drop constraint if exists assignment_resources_route_check;
alter table public.assignment_resources
  add constraint assignment_resources_route_check
  check (route in (
    '/levels/a1/be-basic-sentences',
    '/levels/a1/present-simple-normal-verbs',
    '/trainers/business-expression',
    '/trainers/general-expression',
    '/trainers/hospitality-expression',
    '/trainers/word-trainer',
    '/practice',
    '/exercises',
    '/collections'
  ));

create index if not exists assignment_resources_collection_parent_idx
  on public.assignment_resources(collection_parent_resource_id, sequence_index)
  where collection_parent_resource_id is not null;

create table if not exists public.assignment_collection_progress (
  parent_resource_id uuid primary key references public.assignment_resources(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  completed_items integer not null default 0 check (completed_items >= 0),
  total_items integer not null default 0 check (total_items >= 0),
  progress_percent numeric(7,3) not null default 0 check (progress_percent between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.assignment_collection_progress enable row level security;
drop policy if exists assignment_collection_progress_select_own on public.assignment_collection_progress;
create policy assignment_collection_progress_select_own
on public.assignment_collection_progress for select to authenticated
using (learner_id = auth.uid() or public.is_admin());
drop policy if exists assignment_collection_progress_admin_all on public.assignment_collection_progress;
create policy assignment_collection_progress_admin_all
on public.assignment_collection_progress for all to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.assignment_collection_progress to authenticated;

create or replace function public.refresh_assignment_collection_progress(p_parent_resource_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent record;
  v_total integer;
  v_completed integer;
  v_percent numeric;
  v_threshold numeric;
begin
  select resource.assignment_id, assignment.learner_id, resource.collection_config
  into v_parent
  from public.assignment_resources resource
  join public.assignments assignment on assignment.id = resource.assignment_id
  where resource.id = p_parent_resource_id
    and resource.resource_type = 'exercise_collection';
  if not found then return; end if;

  select count(*), count(*) filter (where completed)
  into v_total, v_completed
  from (
    select child.id, exists (
      select 1
      from public.exercise_builder_attempts attempt
      where attempt.assignment_resource_id = child.id
        and attempt.learner_id = v_parent.learner_id
        and attempt.status = 'submitted'
        and attempt.review_status <> 'reviewed'
        and coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) = 0
        and (
          coalesce(child.exercise_config ->> 'completion_rule', 'passed') = 'submitted'
          or (
            coalesce(child.exercise_config ->> 'completion_rule', 'passed') = 'attempts'
            and attempt.attempt_number >= greatest(1, coalesce((child.exercise_config ->> 'required_attempts')::integer, 1))
          )
          or (
            coalesce(child.exercise_config ->> 'completion_rule', 'passed') = 'passed'
            and attempt.score >= greatest(0, least(100, coalesce((child.exercise_config ->> 'required_score')::numeric, 70)))
          )
        )
    ) as completed
    from public.assignment_resources child
    where child.collection_parent_resource_id = p_parent_resource_id
  ) item_status;

  v_percent := case when v_total = 0 then 0 else round((v_completed::numeric / v_total::numeric) * 100, 3) end;
  v_threshold := case
    when coalesce(v_parent.collection_config ->> 'completion_rule', 'all_items') = 'percentage'
      then greatest(1, least(100, coalesce((v_parent.collection_config ->> 'required_percent')::numeric, 100)))
    else 100
  end;

  insert into public.assignment_collection_progress as existing (
    parent_resource_id, assignment_id, learner_id, completed_items, total_items,
    progress_percent, completed_at, updated_at
  ) values (
    p_parent_resource_id, v_parent.assignment_id, v_parent.learner_id, v_completed, v_total,
    v_percent, case when v_total > 0 and v_percent >= v_threshold then now() else null end, now()
  )
  on conflict (parent_resource_id) do update set
    completed_items = excluded.completed_items,
    total_items = excluded.total_items,
    progress_percent = excluded.progress_percent,
    completed_at = case
      when excluded.completed_at is not null then coalesce(existing.completed_at, excluded.completed_at)
      else null
    end,
    updated_at = now();
end;
$$;

create or replace function public.refresh_assignment_collection_progress_from_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource_id uuid;
  v_parent_id uuid;
begin
  v_resource_id := case when tg_op = 'DELETE' then old.assignment_resource_id else new.assignment_resource_id end;
  select collection_parent_resource_id into v_parent_id
  from public.assignment_resources where id = v_resource_id;
  if v_parent_id is not null then perform public.refresh_assignment_collection_progress(v_parent_id); end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists exercise_builder_attempt_collection_progress on public.exercise_builder_attempts;
create trigger exercise_builder_attempt_collection_progress
after insert or update or delete on public.exercise_builder_attempts
for each row execute function public.refresh_assignment_collection_progress_from_attempt();

create or replace function public.keep_assignment_open_for_collection_path()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' and exists (
    select 1
    from public.assignment_collection_progress progress
    where progress.assignment_id = new.id
      and progress.completed_at is null
  ) then
    new.status := 'published';
  end if;
  return new;
end;
$$;

drop trigger if exists assignments_collection_completion_guard on public.assignments;
create trigger assignments_collection_completion_guard
before update of status on public.assignments
for each row execute function public.keep_assignment_open_for_collection_path();

create or replace function public.admin_replace_assignment_collections(
  target_assignment_id uuid,
  p_collections jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_collection jsonb;
  v_collection_id uuid;
  v_version_id uuid;
  v_version record;
  v_item record;
  v_parent_id uuid;
  v_sequence integer;
  v_inserted integer := 0;
  v_required_score numeric;
  v_snapshot jsonb;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_collections is null or jsonb_typeof(p_collections) <> 'array' then raise exception 'Collections must be a JSON array.'; end if;
  select id, learner_id into v_assignment from public.assignments where id = target_assignment_id;
  if not found then raise exception 'Assignment not found.'; end if;

  delete from public.assignment_resources
  where assignment_id = target_assignment_id and resource_type = 'exercise_collection';
  select coalesce(max(sequence_index), 0) into v_sequence
  from public.assignment_resources where assignment_id = target_assignment_id;

  for v_collection in select value from jsonb_array_elements(p_collections)
  loop
    v_collection_id := nullif(v_collection ->> 'collection_id', '')::uuid;
    v_version_id := nullif(v_collection ->> 'collection_version_id', '')::uuid;
    if v_collection_id is null then raise exception 'Collection ID is required.'; end if;
    if v_version_id is null then
      select current_version_id into v_version_id
      from public.exercise_builder_collections
      where id = v_collection_id and catalog_status = 'published';
    end if;

    select version.*, collection.public_id
    into v_version
    from public.exercise_builder_collection_versions version
    join public.exercise_builder_collections collection on collection.id = version.collection_id
    where version.id = v_version_id and version.collection_id = v_collection_id;
    if not found then raise exception 'Published collection version not found.'; end if;

    select jsonb_build_object(
      'collection_id', v_collection_id,
      'collection_version_id', v_version.id,
      'public_id', v_version.public_id,
      'version_number', v_version.version_number,
      'title', v_version.title,
      'description', v_version.description,
      'completion_rule', v_version.completion_rule,
      'required_percent', v_version.required_percent,
      'items', coalesce(jsonb_agg(jsonb_build_object(
        'collection_item_id', item.id,
        'sequence_index', item.sequence_index,
        'title', item.title,
        'description', item.description,
        'source_entity_type', item.source_entity_type,
        'source_entity_id', item.source_entity_id,
        'source_version_id', item.source_version_id,
        'exercise_id', item.runnable_exercise_id,
        'exercise_version_id', item.runnable_exercise_version_id
      ) order by item.sequence_index), '[]'::jsonb)
    ) into v_snapshot
    from public.exercise_builder_collection_version_items item
    where item.collection_version_id = v_version.id;

    v_required_score := greatest(0, least(100, coalesce((v_collection ->> 'required_score')::numeric, 70)));
    v_sequence := v_sequence + 1;
    insert into public.assignment_resources (
      assignment_id, resource_key, resource_type, title, description, route,
      sequence_index, collection_config, collection_snapshot
    ) values (
      target_assignment_id, 'collection:' || v_version.id::text, 'exercise_collection',
      v_version.title, v_version.description, '/collections', v_sequence,
      jsonb_build_object(
        'collection_id', v_collection_id,
        'collection_version_id', v_version.id,
        'version_number', v_version.version_number,
        'completion_rule', v_version.completion_rule,
        'required_percent', v_version.required_percent,
        'required_score', v_required_score
      ),
      v_snapshot
    ) returning id into v_parent_id;

    for v_item in
      select * from public.exercise_builder_collection_version_items
      where collection_version_id = v_version.id order by sequence_index
    loop
      v_sequence := v_sequence + 1;
      insert into public.assignment_resources (
        assignment_id, resource_key, resource_type, title, description, route,
        sequence_index, exercise_config, collection_parent_resource_id, collection_item_id
      ) values (
        target_assignment_id, 'collection-item:' || v_item.id::text, 'custom_exercise',
        v_item.title, v_item.description, '/exercises', v_sequence,
        jsonb_build_object(
          'exercise_id', v_item.runnable_exercise_id,
          'exercise_version_id', v_item.runnable_exercise_version_id,
          'completion_rule', 'passed',
          'required_score', v_required_score,
          'required_attempts', 1,
          'allow_retry', true,
          'show_score', true,
          'show_correct_answers', true,
          'show_explanations', true,
          'show_diagnostic_summary', true
        ),
        v_parent_id, v_item.id
      );
    end loop;
    perform public.refresh_assignment_collection_progress(v_parent_id);
    v_inserted := v_inserted + 1;
  end loop;
  return v_inserted;
end;
$$;

create or replace function public.learner_get_assigned_collection_path(
  p_assignment_id uuid,
  p_resource_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parent record;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select resource.*, assignment.learner_id, assignment.status as assignment_status
  into v_parent
  from public.assignment_resources resource
  join public.assignments assignment on assignment.id = resource.assignment_id
  where resource.id = p_resource_id
    and resource.assignment_id = p_assignment_id
    and resource.resource_type = 'exercise_collection'
    and (assignment.learner_id = auth.uid() or public.is_admin())
    and (assignment.status in ('published', 'completed') or public.is_admin());
  if not found then raise exception 'Collection path not found.'; end if;

  return jsonb_build_object(
    'assignment_id', p_assignment_id,
    'resource_id', p_resource_id,
    'title', v_parent.title,
    'description', v_parent.description,
    'config', v_parent.collection_config,
    'snapshot', v_parent.collection_snapshot,
    'progress', coalesce((
      select jsonb_build_object(
        'completed_items', progress.completed_items,
        'total_items', progress.total_items,
        'progress_percent', progress.progress_percent,
        'completed_at', progress.completed_at
      ) from public.assignment_collection_progress progress
      where progress.parent_resource_id = p_resource_id
    ), jsonb_build_object('completed_items', 0, 'total_items', 0, 'progress_percent', 0, 'completed_at', null)),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'resource_id', child.id,
        'collection_item_id', child.collection_item_id,
        'sequence_index', child.sequence_index,
        'title', child.title,
        'description', child.description,
        'exercise_config', child.exercise_config,
        'attempt_id', latest.id,
        'attempt_status', latest.status,
        'attempt_number', latest.attempt_number,
        'review_status', latest.review_status,
        'pending_review', coalesce((latest.result_summary ->> 'pending_review')::integer, 0),
        'score', case when latest.review_status = 'reviewed' then null else latest.score end,
        'completed', coalesce(latest.completed, false)
      ) order by child.sequence_index)
      from public.assignment_resources child
      left join lateral (
        select attempt.*,
          attempt.status = 'submitted'
          and attempt.review_status <> 'reviewed'
          and coalesce((attempt.result_summary ->> 'pending_review')::integer, 0) = 0
          and (
            coalesce(child.exercise_config ->> 'completion_rule', 'passed') = 'submitted'
            or (coalesce(child.exercise_config ->> 'completion_rule', 'passed') = 'attempts'
              and attempt.attempt_number >= greatest(1, coalesce((child.exercise_config ->> 'required_attempts')::integer, 1)))
            or (coalesce(child.exercise_config ->> 'completion_rule', 'passed') = 'passed'
              and attempt.score >= greatest(0, least(100, coalesce((child.exercise_config ->> 'required_score')::numeric, 70))))
          ) as completed
        from public.exercise_builder_attempts attempt
        where attempt.assignment_resource_id = child.id
          and attempt.learner_id = v_parent.learner_id
        order by attempt.attempt_number desc
        limit 1
      ) latest on true
      where child.collection_parent_resource_id = p_resource_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_collection_question_candidates(p_collection_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_candidates jsonb;
  v_incompatible integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if not exists (select 1 from public.exercise_builder_collections where id = p_collection_id) then raise exception 'Collection not found.'; end if;

  with candidate_rows as (
    select question.id as question_id, question.current_version_id as question_version_id
    from public.exercise_builder_collection_items item
    join public.exercise_builder_questions question on item.entity_type = 'question' and question.id = item.entity_id
    join public.exercise_builder_question_versions version on version.id = question.current_version_id
    where item.collection_id = p_collection_id and question.status <> 'archived'
    union
    select membership.question_id, membership.question_version_id
    from public.exercise_builder_collection_items item
    join public.exercise_builder_pools pool on item.entity_type = 'question_pool' and pool.id = item.entity_id
    join public.exercise_builder_pool_questions membership on membership.pool_version_id = pool.current_version_id
    join public.exercise_builder_questions question on question.id = membership.question_id
    where item.collection_id = p_collection_id and question.status <> 'archived'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', question_id,
    'question_version_id', question_version_id
  ) order by question_id), '[]'::jsonb)
  into v_candidates
  from candidate_rows;

  select count(*) into v_incompatible
  from public.exercise_builder_collection_items
  where collection_id = p_collection_id and entity_type = 'exercise';

  return jsonb_build_object(
    'candidates', v_candidates,
    'incompatible_count', v_incompatible,
    'incompatible_reason', case when v_incompatible > 0 then 'Gli esercizi completi non possono essere inseriti in una pool.' else null end
  );
end;
$$;

revoke all on function public.admin_save_exercise_builder_collection(uuid, jsonb, jsonb) from public;
revoke all on function public.admin_get_exercise_builder_collection_detail(uuid) from public;
revoke all on function public.admin_set_exercise_builder_collection_status(uuid, text) from public;
revoke all on function public.refresh_assignment_collection_progress(uuid) from public;
revoke all on function public.admin_replace_assignment_collections(uuid, jsonb) from public;
revoke all on function public.learner_get_assigned_collection_path(uuid, uuid) from public;
revoke all on function public.admin_get_collection_question_candidates(uuid) from public;
grant execute on function public.admin_save_exercise_builder_collection(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.admin_get_exercise_builder_collection_detail(uuid) to authenticated;
grant execute on function public.admin_set_exercise_builder_collection_status(uuid, text) to authenticated;
grant execute on function public.admin_replace_assignment_collections(uuid, jsonb) to authenticated;
grant execute on function public.learner_get_assigned_collection_path(uuid, uuid) to authenticated;
grant execute on function public.admin_get_collection_question_candidates(uuid) to authenticated;

notify pgrst, 'reload schema';
