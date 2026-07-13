-- Teacher-scoped SRS assignments for private and Preply learners.
-- Apply after 20260713280000_targeted_practice_assignments.sql.

create table if not exists public.assignment_study_settings (
  assignment_id uuid primary key references public.assignments(id) on delete cascade,
  include_in_srs boolean not null default true,
  exercise_modes text[] not null default array['italian_to_english', 'english_to_italian']::text[],
  selected_deck_ids uuid[] not null default '{}'::uuid[],
  selected_item_ids uuid[] not null default '{}'::uuid[],
  snapshot_item_count integer not null default 0 check (snapshot_item_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(exercise_modes) > 0),
  check (exercise_modes <@ array['italian_to_english', 'english_to_italian', 'multiple_choice', 'sentence_completion']::text[])
);

drop trigger if exists assignment_study_settings_set_updated_at on public.assignment_study_settings;
create trigger assignment_study_settings_set_updated_at
before update on public.assignment_study_settings
for each row execute function public.set_updated_at();

alter table public.assignment_study_settings enable row level security;

drop policy if exists "assignment_study_settings_select_readable" on public.assignment_study_settings;
create policy "assignment_study_settings_select_readable"
on public.assignment_study_settings for select to authenticated
using (public.can_read_assignment(assignment_id));

drop policy if exists "assignment_study_settings_admin_all" on public.assignment_study_settings;
create policy "assignment_study_settings_admin_all"
on public.assignment_study_settings for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.assignment_study_settings to authenticated;

create index if not exists assignment_study_settings_srs_idx
  on public.assignment_study_settings(include_in_srs, assignment_id);

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

  return v_count;
end;
$$;

revoke all on function public.admin_replace_assignment_study_scope(uuid, uuid[], uuid[], text[], boolean) from public;
grant execute on function public.admin_replace_assignment_study_scope(uuid, uuid[], uuid[], text[], boolean) to authenticated;

create or replace function public.is_guided_private_learner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.teaching_relationships relationship
    join public.profiles teacher on teacher.id = relationship.teacher_id
    where relationship.learner_id = auth.uid()
      and relationship.status = 'active'
      and relationship.relationship_type in ('preply', 'private_programme')
      and teacher.role = 'admin'
  );
$$;

revoke all on function public.is_guided_private_learner() from public;
grant execute on function public.is_guided_private_learner() to authenticated;

