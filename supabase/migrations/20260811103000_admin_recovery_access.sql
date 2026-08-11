-- Admin-managed Recupero Debito access for learner/test accounts.
-- Keeps paid Stripe entitlements authoritative and separate from manual admin grants.

create table public.recovery_access_grants (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active' and revoked_at is null) or status = 'revoked')
);

create trigger recovery_access_grants_set_updated_at
before update on public.recovery_access_grants
for each row execute function public.set_updated_at();

alter table public.recovery_access_grants enable row level security;

create policy recovery_access_grants_admin_all
on public.recovery_access_grants for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.recovery_access_grants to authenticated;

create or replace function public.has_active_recovery_entitlement(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.user_entitlements entitlement
      where entitlement.user_id = p_user_id
        and entitlement.status = 'active'
        and (entitlement.offer_id = 'recupero-debito' or entitlement.access_target = 'recupero-debito')
        and (entitlement.expires_at is null or entitlement.expires_at > now())
    )
    or exists (
      select 1
      from public.recovery_access_grants grant_row
      where grant_row.user_id = p_user_id
        and grant_row.status = 'active'
    );
$$;

create or replace function public.admin_get_recovery_learner_status(target_learner_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_paid boolean := false;
  v_manual boolean := false;
  v_enrollment public.recovery_enrollments%rowtype;
  v_topics integer := 0;
  v_total_sessions integer := 0;
  v_completed_sessions integer := 0;
  v_next_session jsonb := null;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = target_learner_id and p.role = 'learner'
  ) then
    raise exception 'Learner not found';
  end if;

  select exists (
    select 1 from public.user_entitlements entitlement
    where entitlement.user_id = target_learner_id
      and entitlement.status = 'active'
      and (entitlement.offer_id = 'recupero-debito' or entitlement.access_target = 'recupero-debito')
      and (entitlement.expires_at is null or entitlement.expires_at > now())
  ) into v_paid;

  select exists (
    select 1 from public.recovery_access_grants grant_row
    where grant_row.user_id = target_learner_id and grant_row.status = 'active'
  ) into v_manual;

  select enrollment.* into v_enrollment
  from public.recovery_enrollments enrollment
  where enrollment.user_id = target_learner_id
    and enrollment.status in ('onboarding', 'active', 'completed', 'archived')
  order by
    case enrollment.status
      when 'active' then 1
      when 'onboarding' then 2
      when 'completed' then 3
      else 4
    end,
    enrollment.created_at desc
  limit 1;

  if v_enrollment.id is not null then
    select count(*) into v_topics
    from public.recovery_student_topics topic
    where topic.enrollment_id = v_enrollment.id and topic.required;

    select count(*), count(*) filter (where session.status = 'completed')
    into v_total_sessions, v_completed_sessions
    from public.recovery_plan_sessions session
    where session.enrollment_id = v_enrollment.id;

    select jsonb_build_object(
      'id', session.id,
      'title', session.title,
      'session_type', session.session_type,
      'sequence_index', session.sequence_index,
      'status', session.status
    ) into v_next_session
    from public.recovery_plan_sessions session
    where session.enrollment_id = v_enrollment.id
      and session.status in ('available', 'in_progress', 'planned')
    order by
      case session.status when 'in_progress' then 1 when 'available' then 2 else 3 end,
      session.sequence_index
    limit 1;
  end if;

  return jsonb_build_object(
    'user_id', target_learner_id,
    'has_access', (v_paid or v_manual),
    'paid_access', v_paid,
    'manual_access', v_manual,
    'access_source', case
      when v_paid and v_manual then 'paid_and_admin'
      when v_paid then 'paid'
      when v_manual then 'admin'
      else 'none'
    end,
    'enrollment', case when v_enrollment.id is null then null else jsonb_build_object(
      'id', v_enrollment.id,
      'status', v_enrollment.status,
      'class_year', v_enrollment.class_year,
      'exam_date', v_enrollment.exam_date,
      'mode', v_enrollment.mode,
      'plan_version', v_enrollment.plan_version,
      'last_planned_at', v_enrollment.last_planned_at,
      'completed_at', v_enrollment.completed_at,
      'created_at', v_enrollment.created_at,
      'required_topics', v_topics,
      'total_sessions', v_total_sessions,
      'completed_sessions', v_completed_sessions,
      'next_session', v_next_session
    ) end
  );
