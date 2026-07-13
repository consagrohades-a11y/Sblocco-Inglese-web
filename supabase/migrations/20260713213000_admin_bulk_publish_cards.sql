-- Transactional bulk publication for approved Trainer cards.
-- Apply after 20260713200000_word_trainer_content.sql.

create or replace function public.admin_publish_expression_cards(p_card_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_requested integer;
  v_valid integer;
  v_published integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select coalesce(array_agg(distinct card_id), '{}')
  into v_ids
  from unnest(coalesce(p_card_ids, '{}'::uuid[])) as card_id;

  v_requested := cardinality(v_ids);
  if v_requested = 0 then
    raise exception 'Select at least one expression card.';
  end if;

  select count(*)
  into v_valid
  from public.learning_items li
  join public.expressions e on e.id = li.id
  where li.id = any(v_ids)
    and li.item_type = 'expression'
    and li.review_status = 'approved'
    and li.status <> 'archived'
    and coalesce(array_length(e.accepted_answers, 1), 0) > 0
    and nullif(trim(e.pronunciation_ipa_us), '') is not null
    and nullif(trim(e.example_1), '') is not null
    and nullif(trim(e.example_2), '') is not null
    and nullif(trim(e.usage_note), '') is not null;

  if v_valid <> v_requested then
    raise exception 'Every selected expression card must be approved, complete, and not archived.';
  end if;

  update public.learning_items
  set status = 'published',
      updated_at = now()
  where id = any(v_ids)
    and item_type = 'expression';

  get diagnostics v_published = row_count;
  return v_published;
end;
$$;

revoke all on function public.admin_publish_expression_cards(uuid[]) from public;
grant execute on function public.admin_publish_expression_cards(uuid[]) to authenticated;

create or replace function public.admin_publish_word_cards(p_card_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_requested integer;
  v_valid integer;
  v_published integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select coalesce(array_agg(distinct card_id), '{}')
  into v_ids
  from unnest(coalesce(p_card_ids, '{}'::uuid[])) as card_id;

  v_requested := cardinality(v_ids);
  if v_requested = 0 then
    raise exception 'Select at least one word card.';
  end if;

  select count(*)
  into v_valid
  from public.learning_items li
  join public.words w on w.id = li.id
  where li.id = any(v_ids)
    and li.item_type = 'word'
    and li.review_status = 'approved'
    and li.status <> 'archived'
    and coalesce(array_length(w.accepted_answers, 1), 0) > 0
    and nullif(trim(w.pronunciation_ipa_us), '') is not null
    and nullif(trim(w.example_1), '') is not null
    and nullif(trim(w.example_2), '') is not null
    and nullif(trim(w.usage_note), '') is not null;

  if v_valid <> v_requested then
    raise exception 'Every selected word card must be approved, complete, and not archived.';
  end if;

  update public.learning_items
  set status = 'published',
      updated_at = now()
  where id = any(v_ids)
    and item_type = 'word';

  get diagnostics v_published = row_count;
  return v_published;
end;
$$;

revoke all on function public.admin_publish_word_cards(uuid[]) from public;
grant execute on function public.admin_publish_word_cards(uuid[]) to authenticated;
