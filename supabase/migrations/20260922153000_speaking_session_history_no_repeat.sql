-- Persistent per-learner speaking session history and smart no-repeat support.

create table if not exists public.admin_speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.admin_speaking_activities(id) on delete cascade,
  levels text[] not null default '{}',
  started_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint admin_speaking_sessions_levels_check
    check (levels <@ array['A1','A2','B1','B2','C1','C2']::text[]),
  constraint admin_speaking_sessions_end_after_start
    check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.admin_speaking_item_usage (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.admin_speaking_sessions(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.admin_speaking_activities(id) on delete cascade,
  item_signature text not null,
  item_text text not null,
  item_index integer,
  shown_at timestamptz not null default now(),
  constraint admin_speaking_item_usage_text_length
    check (char_length(item_text) between 1 and 4000),
  constraint admin_speaking_item_usage_index_check
    check (item_index is null or item_index >= 0),
  constraint admin_speaking_item_usage_session_item_unique
    unique (session_id, item_signature)
);

create index if not exists admin_speaking_sessions_learner_started_idx
  on public.admin_speaking_sessions (learner_id, started_at desc);

create index if not exists admin_speaking_sessions_learner_activity_started_idx
  on public.admin_speaking_sessions (learner_id, activity_id, started_at desc);

create index if not exists admin_speaking_item_usage_learner_activity_shown_idx
  on public.admin_speaking_item_usage (learner_id, activity_id, shown_at desc);

create index if not exists admin_speaking_item_usage_signature_idx
  on public.admin_speaking_item_usage (learner_id, activity_id, item_signature);

alter table public.admin_speaking_sessions enable row level security;
alter table public.admin_speaking_item_usage enable row level security;

-- These are implementation tables. Frontend access goes through the RPCs below.
revoke all on table public.admin_speaking_sessions from public, anon, authenticated;
revoke all on table public.admin_speaking_item_usage from public, anon, authenticated;
grant all on table public.admin_speaking_sessions to service_role;
grant all on table public.admin_speaking_item_usage to service_role;

create or replace function public.admin_start_speaking_session(
  p_learner_id uuid,
  p_activity_id uuid,
  p_levels text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_levels text[];
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_learner_id
      and p.role = 'learner'
      and p.status = 'active'
  ) then
    raise exception 'Active learner not found.';
  end if;

  if not exists (
    select 1
    from public.admin_speaking_activities a
    where a.id = p_activity_id
      and a.status <> 'archived'
  ) then
    raise exception 'Speaking activity not found.';
  end if;

  select coalesce(array_agg(level order by level), '{}'::text[])
  into v_levels
  from (
    select distinct upper(btrim(raw_level)) as level
    from unnest(coalesce(p_levels, '{}'::text[])) as raw_level
    where upper(btrim(raw_level)) = any(array['A1','A2','B1','B2','C1','C2']::text[])
  ) cleaned;

  insert into public.admin_speaking_sessions (
    learner_id,
    activity_id,
    levels,
    started_by
  )
  values (
    p_learner_id,
    p_activity_id,
    v_levels,
    auth.uid()
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function public.admin_record_speaking_item(
  p_session_id uuid,
  p_item_text text,
  p_item_index integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.admin_speaking_sessions%rowtype;
  v_text text := nullif(btrim(p_item_text), '');
  v_signature text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if v_text is null then
    raise exception 'Speaking item text is required.';
  end if;

  if char_length(v_text) > 4000 then
    raise exception 'Speaking item text is too long.';
  end if;

  if p_item_index is not null and p_item_index < 0 then
    raise exception 'Speaking item index cannot be negative.';
  end if;

  select *
  into v_session
  from public.admin_speaking_sessions s
  where s.id = p_session_id
    and s.started_by = auth.uid();

  if not found then
    raise exception 'Speaking session not found.';
  end if;

  v_signature := md5(lower(regexp_replace(v_text, '[[:space:]]+', ' ', 'g')));

  insert into public.admin_speaking_item_usage (
    session_id,
    learner_id,
    activity_id,
    item_signature,
    item_text,
    item_index
  )
  values (
    v_session.id,
    v_session.learner_id,
    v_session.activity_id,
    v_signature,
    v_text,
    p_item_index
  )
  on conflict (session_id, item_signature)
  do update set
    item_text = excluded.item_text,
    item_index = excluded.item_index;

  return v_signature;
end;
$$;

create or replace function public.admin_get_speaking_item_history(
  p_learner_id uuid,
  p_activity_id uuid,
  p_recent_days integer default 60
)
returns table (
  item_signature text,
  item_text text,
  last_used_at timestamptz,
  use_count integer,
  recent_use_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_recent_days integer := greatest(1, least(coalesce(p_recent_days, 60), 3650));
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    usage.item_signature,
    (array_agg(usage.item_text order by usage.shown_at desc))[1] as item_text,
    max(usage.shown_at) as last_used_at,
    count(*)::integer as use_count,
    count(*) filter (
      where usage.shown_at >= now() - make_interval(days => v_recent_days)
    )::integer as recent_use_count
  from public.admin_speaking_item_usage usage
  where usage.learner_id = p_learner_id
    and usage.activity_id = p_activity_id
  group by usage.item_signature
  order by max(usage.shown_at) desc;
end;
$$;

create or replace function public.admin_get_speaking_activity_history(
  p_learner_id uuid
)
returns table (
  activity_id uuid,
  last_session_at timestamptz,
  session_count integer,
  items_seen integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    sessions.activity_id,
    max(sessions.started_at) as last_session_at,
    count(distinct sessions.id)::integer as session_count,
    count(distinct usage.item_signature)::integer as items_seen
  from public.admin_speaking_sessions sessions
  left join public.admin_speaking_item_usage usage
    on usage.session_id = sessions.id
  where sessions.learner_id = p_learner_id
  group by sessions.activity_id
  order by max(sessions.started_at) desc;
end;
$$;

create or replace function public.admin_finish_speaking_session(
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  update public.admin_speaking_sessions
  set ended_at = greatest(started_at, now())
  where id = p_session_id
    and started_by = auth.uid()
    and ended_at is null;
end;
$$;

revoke all on function public.admin_start_speaking_session(uuid, uuid, text[]) from public, anon;
revoke all on function public.admin_record_speaking_item(uuid, text, integer) from public, anon;
revoke all on function public.admin_get_speaking_item_history(uuid, uuid, integer) from public, anon;
revoke all on function public.admin_get_speaking_activity_history(uuid) from public, anon;
revoke all on function public.admin_finish_speaking_session(uuid) from public, anon;

grant execute on function public.admin_start_speaking_session(uuid, uuid, text[]) to authenticated;
grant execute on function public.admin_record_speaking_item(uuid, text, integer) to authenticated;
grant execute on function public.admin_get_speaking_item_history(uuid, uuid, integer) to authenticated;
grant execute on function public.admin_get_speaking_activity_history(uuid) to authenticated;
grant execute on function public.admin_finish_speaking_session(uuid) to authenticated;

notify pgrst, 'reload schema';
