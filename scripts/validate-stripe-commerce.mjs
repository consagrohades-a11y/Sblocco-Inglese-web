import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';
import { listResolvedOffers, resolveOffer } from '../server/stripe/offers.js';
import { safeReturnTo } from '../src/lib/safeReturnTo.js';

assert.equal(resolveOffer('not-a-real-offer', {}), null);
assert.equal(listResolvedOffers({}).length, 12);
assert.ok(listResolvedOffers({}).every((offer) => !offer.configured));

const configured = resolveOffer('colloquio-essential', {
  STRIPE_PRICE_COLLOQUIO_ESSENTIAL: 'price_testConfigured123',
  STRIPE_ACCESS_COLLOQUIO_ESSENTIAL: 'real-resource-public-id',
  STRIPE_ACCESS_URL_COLLOQUIO_ESSENTIAL: '/collections?assignmentId=known&resourceId=known',
});
assert.equal(configured.configured, true);
assert.equal(configured.stripePriceId, 'price_testConfigured123');
assert.equal(configured.accessTarget, 'real-resource-public-id');
assert.equal(configured.fulfillable, true);

const recovery = resolveOffer('recupero-debito', {
  STRIPE_PRICE_RECUPERO_DEBITO: 'price_recoveryConfigured123',
  STRIPE_ACCESS_RECUPERO_DEBITO: 'recupero-debito',
  STRIPE_ACCESS_URL_RECUPERO_DEBITO: '/recupero-debito/onboarding',
});
assert.equal(recovery.configured, true);
assert.equal(recovery.pathway, 'recupero-debito');
assert.equal(recovery.accessTarget, 'recupero-debito');
assert.equal(recovery.accessUrl, '/recupero-debito/onboarding');

assert.equal(resolveOffer('colloquio-essential', { STRIPE_PRICE_COLLOQUIO_ESSENTIAL: 'price_testOnly' }).configured, false);
assert.equal(resolveOffer('colloquio-complete-plus', {
  STRIPE_PRICE_COLLOQUIO_COMPLETE_PLUS: 'price_completePlus123',
  STRIPE_ACCESS_COLLOQUIO_COMPLETE_PLUS: 'complete-plus-resource',
}).configured, true);
assert.equal(resolveOffer('colloquio-complete-plus', {
  STRIPE_ACCESS_COLLOQUIO_COMPLETE_PLUS: 'payment-link-resource',
}).fulfillable, true);
assert.equal(resolveOffer('colloquio-essential', {
  STRIPE_PRICE_COLLOQUIO_ESSENTIAL: 'arbitrary-client-value',
  STRIPE_ACCESS_COLLOQUIO_ESSENTIAL: 'resource',
}).configured, false);

assert.equal(safeReturnTo('/percorsi/colloquio#supporto'), '/percorsi/colloquio#supporto');
assert.equal(safeReturnTo('/recupero-debito/onboarding'), '/recupero-debito/onboarding');
assert.equal(safeReturnTo('https://evil.example/path'), '/account');
assert.equal(safeReturnTo('//evil.example/path'), '/account');
assert.equal(safeReturnTo('/\\evil.example'), '/account');

const checkout = readFileSync('api/stripe/checkout.js', 'utf8');
const webhook = readFileSync('api/stripe/webhook.js', 'utf8');
const migration = readFileSync('supabase/migrations/20260809140000_stripe_pathway_commerce.sql', 'utf8');
const recoveryMigration = readFileSync('supabase/migrations/20260811010000_recovery_debt_foundation.sql', 'utf8');

assert.match(checkout, /mode: 'payment'/);
assert.match(checkout, /line_items: \[\{ price: offer\.stripePriceId, quantity: 1 \}\]/);
assert.match(checkout, /resolveOffer\(offerId\)/);
assert.match(checkout, /already_owned/);
assert.match(checkout, /offer_not_configured/);
assert.doesNotMatch(checkout, /body\.(amount|currency|price|priceId|accessTarget)/);
assert.doesNotMatch(checkout, /subscription|payment_intent_data/);

assert.match(webhook, /bodyParser: false/);
assert.match(webhook, /webhooks\.constructEvent/);
assert.match(webhook, /checkout\.session\.completed/);
assert.match(webhook, /checkout\.session\.async_payment_succeeded/);
assert.match(webhook, /checkout\.session\.async_payment_failed/);
assert.match(webhook, /fulfill_stripe_checkout/);
assert.match(webhook, /metadataUserId \|\| session\.client_reference_id/);
assert.match(webhook, /offer\.fulfillable/);
assert.doesNotMatch(webhook, /refund.*revoke|revoke.*refund/i);

assert.match(migration, /stripe_checkout_session_id text not null unique/);
assert.match(migration, /unique \(user_id, offer_id\)/);
assert.match(migration, /alter table public\.purchases enable row level security/);
assert.match(migration, /using \(user_id = auth\.uid\(\)\)/);
assert.match(migration, /security definer/g);
assert.match(migration, /on conflict \(stripe_checkout_session_id\) do update/);
assert.match(migration, /on conflict \(user_id, offer_id\) do update/);
assert.doesNotMatch(migration, /purchases_insert_own|user_entitlements_insert_own/);
assert.match(migration, /revoke all on function public\.fulfill_stripe_checkout/);
assert.match(migration, /to service_role/);
assert.match(recoveryMigration, /'recupero-debito'/);
assert.match(recoveryMigration, /has_active_recovery_entitlement/);

const stripe = new Stripe('sk_test_static_validation');
const secret = 'whsec_static_validation';
const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'checkout.session.completed', data: { object: {} } });
const validHeader = stripe.webhooks.generateTestHeaderString({ payload, secret });
assert.equal(stripe.webhooks.constructEvent(payload, validHeader, secret).id, 'evt_test');
assert.throws(() => stripe.webhooks.constructEvent(payload, validHeader, 'whsec_wrong'));

console.log('Stripe commerce validation passed.');
