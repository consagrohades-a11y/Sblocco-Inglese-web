const STORAGE_KEY = 'sblocco_commerce_attribution_v1';
const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
const MAX_VALUE_LENGTH = 100;

export function sanitizeAttributionValue(value) {
  if (typeof value !== 'string') return null;
  const sanitized = value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, MAX_VALUE_LENGTH);
  return sanitized || null;
}

export function sanitizeCommerceAttribution(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return ATTRIBUTION_KEYS.reduce((result, key) => {
    const sanitized = sanitizeAttributionValue(value[key]);
    if (sanitized) result[key] = sanitized;
    return result;
  }, {});
}

export function readCommerceAttribution() {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? sanitizeCommerceAttribution(JSON.parse(stored)) : {};
  } catch {
    return {};
  }
}

export function captureCommerceAttribution(search = '') {
  if (typeof window === 'undefined') return {};
  const current = readCommerceAttribution();
  const params = new URLSearchParams(search || window.location.search);
  const next = { ...current };

  for (const key of ATTRIBUTION_KEYS) {
    if (!params.has(key)) continue;
    const sanitized = sanitizeAttributionValue(params.get(key));
    if (sanitized) next[key] = sanitized;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Attribution is optional and must never interrupt the buyer journey.
  }
  return next;
}

export const COMMERCE_ATTRIBUTION_MAX_LENGTH = MAX_VALUE_LENGTH;
