-- Secure deletion for unpublished Trainer expression cards.
-- Published cards must be archived instead, so learner history is preserved.

create or replace function public.admin_delete_expression_card(p_card_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_item_type text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select item_type, status
  into v_item_type, v_status
  from public.learning_items
  where id = p_card_id
  for update;

  if not found then
    raise exception 'Card not found.';
  end if;

  if v_item_type <> 'expression' then
    raise exception 'Only expression cards can be deleted here.';
  end if;

  if v_status = 'published' then
    raise exception 'Published cards cannot be deleted. Archive the card instead.';
  end if;

  delete from public.learning_items
  where id = p_card_id;
end;
$$;

revoke all on function public.admin_delete_expression_card(uuid) from public;
grant execute on function public.admin_delete_expression_card(uuid) to authenticated;
