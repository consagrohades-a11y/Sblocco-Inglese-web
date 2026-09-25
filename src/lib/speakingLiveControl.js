const STORAGE_PREFIX = '__sblocco_speaking_control__';
export const SPEAKING_STUDENT_WINDOW_NAME = 'sblocco-speaking-student-screen';
export const SPEAKING_STUDENT_WINDOW_FEATURES = 'popup=yes,width=1320,height=860,resizable=yes,scrollbars=yes';

export function openOrReuseSpeakingStudentWindow(presenterUrl, existingWindow = null) {
  if (typeof window === 'undefined' || !presenterUrl) return null;

  if (existingWindow && !existingWindow.closed) {
    try {
      existingWindow.location.replace(presenterUrl);
      return existingWindow;
    } catch {
      // Fall through to the stable named-window lookup.
    }
  }

  return window.open(
    presenterUrl,
    SPEAKING_STUDENT_WINDOW_NAME,
    SPEAKING_STUDENT_WINDOW_FEATURES,
  );
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createSpeakingControlId() {
  return randomId();
}

export function connectSpeakingControl(controlId, onMessage) {
  if (!controlId || typeof window === 'undefined') {
    return { send: () => {}, close: () => {}, supported: false };
  }

  const channelName = `sblocco-speaking-control-${controlId}`;
  const storageKey = `${STORAGE_PREFIX}${controlId}`;
  const seen = new Set();
  let broadcastChannel = null;

  function pruneSeen() {
    if (seen.size <= 200) return;
    const keep = Array.from(seen).slice(-100);
    seen.clear();
    keep.forEach((id) => seen.add(id));
  }

  function deliver(envelope) {
    if (!envelope || envelope.controlId !== controlId || !envelope.id || seen.has(envelope.id)) return;
    seen.add(envelope.id);
    pruneSeen();
    onMessage?.(envelope.payload, envelope);
  }

  if ('BroadcastChannel' in window) {
    try {
      broadcastChannel = new window.BroadcastChannel(channelName);
      broadcastChannel.onmessage = (event) => deliver(event.data);
    } catch {
      broadcastChannel = null;
    }
  }

  function onStorage(event) {
    if (event.key !== storageKey || !event.newValue) return;
    try {
      deliver(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed fallback messages.
    }
  }

  window.addEventListener('storage', onStorage);

  function send(payload) {
    const envelope = {
      id: randomId(),
      controlId,
      sentAt: Date.now(),
      payload,
    };

    seen.add(envelope.id);
    pruneSeen();

    try {
      broadcastChannel?.postMessage(envelope);
    } catch {
      // localStorage remains the fallback.
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(envelope));
      window.localStorage.removeItem(storageKey);
    } catch {
      // BroadcastChannel may still have delivered the message.
    }
  }

  function close() {
    window.removeEventListener('storage', onStorage);
    if (broadcastChannel) {
      broadcastChannel.onmessage = null;
      broadcastChannel.close();
    }
  }

  return {
    send,
    close,
    supported: Boolean(broadcastChannel) || (() => {
      try {
        return Boolean(window.localStorage);
      } catch {
        return false;
      }
    })(),
  };
}
