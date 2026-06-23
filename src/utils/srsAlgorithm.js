export const SRS_STORAGE_KEY = 'sblocco_srs_progress_v1';
export const LEGACY_SRS_STORAGE_KEY = 'sblocco-inglese:srs-progress:v1';

export const reviewRatings = [
  {
    value: 'again',
    label: 'Again',
    helper: 'forgot',
  },
  {
    value: 'hard',
    label: 'Hard',
    helper: 'difficult',
  },
  {
    value: 'good',
    label: 'Good',
    helper: 'remembered',
  },
  {
    value: 'easy',
    label: 'Easy',
    helper: 'automatic',
  },
];

const validRatings = new Set(reviewRatings.map((rating) => rating.value));
const validStatuses = new Set(['new', 'learning', 'review', 'mastered']);
const dayMs = 24 * 60 * 60 * 1000;

function warn(message) {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message);
  }
}

function clampEaseFactor(easeFactor) {
  return Math.max(1.3, Number.isFinite(easeFactor) ? easeFactor : 2.5);
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseISODate(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return getTodayISO(parsed);
}

function dateFromISO(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDaysISO(isoDate, days) {
  const date = dateFromISO(isoDate);
  date.setDate(date.getDate() + days);
  return getTodayISO(date);
}

function daysBetween(startISO, endISO) {
  return Math.round((dateFromISO(endISO).getTime() - dateFromISO(startISO).getTime()) / dayMs);
}

function matchesSelection(value, selection) {
  if (Array.isArray(selection)) {
    return selection.length === 0 || selection.includes('all') || selection.includes(value);
  }

  return !selection || selection === 'all' || selection === value;
}

function filterCards(cards, selectedCategory = 'all', level = 'all') {
  return cards.filter((card) => {
    const categoryMatches = matchesSelection(card.category, selectedCategory);
    const levelMatches = matchesSelection(card.level, level);
    return categoryMatches && levelMatches;
  });
}

export function getCategoryCardCounts(cards = []) {
  return cards.reduce((counts, card) => {
    if (!card?.category) return counts;
    return {
      ...counts,
      [card.category]: (counts[card.category] || 0) + 1,
    };
  }, {});
}

function countNewCardsReviewedToday(progress, today) {
  return Object.values(progress || {}).filter((entry) => entry?.firstReviewed === today).length;
}

function normalizeCardProgress(entry, cardId, today = getTodayISO()) {
  if (!entry || typeof entry !== 'object') return null;

  const dueDate = parseISODate(entry.dueDate || entry.dueAt) || today;
  const lastReviewed = parseISODate(entry.lastReviewed || entry.lastReviewedAt);
  const firstReviewed = parseISODate(entry.firstReviewed);
  const status = validStatuses.has(entry.status) ? entry.status : 'learning';

  return {
    cardId,
    status,
    easeFactor: clampEaseFactor(toNumber(entry.easeFactor ?? entry.ease, 2.5)),
    intervalDays: Math.max(0, Math.round(toNumber(entry.intervalDays, 0))),
    repetitions: Math.max(0, Math.round(toNumber(entry.repetitions, 0))),
    lapses: Math.max(0, Math.round(toNumber(entry.lapses, 0))),
    dueDate,
    lastReviewed,
    ...(firstReviewed ? { firstReviewed } : {}),
  };
}

export function getTodayISO(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

export function initializeCardProgress(cardId, today = getTodayISO()) {
  return {
    cardId,
    status: 'new',
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueDate: today,
    lastReviewed: null,
  };
}

export function cleanProgress(progress, cards = [], today = getTodayISO()) {
  if (!progress || typeof progress !== 'object') return {};

  const validIds = cards.length > 0 ? new Set(cards.map((card) => card.id)) : null;

  return Object.fromEntries(
    Object.entries(progress)
      .filter(([cardId]) => !validIds || validIds.has(cardId))
      .map(([cardId, entry]) => [cardId, normalizeCardProgress({ ...entry, cardId }, cardId, today)])
      .filter(([, entry]) => entry),
  );
}

export function loadProgress(cards = [], storageKey = SRS_STORAGE_KEY) {
  if (typeof window === 'undefined' || !window.localStorage) return {};

  try {
    const stored = window.localStorage.getItem(storageKey);
    const legacyStored =
      storageKey === SRS_STORAGE_KEY && !stored ? window.localStorage.getItem(LEGACY_SRS_STORAGE_KEY) : null;
    const raw = stored || legacyStored;
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    const cleaned = cleanProgress(parsed, cards);

    if (storageKey === SRS_STORAGE_KEY && !stored && legacyStored) {
      saveProgress(cleaned, storageKey);
    }

    return cleaned;
  } catch {
    warn('SRS progress in localStorage is corrupted. Starting with empty progress for this session.');
    return {};
  }
}

export function saveProgress(progress, storageKey = SRS_STORAGE_KEY) {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress || {}));
    return true;
  } catch {
    warn('SRS progress could not be saved to localStorage.');
    return false;
  }
}

