-- Stripe one-time purchases, durable access ownership, and high-intent pathway intake.
-- Apply this migration before enabling any Stripe Price ID in production.

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id text not null check (length(trim(offer_id)) > 0),
  pathway text not null check (pathway in ('colloquio', 'lavorare', 'parlare', 'estero', 'basi')),
  stripe_checkout_session_id text not null unique check (length(trim(stripe_checkout_session_id)) > 0),
  stripe_payment_intent_id text,
  stripe_customer_id text,
  amount_total bigint check (amount_total is null or amount_total >= 0),
  currency text check (currency is null or currency ~ '^[a-z]{3}$'),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'unpaid', 'refunded', 'partially_refunded')),
  fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

create index purchases_user_created_idx on public.purchases(user_id, created_at desc);
create index purchases_offer_user_idx on public.purchases(offer_id, user_id);
create index purchases_payment_intent_idx on public.purchases(stripe_payment_intent_id)
where stripe_payment_intent_id is not null;

create table public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id text not null check (length(trim(offer_id)) > 0),
  access_type text not null check (access_type in ('digital_product', 'course', 'collection')),
  access_target text not null check (length(trim(access_target)) > 0),
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, offer_id),
  unique (purchase_id, offer_id),
  check (expires_at is null or expires_at > granted_at)
);

create trigger user_entitlements_set_updated_at
before update on public.user_entitlements
for each row execute function public.set_updated_at();

create index user_entitlements_user_status_idx on public.user_entitlements(user_id, status);
create index user_entitlements_access_idx on public.user_entitlements(access_type, access_target);

create table public.pathway_intake_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pathway text not null check (pathway in ('colloquio', 'lavorare', 'parlare', 'estero', 'basi')),
  interview_date date,
  role text not null check (length(trim(role)) between 1 and 180),
  company text check (company is null or length(company) <= 180),
  interview_type text check (interview_type is null or length(interview_type) <= 180),
  practical_test text not null default 'unknown' check (practical_test in ('yes', 'no', 'unknown')),
  note text check (note is null or length(note) <= 1500),
  status text not null default 'new' check (status in ('new', 'reviewing', 'contacted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pathway_intake_requests_set_updated_at
before update on public.pathway_intake_requests
for each row execute function public.set_updated_at();

create index pathway_intake_requests_user_created_idx on public.pathway_intake_requests(user_id, created_at desc);
create index pathway_intake_requests_admin_queue_idx on public.pathway_intake_requests(status, created_at desc);

alter table public.purchases enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.pathway_intake_requests enable row level security;

create policy "purchases_select_own"
on public.purchases
for select
to authenticated
using (user_id = auth.uid());

create policy "purchases_admin_all"
on public.purchases
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "user_entitlements_select_own"
on public.user_entitlements
for select
to authenticated
using (user_id = auth.uid());

create policy "user_entitlements_admin_all"
on public.user_entitlements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "pathway_intake_requests_select_own"
on public.pathway_intake_requests
for select
to authenticated
using (user_id = auth.uid());

create policy "pathway_intake_requests_insert_own"
on public.pathway_intake_requests
for insert
to authenticated
with check (user_id = auth.uid());

create policy "pathway_intake_requests_admin_all"
on public.pathway_intake_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- The service-role-only RPC keeps purchase and entitlement writes in one transaction.
create or replace function public.fulfill_stripe_checkout(
  p_user_id uuid,
  p_offer_id text,
  p_pathway text,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_customer_id text,
  p_amount_total bigint,
  p_currency text,
  p_access_type text,
  p_access_target text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.purchases%rowtype;
  v_purchase_id uuid;
begin
  select p.*
  into v_existing
  from public.purchases p
  where p.stripe_checkout_session_id = p_checkout_session_id
  for update;

  if found and (v_existing.user_id <> p_user_id or v_existing.offer_id <> p_offer_id) then
    raise exception 'Checkout session already belongs to a different user or offer';
  end if;

  insert into public.purchases (
    user_id,
    offer_id,
    pathway,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_customer_id,
    amount_total,
    currency,
    payment_status,
    fulfillment_status
  ) values (
    p_user_id,
    p_offer_id,
    p_pathway,
    p_checkout_session_id,
    p_payment_intent_id,
    p_customer_id,
    p_amount_total,
    lower(p_currency),
    'paid',
    'completed'
  )
  on conflict (stripe_checkout_session_id) do update set
    stripe_payment_intent_id = excluded.stripe_payment_intent_id,
    stripe_customer_id = excluded.stripe_customer_id,
    amount_total = excluded.amount_total,
    currency = excluded.currency,
    payment_status = 'paid',
    fulfillment_status = 'completed'
  returning id into v_purchase_id;

  insert into public.user_entitlements (
    user_id,
    offer_id,
    access_type,
    access_target,
    purchase_id,
    status,
    granted_at,
    expires_at
  ) values (
    p_user_id,
    p_offer_id,
    p_access_type,
    p_access_target,
    v_purchase_id,
    'active',
    now(),
    null
  )
  on conflict (user_id, offer_id) do update set
    access_type = excluded.access_type,
    access_target = excluded.access_target,
    purchase_id = excluded.purchase_id,
    status = 'active',
    granted_at = excluded.granted_at,
    expires_at = null;

  return v_purchase_id;
end;
$$;

create or replace function public.record_stripe_checkout_failure(
  p_user_id uuid,
  p_offer_id text,
  p_pathway text,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_customer_id text,
  p_amount_total bigint,
  p_currency text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.purchases (
    user_id,
    offer_id,
    pathway,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_customer_id,
    amount_total,
    currency,
    payment_status,
    fulfillment_status
  ) values (
    p_user_id,
    p_offer_id,
    p_pathway,
    p_checkout_session_id,
    p_payment_intent_id,
    p_customer_id,
    p_amount_total,
    lower(p_currency),
    'failed',
    'failed'
  )
  on conflict (stripe_checkout_session_id) do update set
    stripe_payment_intent_id = excluded.stripe_payment_intent_id,
    stripe_customer_id = excluded.stripe_customer_id,
    amount_total = excluded.amount_total,
    currency = excluded.currency,
    payment_status = 'failed',
    fulfillment_status = 'failed'
  where public.purchases.fulfillment_status <> 'completed';
end;
$$;

revoke all on function public.fulfill_stripe_checkout(uuid, text, text, text, text, text, bigint, text, text, text)
from public, anon, authenticated;
revoke all on function public.record_stripe_checkout_failure(uuid, text, text, text, text, text, bigint, text)
from public, anon, authenticated;

grant execute on function public.fulfill_stripe_checkout(uuid, text, text, text, text, text, bigint, text, text, text)
to service_role;
grant execute on function public.record_stripe_checkout_failure(uuid, text, text, text, text, text, bigint, text)
to service_role;

grant select, insert, update, delete on public.purchases to authenticated;
grant select, insert, update, delete on public.user_entitlements to authenticated;
grant select, insert, update, delete on public.pathway_intake_requests to authenticated;

comment on table public.purchases is 'Authoritative one-time Stripe purchases written by webhook fulfillment.';
comment on table public.user_entitlements is 'Durable ownership pointers for paid digital offers. No client self-grants.';
comment on table public.pathway_intake_requests is 'Authenticated high-intent pathway enquiries; not payments or bookings.';

