-- Word Trainer decks built on the shared collections foundation.

alter table public.collections
  add column if not exists content_type text
    check (content_type is null or content_type in ('word', 'expression'));

create index if not exists collections_content_type_status_idx
  on public.collections(content_type, status);

create or replace function public.admin_list_word_decks()
returns table (
  id uuid,
  public_id text,
  title text,
  description text,
  collection_type text,
  status text,
  card_count bigint,
  card_ids uuid[],
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.public_id,
    c.title,
    c.description,
    c.collection_type,
    c.status,
    count(ci.id) as card_count,
    coalesce(array_agg(ci.learning_item_id order by ci.sequence_index) filter (where ci.id is not null), '{}'::uuid[]) as card_ids,
    c.created_at,
    c.updated_at
  from public.collections c
  left join public.collection_items ci on ci.collection_id = c.id
  where public.is_admin()
    and c.content_type = 'word'
  group by c.id
  order by c.updated_at desc, c.title;
$$;

revoke all on function public.admin_list_word_decks() from public;
grant execute on function public.admin_list_word_decks() to authenticated;

create or replace function public.admin_save_word_deck(p_deck jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(nullif(p_deck->>'id', '')::uuid, gen_random_uuid());
  v_public_id text := lower(trim(coalesce(p_deck->>'public_id', '')));
  v_title text := trim(coalesce(p_deck->>'title', ''));
  v_status text := coalesce(nullif(p_deck->>'status', ''), 'draft');
  v_collection_type text := coalesce(nullif(p_deck->>'collection_type', ''), 'reusable');
  v_existing_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if v_public_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Deck ID must use lowercase letters, numbers, and hyphens.';
  end if;
  if v_title = '' then raise exception 'Deck title is required.'; end if;
  if v_status not in ('draft', 'review_needed', 'approved', 'published', 'archived') then
    raise exception 'Invalid deck status.';
  end if;
  if v_collection_type not in ('reusable', 'starter_pack', 'specialist') then
    raise exception 'Invalid Word deck type.';
  end if;

  select id into v_existing_id from public.collections where public_id = v_public_id;
  if v_existing_id is not null and v_existing_id <> v_id then
    raise exception 'Deck ID % already exists.', v_public_id;
  end if;

  insert into public.collections (
    id, public_id, title, description, collection_type, content_type, status, created_by
  ) values (
    v_id, v_public_id, v_title, nullif(trim(p_deck->>'description'), ''),
    v_collection_type, 'word', v_status, auth.uid()
  ) on conflict (id) do update set
    public_id = excluded.public_id,
    title = excluded.title,
    description = excluded.description,
    collection_type = excluded.collection_type,
    content_type = 'word',
    status = excluded.status;

  return v_id;
end;
$$;

revoke all on function public.admin_save_word_deck(jsonb) from public;
grant execute on function public.admin_save_word_deck(jsonb) to authenticated;

create or replace function public.admin_replace_word_deck_items(p_deck_id uuid, p_card_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if not exists (select 1 from public.collections where id = p_deck_id and content_type = 'word') then
    raise exception 'Word deck not found.';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_card_ids, '{}'::uuid[])) card_id
    where not exists (
      select 1 from public.learning_items li where li.id = card_id and li.item_type = 'word'
    )
  ) then
    raise exception 'Every deck item must be a Word card.';
  end if;

  delete from public.collection_items where collection_id = p_deck_id;

  insert into public.collection_items (collection_id, learning_item_id, sequence_index)
  select p_deck_id, card_id, row_number() over (order by first_position)::integer
  from (
    select card_id, min(position) as first_position
    from unnest(coalesce(p_card_ids, '{}'::uuid[])) with ordinality as requested(card_id, position)
    group by card_id
  ) ordered_cards;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_replace_word_deck_items(uuid, uuid[]) from public;
grant execute on function public.admin_replace_word_deck_items(uuid, uuid[]) to authenticated;

