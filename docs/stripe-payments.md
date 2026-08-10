# Stripe one-time payments

Stripe Checkout is the intended payment integration for new Sblocco Inglese digital pathway offers. PayPal configuration in `src/config/site.js` is legacy and is retained only for the older simulation booking flow.

## Safety model

- Payments are one-time only through Stripe-hosted Checkout.
- A Supabase account is required before Checkout starts.
- The browser submits only an internal `offerId`.
- The server chooses the Stripe Price ID, pathway and access target.
- The signed webhook, not the success redirect, records the purchase and grants access.
- `stripe_checkout_session_id` is unique and fulfillment uses one transactional database function, so Stripe retries are idempotent.
- Refunds do not automatically revoke access in v1 because that business policy is not final.
- With zero configured offers, every purchase button remains disabled and the API refuses Checkout safely.

## Required migrations

Apply `supabase/migrations/20260809140000_stripe_pathway_commerce.sql` before configuring any purchasable offer. It creates:

- `purchases`
- `user_entitlements`
- `pathway_intake_requests`
- service-role-only fulfillment functions
- owner-only RLS reads and admin policies

For Recupero Debito Inglese also apply the additive `2026081101xxxx_recovery_debt_*.sql` migrations. They extend the allowed purchase pathway and add recovery enrolment/plan state without replacing the commerce tables.

Do not paste the service role key into browser variables or any `VITE_` variable.

## Environment variables

Server functions require:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_SITE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Each digital offer has three optional values. For example:

```text
STRIPE_PRICE_COLLOQUIO_ESSENTIAL=
STRIPE_ACCESS_COLLOQUIO_ESSENTIAL=
STRIPE_ACCESS_URL_COLLOQUIO_ESSENTIAL=
```

Recupero Debito uses:

```text
STRIPE_PRICE_RECUPERO_DEBITO=price_...
STRIPE_ACCESS_RECUPERO_DEBITO=recupero-debito
STRIPE_ACCESS_URL_RECUPERO_DEBITO=/recupero-debito/onboarding
```

`STRIPE_PRICE_RECUPERO_DEBITO` should point to the real one-time Stripe Price chosen for launch (for example the planned ~€39 offer); the application does not hardcode the amount. The stable entitlement target is `recupero-debito`, and the success route should enter onboarding so the learner can attach or complete the diagnostic, set the exam date, class and school programme.

The `PRICE` value must be a real Stripe Price ID created manually in the appropriate Stripe account and mode. `ACCESS` must point to a real existing internal resource identifier. `ACCESS_URL` must be a same-origin route that can open that resource. The offer becomes purchasable only when both `PRICE` and `ACCESS` are present. An omitted or invalid `ACCESS_URL` safely falls back to `/account`.

Never create placeholder Products, fake prices or speculative access targets. Guided and individual preparation remain enquiry actions until real delivery and pricing exist.

## Configure a future offer

1. Create the real digital resource or course in the existing Sblocco content system.
2. Decide the stable access identifier and authenticated route for that resource.
3. Create a one-time Product and Price in Stripe test mode.
4. Add the matching `STRIPE_PRICE_*`, `STRIPE_ACCESS_*` and `STRIPE_ACCESS_URL_*` values to local/Vercel server environment variables.
5. Redeploy and confirm that the offer changes from `Prossimamente` to the Checkout action.
6. Complete test-mode verification before repeating the configuration in live mode.

## Local webhook test

Use the Vercel development server because plain Vite does not execute `api/` functions.

```powershell
pnpm install
vercel dev
stripe login
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Copy the temporary `whsec_...` value printed by `stripe listen` into `STRIPE_WEBHOOK_SECRET` for that local session, then restart `vercel dev`.

1. Use Stripe test-mode secret and Price values only.
2. Log in to a Sblocco learner account.
3. Open the configured pathway and start Checkout.
4. Use Stripe's documented test card `4242 4242 4242 4242`, a future expiry and any CVC/postcode.
5. Confirm the webhook returns 2xx.
6. Confirm one `purchases` row and one `user_entitlements` row were created.
7. Resend the same event from Stripe CLI and confirm no duplicate row or entitlement appears.
8. Confirm another authenticated user cannot read those rows or self-grant access.
9. For `recupero-debito`, confirm the success CTA opens `/recupero-debito/onboarding` and `has_active_recovery_entitlement()` returns true only for the purchasing user.

The success page performs a small number of delayed rechecks and also provides a manual refresh button. A success URL alone never grants access.

## Production checklist

- Apply the migrations.
- Configure server-only Supabase and Stripe secrets in Vercel.
- Set `PUBLIC_SITE_URL` to the canonical HTTPS origin.
- Add the production webhook endpoint `/api/stripe/webhook` in Stripe.
- Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`.
- Store the production webhook signing secret.
- Configure only offers whose content and access route already exist.
- For Recupero Debito, map the required approved Exercise Builder versions in `/admin/content/recovery` before opening sales.
- Run a low-risk live verification and inspect the purchase and entitlement rows.
