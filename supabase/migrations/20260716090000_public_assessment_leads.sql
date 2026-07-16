create table if not exists public.assessment_leads (
  id uuid primary key default gen_random_uuid(),
  result_token uuid not null default gen_random_uuid() unique,
  full_name text not null,
  email text not null,
  profession text,
  whatsapp text,
  goal text,
  recommended_course text not null,
  profile_key text,
  primary_blocker text,
  beta_eligible boolean not null default false,
  marketing_consent boolean not null default false,
  result_consent boolean not null default true,
  answers jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text not null default 'new' check (status in ('new', 'qualified', 'contacted', 'waitlist', 'enrolled', 'not_fit', 'archived')),
  followup_requested boolean not null default false,
  followup_type text,
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessment_leads_created_at_idx on public.assessment_leads (created_at desc);
create index if not exists assessment_leads_course_status_idx on public.assessment_leads (recommended_course, status);
create index if not exists assessment_leads_beta_idx on public.assessment_leads (beta_eligible, followup_requested) where beta_eligible = true;
create index if not exists assessment_leads_email_idx on public.assessment_leads (lower(email));

alter table public.assessment_leads enable row level security;

revoke all on table public.assessment_leads from public, anon, authenticated;

create or replace function public.submit_public_assessment_lead(p_payload jsonb)
returns table (id uuid, result_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_email text;
  v_profession text;
  v_whatsapp text;
  v_answers jsonb;
  v_result jsonb;
  v_id uuid;
  v_token uuid;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid assessment payload';
  end if;

  v_name := left(trim(coalesce(p_payload->>'full_name', '')), 120);
  v_email := lower(left(trim(coalesce(p_payload->>'email', '')), 254));
  v_profession := nullif(left(trim(coalesce(p_payload->>'profession', '')), 180), '');
  v_whatsapp := nullif(left(trim(coalesce(p_payload->>'whatsapp', '')), 60), '');
  v_answers := coalesce(p_payload->'answers', '{}'::jsonb);
  v_result := coalesce(p_payload->'result', '{}'::jsonb);

  if length(v_name) < 2 then
    raise exception 'Name is required';
  end if;
  if v_email !~* '^[A-Z0-9._%+''-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'A valid email is required';
  end if;
  if coalesce((p_payload->>'result_consent')::boolean, false) is not true then
    raise exception 'Result delivery consent is required';
  end if;
  if jsonb_typeof(v_answers) <> 'object' or jsonb_typeof(v_result) <> 'object' then
    raise exception 'Invalid assessment result';
  end if;
  if octet_length(v_answers::text) > 60000 or octet_length(v_result::text) > 60000 then
    raise exception 'Assessment payload is too large';
  end if;
  if (
    select count(*)
    from public.assessment_leads existing
    where lower(existing.email) = v_email
      and existing.created_at > now() - interval '6 hours'
  ) >= 5 then
    raise exception 'Too many recent assessment attempts for this email';
  end if;

  insert into public.assessment_leads (
    full_name,
    email,
    profession,
    whatsapp,
    goal,
    recommended_course,
    profile_key,
    primary_blocker,
    beta_eligible,
    marketing_consent,
    result_consent,
    answers,
    result,
    source,
    utm_source,
    utm_medium,
    utm_campaign
  ) values (
    v_name,
    v_email,
    v_profession,
    v_whatsapp,
    nullif(left(trim(coalesce(p_payload->>'goal', '')), 80), ''),
    left(trim(coalesce(p_payload->>'recommended_course', 'unknown')), 120),
    nullif(left(trim(coalesce(p_payload->>'profile_key', '')), 80), ''),
    nullif(left(trim(coalesce(p_payload->>'primary_blocker', '')), 240), ''),
    coalesce((p_payload->>'beta_eligible')::boolean, false),
    coalesce((p_payload->>'marketing_consent')::boolean, false),
    true,
    v_answers,
    v_result,
    nullif(left(trim(coalesce(p_payload->>'source', 'website_assessment')), 120), ''),
    nullif(left(trim(coalesce(p_payload->>'utm_source', '')), 160), ''),
    nullif(left(trim(coalesce(p_payload->>'utm_medium', '')), 160), ''),
    nullif(left(trim(coalesce(p_payload->>'utm_campaign', '')), 160), '')
  )
  returning assessment_leads.id, assessment_leads.result_token into v_id, v_token;

  return query select v_id, v_token;
end;
$$;

create or replace function public.get_public_assessment_result(p_token uuid)
returns table (
  full_name text,
  profession text,
  result jsonb,
  followup_requested boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    lead.full_name,
    lead.profession,
    lead.result,
    lead.followup_requested,
    lead.created_at
  from public.assessment_leads lead
  where lead.result_token = p_token
    and lead.status <> 'archived'
  limit 1;
$$;

create or replace function public.request_public_assessment_followup(p_token uuid, p_followup_type text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.assessment_leads lead
  set
    followup_requested = true,
    followup_type = left(nullif(trim(coalesce(p_followup_type, 'followup')), ''), 120),
    status = case when lead.status = 'new' then 'qualified' else lead.status end,
    updated_at = now()
  where lead.result_token = p_token
    and lead.status <> 'archived';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.mark_public_assessment_email_status(p_token uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_status not in ('sent', 'failed') then
    raise exception 'Invalid email status';
  end if;

  update public.assessment_leads lead
  set email_status = p_status, updated_at = now()
  where lead.result_token = p_token;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.admin_list_assessment_leads()
returns table (
  id uuid,
  result_token uuid,
  full_name text,
  email text,
  profession text,
  whatsapp text,
  goal text,
  recommended_course text,
  profile_key text,
  primary_blocker text,
  beta_eligible boolean,
  marketing_consent boolean,
  status text,
  followup_requested boolean,
  followup_type text,
  email_status text,
  notes text,
  answers jsonb,
  result jsonb,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    lead.id,
    lead.result_token,
    lead.full_name,
    lead.email,
    lead.profession,
    lead.whatsapp,
    lead.goal,
    lead.recommended_course,
    lead.profile_key,
    lead.primary_blocker,
    lead.beta_eligible,
    lead.marketing_consent,
    lead.status,
    lead.followup_requested,
    lead.followup_type,
    lead.email_status,
    lead.notes,
    lead.answers,
    lead.result,
    lead.source,
    lead.utm_source,
    lead.utm_medium,
    lead.utm_campaign,
    lead.created_at,
    lead.updated_at
  from public.assessment_leads lead
  order by lead.created_at desc;
end;
$$;

create or replace function public.admin_update_assessment_lead(p_id uuid, p_status text, p_notes text default null)
returns table (id uuid, status text, notes text, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_status not in ('new', 'qualified', 'contacted', 'waitlist', 'enrolled', 'not_fit', 'archived') then
    raise exception 'Invalid lead status';
  end if;

  return query
  update public.assessment_leads lead
  set
    status = p_status,
    notes = case when p_notes is null then lead.notes else left(p_notes, 4000) end,
    updated_at = now()
  where lead.id = p_id
  returning lead.id, lead.status, lead.notes, lead.updated_at;
end;
$$;

revoke all on function public.submit_public_assessment_lead(jsonb) from public;
revoke all on function public.get_public_assessment_result(uuid) from public;
revoke all on function public.request_public_assessment_followup(uuid, text) from public;
revoke all on function public.mark_public_assessment_email_status(uuid, text) from public;
revoke all on function public.admin_list_assessment_leads() from public;
revoke all on function public.admin_update_assessment_lead(uuid, text, text) from public;

grant execute on function public.submit_public_assessment_lead(jsonb) to anon, authenticated;
grant execute on function public.get_public_assessment_result(uuid) to anon, authenticated;
grant execute on function public.request_public_assessment_followup(uuid, text) to anon, authenticated;
grant execute on function public.mark_public_assessment_email_status(uuid, text) to anon, authenticated;
grant execute on function public.admin_list_assessment_leads() to authenticated;
grant execute on function public.admin_update_assessment_lead(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