export function getCardState(progress, cardId) {
  return normalizeCardProgress(progress?.[cardId], cardId);
}

export function isCardDue(progressEntry, today = getTodayISO()) {
  if (!progressEntry) return false;
  return progressEntry.dueDate <= today;
}

export function getDueCards(cards, progress, selectedCategory = 'all', options = {}) {
  const { today = getTodayISO(), level = options.levels || 'all' } = options;

  return filterCards(cards, selectedCategory, level)
    .filter((card) => isCardDue(getCardState(progress, card.id), today))
    .sort((a, b) => {
      const aDate = getCardState(progress, a.id)?.dueDate || today;
      const bDate = getCardState(progress, b.id)?.dueDate || today;
      return aDate.localeCompare(bDate);
    });
}

export function getNewCards(cards, progress, selectedCategory = 'all', options = {}) {
  const {
    today = getTodayISO(),
    level = options.levels || 'all',
    newLimit = 10,
  } = options;
  const reviewedToday = countNewCardsReviewedToday(progress, today);
  const remainingNewCards = Math.max(0, newLimit - reviewedToday);

  return filterCards(cards, selectedCategory, level)
    .filter((card) => !getCardState(progress, card.id))
    .slice(0, remainingNewCards);
}

export function buildReviewQueue(cards, progress, selectedCategory = 'all', options = {}) {
  const {
    today = getTodayISO(),
    level = options.levels || 'all',
    totalLimit = 30,
    newLimit = 10,
  } = options;
  const remainingTotal = Math.max(0, totalLimit);

  if (remainingTotal === 0) return [];

  const dueCards = getDueCards(cards, progress, selectedCategory, { today, level }).slice(0, remainingTotal);
  const remainingSlots = Math.max(0, remainingTotal - dueCards.length);
  const newCards = getNewCards(cards, progress, selectedCategory, {
    today,
    level,
    newLimit,
  }).slice(0, remainingSlots);

  return [...dueCards, ...newCards].slice(0, remainingTotal);
}

export function getNextDueCard(cards, progress, options = {}) {
  const {
    category = 'all',
    level = options.levels || 'all',
    today = getTodayISO(),
  } = options;

  return filterCards(cards, category, level)
    .map((card) => ({ card, state: getCardState(progress, card.id) }))
    .filter(({ state }) => state && !isCardDue(state, today))
    .sort((a, b) => a.state.dueDate.localeCompare(b.state.dueDate))[0] || null;
}

