create table if not exists public.learner_vocab_bank_items (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  bank_kind text not null check (bank_kind in ('word', 'chunk')),
  normalized_text text not null,
  display_text text not null,
  english_meaning text,
  italian_support text,
  example text,
  level text,
  topic text,
  source_exercise_id uuid references public.exercise_builder_exercises(id) on delete set null,
  source_exercise_version_id uuid references public.exercise_builder_exercise_versions(id) on delete set null,
  source_attempt_id uuid references public.exercise_builder_attempts(id) on delete set null,
  source_activity_title text,
  self_added boolean not null default false,
  activity_added boolean not null default true,
  self_added_at timestamptz,
  encounter_count integer not null default 1 check (encounter_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learner_id, bank_kind, normalized_text)
);

alter table public.learner_vocab_bank_items enable row level security;

drop policy if exists learner_vocab_bank_select_own on public.learner_vocab_bank_items;
drop policy if exists learner_vocab_bank_admin_read on public.learner_vocab_bank_items;
create policy learner_vocab_bank_read
on public.learner_vocab_bank_items
for select
to authenticated
using ((select auth.uid()) = learner_id or public.is_admin());

drop policy if exists learner_vocab_bank_delete_own on public.learner_vocab_bank_items;
create policy learner_vocab_bank_delete_own
on public.learner_vocab_bank_items
for delete
to authenticated
using ((select auth.uid()) = learner_id);

drop policy if exists learner_vocab_bank_insert_own on public.learner_vocab_bank_items;
create policy learner_vocab_bank_insert_own
on public.learner_vocab_bank_items
for insert
to authenticated
with check (
  (select auth.uid()) = learner_id
  and self_added = true
  and activity_added = false
  and source_exercise_id is null
  and source_exercise_version_id is null
  and source_attempt_id is null
  and source_activity_title is null
);

drop policy if exists learner_vocab_bank_mark_self_added on public.learner_vocab_bank_items;
create policy learner_vocab_bank_mark_self_added
on public.learner_vocab_bank_items
for update
to authenticated
using ((select auth.uid()) = learner_id)
with check ((select auth.uid()) = learner_id and self_added = true);

revoke all on table public.learner_vocab_bank_items from anon;
grant select, delete on table public.learner_vocab_bank_items to authenticated;
grant insert (
  learner_id,
  bank_kind,
  display_text,
  english_meaning,
  italian_support,
  example,
  topic,
  self_added,
  activity_added
) on public.learner_vocab_bank_items to authenticated;
grant update (self_added, self_added_at) on public.learner_vocab_bank_items to authenticated;

create or replace function public.normalize_learner_vocab_bank_item()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.display_text := trim(coalesce(new.display_text, ''));
  new.normalized_text := regexp_replace(lower(new.display_text), '\s+', ' ', 'g');
  if new.self_added and new.self_added_at is null then
    new.self_added_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.normalize_learner_vocab_bank_item() from public;

drop trigger if exists learner_vocab_bank_normalize_item on public.learner_vocab_bank_items;
create trigger learner_vocab_bank_normalize_item
before insert or update on public.learner_vocab_bank_items
for each row execute function public.normalize_learner_vocab_bank_item();

create index if not exists learner_vocab_bank_learner_kind_seen_idx
on public.learner_vocab_bank_items (learner_id, bank_kind, last_seen_at desc);


create index if not exists learner_vocab_bank_source_attempt_idx
on public.learner_vocab_bank_items (source_attempt_id);

create index if not exists learner_vocab_bank_source_exercise_idx
on public.learner_vocab_bank_items (source_exercise_id);

create index if not exists learner_vocab_bank_source_version_idx
on public.learner_vocab_bank_items (source_exercise_version_id);

create index if not exists learner_vocab_bank_learner_source_idx
on public.learner_vocab_bank_items (learner_id, self_added, activity_added, last_seen_at desc);

create index if not exists learner_vocab_bank_learner_topic_idx
on public.learner_vocab_bank_items (learner_id, topic);

