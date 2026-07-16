-- Synchronize the curated Travel starter catalogue without touching custom Travel cards.
-- Applies only to stable starter IDs travel-0001 through travel-0100.

create or replace function public.admin_sync_travel_expression_cards(p_cards jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card jsonb;
  v_public_id text;
  v_number integer;
  v_existing_id uuid;
  v_existing_domain text;
  v_status text;
  v_review_status text;
  v_review_decision text;
  v_review_notes text;
  v_card_id uuid;
  v_created integer := 0;
  v_updated integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'Expected a JSON array of Travel starter cards.';
  end if;

  perform pg_advisory_xact_lock(hashtext('sblocco-card-sync-travel-starters'));

  for v_card in select value from jsonb_array_elements(p_cards)
  loop
    v_public_id := lower(trim(coalesce(v_card->>'public_id', '')));

    if v_public_id !~ '^travel-[0-9]{4}$' then
      raise exception 'Travel starter ID % is invalid.', coalesce(nullif(v_public_id, ''), '(empty)');
    end if;

    v_number := right(v_public_id, 4)::integer;
    if v_number < 1 or v_number > 100 then
      raise exception 'Travel starter sync only accepts travel-0001 through travel-0100.';
    end if;

    select li.id, li.primary_domain, li.status, li.review_status,
      li.review_decision, li.review_notes
    into v_existing_id, v_existing_domain, v_status, v_review_status,
      v_review_decision, v_review_notes
    from public.learning_items li
    where li.public_id = v_public_id
    for update;

    if v_existing_id is not null and v_existing_domain <> 'travel' then
      raise exception 'Public ID % belongs to another content domain.', v_public_id;
    end if;

    if v_existing_id is null then
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
    else
      perform public.admin_save_expression_card(
        v_card || jsonb_build_object(
          'id', v_existing_id,
          'public_id', v_public_id,
          'primary_domain', 'travel',
          'status', v_status,
          'review_status', v_review_status,
          'review_decision', coalesce(v_review_decision, ''),
          'review_notes', coalesce(v_review_notes, '')
        )
      );

      v_updated := v_updated + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'total', v_created + v_updated
  );
end;
$$;

revoke all on function public.admin_sync_travel_expression_cards(jsonb) from public;
grant execute on function public.admin_sync_travel_expression_cards(jsonb) to authenticated;
