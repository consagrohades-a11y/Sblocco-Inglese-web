async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'Non è stato possibile completare la richiesta.');
    error.code = payload.code || 'request_failed';
    error.status = response.status;
    throw error;
  }
  return payload;
}

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function loadPathwayOffers({ pathway, accessToken, signal } = {}) {
  const response = await fetch(`/api/stripe/offers?pathway=${encodeURIComponent(pathway || '')}`, {
    headers: authHeaders(accessToken),
    signal,
  });
  return readJson(response);
}

export async function createCheckout({ offerId, accessToken }) {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken),
    },
    body: JSON.stringify({ offerId }),
  });
  return readJson(response);
}

export async function loadCheckoutStatus({ sessionId, accessToken, signal }) {
  const response = await fetch(`/api/stripe/status?session_id=${encodeURIComponent(sessionId || '')}`, {
    headers: authHeaders(accessToken),
    signal,
  });
  return readJson(response);
}

