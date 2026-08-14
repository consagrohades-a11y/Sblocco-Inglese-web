import { allowMethods, parseJsonBody, requestOrigin, sendJson } from '../../server/http.js';
import { authenticateRequest, getSupabaseAdmin, ServerConfigurationError } from '../../server/supabaseAdmin.js';
import { getStripe } from '../../server/stripe/client.js';
import { resolveOffer } from '../../server/stripe/offers.js';

const RECOVERY_CONSENT_VERSION = 'recovery-checkout-2026-08-14-v1';
const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
const ATTRIBUTION_MAX_LENGTH = 100;

function sanitizeAttribution(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return ATTRIBUTION_KEYS.reduce((result, key) => {
    if (typeof input[key] !== 'string') return result;
    const value = input[key].replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, ATTRIBUTION_MAX_LENGTH);
    if (value) result[key] = value;
    return result;
  }, {});
}

function validateRecoveryConsent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  return input.terms === true
    && input.privacy === true
    && input.immediateAccess === true
    && input.version === RECOVERY_CONSENT_VERSION;
}

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) return;

  try {
    const auth = await authenticateRequest(request);
    if (auth.error) return sendJson(response, 401, { error: auth.error, code: 'authentication_required' });

    const body = parseJsonBody(request);
    const offerId = typeof body.offerId === 'string' ? body.offerId.trim() : '';
    const offer = resolveOffer(offerId);
    if (!offer) return sendJson(response, 400, { error: 'Unknown offer.', code: 'unknown_offer' });
    if (!offer.active) return sendJson(response, 409, { error: 'This offer is not active.', code: 'inactive_offer' });
    if (!offer.configured) {
      return sendJson(response, 409, { error: 'Questo percorso non è ancora disponibile per l’acquisto.', code: 'offer_not_configured' });
    }

    const recoveryConsent = offer.id === 'recupero-debito' ? body.consent : null;
    if (offer.id === 'recupero-debito' && !validateRecoveryConsent(recoveryConsent)) {
      return sendJson(response, 400, {
        error: 'Le conferme richieste per l’acquisto digitale non sono complete.',
        code: 'consent_required',
      });
    }
    const attribution = offer.id === 'recupero-debito' ? sanitizeAttribution(body.attribution) : {};
    const consentRecordedAt = offer.id === 'recupero-debito' ? new Date().toISOString() : null;

    const supabase = getSupabaseAdmin();
    const { data: entitlement, error: entitlementError } = await supabase
      .from('user_entitlements')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('offer_id', offer.id)
      .eq('status', 'active')
      .maybeSingle();
    if (entitlementError) throw entitlementError;
    if (entitlement) return sendJson(response, 409, { error: 'Possiedi già questo percorso.', code: 'already_owned' });

    const origin = requestOrigin(request);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      integration_identifier: 'sblocco-pathway-rkqmvxzt',
      ...(offer.id === 'recupero-debito'
        ? {
            locale: 'it',
            adaptive_pricing: { enabled: false },
            payment_method_types: ['card', 'klarna', 'satispay'],
            wallet_options: { link: { display: 'never' } },
          }
        : {}),
      line_items: [{ price: offer.stripePriceId, quantity: 1 }],
      client_reference_id: auth.user.id,
      customer_email: auth.user.email || undefined,
      metadata: {
        offer_id: offer.id,
        pathway: offer.pathway,
        access_type: offer.accessType,
        access_target: offer.accessTarget,
        user_id: auth.user.id,
        ...(offer.id === 'recupero-debito'
          ? {
              consent_terms: 'true',
              consent_privacy: 'true',
              consent_immediate_access: 'true',
              consent_version: RECOVERY_CONSENT_VERSION,
              consent_recorded_at: consentRecordedAt,
              ...attribution,
            }
          : {}),
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?pathway=${encodeURIComponent(offer.pathway)}&offer=${encodeURIComponent(offer.id)}`,
    });

    if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
    return sendJson(response, 200, { url: session.url });
  } catch (error) {
    const configurationRequired = error instanceof ServerConfigurationError;
    console.error('Stripe checkout failed', { name: error.name, code: error.code || null });
    return sendJson(response, configurationRequired ? 503 : 500, {
      error: configurationRequired ? 'Il pagamento non è ancora configurato.' : 'Non è stato possibile aprire Stripe Checkout.',
      code: configurationRequired ? 'configuration_required' : 'checkout_failed',
    });
  }
}
