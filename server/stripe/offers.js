const offerDefinitions = [
  ['colloquio-essential', 'colloquio', 'Essenziale', 'COLLOQUIO_ESSENTIAL'],
  ['colloquio-complete', 'colloquio', 'Percorso completo', 'COLLOQUIO_COMPLETE'],
  ['colloquio-complete-plus', 'colloquio', 'Sblocco Colloquio Complete', 'COLLOQUIO_COMPLETE_PLUS'],
  ['lavorare-essential', 'lavorare', 'Essenziale', 'LAVORARE_ESSENTIAL'],
  ['lavorare-complete', 'lavorare', 'Percorso completo', 'LAVORARE_COMPLETE'],
  ['parlare-essential', 'parlare', 'Essenziale', 'PARLARE_ESSENTIAL'],
  ['parlare-complete', 'parlare', 'Percorso completo', 'PARLARE_COMPLETE'],
  ['estero-essential', 'estero', 'Essenziale', 'ESTERO_ESSENTIAL'],
  ['estero-complete', 'estero', 'Percorso completo', 'ESTERO_COMPLETE'],
  ['basi-essential', 'basi', 'Essenziale', 'BASI_ESSENTIAL'],
  ['basi-complete', 'basi', 'Percorso completo', 'BASI_COMPLETE'],
].map(([id, pathway, name, envKey]) => ({
  id,
  pathway,
  name,
  envKey,
  accessType: 'digital_product',
  active: true,
}));

const offerIndex = new Map(offerDefinitions.map((offer) => [offer.id, offer]));

function envValue(env, key) {
  const value = String(env?.[key] || '').trim();
  return value || null;
}

function safeAccessUrl(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/account';
  try {
    const parsed = new URL(value, 'https://sblocco.local');
    if (parsed.origin !== 'https://sblocco.local') return '/account';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/account';
  }
}

export function resolveOffer(offerId, env = process.env) {
  const definition = offerIndex.get(offerId);
  if (!definition) return null;
  const stripePriceId = envValue(env, `STRIPE_PRICE_${definition.envKey}`);
  const accessTarget = envValue(env, `STRIPE_ACCESS_${definition.envKey}`);
  const accessUrl = safeAccessUrl(envValue(env, `STRIPE_ACCESS_URL_${definition.envKey}`));
  const priceLooksValid = Boolean(stripePriceId && /^price_[A-Za-z0-9_]+$/.test(stripePriceId));

  return {
    ...definition,
    stripePriceId,
    accessTarget,
    accessUrl,
    fulfillable: Boolean(definition.active && accessTarget),
    configured: Boolean(definition.active && priceLooksValid && accessTarget),
  };
}

export function listResolvedOffers(env = process.env) {
  return offerDefinitions.map((definition) => resolveOffer(definition.id, env));
}

export function publicOfferState(offer, owned = false) {
  return {
    id: offer.id,
    pathway: offer.pathway,
    name: offer.name,
    configured: offer.configured,
    owned,
    ...(owned ? { accessUrl: offer.accessUrl } : {}),
  };
}

export const knownPathways = new Set(['colloquio', 'lavorare', 'parlare', 'estero', 'basi']);
