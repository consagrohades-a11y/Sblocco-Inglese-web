const LIVE_SESSION_KEY = '__sblocco_speaking_live_session_v1__';
const PRESENTER_STATE_PREFIX = '__sblocco_speaking_presenter_v1__';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function sessionStorageSafe() {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage || null; } catch { return null; }
}
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function uniqueLevels(value) {
  return Array.isArray(value) ? [...new Set(value.map((item) => text(item)).filter(Boolean))] : [];
}
function fresh(timestamp) {
  const value = Number(timestamp || 0);
  return value > 0 && Date.now() - value <= MAX_AGE_MS;
}

export function speakingLiveSessionDescriptor(session) {
  const activityId = text(session?.activity?.id || session?.activityId);
  const controlId = text(session?.controlId);
  const presenterUrl = text(session?.presenterUrl);
  if (!activityId || !controlId || !presenterUrl) return null;
  return {
    version: 1,
    activityId,
    learnerId: text(session?.learnerId) || null,
    levels: uniqueLevels(session?.levels),
    controlId,
    presenterUrl,
    startedAt: Number(session?.startedAt || Date.now()),
    savedAt: Date.now(),
  };
}
export function saveSpeakingLiveSession(session) {
  const storage = sessionStorageSafe();
  const descriptor = speakingLiveSessionDescriptor(session);
  if (!storage || !descriptor) return descriptor;
  try { storage.setItem(LIVE_SESSION_KEY, JSON.stringify(descriptor)); } catch {}
  return descriptor;
}
export function loadSpeakingLiveSession() {
  const storage = sessionStorageSafe();
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(LIVE_SESSION_KEY) || 'null');
    if (!value || value.version !== 1 || !fresh(value.savedAt)) {
      storage.removeItem(LIVE_SESSION_KEY);
      return null;
    }
    const activityId = text(value.activityId);
    const controlId = text(value.controlId);
    const presenterUrl = text(value.presenterUrl);
    if (!activityId || !controlId || !presenterUrl.startsWith('/admin/present/speaking/')) {
      storage.removeItem(LIVE_SESSION_KEY);
      return null;
    }
    return {
      version: 1,
      activityId,
      learnerId: text(value.learnerId) || null,
      levels: uniqueLevels(value.levels),
      controlId,
      presenterUrl,
      startedAt: Number(value.startedAt || value.savedAt || Date.now()),
      savedAt: Number(value.savedAt),
    };
  } catch {
    try { storage.removeItem(LIVE_SESSION_KEY); } catch {}
    return null;
  }
}
export function clearSpeakingLiveSession() {
  const storage = sessionStorageSafe();
  try { storage?.removeItem(LIVE_SESSION_KEY); } catch {}
}
function presenterKey(controlId, activityId) {
  const control = text(controlId);
  const activity = text(activityId);
  return control && activity ? PRESENTER_STATE_PREFIX + control + '__' + activity : '';
}
export function saveSpeakingPresenterState(controlId, activityId, state) {
  const storage = sessionStorageSafe();
  const key = presenterKey(controlId, activityId);
  if (!storage || !key) return null;
  const value = {
    version: 1,
    sourceIndex: Number.isInteger(state?.sourceIndex) ? state.sourceIndex : null,
    supportVisible: state?.supportVisible === true,
    challengeVisible: state?.challengeVisible === true,
    savedAt: Date.now(),
  };
  try { storage.setItem(key, JSON.stringify(value)); } catch {}
  return value;
}
export function loadSpeakingPresenterState(controlId, activityId) {
  const storage = sessionStorageSafe();
  const key = presenterKey(controlId, activityId);
  if (!storage || !key) return null;
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    if (!value || value.version !== 1 || !fresh(value.savedAt)) {
      storage.removeItem(key);
      return null;
    }
    return {
      sourceIndex: Number.isInteger(value.sourceIndex) ? value.sourceIndex : null,
      supportVisible: value.supportVisible === true,
      challengeVisible: value.challengeVisible === true,
      savedAt: Number(value.savedAt),
    };
  } catch {
    try { storage.removeItem(key); } catch {}
    return null;
  }
}
