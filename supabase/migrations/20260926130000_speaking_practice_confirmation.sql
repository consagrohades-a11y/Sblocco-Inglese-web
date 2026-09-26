create table if not exists public.admin_speaking_practice_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.admin_speaking_sessions(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.admin_speaking_activities(id) on delete cascade,
  item_signature text not null,
  item_text text not null,
  item_index integer,
  confirmed_at timestamptz not null default now(),
  undone_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  constraint admin_speaking_practice_events_text_length check (char_length(item_text) between 1 and 4000),
  constraint admin_speaking_practice_events_index_check check (item_index is null or item_index >= 0),
  constraint admin_speaking_practice_events_undo_order check (undone_at is null or undone_at >= confirmed_at)
);

alter table public.admin_speaking_practice_events enable row level security;
revoke all on table public.admin_speaking_practice_events from anon, authenticated, public;

create index if not exists admin_speaking_practice_events_learner_activity_idx
  on public.admin_speaking_practice_events(learner_id, activity_id, confirmed_at desc);

create unique index if not exists admin_speaking_practice_events_active_session_item_idx
  on public.admin_speaking_practice_events(session_id, item_signature)
  where undone_at is null;

create or replace function public.admin_confirm_speaking_practice(
  p_session_id uuid,
  p_item_text text,
  p_item_index integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_session public.admin_speaking_sessions%rowtype;
  v_text text := nullif(btrim(p_item_text), '');
  v_signature text;
  v_event public.admin_speaking_practice_events%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;
  if v_text is null then raise exception 'Speaking item text is required.'; end if;
  if char_length(v_text) > 4000 then raise exception 'Speaking item text is too long.'; end if;
  if p_item_index is not null and p_item_index < 0 then raise exception 'Speaking item index cannot be negative.'; end if;

  select *
  into v_session
  from public.admin_speaking_sessions session
  where session.id = p_session_id
    and session.started_by = auth.uid()
    and session.ended_at is null;

  if not found then raise exception 'Open speaking session not found.'; end if;

  v_signature := md5(lower(regexp_replace(v_text, '[[:space:]]+', ' ', 'g')));

  insert into public.admin_speaking_practice_events (
    session_id, learner_id, activity_id, item_signature, item_text, item_index, confirmed_by
  )
  values (
    v_session.id, v_session.learner_id, v_session.activity_id, v_signature, v_text, p_item_index, auth.uid()
  )
  on conflict (session_id, item_signature) where undone_at is null
  do update set
    item_text = excluded.item_text,
    item_index = excluded.item_index,
    confirmed_at = excluded.confirmed_at,
    confirmed_by = excluded.confirmed_by
  returning * into v_event;

  return jsonb_build_object(
    'id', v_event.id,
    'session_id', v_event.session_id,
    'activity_id', v_event.activity_id,
    'item_signature', v_event.item_signature,
    'item_text', v_event.item_text,
    'item_index', v_event.item_index,
    'confirmed_at', v_event.confirmed_at
  );
end;
$function$;

revoke all on function public.admin_confirm_speaking_practice(uuid, text, integer) from public, anon;
grant execute on function public.admin_confirm_speaking_practice(uuid, text, integer) to authenticated;

create or replace function public.admin_undo_latest_speaking_practice(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_event public.admin_speaking_practice_events%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  if not exists (
    select 1
    from public.admin_speaking_sessions session
    where session.id = p_session_id
      and session.started_by = auth.uid()
  ) then raise exception 'Speaking session not found.'; end if;

  select event.*
  into v_event
  from public.admin_speaking_practice_events event
  where event.session_id = p_session_id
    and event.undone_at is null
  order by event.confirmed_at desc, event.id desc
  limit 1
  for update;

  if not found then return null; end if;

  update public.admin_speaking_practice_events
  set undone_at = now()
  where id = v_event.id;

  return jsonb_build_object(
    'id', v_event.id,
    'activity_id', v_event.activity_id,
    'item_signature', v_event.item_signature,
    'item_text', v_event.item_text,
    'item_index', v_event.item_index,
    'confirmed_at', v_event.confirmed_at
  );
end;
$function$;

revoke all on function public.admin_undo_latest_speaking_practice(uuid) from public, anon;
grant execute on function public.admin_undo_latest_speaking_practice(uuid) to authenticated;

create or replace function public.admin_get_speaking_item_history_v2(
  p_learner_id uuid,
  p_activity_id uuid,
  p_recent_days integer default 60
)
returns table(
  item_signature text,
  item_text text,
  last_shown_at timestamptz,
  shown_count integer,
  recent_shown_count integer,
  last_practised_at timestamptz,
  practice_count integer,
  recent_practice_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_recent_days integer := greatest(1, least(coalesce(p_recent_days, 60), 3650));
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  return query
  with signatures as (
    select usage.item_signature
    from public.admin_speaking_item_usage usage
    where usage.learner_id = p_learner_id and usage.activity_id = p_activity_id
    union
    select event.item_signature
    from public.admin_speaking_practice_events event
    where event.learner_id = p_learner_id
      and event.activity_id = p_activity_id
      and event.undone_at is null
  )
  select
    signature.item_signature,
    coalesce(
      (
        select event.item_text
        from public.admin_speaking_practice_events event
        where event.learner_id = p_learner_id
          and event.activity_id = p_activity_id
          and event.item_signature = signature.item_signature
          and event.undone_at is null
        order by event.confirmed_at desc
        limit 1
      ),
      (
        select usage.item_text
        from public.admin_speaking_item_usage usage
        where usage.learner_id = p_learner_id
          and usage.activity_id = p_activity_id
          and usage.item_signature = signature.item_signature
        order by usage.shown_at desc
        limit 1
      )
    ) as item_text,
    (
      select max(usage.shown_at)
      from public.admin_speaking_item_usage usage
      where usage.learner_id = p_learner_id
        and usage.activity_id = p_activity_id
        and usage.item_signature = signature.item_signature
    ) as last_shown_at,
    (
      select count(*)::integer
      from public.admin_speaking_item_usage usage
      where usage.learner_id = p_learner_id
        and usage.activity_id = p_activity_id
        and usage.item_signature = signature.item_signature
    ) as shown_count,
    (
      select count(*)::integer
      from public.admin_speaking_item_usage usage
      where usage.learner_id = p_learner_id
        and usage.activity_id = p_activity_id
        and usage.item_signature = signature.item_signature
        and usage.shown_at >= now() - make_interval(days => v_recent_days)
    ) as recent_shown_count,
    (
      select max(event.confirmed_at)
      from public.admin_speaking_practice_events event
      where event.learner_id = p_learner_id
        and event.activity_id = p_activity_id
        and event.item_signature = signature.item_signature
        and event.undone_at is null
    ) as last_practised_at,
    (
      select count(*)::integer
      from public.admin_speaking_practice_events event
      where event.learner_id = p_learner_id
        and event.activity_id = p_activity_id
        and event.item_signature = signature.item_signature
        and event.undone_at is null
    ) as practice_count,
    (
      select count(*)::integer
      from public.admin_speaking_practice_events event
      where event.learner_id = p_learner_id
        and event.activity_id = p_activity_id
        and event.item_signature = signature.item_signature
        and event.undone_at is null
        and event.confirmed_at >= now() - make_interval(days => v_recent_days)
    ) as recent_practice_count
  from signatures signature
  order by last_practised_at desc nulls last, last_shown_at desc nulls last;
end;
$function$;

revoke all on function public.admin_get_speaking_item_history_v2(uuid, uuid, integer) from public, anon;
grant execute on function public.admin_get_speaking_item_history_v2(uuid, uuid, integer) to authenticated;

create or replace function public.admin_get_speaking_practice_catalog(p_learner_id uuid)
returns table(
  activity_id uuid,
  item_signature text,
  item_text text,
  last_practised_at timestamptz,
  practice_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  return query
  select
    event.activity_id,
    event.item_signature,
    (array_agg(event.item_text order by event.confirmed_at desc))[1] as item_text,
    max(event.confirmed_at) as last_practised_at,
    count(*)::integer as practice_count
  from public.admin_speaking_practice_events event
  where event.learner_id = p_learner_id
    and event.undone_at is null
  group by event.activity_id, event.item_signature
  order by max(event.confirmed_at) desc;
end;
$function$;

revoke all on function public.admin_get_speaking_practice_catalog(uuid) from public, anon;
grant execute on function public.admin_get_speaking_practice_catalog(uuid) to authenticated;

create or replace function public.admin_get_speaking_activity_history_v2(p_learner_id uuid)
returns table(
  activity_id uuid,
  last_session_at timestamptz,
  session_count integer,
  items_shown integer,
  items_practised integer,
  last_practised_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not public.is_admin() then raise exception 'Admin access required.'; end if;

  return query
  select
    session_activity.activity_id,
    session_activity.last_session_at,
    session_activity.session_count,
    (
      select count(distinct usage.item_signature)::integer
      from public.admin_speaking_item_usage usage
      where usage.learner_id = p_learner_id
        and usage.activity_id = session_activity.activity_id
    ) as items_shown,
    (
      select count(distinct event.item_signature)::integer
      from public.admin_speaking_practice_events event
      where event.learner_id = p_learner_id
        and event.activity_id = session_activity.activity_id
        and event.undone_at is null
    ) as items_practised,
    (
      select max(event.confirmed_at)
      from public.admin_speaking_practice_events event
      where event.learner_id = p_learner_id
        and event.activity_id = session_activity.activity_id
        and event.undone_at is null
    ) as last_practised_at
  from (
    select
      session.activity_id,
      max(session.started_at) as last_session_at,
      count(*)::integer as session_count
    from public.admin_speaking_sessions session
    where session.learner_id = p_learner_id
    group by session.activity_id
  ) session_activity
  order by session_activity.last_session_at desc;
end;
$function$;

revoke all on function public.admin_get_speaking_activity_history_v2(uuid) from public, anon;
grant execute on function public.admin_get_speaking_activity_history_v2(uuid) to authenticated;