create or replace function public.get_learner_srs_scope(
  p_item_type text,
  p_domain text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with guided as (
    select public.is_guided_private_learner() as value
  ),
  assigned as (
    select distinct coalesce(ai.learning_item_id, ci.learning_item_id) as learning_item_id
    from public.assignments a
    join public.assignment_study_settings settings
      on settings.assignment_id = a.id and settings.include_in_srs
    join public.assignment_items ai on ai.assignment_id = a.id
    left join public.collection_items ci on ci.collection_id = ai.collection_id
    where a.learner_id = auth.uid()
      and a.status in ('published', 'completed')
      and (a.published_at is null or a.published_at <= now())
      and (a.access_ends_at is null or a.access_ends_at > now())
  ),
  scoped as (
    select li.id
    from assigned
    join public.learning_items li on li.id = assigned.learning_item_id
    where li.status = 'published'
      and (p_item_type = 'mixed' or li.item_type = p_item_type)
      and (p_domain is null or li.primary_domain = p_domain)
  )
  select jsonb_build_object(
    'guided', (select value from guided),
    'item_ids', coalesce((select jsonb_agg(id order by id) from scoped), '[]'::jsonb),
    'states', coalesce((
      select jsonb_agg(jsonb_build_object(
        'learning_item_id', state.learning_item_id,
        'state', state.state,
        'due_at', state.due_at,
        'interval_days', state.interval_days,
        'ease_factor', state.ease_factor,
        'repetitions', state.repetitions,
        'lapses', state.lapses,
        'last_reviewed_at', state.last_reviewed_at
      ))
      from public.learner_srs_state state
      where state.learner_id = auth.uid()
        and (not (select value from guided) or state.learning_item_id in (select id from scoped))
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_learner_srs_scope(text, text) from public;
grant execute on function public.get_learner_srs_scope(text, text) to authenticated;

create or replace function public.record_learner_srs_review(
  p_learning_item_id uuid,
  p_rating text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guided boolean := public.is_guided_private_learner();
  v_previous public.learner_srs_state%rowtype;
  v_repetitions integer;
  v_lapses integer;
  v_interval integer;
  v_ease numeric(4,2);
  v_state text;
  v_due timestamptz;
  v_result text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_rating not in ('again', 'hard', 'good', 'easy') then raise exception 'Invalid SRS rating.'; end if;
  if not exists (select 1 from public.learning_items where id = p_learning_item_id and status = 'published') then
    raise exception 'Published learning item not found.';
  end if;
  if v_guided and not exists (
    select 1
    from public.assignments a
    join public.assignment_study_settings settings on settings.assignment_id = a.id and settings.include_in_srs
    join public.assignment_items ai on ai.assignment_id = a.id
    left join public.collection_items ci on ci.collection_id = ai.collection_id
    where a.learner_id = auth.uid()
      and a.status in ('published', 'completed')
      and (a.access_ends_at is null or a.access_ends_at > now())
      and coalesce(ai.learning_item_id, ci.learning_item_id) = p_learning_item_id
  ) then raise exception 'This card is outside the learner guided scope.'; end if;

  select * into v_previous
  from public.learner_srs_state
  where learner_id = auth.uid() and learning_item_id = p_learning_item_id
  for update;

  v_repetitions := coalesce(v_previous.repetitions, 0);
  v_lapses := coalesce(v_previous.lapses, 0);
  v_interval := coalesce(v_previous.interval_days, 0);
  v_ease := greatest(1.30, coalesce(v_previous.ease_factor, 2.50));

  if p_rating = 'again' then
    v_state := 'learning'; v_lapses := v_lapses + 1; v_repetitions := 0;
    v_interval := 0; v_ease := greatest(1.30, v_ease - 0.20); v_due := now() + interval '10 minutes'; v_result := 'incorrect';
  elsif p_rating = 'hard' then
    v_state := 'reviewing'; v_repetitions := v_repetitions + 1;
    v_interval := case when v_interval = 0 then 1 else greatest(1, round(v_interval * 1.20)::integer) end;
    v_ease := greatest(1.30, v_ease - 0.15); v_due := now() + make_interval(days => v_interval); v_result := 'nearly_correct';
  elsif p_rating = 'good' then
    v_state := 'reviewing';
    v_interval := case when v_repetitions = 0 then 1 when v_repetitions = 1 then 3 else greatest(1, round(v_interval * v_ease)::integer) end;
    v_repetitions := v_repetitions + 1; v_due := now() + make_interval(days => v_interval); v_result := 'correct';
  else
    v_state := 'reviewing'; v_ease := greatest(1.30, v_ease + 0.15);
    v_interval := case when v_repetitions = 0 then 4 else greatest(1, round(v_interval * v_ease * 1.30)::integer) end;
    v_repetitions := v_repetitions + 1; v_due := now() + make_interval(days => v_interval); v_result := 'correct';
  end if;
  if v_repetitions >= 6 and v_interval >= 30 then v_state := 'mastered'; end if;

  insert into public.learner_srs_state (
    learner_id, learning_item_id, state, due_at, interval_days, ease_factor,
    repetitions, lapses, last_rating, last_objective_result, last_reviewed_at, source
  ) values (
    auth.uid(), p_learning_item_id, v_state, v_due, v_interval, v_ease,
    v_repetitions, v_lapses, p_rating, v_result, now(), case when v_guided then 'assignment' else 'learner' end
  )
  on conflict (learner_id, learning_item_id) do update set
    state = excluded.state, due_at = excluded.due_at, interval_days = excluded.interval_days,
    ease_factor = excluded.ease_factor, repetitions = excluded.repetitions, lapses = excluded.lapses,
    last_rating = excluded.last_rating, last_objective_result = excluded.last_objective_result,
    last_reviewed_at = excluded.last_reviewed_at, source = excluded.source, updated_at = now();

  insert into public.learner_review_history (
    learner_id, learning_item_id, review_direction, objective_result, self_rating,
    previous_due_at, next_due_at
  ) values (
    auth.uid(), p_learning_item_id, 'srs_recall', v_result, p_rating, v_previous.due_at, v_due
  );

  return jsonb_build_object(
    'learning_item_id', p_learning_item_id, 'state', v_state, 'due_at', v_due,
    'interval_days', v_interval, 'ease_factor', v_ease,
    'repetitions', v_repetitions, 'lapses', v_lapses
  );
end;
$$;

revoke all on function public.record_learner_srs_review(uuid, text) from public;
grant execute on function public.record_learner_srs_review(uuid, text) to authenticated;
