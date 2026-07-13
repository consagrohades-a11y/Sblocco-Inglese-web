-- Safe, automatic public IDs and duplicate protection for Word and Expression imports.
-- Apply after 20260713260000_mixed_deck_collections.sql.

create or replace function public.admin_next_card_public_id(p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_prefix not in ('word', 'general', 'business', 'hospitality') then
    raise exception 'Invalid card ID prefix.';
  end if;

  select coalesce(max(right(public_id, 4)::integer), 0) + 1
  into v_next
  from public.learning_items
  where public_id ~ ('^' || p_prefix || '-[0-9]{4}$');

  if v_next > 9999 then
    raise exception 'No public IDs remain for prefix %.', p_prefix;
  end if;

  return p_prefix || '-' || lpad(v_next::text, 4, '0');
end;
$$;

revoke all on function public.admin_next_card_public_id(text) from public;
grant execute on function public.admin_next_card_public_id(text) to authenticated;

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
  v_public_id text;
  v_generated boolean;
  v_requested_decks text[];
  v_deck_ids uuid[];
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'Expected a JSON array of word cards.';
  end if;

  perform pg_advisory_xact_lock(hashtext('sblocco-card-import-word'));

  for v_card in select value from jsonb_array_elements(p_cards)
  loop
    v_public_id := lower(trim(coalesce(v_card->>'public_id', '')));
    v_generated := coalesce((v_card->>'_generated_public_id')::boolean, false);

    if v_public_id = '' or (
      v_generated and exists (
        select 1 from public.learning_items where public_id = v_public_id
      )
    ) then
      v_public_id := public.admin_next_card_public_id('word');
    elsif v_public_id !~ '^word-[0-9]{4}$' then
      raise exception 'Word ID % is invalid. Use word-0001 or leave it empty.', v_public_id;
    elsif exists (select 1 from public.learning_items where public_id = v_public_id) then
      raise exception 'Public ID % already exists. No cards were imported.', v_public_id;
    end if;

    if exists (
      select 1
      from public.learning_items li
      join public.words w on w.id = li.id
      where li.item_type = 'word'
        and lower(trim(w.lemma)) = lower(trim(coalesce(v_card->>'lemma', '')))
        and lower(trim(w.italian_meaning)) = lower(trim(coalesce(v_card->>'italian_meaning', '')))
        and lower(trim(w.part_of_speech)) = lower(trim(coalesce(v_card->>'part_of_speech', '')))
    ) then
      raise exception 'A matching Word card already exists for %. No cards were imported.', v_card->>'lemma';
    end if;

    v_card := jsonb_set(v_card, '{public_id}', to_jsonb(v_public_id), true);
    v_card_id := public.admin_save_word_card(
      v_card || jsonb_build_object(
        'id', null,
        'status', 'draft',
        'review_status', 'pending',
        'review_decision', '',
        'review_notes', coalesce(v_card->>'review_notes', '')
      )
    );

    v_requested_decks := coalesce(array(
      select jsonb_array_elements_text(
        coalesce(v_card->'deck_public_ids', v_card->'decks', '[]'::jsonb)
      )
    ), '{}'::text[]);

    if coalesce(array_length(v_requested_decks, 1), 0) > 0 then
      select coalesce(array_agg(id order by public_id), '{}'::uuid[])
      into v_deck_ids
      from public.collections
      where content_type = 'word' and public_id = any(v_requested_decks);

      if coalesce(array_length(v_deck_ids, 1), 0)
        <> coalesce(array_length(v_requested_decks, 1), 0) then
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

create or replace function public.admin_import_expression_cards(p_cards jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card jsonb;
  v_count integer := 0;
  v_card_id uuid;
  v_domain text;
  v_prefix text;
  v_public_id text;
  v_generated boolean;
  v_requested_decks text[];
  v_deck_ids uuid[];
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'Expected a JSON array of expression cards.';
  end if;

  perform pg_advisory_xact_lock(hashtext('sblocco-card-import-expression'));

  for v_card in select value from jsonb_array_elements(p_cards)
  loop
    v_domain := lower(trim(coalesce(nullif(v_card->>'primary_domain', ''), 'general')));
    if v_domain not in ('general', 'business', 'hospitality') then
      raise exception 'Invalid Expression domain: %.', v_domain;
    end if;
    v_prefix := v_domain;
    v_public_id := lower(trim(coalesce(v_card->>'public_id', '')));
    v_generated := coalesce((v_card->>'_generated_public_id')::boolean, false);

    if v_public_id = '' or (
      v_generated and exists (
        select 1 from public.learning_items where public_id = v_public_id
      )
    ) then
      v_public_id := public.admin_next_card_public_id(v_prefix);
    elsif v_public_id !~ ('^' || v_prefix || '-[0-9]{4}$') then
      raise exception 'Expression ID % is invalid for %. Leave it empty to generate one.', v_public_id, v_domain;
    elsif exists (select 1 from public.learning_items where public_id = v_public_id) then
      raise exception 'Public ID % already exists. No cards were imported.', v_public_id;
    end if;

    if exists (
      select 1
      from public.learning_items li
      join public.expressions e on e.id = li.id
      where li.item_type = 'expression'
        and li.primary_domain = v_domain
        and lower(trim(e.canonical_text)) = lower(trim(coalesce(v_card->>'canonical_text', '')))
        and lower(trim(e.italian_meaning)) = lower(trim(coalesce(v_card->>'italian_meaning', '')))
    ) then
      raise exception 'A matching Expression card already exists for %. No cards were imported.', v_card->>'canonical_text';
    end if;

    v_card := jsonb_set(v_card, '{public_id}', to_jsonb(v_public_id), true);
    v_card_id := public.admin_save_expression_card(
      v_card || jsonb_build_object(
        'id', null,
        'status', 'draft',
        'review_status', 'pending',
        'review_decision', '',
        'review_notes', coalesce(v_card->>'review_notes', '')
      )
    );

    v_requested_decks := coalesce(array(
      select jsonb_array_elements_text(
        coalesce(v_card->'deck_public_ids', v_card->'decks', '[]'::jsonb)
      )
    ), '{}'::text[]);

    if coalesce(array_length(v_requested_decks, 1), 0) > 0 then
      select coalesce(array_agg(id order by public_id), '{}'::uuid[])
      into v_deck_ids
      from public.collections
      where content_type = 'expression'
        and content_domain = v_domain
        and public_id = any(v_requested_decks);

      if coalesce(array_length(v_deck_ids, 1), 0)
        <> coalesce(array_length(v_requested_decks, 1), 0) then
        raise exception 'One or more requested Expression decks do not exist.';
      end if;
      perform public.admin_replace_expression_deck_items_for_card(v_card_id, v_deck_ids);
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.admin_import_expression_cards(jsonb) from public;
grant execute on function public.admin_import_expression_cards(jsonb) to authenticated;
