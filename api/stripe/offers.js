import { allowMethods, sendJson } from '../../server/http.js';
import { authenticateRequest, bearerToken, getSupabaseAdmin, ServerConfigurationError } from '../../server/supabaseAdmin.js';
import { knownPathways, listResolvedOffers, publicOfferState } from '../../server/stripe/offers.js';

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['GET'])) return;
  const pathway = String(request.query?.pathway || '').trim();
  if (pathway && !knownPathways.has(pathway)) return sendJson(response, 400, { error: 'Unknown pathway.', code: 'unknown_pathway' });

  try {
    let user = null;
    if (bearerToken(request)) {
      const auth = await authenticateRequest(request);
      if (auth.error) return sendJson(response, 401, { error: auth.error, code: 'authentication_required' });
      user = auth.user;
    }

    const offers = listResolvedOffers().filter((offer) => !pathway || offer.pathway === pathway);
    let ownedIds = new Set();
    if (user && offers.length) {
      const { data, error } = await getSupabaseAdmin()
        .from('user_entitlements')
        .select('offer_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('offer_id', offers.map((offer) => offer.id));
      if (error) throw error;
      ownedIds = new Set((data || []).map((item) => item.offer_id));
    }

    return sendJson(response, 200, { offers: offers.map((offer) => publicOfferState(offer, ownedIds.has(offer.id))) });
  } catch (error) {
    const configurationRequired = error instanceof ServerConfigurationError;
    return sendJson(response, configurationRequired ? 503 : 500, {
      error: configurationRequired ? 'Commerce service is not configured.' : 'Unable to load offer availability.',
      code: configurationRequired ? 'configuration_required' : 'offer_state_failed',
    });
  }
}

