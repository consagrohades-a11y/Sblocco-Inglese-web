-- Unified admin content import, archive, restore, and permitted deletion.
-- Apply after 20260713213000_admin_bulk_publish_cards.sql.

create or replace function public.admin_import_expression_cards(p_cards jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card jsonb;
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'Expected a JSON array of expression cards.';
  end if;

  for v_card in select value from jsonb_array_elements(p_cards)
  loop
    perform public.admin_save_expression_card(
      v_card
      || jsonb_build_object(
        'id', null,
        'status', 'draft',
        'review_status', 'pending',
        'review_decision', '',
        'review_notes', coalesce(v_card->>'review_notes', '')
      )
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.admin_import_expression_cards(jsonb) from public;
grant execute on function public.admin_import_expression_cards(jsonb) to authenticated;

create or replace function public.admin_set_card_status(
  p_card_id uuid,
  p_item_type text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_item_type not in ('word', 'expression') then
    raise exception 'Unsupported card type.';
  end if;

  if p_status not in ('draft', 'archived') then
    raise exception 'Only draft and archived status changes are allowed here.';
  end if;

  update public.learning_items
  set status = p_status,
      updated_at = now()
  where id = p_card_id
    and item_type = p_item_type;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Card not found.';
  end if;
end;
$$;

revoke all on function public.admin_set_card_status(uuid, text, text) from public;
grant execute on function public.admin_set_card_status(uuid, text, text) to authenticated;

create or replace function public.admin_delete_card(
  p_card_id uuid,
  p_item_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_item_type not in ('word', 'expression') then
    raise exception 'Unsupported card type.';
  end if;

  select status
  into v_status
  from public.learning_items
  where id = p_card_id
    and item_type = p_item_type
  for update;

  if v_status is null then
    raise exception 'Card not found.';
  end if;

  if v_status = 'published' then
    raise exception 'Published cards must be archived before deletion.';
  end if;

  delete from public.learning_items
  where id = p_card_id
    and item_type = p_item_type;
end;
$$;

revoke all on function public.admin_delete_card(uuid, text) from public;
grant execute on function public.admin_delete_card(uuid, text) to authenticated;