create or replace function public.exercise_builder_collect_vocab_bank(p_attempt_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.exercise_builder_attempts%rowtype;
  v_count integer := 0;
begin
  select * into v_attempt
  from public.exercise_builder_attempts
  where id = p_attempt_id;

  if v_attempt.id is null then
    raise exception 'Attempt not found.';
  end if;

  if auth.uid() is distinct from v_attempt.learner_id and not public.is_admin() then
    raise exception 'Learner access required.';
  end if;

  with raw_candidates as (
    select
      case
        when lower(coalesce(entry->>'vocab_kind', '')) in ('word', 'chunk') then lower(entry->>'vocab_kind')
        when trim(coalesce(entry->>'term', '')) ~ '\s' then 'chunk'
        else 'word'
      end as bank_kind,
      regexp_replace(lower(trim(coalesce(entry->>'term', ''))), '\s+', ' ', 'g') as normalized_text,
      trim(coalesce(entry->>'term', '')) as display_text,
      nullif(trim(entry->>'meaning'), '') as english_meaning,
      nullif(trim(entry->>'translation'), '') as italian_support,
      nullif(trim(entry->>'example'), '') as example,
      4 as richness
    from public.exercise_builder_attempt_questions aq
    cross join lateral jsonb_array_elements(coalesce(aq.question_snapshot #> '{content,entries}', '[]'::jsonb)) entry
    where aq.attempt_id = p_attempt_id
      and aq.question_snapshot #>> '{content,presentation}' = 'vocabulary'
      and nullif(trim(entry->>'term'), '') is not null

    union all

    select
      case when option->>'vocab_kind' = 'word' then 'word' else 'chunk' end,
      regexp_replace(lower(trim(coalesce(option->>'text', ''))), '\s+', ' ', 'g'),
      trim(coalesce(option->>'text', '')),
      null,
      null,
      null,
      1
    from public.exercise_builder_attempt_questions aq
    cross join lateral jsonb_array_elements(coalesce(aq.question_snapshot #> '{content,options}', '[]'::jsonb)) option
    where aq.attempt_id = p_attempt_id
      and aq.question_snapshot->>'type' = 'practice_selection'
      and coalesce((option->>'vocab_bank')::boolean, false)
      and option->>'vocab_kind' in ('word', 'chunk')
      and nullif(trim(option->>'text'), '') is not null
  ),
  candidates as (
    select distinct on (bank_kind, normalized_text)
      bank_kind,
      normalized_text,
      display_text,
      english_meaning,
      italian_support,
      example
    from raw_candidates
    where normalized_text <> ''
    order by bank_kind, normalized_text, richness desc
  )
  insert into public.learner_vocab_bank_items (
    learner_id,
    bank_kind,
    normalized_text,
    display_text,
    english_meaning,
    italian_support,
    example,
    level,
    topic,
    source_exercise_id,
    source_exercise_version_id,
    source_attempt_id,
    source_activity_title,
    activity_added,
    self_added
  )
  select
    v_attempt.learner_id,
    candidate.bank_kind,
    candidate.normalized_text,
    candidate.display_text,
    candidate.english_meaning,
    candidate.italian_support,
    candidate.example,
    nullif(v_attempt.exercise_snapshot->>'level', ''),
    nullif(v_attempt.exercise_snapshot->>'topic', ''),
    v_attempt.exercise_id,
    v_attempt.exercise_version_id,
    v_attempt.id,
    nullif(v_attempt.exercise_snapshot->>'title', ''),
    true,
    false
  from candidates candidate
  on conflict (learner_id, bank_kind, normalized_text) do update
  set display_text = excluded.display_text,
      english_meaning = coalesce(excluded.english_meaning, learner_vocab_bank_items.english_meaning),
      italian_support = coalesce(excluded.italian_support, learner_vocab_bank_items.italian_support),
      example = coalesce(excluded.example, learner_vocab_bank_items.example),
      level = coalesce(excluded.level, learner_vocab_bank_items.level),
      topic = coalesce(excluded.topic, learner_vocab_bank_items.topic),
      source_exercise_id = excluded.source_exercise_id,
      source_exercise_version_id = excluded.source_exercise_version_id,
      source_attempt_id = excluded.source_attempt_id,
      source_activity_title = excluded.source_activity_title,
      activity_added = true,
      encounter_count = learner_vocab_bank_items.encounter_count + 1,
      last_seen_at = now(),
      updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.exercise_builder_collect_vocab_bank(uuid) from public;
revoke execute on function public.exercise_builder_collect_vocab_bank(uuid) from authenticated;

create or replace function public.exercise_builder_collect_vocab_bank_on_submit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'submitted' and old.status is distinct from new.status then
    perform public.exercise_builder_collect_vocab_bank(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.exercise_builder_collect_vocab_bank_on_submit() from public;

drop trigger if exists exercise_builder_attempt_collect_vocab_bank on public.exercise_builder_attempts;
create trigger exercise_builder_attempt_collect_vocab_bank
after update of status on public.exercise_builder_attempts
for each row
when (new.status = 'submitted' and old.status is distinct from new.status)
execute function public.exercise_builder_collect_vocab_bank_on_submit();
