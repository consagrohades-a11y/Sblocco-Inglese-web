import { allowMethods, parseJsonBody, requestOrigin, sendJson } from '../../server/http.js';
import { authenticateRequest, getSupabaseAdmin, ServerConfigurationError } from '../../server/supabaseAdmin.js';
import { getStripe } from '../../server/stripe/client.js';
import { resolveOffer } from '../../server/stripe/offers.js';

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
