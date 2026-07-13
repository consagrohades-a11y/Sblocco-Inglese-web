-- Mixed decks can combine Word cards with Expressions from one Expression Trainer.
-- Apply after 20260713250000_expression_deck_collections.sql.

alter table public.collections
  drop constraint if exists collections_content_type_check;

alter table public.collections
  add constraint collections_content_type_check
  check (content_type is null or content_type in ('word', 'expression', 'mixed'));

drop function if exists public.admin_list_expression_decks(text);
create function public.admin_list_expression_decks(p_domain text)
returns table (
  id uuid, public_id text, title text, description text, collection_type text,
  content_type text, status text, card_count bigint, card_ids uuid[],
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.public_id, c.title, c.description, c.collection_type,
    c.content_type, c.status, count(ci.id),
    coalesce(
      array_agg(ci.learning_item_id order by ci.sequence_index) filter (where ci.id is not null),
      '{}'::uuid[]
    ),
    c.created_at, c.updated_at
  from public.collections c
  left join public.collection_items ci on ci.collection_id = c.id
  where public.is_admin()
    and c.content_type in ('expression', 'mixed')
    and c.content_domain = p_domain
  group by c.id
  order by c.updated_at desc, c.title;
$$;

revoke all on function public.admin_list_expression_decks(text) from public;
grant execute on function public.admin_list_expression_decks(text) to authenticated;

create or replace function public.admin_save_expression_deck(p_deck jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid := coalesce(nullif(p_deck->>'id', '')::uuid, gen_random_uuid());
  v_public_id text := lower(trim(coalesce(p_deck->>'public_id', '')));
  v_title text := trim(coalesce(p_deck->>'title', ''));
  v_domain text := lower(trim(coalesce(p_deck->>'content_domain', '')));
  v_content_type text := lower(trim(coalesce(nullif(p_deck->>'content_type', ''), 'expression')));
  v_status text := coalesce(nullif(p_deck->>'status', ''), 'draft');
  v_collection_type text := coalesce(nullif(p_deck->>'collection_type', ''), 'reusable');
  v_existing_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if v_domain not in ('general', 'business', 'hospitality') then
    raise exception 'Invalid Expression domain.';
  end if;
  if v_content_type not in ('expression', 'mixed') then
    raise exception 'Expression workspaces accept Expression or mixed decks.';
  end if;
  if v_public_id !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Deck ID must use lowercase letters, numbers, and hyphens.';
  end if;
  if v_title = '' then raise exception 'Deck title is required.'; end if;
  if v_status not in ('draft', 'review_needed', 'approved', 'published', 'archived') then
    raise exception 'Invalid deck status.';
  end if;
  if v_collection_type not in ('reusable', 'starter_pack', 'specialist') then
    raise exception 'Invalid deck type.';
  end if;

  select id into v_existing_id from public.collections where public_id = v_public_id;
  if v_existing_id is not null and v_existing_id <> v_id then
    raise exception 'Deck ID % already exists.', v_public_id;
  end if;

  insert into public.collections (
    id, public_id, title, description, collection_type,
    content_type, content_domain, status, created_by
  ) values (
    v_id, v_public_id, v_title, nullif(trim(p_deck->>'description'), ''),
    v_collection_type, v_content_type, v_domain, v_status, auth.uid()
  ) on conflict (id) do update set
    public_id = excluded.public_id,
    title = excluded.title,
    description = excluded.description,
    collection_type = excluded.collection_type,
    content_type = excluded.content_type,
    content_domain = excluded.content_domain,
    status = excluded.status;

  return v_id;
end;
$$;

revoke all on function public.admin_save_expression_deck(jsonb) from public;
grant execute on function public.admin_save_expression_deck(jsonb) to authenticated;

create or replace function public.admin_replace_expression_deck_items(p_deck_id uuid, p_card_ids uuid[])
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
  v_domain text;
  v_content_type text;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  select content_domain, content_type into v_domain, v_content_type
  from public.collections
  where id = p_deck_id and content_type in ('expression', 'mixed');

  if v_domain is null then raise exception 'Expression or mixed deck not found.'; end if;

  if exists (
    select 1
    from unnest(coalesce(p_card_ids, '{}'::uuid[])) card_id
    where not exists (
      select 1
      from public.learning_items li
      where li.id = card_id
        and (
          (v_content_type = 'expression' and li.item_type = 'expression' and li.primary_domain = v_domain)
          or
          (v_content_type = 'mixed' and (
            li.item_type = 'word'
            or (li.item_type = 'expression' and li.primary_domain = v_domain)
          ))
        )
    )
  ) then
    raise exception 'A deck may contain Words and Expressions only from its selected Trainer.';
  end if;

  delete from public.collection_items where collection_id = p_deck_id;
  insert into public.collection_items (collection_id, learning_item_id, sequence_index)
  select p_deck_id, card_id, row_number() over (order by first_position)::integer
  from (
    select card_id, min(position) first_position
    from unnest(coalesce(p_card_ids, '{}'::uuid[])) with ordinality requested(card_id, position)
    group by card_id
  ) ordered_cards;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_replace_expression_deck_items(uuid, uuid[]) from public;
grant execute on function public.admin_replace_expression_deck_items(uuid, uuid[]) to authenticated;

create or replace function public.admin_delete_expression_deck(p_deck_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if not exists (
    select 1 from public.collections
    where id = p_deck_id and content_type in ('expression', 'mixed')
  ) then
    raise exception 'Expression or mixed deck not found.';
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

revoke all on function public.admin_delete_expression_deck(uuid) from public;
grant execute on function public.admin_delete_expression_deck(uuid) to authenticated;

create or replace function public.list_published_mixed_deck_cards(p_domain text default null)
returns table (
  id uuid,
  public_id text,
  item_type text,
  level text,
  primary_domain text,
  category text,
  english text,
  italian text,
  accepted_answers text[],
  example_1 text,
  example_2 text,
  explanation text,
  tags text[],
  deck_ids uuid[],
  deck_public_ids text[],
  deck_titles text[]
)
language sql stable security definer set search_path = public
as $$
  with mixed_memberships as (
    select
      ci.learning_item_id,
      array_agg(c.id order by ci.sequence_index) as deck_ids,
      array_agg(c.public_id order by ci.sequence_index) as deck_public_ids,
      array_agg(c.title order by ci.sequence_index) as deck_titles
    from public.collection_items ci
    join public.collections c on c.id = ci.collection_id
    where c.content_type = 'mixed'
      and c.status = 'published'
      and (p_domain is null or c.content_domain = p_domain)
    group by ci.learning_item_id
  )
  select
    li.id,
    li.public_id,
    'word'::text,
    li.level,
    li.primary_domain,
    li.topic,
    w.lemma,
    w.italian_meaning,
    w.accepted_answers,
    w.example_1,
    w.example_2,
    coalesce(nullif(w.english_definition, ''), w.usage_note, ''),
    w.tags,
    mm.deck_ids,
    mm.deck_public_ids,
    mm.deck_titles
  from mixed_memberships mm
  join public.learning_items li on li.id = mm.learning_item_id
  join public.words w on w.id = li.id
  where li.item_type = 'word' and li.status = 'published'

  union all

  select
    li.id,
    li.public_id,
    'expression'::text,
    li.level,
    li.primary_domain,
    li.topic,
    e.canonical_text,
    e.italian_meaning,
    e.accepted_answers,
    e.example_1,
    e.example_2,
    coalesce(nullif(e.english_explanation, ''), e.usage_note, ''),
    e.tags,
    mm.deck_ids,
    mm.deck_public_ids,
    mm.deck_titles
  from mixed_memberships mm
  join public.learning_items li on li.id = mm.learning_item_id
  join public.expressions e on e.id = li.id
  where li.item_type = 'expression' and li.status = 'published'

  order by 4, 6, 2;
$$;

revoke all on function public.list_published_mixed_deck_cards(text) from public;
grant execute on function public.list_published_mixed_deck_cards(text) to anon, authenticated;
