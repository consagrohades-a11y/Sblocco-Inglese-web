const STORAGE_KEY = 'sblocco_learning_progress_v1';
const EMPTY_PROGRESS = { attempts: [] };

let memoryProgress = { ...EMPTY_PROGRESS, attempts: [] };

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function getProgress() {
  const storage = getStorage();
  if (!storage) return memoryProgress;

  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.attempts) ? saved : { ...EMPTY_PROGRESS, attempts: [] };
  } catch {
    return { ...EMPTY_PROGRESS, attempts: [] };
  }
}

export function saveExerciseAttempt(attempt) {
  const progress = getProgress();
  const nextAttempt = { ...attempt, savedAt: new Date().toISOString() };
  const nextProgress = { ...progress, attempts: [...progress.attempts, nextAttempt] };
  const storage = getStorage();

  memoryProgress = nextProgress;
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
    } catch {
      // Keep the in-memory fallback when storage is unavailable or full.
    }
  }

  return nextAttempt;
}

export function clearProgress() {
  memoryProgress = { ...EMPTY_PROGRESS, attempts: [] };
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Clearing progress remains safe in restricted browser environments.
    }
  }
  return memoryProgress;
}

export function getAttempts() {
  return getProgress().attempts;
}

export { STORAGE_KEY };
