-- Recupero Debito Inglese launch access duration.
-- The €39 one-time purchase grants 90 days of access from first successful fulfillment.
-- Webhook retries for the same purchase do not extend the entitlement window.

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
  v_granted_at timestamptz := now();
  v_expires_at timestamptz;
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

  v_expires_at := case
    when p_offer_id = 'recupero-debito' or p_access_target = 'recupero-debito'
      then v_granted_at + interval '90 days'
    else null
  end;

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
    v_granted_at,
    v_expires_at
  )
  on conflict (user_id, offer_id) do update set
    access_type = excluded.access_type,
    access_target = excluded.access_target,
    purchase_id = excluded.purchase_id,
    status = 'active',
    granted_at = case
      when public.user_entitlements.purchase_id = excluded.purchase_id
        then public.user_entitlements.granted_at
      else excluded.granted_at
    end,
    expires_at = case
      when public.user_entitlements.purchase_id = excluded.purchase_id
        then public.user_entitlements.expires_at
      else excluded.expires_at
    end;

  return v_purchase_id;
end;
$$;

revoke all on function public.fulfill_stripe_checkout(uuid, text, text, text, text, text, bigint, text, text, text)
from public, anon, authenticated;

grant execute on function public.fulfill_stripe_checkout(uuid, text, text, text, text, text, bigint, text, text, text)
to service_role;

comment on function public.fulfill_stripe_checkout(uuid, text, text, text, text, text, bigint, text, text, text)
is 'Service-role Stripe fulfillment. Recupero Debito entitlements expire 90 days after first fulfillment; retries are idempotent.';

notify pgrst, 'reload schema';