create or replace function public.admin_delete_word_deck(p_deck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if not exists (select 1 from public.collections where id = p_deck_id and content_type = 'word') then
    raise exception 'Word deck not found.';
  end if;
  if exists (select 1 from public.collections where id = p_deck_id and status = 'published') then
    raise exception 'Archive the deck before deleting it.';
  end if;
  if exists (select 1 from public.assignment_items where collection_id = p_deck_id) then
    raise exception 'This deck is referenced by an assignment and cannot be deleted.';
  end if;

  delete from public.collections where id = p_deck_id;
end;
$$;

revoke all on function public.admin_delete_word_deck(uuid) from public;
grant execute on function public.admin_delete_word_deck(uuid) to authenticated;

drop function if exists public.admin_list_word_cards();
create function public.admin_list_word_cards()
returns table (
  id uuid, public_id text, display_target text, level text, primary_domain text,
  topic text, priority text, status text, review_status text,
  review_decision text, review_notes text, reviewed_at timestamptz,
  lemma text, sense_label text, italian_meaning text, english_definition text,
  part_of_speech text, countability text, plural_form text, base_form text,
  past_form text, past_participle text, third_person_form text, ing_form text,
  register text, usage_channel text, common_collocations text[], common_mistakes text,
  accepted_answers text[], pronunciation_ipa_us text, pronunciation_learner_us text,
  example_1 text, example_2 text, usage_note text, tags text[],
  deck_ids uuid[], deck_public_ids text[], deck_titles text[], updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    li.id, li.public_id, li.display_target, li.level, li.primary_domain,
    li.topic, li.priority, li.status, li.review_status,
    li.review_decision, li.review_notes, li.reviewed_at,
    w.lemma, w.sense_label, w.italian_meaning, w.english_definition,
    w.part_of_speech, w.countability, w.plural_form, w.base_form,
    w.past_form, w.past_participle, w.third_person_form, w.ing_form,
    w.register, w.usage_channel, w.common_collocations, w.common_mistakes,
    w.accepted_answers, w.pronunciation_ipa_us, w.pronunciation_learner_us,
    w.example_1, w.example_2, w.usage_note, w.tags,
    coalesce((select array_agg(c.id order by ci.sequence_index) from public.collection_items ci join public.collections c on c.id = ci.collection_id where ci.learning_item_id = li.id and c.content_type = 'word'), '{}'::uuid[]),
    coalesce((select array_agg(c.public_id order by ci.sequence_index) from public.collection_items ci join public.collections c on c.id = ci.collection_id where ci.learning_item_id = li.id and c.content_type = 'word'), '{}'::text[]),
    coalesce((select array_agg(c.title order by ci.sequence_index) from public.collection_items ci join public.collections c on c.id = ci.collection_id where ci.learning_item_id = li.id and c.content_type = 'word'), '{}'::text[]),
    li.updated_at
  from public.learning_items li
  join public.words w on w.id = li.id
  where public.is_admin() and li.item_type = 'word'
  order by li.updated_at desc;
$$;

revoke all on function public.admin_list_word_cards() from public;
grant execute on function public.admin_list_word_cards() to authenticated;

drop function if exists public.list_published_word_cards();
create function public.list_published_word_cards()
returns table (
  id uuid, public_id text, level text, category text, lemma text,
  part_of_speech text, italian_meaning text, english_definition text,
  pronunciation_ipa_us text, pronunciation_learner_us text,
  common_collocations text[], example_1 text, example_2 text, usage_note text,
  common_mistakes text, accepted_answers text[], tags text[],
  deck_ids uuid[], deck_public_ids text[], deck_titles text[]
)
language sql stable security invoker set search_path = public
as $$
  select
    li.id, li.public_id, li.level, li.topic as category, w.lemma,
    w.part_of_speech, w.italian_meaning, w.english_definition,
    w.pronunciation_ipa_us, w.pronunciation_learner_us,
    w.common_collocations, w.example_1, w.example_2, w.usage_note,
    w.common_mistakes, w.accepted_answers, w.tags,
    coalesce((select array_agg(c.id order by ci.sequence_index) from public.collection_items ci join public.collections c on c.id = ci.collection_id where ci.learning_item_id = li.id and c.content_type = 'word' and c.status = 'published'), '{}'::uuid[]),
    coalesce((select array_agg(c.public_id order by ci.sequence_index) from public.collection_items ci join public.collections c on c.id = ci.collection_id where ci.learning_item_id = li.id and c.content_type = 'word' and c.status = 'published'), '{}'::text[]),
    coalesce((select array_agg(c.title order by ci.sequence_index) from public.collection_items ci join public.collections c on c.id = ci.collection_id where ci.learning_item_id = li.id and c.content_type = 'word' and c.status = 'published'), '{}'::text[])
  from public.learning_items li
  join public.words w on w.id = li.id
  where li.item_type = 'word' and li.status = 'published'
  order by li.level, li.topic, li.public_id;
$$;

revoke all on function public.list_published_word_cards() from public;
grant execute on function public.list_published_word_cards() to anon, authenticated;

-- Card-oriented helper used by editor saves and imports.
create or replace function public.admin_replace_word_deck_items_for_card(p_card_id uuid, p_deck_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deck_id uuid;
  v_count integer := 0;
  v_next integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if not exists (select 1 from public.learning_items where id = p_card_id and item_type = 'word') then
    raise exception 'Word card not found.';
  end if;
  if exists (select 1 from unnest(coalesce(p_deck_ids, '{}'::uuid[])) deck_id where not exists (select 1 from public.collections where id = deck_id and content_type = 'word')) then
    raise exception 'One or more Word decks do not exist.';
  end if;

  delete from public.collection_items ci
  using public.collections c
  where ci.collection_id = c.id and ci.learning_item_id = p_card_id and c.content_type = 'word';

  for v_deck_id in select distinct unnest(coalesce(p_deck_ids, '{}'::uuid[]))
  loop
    select coalesce(max(sequence_index), 0) + 1 into v_next from public.collection_items where collection_id = v_deck_id;
    insert into public.collection_items (collection_id, learning_item_id, sequence_index)
    values (v_deck_id, p_card_id, v_next);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.admin_replace_word_deck_items_for_card(uuid, uuid[]) from public;
grant execute on function public.admin_replace_word_deck_items_for_card(uuid, uuid[]) to authenticated;

create or replace function public.admin_import_word_cards(p_cards jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card jsonb;
  v_count integer := 0;
  v_card_id uuid;
  v_requested_decks text[];
  v_deck_ids uuid[];
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if jsonb_typeof(p_cards) <> 'array' then raise exception 'Expected a JSON array of word cards.'; end if;

  for v_card in select value from jsonb_array_elements(p_cards)
  loop
    v_card_id := public.admin_save_word_card(
      v_card || jsonb_build_object('id', null, 'status', 'draft', 'review_status', 'pending', 'review_decision', '', 'review_notes', '')
    );

    v_requested_decks := coalesce(array(
      select jsonb_array_elements_text(coalesce(v_card->'deck_public_ids', v_card->'decks', '[]'::jsonb))
    ), '{}'::text[]);

    if coalesce(array_length(v_requested_decks, 1), 0) > 0 then
      select coalesce(array_agg(id order by public_id), '{}'::uuid[]) into v_deck_ids
      from public.collections
      where content_type = 'word' and public_id = any(v_requested_decks);

      if coalesce(array_length(v_deck_ids, 1), 0) <> coalesce(array_length(v_requested_decks, 1), 0) then
        raise exception 'One or more requested Word decks do not exist.';
      end if;
      perform public.admin_replace_word_deck_items_for_card(v_card_id, v_deck_ids);
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.admin_import_word_cards(jsonb) from public;
grant execute on function public.admin_import_word_cards(jsonb) to authenticated;
