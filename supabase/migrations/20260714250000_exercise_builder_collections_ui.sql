-- Visual organizational collections for questions, pools, and exercises.
-- Collections never change or version the content they contain.

create sequence if not exists public.exercise_builder_collection_public_id_seq start 1;

create table if not exists public.exercise_builder_collections (
  id uuid primary key default gen_random_uuid(),
  public_id text unique,
  title text,
  description text,
  catalog_status text not null default 'active'
    check (catalog_status in ('active', 'archived')),
  color_key text not null default 'emerald',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercise_builder_collections
  add column if not exists public_id text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists catalog_status text not null default 'active',
  add column if not exists color_key text not null default 'emerald',
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists exercise_builder_collections_public_id_idx
  on public.exercise_builder_collections(public_id)
  where public_id is not null;

create table if not exists public.exercise_builder_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.exercise_builder_collections(id) on delete cascade,
  entity_type text,
  entity_id uuid,
  sequence_index integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.exercise_builder_collection_items
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists sequence_index integer not null default 1,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists exercise_builder_collection_items_unique_entity_idx
  on public.exercise_builder_collection_items(collection_id, entity_type, entity_id)
  where entity_type is not null and entity_id is not null;
create index if not exists exercise_builder_collection_items_sequence_idx
  on public.exercise_builder_collection_items(collection_id, sequence_index);

create or replace function public.exercise_builder_collections_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists exercise_builder_collections_updated_at on public.exercise_builder_collections;
create trigger exercise_builder_collections_updated_at
before update on public.exercise_builder_collections
for each row execute function public.exercise_builder_collections_set_updated_at();

alter table public.exercise_builder_collections enable row level security;
alter table public.exercise_builder_collection_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exercise_builder_collections'
      and policyname = 'exercise_builder_collections_admin_all_v2'
  ) then
    create policy exercise_builder_collections_admin_all_v2
      on public.exercise_builder_collections for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exercise_builder_collection_items'
      and policyname = 'exercise_builder_collection_items_admin_all_v2'
  ) then
    create policy exercise_builder_collection_items_admin_all_v2
      on public.exercise_builder_collection_items for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;
end;
$$;

grant select on public.exercise_builder_collections to authenticated;
grant select on public.exercise_builder_collection_items to authenticated;

create or replace function public.next_exercise_builder_collection_public_id()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'COL-' || lpad(nextval('public.exercise_builder_collection_public_id_seq')::text, 5, '0');
$$;

create or replace function public.exercise_builder_collection_entity_exists(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_entity_type = 'question' then
    return exists (select 1 from public.exercise_builder_questions where id = p_entity_id);
  elsif p_entity_type = 'question_pool' then
    return exists (select 1 from public.exercise_builder_pools where id = p_entity_id);
  elsif p_entity_type = 'exercise' then
    return exists (select 1 from public.exercise_builder_exercises where id = p_entity_id);
  end if;
  return false;
end;
$$;

create or replace function public.admin_save_exercise_builder_collection(
  p_collection_id uuid,
  p_payload jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collection_id uuid := p_collection_id;
  v_public_id text;
  v_title text;
  v_status text;
  v_color text;
  v_item jsonb;
  v_entity_type text;
  v_entity_id uuid;
  v_sequence integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Collection payload must be an object.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Collection items must be an array.';
  end if;

  v_title := nullif(trim(p_payload ->> 'title'), '');
  v_status := coalesce(nullif(p_payload ->> 'catalog_status', ''), 'active');
  v_color := coalesce(nullif(p_payload ->> 'color_key', ''), 'emerald');

  if v_title is null then raise exception 'Collection title is required.'; end if;
  if v_status not in ('active', 'archived') then raise exception 'Invalid collection status.'; end if;
  if v_color not in ('emerald', 'violet', 'cyan', 'amber', 'rose', 'slate') then
    raise exception 'Invalid collection color.';
  end if;

  if v_collection_id is null then
    v_public_id := public.next_exercise_builder_collection_public_id();
    insert into public.exercise_builder_collections (
      public_id, title, description, catalog_status, color_key, created_by
    ) values (
      v_public_id, v_title, nullif(trim(p_payload ->> 'description'), ''),
      v_status, v_color, auth.uid()
    ) returning id into v_collection_id;
  else
    select public_id into v_public_id
    from public.exercise_builder_collections
    where id = v_collection_id
    for update;
    if v_public_id is null then raise exception 'Collection not found.'; end if;
    update public.exercise_builder_collections
    set title = v_title,
        description = nullif(trim(p_payload ->> 'description'), ''),
        catalog_status = v_status,
        color_key = v_color
    where id = v_collection_id;
    delete from public.exercise_builder_collection_items
    where collection_id = v_collection_id
      and entity_type is not null
      and entity_id is not null;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_entity_type := nullif(v_item ->> 'entity_type', '');
    v_entity_id := nullif(v_item ->> 'entity_id', '')::uuid;
    if v_entity_type not in ('question', 'question_pool', 'exercise') or v_entity_id is null then
      raise exception 'Every collection item requires a supported entity type and ID.';
    end if;
    if not public.exercise_builder_collection_entity_exists(v_entity_type, v_entity_id) then
      raise exception 'Collection item does not exist: % %.', v_entity_type, v_entity_id;
    end if;
    v_sequence := v_sequence + 1;
    insert into public.exercise_builder_collection_items (
      collection_id, entity_type, entity_id, sequence_index
    ) values (
      v_collection_id, v_entity_type, v_entity_id,
      coalesce((v_item ->> 'sequence_index')::integer, v_sequence)
    );
  end loop;

  return jsonb_build_object(
    'id', v_collection_id,
    'public_id', v_public_id,
    'item_count', jsonb_array_length(p_items)
  );
end;
$$;

create or replace function public.admin_get_exercise_builder_collection_detail(p_collection_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', collection.id,
    'public_id', collection.public_id,
    'title', collection.title,
    'description', collection.description,
    'catalog_status', collection.catalog_status,
    'color_key', collection.color_key,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'entity_type', item.entity_type,
        'entity_id', item.entity_id,
        'sequence_index', item.sequence_index
      ) order by item.sequence_index)
      from public.exercise_builder_collection_items item
      where item.collection_id = collection.id
        and item.entity_type is not null
        and item.entity_id is not null
    ), '[]'::jsonb)
  )
  from public.exercise_builder_collections collection
  where collection.id = p_collection_id
    and public.is_admin();
$$;

create or replace function public.admin_set_exercise_builder_collection_status(
  p_collection_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if p_status not in ('active', 'archived') then raise exception 'Invalid collection status.'; end if;
  update public.exercise_builder_collections
  set catalog_status = p_status
  where id = p_collection_id;
  if not found then raise exception 'Collection not found.'; end if;
end;
$$;

revoke all on function public.next_exercise_builder_collection_public_id() from public;
revoke all on function public.exercise_builder_collection_entity_exists(text, uuid) from public;
revoke all on function public.admin_save_exercise_builder_collection(uuid, jsonb, jsonb) from public;
revoke all on function public.admin_get_exercise_builder_collection_detail(uuid) from public;
revoke all on function public.admin_set_exercise_builder_collection_status(uuid, text) from public;
grant execute on function public.admin_save_exercise_builder_collection(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.admin_get_exercise_builder_collection_detail(uuid) to authenticated;
grant execute on function public.admin_set_exercise_builder_collection_status(uuid, text) to authenticated;
