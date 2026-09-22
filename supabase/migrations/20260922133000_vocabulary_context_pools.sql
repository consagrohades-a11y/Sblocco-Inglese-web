-- Vocabulary context pools: keep 3-5 reusable example sentences with each bank item.
alter table public.learner_vocab_bank_items
  add column if not exists examples jsonb not null default '[]'::jsonb;

alter table public.learner_vocab_bank_items
  drop constraint if exists learner_vocab_bank_items_examples_array_check;

alter table public.learner_vocab_bank_items
  add constraint learner_vocab_bank_items_examples_array_check
  check (jsonb_typeof(examples) = 'array');

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

  if v_attempt.id is null then raise exception 'Attempt not found.'; end if;
  if auth.uid() is distinct from v_attempt.learner_id and not public.is_admin() then
    raise exception 'Learner access required.';
  end if;

  with raw_candidates as (
    select
      case
        when lower(coalesce(entry->>'kind', entry->>'vocab_kind', '')) in ('word', 'chunk')
          then lower(coalesce(entry->>'kind', entry->>'vocab_kind'))
        when trim(coalesce(entry->>'term', '')) ~ '\s' then 'chunk'
        else 'word'
      end as bank_kind,
      regexp_replace(lower(trim(coalesce(entry->>'term', ''))), '\s+', ' ', 'g') as normalized_text,
      trim(coalesce(entry->>'term', '')) as display_text,
      nullif(trim(entry->>'meaning'), '') as english_meaning,
      nullif(trim(entry->>'translation'), '') as italian_support,
      nullif(trim(entry->>'example'), '') as example,
      case
        when jsonb_typeof(entry->'examples') = 'array' then entry->'examples'
        when nullif(trim(entry->>'example'), '') is not null then jsonb_build_array(trim(entry->>'example'))
        else '[]'::jsonb
      end as examples,
      5 as richness
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
      null, null, null, '[]'::jsonb, 1
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
      bank_kind, normalized_text, display_text, english_meaning, italian_support, example, examples
    from raw_candidates
    where normalized_text <> ''
    order by bank_kind, normalized_text, richness desc
  )
  insert into public.learner_vocab_bank_items (
    learner_id, bank_kind, normalized_text, display_text, english_meaning, italian_support,
    example, examples, level, topic, source_exercise_id, source_exercise_version_id,
    source_attempt_id, source_activity_title, activity_added, self_added
  )
  select
    v_attempt.learner_id, candidate.bank_kind, candidate.normalized_text, candidate.display_text,
    candidate.english_meaning, candidate.italian_support, candidate.example, candidate.examples,
    nullif(v_attempt.exercise_snapshot->>'level', ''), nullif(v_attempt.exercise_snapshot->>'topic', ''),
    v_attempt.exercise_id, v_attempt.exercise_version_id, v_attempt.id,
    nullif(v_attempt.exercise_snapshot->>'title', ''), true, false
  from candidates candidate
  on conflict (learner_id, bank_kind, normalized_text) do update
  set display_text = excluded.display_text,
      english_meaning = coalesce(excluded.english_meaning, learner_vocab_bank_items.english_meaning),
      italian_support = coalesce(excluded.italian_support, learner_vocab_bank_items.italian_support),
      example = coalesce(excluded.example, learner_vocab_bank_items.example),
      examples = case
        when jsonb_array_length(excluded.examples) > 0 then excluded.examples
        else learner_vocab_bank_items.examples
      end,
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

notify pgrst, 'reload schema';
