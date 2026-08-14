import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';
import { listResolvedOffers, resolveOffer } from '../server/stripe/offers.js';
import { safeReturnTo } from '../src/lib/safeReturnTo.js';
import {
  readCommerceAttribution,
  sanitizeCommerceAttribution,
  withCommerceAttribution,
} from '../src/lib/commerceAttribution.js';

assert.equal(resolveOffer('not-a-real-offer', {}), null);
assert.equal(listResolvedOffers({}).length, 12);
assert.ok(listResolvedOffers({}).every((offer) => !offer.configured));

const inactiveKit = resolveOffer('colloquio-essential', {
  STRIPE_PRICE_COLLOQUIO_ESSENTIAL: 'price_testConfigured123',
  STRIPE_ACCESS_COLLOQUIO_ESSENTIAL: 'real-resource-public-id',
  STRIPE_ACCESS_URL_COLLOQUIO_ESSENTIAL: '/collections?assignmentId=known&resourceId=known',
});
assert.equal(inactiveKit.active, false);
assert.equal(inactiveKit.configured, false);
assert.equal(inactiveKit.stripePriceId, 'price_testConfigured123');
assert.equal(inactiveKit.accessTarget, 'real-resource-public-id');
assert.equal(inactiveKit.fulfillable, false);

const configuredCore = resolveOffer('colloquio-complete', {
  STRIPE_PRICE_COLLOQUIO_COMPLETE: 'price_coreConfigured123',
  STRIPE_ACCESS_COLLOQUIO_COMPLETE: 'core-resource-public-id',
  STRIPE_ACCESS_URL_COLLOQUIO_COMPLETE: '/collections?assignmentId=core',
});
assert.equal(configuredCore.active, true);
assert.equal(configuredCore.configured, true);
assert.equal(configuredCore.fulfillable, true);

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
}).configured, false);
assert.equal(resolveOffer('colloquio-complete-plus', {
  STRIPE_ACCESS_COLLOQUIO_COMPLETE_PLUS: 'payment-link-resource',
}).fulfillable, false);
assert.equal(resolveOffer('colloquio-essential', {
  STRIPE_PRICE_COLLOQUIO_ESSENTIAL: 'arbitrary-client-value',
  STRIPE_ACCESS_COLLOQUIO_ESSENTIAL: 'resource',
}).configured, false);

assert.equal(safeReturnTo('/percorsi/colloquio#supporto'), '/percorsi/colloquio#supporto');
assert.equal(safeReturnTo('/recupero-debito/onboarding'), '/recupero-debito/onboarding');
assert.equal(
  safeReturnTo('/percorsi/recupero-debito?utm_source=facebook&utm_campaign=agosto#sblocca'),
  '/percorsi/recupero-debito?utm_source=facebook&utm_campaign=agosto#sblocca',
);
assert.equal(safeReturnTo('https://evil.example/path'), '/account');
assert.equal(safeReturnTo('//evil.example/path'), '/account');
assert.equal(safeReturnTo('/\\evil.example'), '/account');

assert.deepEqual(
  readCommerceAttribution('?utm_source=facebook&utm_medium=social&utm_campaign=recupero&utm_content=post-a&ignored=x'),
  { utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'recupero', utm_content: 'post-a' },
);
assert.deepEqual(sanitizeCommerceAttribution({ utm_source: ' ok ', admin: 'true', utm_medium: { injected: true } }), { utm_source: 'ok' });
assert.equal(sanitizeCommerceAttribution({ utm_campaign: 'x'.repeat(150) }).utm_campaign.length, 100);
assert.equal(
  withCommerceAttribution('/percorsi/recupero-debito#sblocca', { utm_source: 'facebook', utm_campaign: 'agosto' }),
  '/percorsi/recupero-debito?utm_source=facebook&utm_campaign=agosto#sblocca',
);

const stripeClient = readFileSync('server/stripe/client.js', 'utf8');
const checkout = readFileSync('api/stripe/checkout.js', 'utf8');
const offersApi = readFileSync('api/stripe/offers.js', 'utf8');
const webhook = readFileSync('api/stripe/webhook.js', 'utf8');
const migration = readFileSync('supabase/migrations/20260809140000_stripe_pathway_commerce.sql', 'utf8');
const recoveryMigration = readFileSync('supabase/migrations/20260811010000_recovery_debt_foundation.sql', 'utf8');
const checkoutContextMigration = readFileSync('supabase/migrations/20260814082000_recovery_commerce_checkout_context.sql', 'utf8');
const recoveryAccessMigration = readFileSync('supabase/migrations/20260814173000_recovery_access_90_days.sql', 'utf8');
const recoveryLanding = readFileSync('src/pages/RecoveryLandingPage.jsx', 'utf8');
const recoveryDiagnostic = readFileSync('src/pages/RecoveryDiagnostic.jsx', 'utf8');
const checkoutCancel = readFileSync('src/pages/CheckoutCancel.jsx', 'utf8');
const legalPages = readFileSync('src/data/legalPages.js', 'utf8');

