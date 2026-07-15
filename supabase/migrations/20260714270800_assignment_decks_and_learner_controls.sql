-- Direct assignment deck catalog and reversible learner account controls.

create or replace function public.admin_list_assignment_decks()
returns table (
  id uuid,
  public_id text,
  title text,
  description text,
  content_type text,
  content_domain text,
  collection_type text,
  published_item_count bigint,
  total_item_count bigint,
  item_ids uuid[]
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
    c.content_type,
    c.content_domain,
    c.collection_type,
    count(ci.id) filter (where li.status = 'published') as published_item_count,
    count(ci.id) as total_item_count,
    coalesce(
      array_agg(ci.learning_item_id order by ci.sequence_index)
        filter (where ci.id is not null and li.status = 'published'),
      '{}'::uuid[]
    ) as item_ids
  from public.collections c
  left join public.collection_items ci on ci.collection_id = c.id
  left join public.learning_items li on li.id = ci.learning_item_id
  where public.is_admin()
    and c.status = 'published'
    and c.content_type in ('word', 'expression', 'mixed')
  group by c.id
  having count(ci.id) filter (where li.status = 'published') > 0
  order by
    case c.content_type when 'word' then 0 when 'expression' then 1 else 2 end,
    c.content_domain nulls first,
    c.title;
$$;

revoke all on function public.admin_list_assignment_decks() from public;
grant execute on function public.admin_list_assignment_decks() to authenticated;

create or replace function public.admin_set_learner_status(
  target_learner_id uuid,
  next_status text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if next_status not in ('active', 'suspended', 'deleted') then
    raise exception 'Unsupported learner status.';
  end if;

  if target_learner_id = auth.uid() then
    raise exception 'You cannot change your own admin account through this action.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_learner_id
      and role = 'learner'
  ) then
    raise exception 'Learner not found.';
  end if;

  update public.profiles
  set status = next_status
  where id = target_learner_id
    and role = 'learner';

  if next_status = 'suspended' then
    update public.teaching_relationships
    set status = 'paused'
    where learner_id = target_learner_id
      and status = 'active';
  elsif next_status = 'deleted' then
    update public.teaching_relationships
    set status = 'ended',
        ends_at = coalesce(ends_at, current_date)
    where learner_id = target_learner_id
      and status <> 'ended';

    update public.assignments
    set status = 'archived'
    where learner_id = target_learner_id
      and status in ('draft', 'published');
  end if;

  return next_status;
end;
$$;

revoke all on function public.admin_set_learner_status(uuid, text) from public;
grant execute on function public.admin_set_learner_status(uuid, text) to authenticated;
