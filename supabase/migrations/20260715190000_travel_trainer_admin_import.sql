-- Travel Trainer admin authoring and batch import support.
-- The existing 100 starter cards remain static until an admin copies them into the database.

create or replace function public.admin_import_travel_expression_cards(p_cards jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card jsonb;
  v_public_id text;
  v_card_id uuid;
  v_existing_id uuid;
  v_existing_content_id uuid;
  v_next integer;
  v_created integer := 0;
  v_skipped integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'Expected a JSON array of Travel expression cards.';
  end if;

  perform pg_advisory_xact_lock(hashtext('sblocco-card-import-travel'));

  select greatest(
    100,
    coalesce(max(right(public_id, 4)::integer), 100)
  )
  into v_next
  from public.learning_items
  where public_id ~ '^travel-[0-9]{4}$';

  for v_card in select value from jsonb_array_elements(p_cards)
  loop
    v_public_id := lower(trim(coalesce(v_card->>'public_id', '')));

    if v_public_id = '' then
      loop
        v_next := v_next + 1;
        v_public_id := 'travel-' || lpad(v_next::text, 4, '0');
        exit when not exists (
          select 1 from public.learning_items where public_id = v_public_id
        );
      end loop;
    elsif v_public_id !~ '^travel-[0-9]{4}$' then
      raise exception 'Travel ID % is invalid. Use travel-0101 or leave it empty.', v_public_id;
    else
      v_next := greatest(v_next, right(v_public_id, 4)::integer);
    end if;

    select id into v_existing_id
    from public.learning_items
    where public_id = v_public_id
    limit 1;

    select li.id into v_existing_content_id
    from public.learning_items li
    join public.expressions expression on expression.id = li.id
    where li.item_type = 'expression'
      and li.primary_domain = 'travel'
      and lower(trim(expression.canonical_text)) = lower(trim(coalesce(v_card->>'canonical_text', v_card->>'expression', '')))
      and lower(trim(expression.italian_meaning)) = lower(trim(coalesce(v_card->>'italian_meaning', v_card->>'italian', '')))
    limit 1;

    if v_existing_id is not null or v_existing_content_id is not null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_card_id := public.admin_save_expression_card(
      v_card || jsonb_build_object(
        'id', null,
        'public_id', v_public_id,
        'primary_domain', 'travel',
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

    v_created := v_created + 1;
  end loop;

  return jsonb_build_object(
    'created', v_created,
    'skipped', v_skipped,
    'total', v_created + v_skipped
  );
end;
$$;

revoke all on function public.admin_import_travel_expression_cards(jsonb) from public;
grant execute on function public.admin_import_travel_expression_cards(jsonb) to authenticated;