end;
$$;

create or replace function public.admin_set_recovery_access(
  target_learner_id uuid,
  enabled boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = target_learner_id
      and p.role = 'learner'
      and p.status <> 'deleted'
  ) then
    raise exception 'Active learner not found';
  end if;

  if enabled then
    insert into public.recovery_access_grants (
      user_id, status, granted_by, granted_at, revoked_at, note
    ) values (
      target_learner_id, 'active', auth.uid(), now(), null, nullif(trim(p_note), '')
    )
    on conflict (user_id) do update set
      status = 'active',
      granted_by = auth.uid(),
      granted_at = now(),
      revoked_at = null,
      note = coalesce(nullif(trim(p_note), ''), recovery_access_grants.note);

    if not exists (
      select 1 from public.recovery_enrollments enrollment
      where enrollment.user_id = target_learner_id
        and enrollment.status in ('onboarding', 'active')
    ) then
      insert into public.recovery_enrollments (user_id, offer_id, status)
      values (target_learner_id, 'recupero-debito', 'onboarding');
    end if;
  else
    update public.recovery_access_grants
    set status = 'revoked', revoked_at = now()
    where user_id = target_learner_id;
  end if;

  return public.admin_get_recovery_learner_status(target_learner_id);
end;
$$;

create or replace function public.admin_list_recovery_learner_statuses()
returns table (
  user_id uuid,
  has_access boolean,
  paid_access boolean,
  manual_access boolean,
  enrollment_status text,
  exam_date date,
  mode text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    p.id,
    (
      exists (
        select 1 from public.user_entitlements entitlement
        where entitlement.user_id = p.id
          and entitlement.status = 'active'
          and (entitlement.offer_id = 'recupero-debito' or entitlement.access_target = 'recupero-debito')
          and (entitlement.expires_at is null or entitlement.expires_at > now())
      )
      or exists (
        select 1 from public.recovery_access_grants grant_row
        where grant_row.user_id = p.id and grant_row.status = 'active'
      )
    ) as has_access,
    exists (
      select 1 from public.user_entitlements entitlement
      where entitlement.user_id = p.id
        and entitlement.status = 'active'
        and (entitlement.offer_id = 'recupero-debito' or entitlement.access_target = 'recupero-debito')
        and (entitlement.expires_at is null or entitlement.expires_at > now())
    ) as paid_access,
    exists (
      select 1 from public.recovery_access_grants grant_row
      where grant_row.user_id = p.id and grant_row.status = 'active'
    ) as manual_access,
    enrollment.status,
    enrollment.exam_date,
    enrollment.mode
  from public.profiles p
  left join lateral (
    select e.status, e.exam_date, e.mode
    from public.recovery_enrollments e
    where e.user_id = p.id
    order by
      case e.status when 'active' then 1 when 'onboarding' then 2 when 'completed' then 3 else 4 end,
      e.created_at desc
    limit 1
  ) enrollment on true
  where p.role = 'learner';
end;
$$;

revoke all on function public.admin_get_recovery_learner_status(uuid) from public;
revoke all on function public.admin_set_recovery_access(uuid, boolean, text) from public;
revoke all on function public.admin_list_recovery_learner_statuses() from public;

grant execute on function public.admin_get_recovery_learner_status(uuid) to authenticated;
grant execute on function public.admin_set_recovery_access(uuid, boolean, text) to authenticated;
grant execute on function public.admin_list_recovery_learner_statuses() to authenticated;

comment on table public.recovery_access_grants is 'Manual admin access grants for Recupero Debito. Paid Stripe ownership remains in user_entitlements.';

notify pgrst, 'reload schema';
