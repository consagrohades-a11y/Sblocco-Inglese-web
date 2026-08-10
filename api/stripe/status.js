import { allowMethods, sendJson } from '../../server/http.js';
import { authenticateRequest, getSupabaseAdmin, ServerConfigurationError } from '../../server/supabaseAdmin.js';
import { resolveOffer } from '../../server/stripe/offers.js';

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['GET'])) return;
  const sessionId = String(request.query?.session_id || '').trim();
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return sendJson(response, 400, { error: 'Invalid Checkout Session.', code: 'invalid_session' });
  }

  try {
    const auth = await authenticateRequest(request);
    if (auth.error) return sendJson(response, 401, { error: auth.error, code: 'authentication_required' });

    const { data: purchase, error } = await getSupabaseAdmin()
      .from('purchases')
      .select('offer_id, pathway, payment_status, fulfillment_status, updated_at')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!purchase) return sendJson(response, 200, { status: 'processing', fulfilled: false });

    const offer = resolveOffer(purchase.offer_id);
    return sendJson(response, 200, {
      status: purchase.fulfillment_status,
      paymentStatus: purchase.payment_status,
      fulfilled: purchase.fulfillment_status === 'completed' && purchase.payment_status === 'paid',
      pathway: purchase.pathway,
      offerId: purchase.offer_id,
      accessUrl: offer?.accessUrl || '/account',
      updatedAt: purchase.updated_at,
    });
  } catch (error) {
    const configurationRequired = error instanceof ServerConfigurationError;
    return sendJson(response, configurationRequired ? 503 : 500, {
      error: configurationRequired ? 'Access verification is not configured.' : 'Unable to verify access.',
      code: configurationRequired ? 'configuration_required' : 'status_failed',
    });
  }
}

