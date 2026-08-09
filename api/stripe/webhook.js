import { readRawBody, sendJson } from '../../server/http.js';
import { getSupabaseAdmin, ServerConfigurationError } from '../../server/supabaseAdmin.js';
import { getStripe } from '../../server/stripe/client.js';
import { resolveOffer } from '../../server/stripe/offers.js';

export const config = { api: { bodyParser: false } };

function stripeId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
}

function trustedSessionData(session) {
  const offer = resolveOffer(session.metadata?.offer_id);
  const userId = session.metadata?.user_id;
  if (!offer || !offer.configured) throw new Error('Webhook references an unknown or unconfigured offer.');
  if (!userId || userId !== session.client_reference_id) throw new Error('Webhook user metadata is inconsistent.');
  return { offer, userId };
}

async function fulfillSession(session) {
  const { offer, userId } = trustedSessionData(session);
  if (session.payment_status !== 'paid') return { ignored: true, reason: 'payment_not_paid' };

  const { error } = await getSupabaseAdmin().rpc('fulfill_stripe_checkout', {
    p_user_id: userId,
    p_offer_id: offer.id,
    p_pathway: offer.pathway,
    p_checkout_session_id: session.id,
    p_payment_intent_id: stripeId(session.payment_intent),
    p_customer_id: stripeId(session.customer),
    p_amount_total: session.amount_total ?? null,
    p_currency: session.currency || null,
    p_access_type: offer.accessType,
    p_access_target: offer.accessTarget,
  });
  if (error) throw error;
  return { fulfilled: true };
}

async function recordFailure(session) {
  const { offer, userId } = trustedSessionData(session);
  const { error } = await getSupabaseAdmin().rpc('record_stripe_checkout_failure', {
    p_user_id: userId,
    p_offer_id: offer.id,
    p_pathway: offer.pathway,
    p_checkout_session_id: session.id,
    p_payment_intent_id: stripeId(session.payment_intent),
    p_customer_id: stripeId(session.customer),
    p_amount_total: session.amount_total ?? null,
    p_currency: session.currency || null,
  });
  if (error) throw error;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed', code: 'method_not_allowed' });
  }

  try {
    const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) throw new ServerConfigurationError('STRIPE_WEBHOOK_SECRET is not configured.');
    const signature = request.headers['stripe-signature'];
    if (!signature) return sendJson(response, 400, { error: 'Missing Stripe signature.', code: 'missing_signature' });

    const rawBody = await readRawBody(request);
    let event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      return sendJson(response, 400, { error: 'Invalid Stripe signature.', code: 'invalid_signature' });
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await fulfillSession(event.data.object);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      await recordFailure(event.data.object);
    }

    return sendJson(response, 200, { received: true });
  } catch (error) {
    const configurationRequired = error instanceof ServerConfigurationError;
    console.error('Stripe webhook processing failed', { name: error.name, code: error.code || null });
    return sendJson(response, configurationRequired ? 503 : 500, {
      error: configurationRequired ? 'Webhook service is not configured.' : 'Webhook fulfillment failed.',
      code: configurationRequired ? 'configuration_required' : 'fulfillment_failed',
    });
  }
}

