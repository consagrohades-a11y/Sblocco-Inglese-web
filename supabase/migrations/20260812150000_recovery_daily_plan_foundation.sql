-- Recupero Debito daily-plan foundation.
-- Additive only: no Exercise Builder/content changes and no production data migration.
-- The existing replace_recovery_plan RPC remains available as a compatibility fallback.

create table public.recovery_plan_days (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.recovery_enrollments(id) on delete cascade,
  plan_version integer not null check (plan_version > 0),
  day_index integer not null check (day_index > 0),
  scheduled_for date not null,
  target_minutes integer not null check (target_minutes between 5 and 1440),
  status text not null default 'planned' check (status in ('planned', 'available', 'in_progress', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, plan_version, day_index),
  unique (enrollment_id, plan_version, scheduled_for)
);

create trigger recovery_plan_days_set_updated_at
before update on public.recovery_plan_days
for each row execute function public.set_updated_at();

create index recovery_plan_days_queue_idx
  on public.recovery_plan_days(enrollment_id, status, scheduled_for, day_index);

alter table public.recovery_plan_sessions
  add column if not exists plan_day_id uuid references public.recovery_plan_days(id) on delete set null,
  add column if not exists scheduled_for date,
  add column if not exists daily_order integer check (daily_order is null or daily_order > 0);

create index if not exists recovery_plan_sessions_day_idx
  on public.recovery_plan_sessions(enrollment_id, scheduled_for, daily_order, sequence_index);

create unique index if not exists recovery_plan_sessions_day_order_idx
  on public.recovery_plan_sessions(plan_day_id, daily_order)
  where plan_day_id is not null and daily_order is not null;

alter table public.recovery_plan_days enable row level security;

create policy recovery_plan_days_owner_read
on public.recovery_plan_days for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.recovery_enrollments enrollment
    where enrollment.id = enrollment_id
      and enrollment.user_id = (select auth.uid())
  )
);

create policy recovery_plan_days_admin
on public.recovery_plan_days for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.recovery_plan_days to authenticated;

-- Existing sync_recovery_session historically unlocks the next sequence item.
-- Once sessions are dated, never let that legacy behaviour unlock a future day.
create or replace function public.guard_recovery_session_availability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'available'
     and new.scheduled_for is not null
     and new.scheduled_for > current_date then
    new.status := 'planned';
  end if;
  return new;
end;
$$;

drop trigger if exists recovery_plan_sessions_guard_availability on public.recovery_plan_sessions;
create trigger recovery_plan_sessions_guard_availability
before update of status, scheduled_for on public.recovery_plan_sessions
for each row execute function public.guard_recovery_session_availability();

create or replace function public.sync_recovery_plan_day_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day_id uuid;
  v_next_status text;
begin
  if tg_op = 'DELETE' then
    v_day_id := old.plan_day_id;
  else
    v_day_id := new.plan_day_id;
  end if;

  if v_day_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select case
    when exists (
      select 1 from public.recovery_plan_sessions session
      where session.plan_day_id = v_day_id and session.status = 'in_progress'
    ) then 'in_progress'
    when exists (
      select 1 from public.recovery_plan_sessions session
      where session.plan_day_id = v_day_id and session.status = 'available'
    ) then 'available'
    when exists (
      select 1 from public.recovery_plan_sessions session
      where session.plan_day_id = v_day_id and session.status not in ('completed', 'skipped')
    ) then 'planned'
    else 'completed'
  end into v_next_status;

  update public.recovery_plan_days
  set status = v_next_status
  where id = v_day_id;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists recovery_plan_sessions_sync_day_status on public.recovery_plan_sessions;
create trigger recovery_plan_sessions_sync_day_status
after insert or delete or update of status, plan_day_id on public.recovery_plan_sessions
for each row execute function public.sync_recovery_plan_day_status();

