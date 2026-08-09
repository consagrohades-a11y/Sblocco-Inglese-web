-- Allow interview-preparation enquiries without forcing account creation.
-- Paid pathway checkout remains authenticated and is unchanged.

alter table public.pathway_intake_requests
  alter column user_id drop not null;

alter table public.pathway_intake_requests
  add column if not exists name text,
  add column if not exists email text;

update public.pathway_intake_requests request
set
  name = coalesce(
    nullif(trim(coalesce(account.raw_user_meta_data->>'display_name', account.raw_user_meta_data->>'full_name', account.raw_user_meta_data->>'name', '')), ''),
    'Utente registrato'
  ),
  email = coalesce(
    nullif(lower(trim(account.email)), ''),
    'legacy+' || replace(request.id::text, '-', '') || '@invalid.local'
  )
from auth.users account
where request.user_id = account.id
  and (request.name is null or request.email is null);

update public.pathway_intake_requests
set
  name = coalesce(nullif(trim(name), ''), 'Utente registrato'),
  email = coalesce(nullif(lower(trim(email)), ''), 'legacy+' || replace(id::text, '-', '') || '@invalid.local')
where name is null or email is null;

alter table public.pathway_intake_requests
  alter column name set not null,
  alter column email set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pathway_intake_requests_name_length_check'
  ) then
    alter table public.pathway_intake_requests
      add constraint pathway_intake_requests_name_length_check
      check (length(trim(name)) between 2 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pathway_intake_requests_email_length_check'
  ) then
    alter table public.pathway_intake_requests
      add constraint pathway_intake_requests_email_length_check
      check (length(trim(email)) between 3 and 254);
  end if;
end;
$$;

create index if not exists pathway_intake_requests_email_created_idx
on public.pathway_intake_requests (lower(email), created_at desc);

create or replace function public.submit_public_pathway_intake(p_payload jsonb)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_email text;
  v_pathway text;
  v_interview_date_text text;
  v_interview_date date;
  v_role text;
  v_company text;
  v_interview_type text;
  v_practical_test text;
  v_note text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid enquiry payload';
  end if;

  if length(trim(coalesce(p_payload->>'website', ''))) > 0 then
    raise exception 'Invalid enquiry payload';
  end if;

  v_name := left(trim(coalesce(p_payload->>'name', '')), 120);
  v_email := lower(left(trim(coalesce(p_payload->>'email', '')), 254));
  v_pathway := left(trim(coalesce(p_payload->>'pathway', '')), 40);
  v_interview_date_text := nullif(trim(coalesce(p_payload->>'interview_date', '')), '');
  v_role := left(trim(coalesce(p_payload->>'role', '')), 180);
  v_company := nullif(left(trim(coalesce(p_payload->>'company', '')), 180), '');
  v_interview_type := nullif(left(trim(coalesce(p_payload->>'interview_type', '')), 180), '');
  v_practical_test := lower(left(trim(coalesce(p_payload->>'practical_test', 'unknown')), 20));
  v_note := nullif(left(trim(coalesce(p_payload->>'note', '')), 1500), '');

  if length(v_name) < 2 then
    raise exception 'Name is required';
  end if;
  if v_email !~* '^[A-Z0-9._%+''-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'A valid email is required';
  end if;
  if v_pathway <> 'colloquio' then
    raise exception 'Invalid pathway';
  end if;
  if length(v_role) < 1 then
    raise exception 'Role is required';
  end if;
  if v_practical_test not in ('yes', 'no', 'unknown') then
    raise exception 'Invalid practical test value';
  end if;

  if v_interview_date_text is not null then
    if v_interview_date_text !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Invalid interview date';
    end if;
    begin
      v_interview_date := v_interview_date_text::date;
    exception when others then
      raise exception 'Invalid interview date';
    end;
  end if;

  if (
    select count(*)
    from public.pathway_intake_requests recent
    where lower(recent.email) = v_email
      and recent.created_at > now() - interval '6 hours'
  ) >= 3 then
    raise exception 'Too many recent pathway enquiries for this email';
  end if;

  return query
  insert into public.pathway_intake_requests (
    user_id,
    name,
    email,
    pathway,
    interview_date,
    role,
    company,
    interview_type,
    practical_test,
    note
  ) values (
    auth.uid(),
    v_name,
    v_email,
    v_pathway,
    v_interview_date,
    v_role,
    v_company,
    v_interview_type,
    v_practical_test,
    v_note
  )
  returning pathway_intake_requests.id, pathway_intake_requests.created_at;
end;
$$;

revoke all on function public.submit_public_pathway_intake(jsonb) from public;
grant execute on function public.submit_public_pathway_intake(jsonb) to anon, authenticated;

revoke insert on table public.pathway_intake_requests from anon, authenticated;

comment on table public.pathway_intake_requests is
'Public or authenticated pathway enquiries. These records are not payments or bookings.';

comment on function public.submit_public_pathway_intake(jsonb) is
'Validates and rate-limits public Colloquio preparation enquiries without creating an account.';
