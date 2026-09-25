const MIN_CHECK_GAP_MS = 60 * 1000;

function buildVersion() {
  try {
    return typeof __SBLOCCO_BUILD_SHA__ === 'string'
      ? __SBLOCCO_BUILD_SHA__
      : 'local';
  } catch {
    return 'local';
  }
}

export function installAppVersionGuard(onOutdated) {
  if (typeof window === 'undefined') return () => {};

  const currentVersion = buildVersion();
  if (!currentVersion || currentVersion === 'local' || currentVersion === 'unknown') return () => {};

  let checking = false;
  let lastCheckedAt = 0;
  let disposed = false;
  let startupTimer = null;

  async function checkVersion({ force = false } = {}) {
    if (disposed || checking) return;
    const now = Date.now();
    if (!force && now - lastCheckedAt < MIN_CHECK_GAP_MS) return;

    checking = true;
    lastCheckedAt = now;
    try {
      const response = await fetch('/api/version', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;

      const payload = await response.json();
      const serverVersion = String(payload?.version || '').trim();
      if (
        serverVersion
        && serverVersion !== 'unknown'
        && serverVersion !== currentVersion
      ) {
        onOutdated?.();
      }
    } catch {
      // Version checks are advisory and must never affect navigation.
    } finally {
      checking = false;
    }
  }

  function handleVisibility() {
    if (document.visibilityState === 'visible') checkVersion();
  }

  function handleFocus() {
    checkVersion();
  }

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleFocus);
  startupTimer = window.setTimeout(() => checkVersion({ force: true }), 10000);

  return () => {
    disposed = true;
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('focus', handleFocus);
    if (startupTimer) window.clearTimeout(startupTimer);
  };
}

export { buildVersion };