create or replace function public.activate_due_recovery_plan(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.recovery_plan_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not exists (
    select 1
    from public.recovery_enrollments enrollment
    where enrollment.id = p_enrollment_id
      and enrollment.status = 'active'
      and (enrollment.user_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'Recovery enrollment not found.';
  end if;

  -- Normalize any future "available" row created by the pre-daily-plan flow.
  update public.recovery_plan_sessions session
  set status = 'planned'
  where session.enrollment_id = p_enrollment_id
    and session.status = 'available'
    and session.scheduled_for is not null
    and session.scheduled_for > current_date;

  select session.* into v_session
  from public.recovery_plan_sessions session
  where session.enrollment_id = p_enrollment_id
    and session.status in ('in_progress', 'available')
  order by
    case session.status when 'in_progress' then 1 else 2 end,
    session.scheduled_for nulls first,
    session.daily_order nulls first,
    session.sequence_index
  limit 1;

  if v_session.id is null then
    select session.* into v_session
    from public.recovery_plan_sessions session
    where session.enrollment_id = p_enrollment_id
      and session.status = 'planned'
      and (session.scheduled_for is null or session.scheduled_for <= current_date)
    order by session.scheduled_for nulls first, session.daily_order nulls first, session.sequence_index
    limit 1
    for update;

    if v_session.id is not null then
      update public.recovery_plan_sessions
      set status = 'available'
      where id = v_session.id;
      v_session.status := 'available';
    end if;
  end if;

  if v_session.id is null then
    return jsonb_build_object('activated', false, 'session_id', null);
  end if;

  return jsonb_build_object(
    'activated', true,
    'session_id', v_session.id,
    'plan_day_id', v_session.plan_day_id,
    'scheduled_for', v_session.scheduled_for,
    'status', v_session.status
  );
end;
$$;

create or replace function public.get_today_recovery_plan(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_day_id uuid;
  v_payload jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not exists (
    select 1
    from public.recovery_enrollments enrollment
    where enrollment.id = p_enrollment_id
      and (enrollment.user_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'Recovery enrollment not found.';
  end if;

  select session.plan_day_id into v_day_id
  from public.recovery_plan_sessions session
  where session.enrollment_id = p_enrollment_id
    and session.status in ('in_progress', 'available')
    and (session.scheduled_for is null or session.scheduled_for <= current_date)
  order by
    case session.status when 'in_progress' then 1 else 2 end,
    session.scheduled_for nulls first,
    session.daily_order nulls first,
    session.sequence_index
  limit 1;

  if v_day_id is null then
    select day.id into v_day_id
    from public.recovery_plan_days day
    join public.recovery_enrollments enrollment on enrollment.id = day.enrollment_id
    where day.enrollment_id = p_enrollment_id
      and day.plan_version = enrollment.plan_version
      and day.scheduled_for <= current_date
      and day.status <> 'completed'
    order by day.scheduled_for, day.day_index
    limit 1;
  end if;

  if v_day_id is null then
    return jsonb_build_object('day', null, 'sessions', '[]'::jsonb);
  end if;

  select jsonb_build_object(
    'day', jsonb_build_object(
      'id', day.id,
      'plan_version', day.plan_version,
      'day_index', day.day_index,
      'scheduled_for', day.scheduled_for,
      'target_minutes', day.target_minutes,
      'status', day.status
    ),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', session.id,
        'sequence_index', session.sequence_index,
        'daily_order', session.daily_order,
        'session_type', session.session_type,
        'topic_key', session.topic_key,
        'title', session.title,
        'estimated_minutes', session.estimated_minutes,
        'status', session.status,
        'scheduled_for', session.scheduled_for
      ) order by session.daily_order, session.sequence_index)
      from public.recovery_plan_sessions session
      where session.plan_day_id = day.id
        and session.status <> 'skipped'
    ), '[]'::jsonb)
  ) into v_payload
  from public.recovery_plan_days day
  where day.id = v_day_id;

  return coalesce(v_payload, jsonb_build_object('day', null, 'sessions', '[]'::jsonb));
end;
$$;

create or replace function public.replace_recovery_plan_v2(
  p_enrollment_id uuid,
  p_mode text,
  p_topic_states jsonb,
  p_days jsonb,
  p_sessions jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_inserted integer := 0;
  v_next_plan_version integer;
  v_day_id uuid;
  v_day_index integer;
  v_daily_order integer;
  v_scheduled_for date;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_mode not in ('complete', 'intensive', 'sos') then raise exception 'Invalid recovery mode.'; end if;
  if jsonb_typeof(p_topic_states) <> 'array'
     or jsonb_typeof(p_days) <> 'array'
     or jsonb_typeof(p_sessions) <> 'array' then
    raise exception 'Invalid recovery plan payload.';
  end if;
  if jsonb_array_length(p_sessions) > 0 and jsonb_array_length(p_days) = 0 then
    raise exception 'Recovery sessions require at least one plan day.';
  end if;

  select enrollment.plan_version + 1 into v_next_plan_version
  from public.recovery_enrollments enrollment
  where enrollment.id = p_enrollment_id
    and enrollment.user_id = auth.uid()
    and enrollment.status = 'active'
  for update;

  if v_next_plan_version is null then raise exception 'Recovery enrollment not found.'; end if;

  for v_item in select value from jsonb_array_elements(p_topic_states)
  loop
    update public.recovery_student_topics topic
    set diagnostic_score = coalesce((v_item ->> 'diagnosticScore')::numeric, topic.diagnostic_score),
        checkpoint_score = coalesce((v_item ->> 'checkpointScore')::numeric, topic.checkpoint_score),
        mock_score = coalesce((v_item ->> 'mockScore')::numeric, topic.mock_score),
        mastery_score = coalesce((v_item ->> 'masteryScore')::numeric, topic.mastery_score),
        repeated_errors = greatest(0, coalesce((v_item ->> 'repeatedErrors')::integer, topic.repeated_errors)),
        priority_score = greatest(0, least(100, coalesce((v_item ->> 'priorityScore')::numeric, topic.priority_score))),
        priority_band = coalesce(nullif(v_item ->> 'priorityBand', ''), topic.priority_band),
        verification_only = coalesce((v_item ->> 'verificationOnly')::boolean, topic.verification_only),
        last_evidence_at = now()
    where topic.enrollment_id = p_enrollment_id
      and topic.topic_key = v_item ->> 'topicKey'
      and topic.required;
  end loop;

  -- Preserve evidence-bearing work. Only replace the not-started future queue.
  delete from public.recovery_plan_sessions session
  where session.enrollment_id = p_enrollment_id
    and session.status in ('planned', 'available');

  delete from public.recovery_plan_days day
  where day.enrollment_id = p_enrollment_id
    and not exists (
      select 1 from public.recovery_plan_sessions session where session.plan_day_id = day.id
    );

  for v_item in select value from jsonb_array_elements(p_days)
  loop
    v_day_index := coalesce((v_item ->> 'dayIndex')::integer, 0);
    if v_day_index <= 0 then raise exception 'Invalid recovery day index.'; end if;
    if nullif(v_item ->> 'scheduledFor', '') is null then raise exception 'Recovery day requires a date.'; end if;
    v_scheduled_for := (v_item ->> 'scheduledFor')::date;
    if v_scheduled_for < current_date then raise exception 'Recovery plan cannot schedule new work in the past.'; end if;

    insert into public.recovery_plan_days (
      enrollment_id, plan_version, day_index, scheduled_for, target_minutes, status
    ) values (
      p_enrollment_id,
      v_next_plan_version,
      v_day_index,
      v_scheduled_for,
      greatest(5, least(1440, coalesce((v_item ->> 'targetMinutes')::integer, 30))),
      'planned'
    );
  end loop;

  for v_item in select value from jsonb_array_elements(p_sessions)
  loop
    if coalesce((v_item ->> 'sequenceIndex')::integer, 0) <= 0 then raise exception 'Invalid session sequence.'; end if;
    if v_item ->> 'sessionType' not in ('topic', 'quick_review', 'error_review', 'checkpoint', 'mock_intermediate', 'mock_final') then
      raise exception 'Invalid recovery session type.';
    end if;

    v_day_index := coalesce((v_item ->> 'planDayIndex')::integer, 0);
    v_daily_order := coalesce((v_item ->> 'dailyOrder')::integer, 0);
    if v_day_index <= 0 or v_daily_order <= 0 then raise exception 'Recovery session requires daily scheduling metadata.'; end if;

    select day.id, day.scheduled_for into v_day_id, v_scheduled_for
    from public.recovery_plan_days day
    where day.enrollment_id = p_enrollment_id
      and day.plan_version = v_next_plan_version
      and day.day_index = v_day_index;

    if v_day_id is null then raise exception 'Recovery session references an unknown plan day.'; end if;
    if nullif(v_item ->> 'scheduledFor', '') is not null
       and (v_item ->> 'scheduledFor')::date <> v_scheduled_for then
      raise exception 'Recovery session date does not match its plan day.';
    end if;

    insert into public.recovery_plan_sessions (
      enrollment_id, sequence_index, session_type, topic_key, title, rationale,
      estimated_minutes, priority_score, stages, metadata, status,
      plan_day_id, scheduled_for, daily_order
    ) values (
      p_enrollment_id,
      (v_item ->> 'sequenceIndex')::integer,
      v_item ->> 'sessionType',
      nullif(v_item ->> 'topicKey', ''),
      left(v_item ->> 'title', 180),
      nullif(v_item ->> 'rationale', ''),
      greatest(5, least(180, coalesce((v_item ->> 'estimatedMinutes')::integer, 30))),
      case when nullif(v_item ->> 'priorityScore', '') is null then null else greatest(0, least(100, (v_item ->> 'priorityScore')::numeric)) end,
      coalesce(v_item -> 'stages', '[]'::jsonb),
      coalesce(v_item -> 'metadata', '{}'::jsonb),
      'planned',
      v_day_id,
      v_scheduled_for,
      v_daily_order
    );
    v_inserted := v_inserted + 1;
  end loop;

  update public.recovery_enrollments
  set mode = p_mode,
      plan_version = v_next_plan_version,
      last_planned_at = now()
  where id = p_enrollment_id;

  perform public.activate_due_recovery_plan(p_enrollment_id);
  return v_inserted;
end;
$$;

revoke all on function public.guard_recovery_session_availability() from public;
revoke all on function public.sync_recovery_plan_day_status() from public;
revoke all on function public.activate_due_recovery_plan(uuid) from public;
revoke all on function public.get_today_recovery_plan(uuid) from public;
revoke all on function public.replace_recovery_plan_v2(uuid, text, jsonb, jsonb, jsonb) from public;

grant execute on function public.activate_due_recovery_plan(uuid) to authenticated;
grant execute on function public.get_today_recovery_plan(uuid) to authenticated;
grant execute on function public.replace_recovery_plan_v2(uuid, text, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
