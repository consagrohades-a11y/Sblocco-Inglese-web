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

export function readCommerceAttribution(search = '') {
  const params = new URLSearchParams(search);
  return ATTRIBUTION_KEYS.reduce((result, key) => {
    const sanitized = sanitizeAttributionValue(params.get(key));
    if (sanitized) result[key] = sanitized;
    return result;
  }, {});
}

export function withCommerceAttribution(path, attribution) {
  const safe = sanitizeCommerceAttribution(attribution);
  if (!Object.keys(safe).length) return path;

  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = withoutHash.indexOf('?');
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const params = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '');
  for (const [key, value] of Object.entries(safe)) params.set(key, value);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
}

export const COMMERCE_ATTRIBUTION_MAX_LENGTH = MAX_VALUE_LENGTH;