export function getDeckStats(cards, progress, now = new Date()) {
  const today = typeof now === 'string' ? now : getTodayISO(now);

  const totals = cards.reduce(
    (summary, card) => {
      const state = getCardState(progress, card.id);
      const categoryStats = summary.byCategory[card.category] || {
        total: 0,
        due: 0,
        new: 0,
        reviewed: 0,
      };

      categoryStats.total += 1;
      summary.total += 1;

      if (!state) {
        summary.new += 1;
        categoryStats.new += 1;
      } else {
        summary.reviewed += state.lastReviewed ? 1 : 0;
        categoryStats.reviewed += state.lastReviewed ? 1 : 0;

        if (isCardDue(state, today)) {
          summary.due += 1;
          categoryStats.due += 1;
        }

        if (state.status === 'learning') {
          summary.learning += 1;
        }

        if (state.status === 'mastered') {
          summary.mastered += 1;
        }

        if (state.lastReviewed === today) {
          summary.reviewedToday += 1;
        }

        if (state.firstReviewed === today) {
          summary.newReviewedToday += 1;
        }
      }

      summary.byCategory[card.category] = categoryStats;
      return summary;
    },
    {
      total: 0,
      due: 0,
      new: 0,
      reviewed: 0,
      learning: 0,
      mastered: 0,
      reviewedToday: 0,
      newReviewedToday: 0,
      byCategory: {},
    },
  );

  totals.progressPercent = totals.total > 0 ? Math.round((totals.reviewed / totals.total) * 100) : 0;
  totals.newAvailableToday = Math.max(0, 10 - totals.newReviewedToday);
  return totals;
}

export function reviewCard(cardId, rating, progress, today = getTodayISO()) {
  if (!validRatings.has(rating)) {
    warn(`Unknown SRS rating: ${rating}`);
    return progress || {};
  }

  const currentProgress = progress || {};
  const previous = getCardState(currentProgress, cardId) || initializeCardProgress(cardId, today);
  const previousRepetitions = previous.repetitions;
  let status = 'review';
  let repetitions = previous.repetitions;
  let intervalDays = previous.intervalDays;
  let easeFactor = previous.easeFactor;
  let lapses = previous.lapses;

  if (rating === 'again') {
    status = 'learning';
    lapses += 1;
    repetitions = 0;
    intervalDays = 0;
    easeFactor = clampEaseFactor(easeFactor - 0.2);
  }

  if (rating === 'hard') {
    repetitions += 1;
    intervalDays = intervalDays === 0 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
    easeFactor = clampEaseFactor(easeFactor - 0.15);
  }

  if (rating === 'good') {
    repetitions += 1;
    if (previousRepetitions === 0) {
      intervalDays = 1;
    } else if (previousRepetitions === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    }
  }

  if (rating === 'easy') {
    repetitions += 1;
    easeFactor = clampEaseFactor(easeFactor + 0.15);
    intervalDays = previousRepetitions === 0 ? 4 : Math.max(1, Math.round(intervalDays * easeFactor * 1.3));
  }

  if (repetitions >= 6 && intervalDays >= 30) {
    status = 'mastered';
  }

  return {
    ...currentProgress,
    [cardId]: {
      cardId,
      status,
      easeFactor,
      intervalDays,
      repetitions,
      lapses,
      dueDate: rating === 'again' ? today : addDaysISO(today, intervalDays),
      lastReviewed: today,
      firstReviewed: previous.firstReviewed || today,
    },
  };
}

export function reinsertCardAfterDelay(remainingQueue, cardId, delay = 3) {
  const queue = Array.isArray(remainingQueue) ? remainingQueue : [];

  if (queue.length === 0) return [cardId];

  const insertAt = Math.min(Math.max(1, delay), queue.length);
  return [
    ...queue.slice(0, insertAt),
    cardId,
    ...queue.slice(insertAt),
  ];
}

export function formatDueLabel(dueDate, now = new Date()) {
  const today = typeof now === 'string' ? now : getTodayISO(now);
  const normalizedDueDate = parseISODate(dueDate);
  if (!normalizedDueDate) return 'non programmata';

  const diffDays = daysBetween(today, normalizedDueDate);

  if (diffDays <= 0) return 'oggi';
  if (diffDays === 1) return 'domani';

  return `tra ${diffDays} giorni`;
}

export function getReviewQueue(cards, progress, options = {}) {
  return buildReviewQueue(cards, progress, options.category || 'all', options);
}

export function rateCard(progress, cardId, rating, now = new Date()) {
  return reviewCard(cardId, rating, progress, getTodayISO(now));
}