assert.match(stripeClient, /apiVersion: '2026-06-24\.dahlia'/);
assert.match(checkout, /mode: 'payment'/);
assert.match(checkout, /integration_identifier: 'sblocco-pathway-[a-z]{8}'/);
assert.match(checkout, /line_items: \[\{ price: offer\.stripePriceId, quantity: 1 \}\]/);
assert.match(checkout, /resolveOffer\(offerId\)/);
assert.match(checkout, /already_owned/);
assert.match(checkout, /offer_not_configured/);
assert.match(checkout, /consent_required/);
assert.match(checkout, /input\.terms === true/);
assert.match(checkout, /input\.privacy === true/);
assert.match(checkout, /input\.immediateAccess === true/);
assert.match(checkout, /input\.adultPurchaser === true/);
assert.match(checkout, /recovery-checkout-2026-08-14-v2/);
assert.match(checkout, /consent_adult_purchaser: 'true'/);
assert.match(checkout, /select\('id, expires_at'\)/);
assert.match(checkout, /entitlement\.expires_at/);
assert.match(checkout, /ATTRIBUTION_KEYS = \['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'\]/);
assert.match(checkout, /slice\(0, ATTRIBUTION_MAX_LENGTH\)/);
assert.doesNotMatch(checkout, /body\.(amount|currency|price|priceId|accessTarget)/);
assert.doesNotMatch(checkout, /subscription|payment_intent_data/);
assert.match(checkout, /locale: 'it'/);
assert.match(checkout, /adaptive_pricing: \{ enabled: false \}/);
assert.match(checkout, /payment_method_types: \['card', 'klarna', 'satispay'\]/);
assert.match(checkout, /wallet_options: \{ link: \{ display: 'never' \} \}/);
assert.equal((checkout.match(/payment_method_types/g) || []).length, 1);
assert.equal((checkout.match(/wallet_options/g) || []).length, 1);
assert.equal((checkout.match(/adaptive_pricing/g) || []).length, 1);

assert.match(offersApi, /select\('offer_id, expires_at'\)/);
assert.match(offersApi, /item\.expires_at/);

assert.match(webhook, /bodyParser: false/);
assert.match(webhook, /webhooks\.constructEvent/);
assert.match(webhook, /checkout\.session\.completed/);
assert.match(webhook, /checkout\.session\.async_payment_succeeded/);
assert.match(webhook, /checkout\.session\.async_payment_failed/);
assert.match(webhook, /session\.payment_status !== 'paid'/);
assert.match(webhook, /fulfill_stripe_checkout/);
assert.match(webhook, /record_stripe_checkout_context/);
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
assert.match(checkoutContextMigration, /add column utm_source text/);
assert.match(checkoutContextMigration, /add column consent_version text/);
assert.match(checkoutContextMigration, /record_stripe_checkout_context/);
assert.match(checkoutContextMigration, /revoke all on function public\.record_stripe_checkout_context/);
assert.match(checkoutContextMigration, /grant execute on function public\.record_stripe_checkout_context[\s\S]*to service_role/);
assert.match(recoveryAccessMigration, /interval '90 days'/);
assert.match(recoveryAccessMigration, /p_offer_id = 'recupero-debito'/);
assert.match(recoveryAccessMigration, /public\.user_entitlements\.purchase_id = excluded\.purchase_id/);
assert.match(recoveryAccessMigration, /then public\.user_entitlements\.expires_at/);
assert.match(recoveryAccessMigration, /grant execute on function public\.fulfill_stripe_checkout[\s\S]*to service_role/);

assert.match(recoveryLanding, /€39 — pagamento unico/);
assert.match(recoveryLanding, /Nessun abbonamento · Accesso per 90 giorni dall’acquisto/);
assert.match(recoveryLanding, /recovery-checkout-2026-08-14-v2/);
assert.match(recoveryLanding, /Conferme prima del pagamento/);
assert.match(recoveryLanding, /adultPurchaser/);
assert.match(recoveryLanding, /genitore o tutore legale/);
assert.match(recoveryLanding, /type="checkbox"/);
assert.match(recoveryLanding, /withCommerceAttribution/);
assert.doesNotMatch(recoveryLanding, /due simulazioni|checkpoint misti|final readiness/i);
assert.match(recoveryDiagnostic, /withCommerceAttribution/);
assert.match(checkoutCancel, /requestedPathway === 'recupero-debito'/);
assert.match(checkoutCancel, /\/percorsi\/recupero-debito#sblocca/);
assert.doesNotMatch(legalPages, /PayPal|Calendly|no-show|mancata presenza|slot disponibile/i);
assert.match(legalPages, /Stripe Hosted Checkout/);
assert.match(legalPages, /90 giorni/);
assert.match(legalPages, /rimborso integrale/);
assert.match(legalPages, /genitore o tutore legale/);
assert.match(legalPages, /DA COMPLETARE PRIMA DELLA MESSA IN VENDITA/);

const stripe = new Stripe('sk_test_static_validation');
const secret = 'whsec_static_validation';
const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'checkout.session.completed', data: { object: {} } });
const validHeader = stripe.webhooks.generateTestHeaderString({ payload, secret });
assert.equal(stripe.webhooks.constructEvent(payload, validHeader, secret).id, 'evt_test');
assert.throws(() => stripe.webhooks.constructEvent(payload, validHeader, 'whsec_wrong'));

console.log('Stripe commerce validation passed.');
