export function safeReturnTo(value, fallback = '/account') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  try {
    const parsed = new URL(value, 'https://sblocco.local');
    if (parsed.origin !== 'https://sblocco.local') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function authPath(pathname, returnTo) {
  const destination = safeReturnTo(returnTo, '/account');
  return `${pathname}?returnTo=${encodeURIComponent(destination)}`;
}

