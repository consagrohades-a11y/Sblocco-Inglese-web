-- Explicit duplicate resolution for Word and Expression imports.
-- Existing import RPCs remain unchanged for backward compatibility.

create or replace function public.admin_import_word_cards_with_duplicate_policy(p_cards jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card jsonb;
  v_action text;
  v_created integer := 0;
  v_replaced integer := 0;
  v_skipped integer := 0;
  v_card_id uuid;
  v_replace_id uuid;
  v_existing_by_id uuid;
  v_existing_by_content uuid;
  v_target_public_id text;
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
    v_action := lower(trim(coalesce(nullif(v_card->>'_duplicate_action', ''), 'create')));
    if v_action not in ('create', 'replace', 'skip') then
      raise exception 'Invalid Word duplicate action.';
    end if;

    if v_action = 'skip' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_public_id := lower(trim(coalesce(v_card->>'public_id', '')));
    v_generated := coalesce((v_card->>'_generated_public_id')::boolean, false);
    v_existing_by_id := null;
    v_existing_by_content := null;
    v_replace_id := null;
    v_target_public_id := null;
    v_deck_ids := '{}'::uuid[];

    if v_public_id <> '' then
      select li.id
      into v_existing_by_id
      from public.learning_items li
      where lower(li.public_id) = v_public_id
      limit 1;
    end if;

    select li.id
    into v_existing_by_content
    from public.learning_items li
    join public.words word on word.id = li.id
    where li.item_type = 'word'
      and lower(trim(word.lemma)) = lower(trim(coalesce(v_card->>'lemma', '')))
      and lower(trim(word.italian_meaning)) = lower(trim(coalesce(v_card->>'italian_meaning', '')))
      and lower(trim(word.part_of_speech)) = lower(trim(coalesce(v_card->>'part_of_speech', '')))
    order by li.updated_at desc, li.id
    limit 1;

    if v_action = 'replace' then
      begin
        v_replace_id := nullif(v_card->>'_replace_existing_id', '')::uuid;
      exception
        when invalid_text_representation then
          raise exception 'Invalid Word replacement identifier.';
      end;

      if v_replace_id is null then
        raise exception 'A replacement target is required for duplicate Word cards.';
      end if;

      select li.public_id
      into v_target_public_id
      from public.learning_items li
      where li.id = v_replace_id
        and li.item_type = 'word'
      for update;

      if v_target_public_id is null then
        raise exception 'The Word card selected for replacement no longer exists.';
      end if;
      if v_existing_by_id is not null and v_existing_by_id <> v_replace_id then
        raise exception 'The Word public ID now belongs to a different card. Reload the import preview.';
      end if;
      if v_existing_by_content is not null and v_existing_by_content <> v_replace_id then
        raise exception 'The Word content now matches a different card. Reload the import preview.';
      end if;
      if v_existing_by_id is null and v_existing_by_content is null then
        raise exception 'The selected Word card is no longer a duplicate. Reload the import preview.';
      end if;

      v_public_id := v_target_public_id;
      v_card_id := public.admin_save_word_card(
        v_card || jsonb_build_object(
          'id', v_replace_id,
          'public_id', v_public_id,
          'status', 'draft',
          'review_status', 'pending',
          'review_decision', '',
          'review_notes', coalesce(v_card->>'review_notes', '')
        )
      );
      update public.learning_items
      set reviewed_by = null,
          reviewed_at = null
      where id = v_card_id;
      v_replaced := v_replaced + 1;
    else
      if v_public_id = '' or (
        v_generated and exists (
          select 1 from public.learning_items where lower(public_id) = v_public_id
        )
      ) then
        v_public_id := public.admin_next_card_public_id('word');
      elsif v_public_id !~ '^word-[0-9]{4}$' then
        raise exception 'Word ID % is invalid. Use word-0001 or leave it empty.', v_public_id;
      elsif v_existing_by_id is not null then
        raise exception 'Word card % already exists. Choose Replace or Skip.', v_public_id;
      end if;

      if v_existing_by_content is not null then
        raise exception 'A matching Word card already exists. Choose Replace or Skip.';
      end if;

      v_card_id := public.admin_save_word_card(
        v_card || jsonb_build_object(
          'id', null,
          'public_id', v_public_id,
          'status', 'draft',
          'review_status', 'pending',
          'review_decision', '',
          'review_notes', coalesce(v_card->>'review_notes', '')
        )
      );
      v_created := v_created + 1;
    end if;

    v_requested_decks := coalesce(array(
      select jsonb_array_elements_text(
        coalesce(v_card->'deck_public_ids', v_card->'decks', '[]'::jsonb)
      )
    ), '{}'::text[]);

    if coalesce(array_length(v_requested_decks, 1), 0) > 0 then
      select coalesce(array_agg(id order by public_id), '{}'::uuid[])
      into v_deck_ids
      from public.collections
      where content_type = 'word'
        and public_id = any(v_requested_decks);

      if coalesce(array_length(v_deck_ids, 1), 0)
        <> coalesce(array_length(v_requested_decks, 1), 0) then
        raise exception 'One or more requested Word decks do not exist.';
      end if;
    end if;

    if v_action = 'replace' or coalesce(array_length(v_requested_decks, 1), 0) > 0 then
      perform public.admin_replace_word_deck_items_for_card(v_card_id, v_deck_ids);
    end if;
  end loop;

  return jsonb_build_object(
    'imported', v_created + v_replaced,
    'created', v_created,
    'replaced', v_replaced,
    'skipped', v_skipped
  );
end;
$$;

create or replace function public.admin_import_expression_cards_with_duplicate_policy(p_cards jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card jsonb;
  v_action text;
  v_created integer := 0;
  v_replaced integer := 0;
  v_skipped integer := 0;
  v_card_id uuid;
  v_replace_id uuid;
  v_existing_by_id uuid;
  v_existing_by_content uuid;
  v_target_public_id text;
  v_target_domain text;
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
    v_action := lower(trim(coalesce(nullif(v_card->>'_duplicate_action', ''), 'create')));
    if v_action not in ('create', 'replace', 'skip') then
      raise exception 'Invalid Expression duplicate action.';
    end if;

    if v_action = 'skip' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_domain := lower(trim(coalesce(nullif(v_card->>'primary_domain', ''), 'general')));
    if v_domain not in ('general', 'business', 'hospitality') then
      raise exception 'Invalid Expression domain: %.', v_domain;
    end if;
    v_prefix := v_domain;
    v_public_id := lower(trim(coalesce(v_card->>'public_id', '')));
    v_generated := coalesce((v_card->>'_generated_public_id')::boolean, false);
    v_existing_by_id := null;
    v_existing_by_content := null;
    v_replace_id := null;
    v_target_public_id := null;
    v_target_domain := null;
    v_deck_ids := '{}'::uuid[];

    if v_public_id <> '' then
      select li.id
      into v_existing_by_id
      from public.learning_items li
      where lower(li.public_id) = v_public_id
      limit 1;
    end if;

    select li.id
    into v_existing_by_content
    from public.learning_items li
    join public.expressions expression on expression.id = li.id
    where li.item_type = 'expression'
      and li.primary_domain = v_domain
      and lower(trim(expression.canonical_text)) = lower(trim(coalesce(v_card->>'canonical_text', '')))
      and lower(trim(expression.italian_meaning)) = lower(trim(coalesce(v_card->>'italian_meaning', '')))
    order by li.updated_at desc, li.id
    limit 1;

    if v_action = 'replace' then
      begin
        v_replace_id := nullif(v_card->>'_replace_existing_id', '')::uuid;
      exception
        when invalid_text_representation then
          raise exception 'Invalid Expression replacement identifier.';
      end;

      if v_replace_id is null then
        raise exception 'A replacement target is required for duplicate Expression cards.';
      end if;

      select li.public_id, li.primary_domain
      into v_target_public_id, v_target_domain
      from public.learning_items li
      where li.id = v_replace_id
        and li.item_type = 'expression'
      for update;

      if v_target_public_id is null then
        raise exception 'The Expression card selected for replacement no longer exists.';
      end if;
      if v_target_domain <> v_domain then
        raise exception 'Expression replacements must remain inside the same domain.';
      end if;
      if v_existing_by_id is not null and v_existing_by_id <> v_replace_id then
        raise exception 'The Expression public ID now belongs to a different card. Reload the import preview.';
      end if;
      if v_existing_by_content is not null and v_existing_by_content <> v_replace_id then
        raise exception 'The Expression content now matches a different card. Reload the import preview.';
      end if;
      if v_existing_by_id is null and v_existing_by_content is null then
        raise exception 'The selected Expression card is no longer a duplicate. Reload the import preview.';
      end if;

      v_public_id := v_target_public_id;
      v_card_id := public.admin_save_expression_card(
        v_card || jsonb_build_object(
          'id', v_replace_id,
          'public_id', v_public_id,
          'primary_domain', v_domain,
          'status', 'draft',
          'review_status', 'pending',
          'review_decision', '',
          'review_notes', coalesce(v_card->>'review_notes', '')
        )
      );
      update public.learning_items
      set reviewed_by = null,
          reviewed_at = null
      where id = v_card_id;
      v_replaced := v_replaced + 1;
    else
      if v_public_id = '' or (
        v_generated and exists (
          select 1 from public.learning_items where lower(public_id) = v_public_id
        )
      ) then
        v_public_id := public.admin_next_card_public_id(v_prefix);
      elsif v_public_id !~ ('^' || v_prefix || '-[0-9]{4}$') then
        raise exception 'Expression ID % is invalid for %. Leave it empty to generate one.', v_public_id, v_domain;
      elsif v_existing_by_id is not null then
        raise exception 'Expression card % already exists. Choose Replace or Skip.', v_public_id;
      end if;

      if v_existing_by_content is not null then
        raise exception 'A matching Expression card already exists. Choose Replace or Skip.';
      end if;

      v_card_id := public.admin_save_expression_card(
        v_card || jsonb_build_object(
          'id', null,
          'public_id', v_public_id,
          'primary_domain', v_domain,
          'status', 'draft',
          'review_status', 'pending',
          'review_decision', '',
          'review_notes', coalesce(v_card->>'review_notes', '')
        )
      );
      v_created := v_created + 1;
    end if;

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
    end if;

    if v_action = 'replace' or coalesce(array_length(v_requested_decks, 1), 0) > 0 then
      perform public.admin_replace_expression_deck_items_for_card(v_card_id, v_deck_ids);
    end if;
  end loop;

  return jsonb_build_object(
    'imported', v_created + v_replaced,
    'created', v_created,
    'replaced', v_replaced,
    'skipped', v_skipped
  );
end;
$$;

revoke all on function public.admin_import_word_cards_with_duplicate_policy(jsonb) from public;
revoke all on function public.admin_import_expression_cards_with_duplicate_policy(jsonb) from public;

grant execute on function public.admin_import_word_cards_with_duplicate_policy(jsonb) to authenticated;
grant execute on function public.admin_import_expression_cards_with_duplicate_policy(jsonb) to authenticated;
