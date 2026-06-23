export const SRS_STORAGE_KEY = 'sblocco-inglese:srs-progress:v1';

export const reviewRatings = [
  {
    value: 'again',
    label: 'Again',
    helper: 'fra poco',
  },
  {
    value: 'hard',
    label: 'Hard',
    helper: 'domani',
  },
  {
    value: 'good',
    label: 'Good',
    helper: 'più avanti',
  },
  {
    value: 'easy',
    label: 'Easy',
    helper: 'molto più avanti',
  },
];

const tenMinutes = 10 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

function addDays(date, days) {
  return new Date(date.getTime() + days * dayMs);
}

function clampEase(ease) {
  return Math.min(3, Math.max(1.3, ease));
}

function getTime(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.getTime() : 0;
}

function cleanCardProgress(entry) {
  if (!entry || typeof entry !== 'object') return null;

  return {
    cardId: entry.cardId,
    status: entry.status || 'learning',
    repetitions: Number.isFinite(entry.repetitions) ? entry.repetitions : 0,
    intervalDays: Number.isFinite(entry.intervalDays) ? entry.intervalDays : 0,
    ease: clampEase(Number.isFinite(entry.ease) ? entry.ease : 2.3),
    dueAt: entry.dueAt || new Date(0).toISOString(),
    lastReviewedAt: entry.lastReviewedAt || null,
    lastRating: entry.lastRating || null,
  };
}

export function cleanProgress(progress, cards) {
  const validIds = new Set(cards.map((card) => card.id));

  return Object.fromEntries(
    Object.entries(progress || {})
      .filter(([cardId]) => validIds.has(cardId))
      .map(([cardId, entry]) => [cardId, cleanCardProgress({ ...entry, cardId })])
      .filter(([, entry]) => entry),
  );
}

export function getCardState(progress, cardId) {
  return cleanCardProgress(progress?.[cardId]);
}

export function isCardDue(progressEntry, now = new Date()) {
  if (!progressEntry) return false;
  return getTime(progressEntry.dueAt) <= now.getTime();
}

export function getReviewQueue(cards, progress, options = {}) {
  const {
    category = 'all',
    level = 'all',
    now = new Date(),
  } = options;

  const filteredCards = cards.filter((card) => {
    const categoryMatches = category === 'all' || card.category === category;
    const levelMatches = level === 'all' || card.level === level;
    return categoryMatches && levelMatches;
  });

  const dueCards = [];
  const newCards = [];

  filteredCards.forEach((card) => {
    const state = getCardState(progress, card.id);

    if (!state) {
      newCards.push(card);
      return;
    }

    if (isCardDue(state, now)) {
      dueCards.push(card);
    }
  });

  dueCards.sort((a, b) => getTime(progress[a.id]?.dueAt) - getTime(progress[b.id]?.dueAt));

  return [...dueCards, ...newCards];
}

export function getNextDueCard(cards, progress, options = {}) {
  const { category = 'all', level = 'all', now = new Date() } = options;

  return cards
    .filter((card) => category === 'all' || card.category === category)
    .filter((card) => level === 'all' || card.level === level)
    .map((card) => ({ card, state: getCardState(progress, card.id) }))
    .filter(({ state }) => state && !isCardDue(state, now))
    .sort((a, b) => getTime(a.state.dueAt) - getTime(b.state.dueAt))[0] || null;
}

export function getDeckStats(cards, progress, now = new Date()) {
  const emptyCategoryStats = {};

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
        summary.reviewed += 1;
        categoryStats.reviewed += 1;

        if (isCardDue(state, now)) {
          summary.due += 1;
          categoryStats.due += 1;
        }

        if (state.repetitions >= 2) {
          summary.learning += 1;
        }

        if (state.lastReviewedAt && new Date(state.lastReviewedAt).toDateString() === now.toDateString()) {
          summary.reviewedToday += 1;
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
      reviewedToday: 0,
      byCategory: emptyCategoryStats,
    },
  );

  totals.progressPercent = totals.total > 0 ? Math.round((totals.reviewed / totals.total) * 100) : 0;
  return totals;
}

export function rateCard(progress, cardId, rating, now = new Date()) {
  const previous = getCardState(progress, cardId) || {
    cardId,
    status: 'new',
    repetitions: 0,
    intervalDays: 0,
    ease: 2.3,
    dueAt: now.toISOString(),
    lastReviewedAt: null,
    lastRating: null,
  };

  const previousInterval = Math.max(previous.intervalDays || 0, 1);
  let repetitions = previous.repetitions;
  let intervalDays = previous.intervalDays;
  let ease = previous.ease;
  let dueAt = now;
  let status = 'review';

  if (rating === 'again') {
    repetitions = 0;
    intervalDays = 0;
    ease = clampEase(ease - 0.2);
    dueAt = new Date(now.getTime() + tenMinutes);
    status = 'learning';
  }

  if (rating === 'hard') {
    repetitions += 1;
    intervalDays = previous.repetitions === 0 ? 1 : Math.max(1, Math.ceil(previousInterval * 1.2));
    ease = clampEase(ease - 0.1);
    dueAt = addDays(now, intervalDays);
  }

  if (rating === 'good') {
    repetitions += 1;
    intervalDays = previous.repetitions === 0 ? 3 : Math.max(2, Math.ceil(previousInterval * ease));
    dueAt = addDays(now, intervalDays);
  }

  if (rating === 'easy') {
    repetitions += 1;
    intervalDays = previous.repetitions === 0 ? 7 : Math.max(4, Math.ceil(previousInterval * (ease + 0.7)));
    ease = clampEase(ease + 0.15);
    dueAt = addDays(now, intervalDays);
  }

  return {
    ...(progress || {}),
    [cardId]: {
      cardId,
      status,
      repetitions,
      intervalDays,
      ease,
      dueAt: dueAt.toISOString(),
      lastReviewedAt: now.toISOString(),
      lastRating: rating,
    },
  };
}

export function formatDueLabel(dueAt, now = new Date()) {
  const dueTime = getTime(dueAt);
  if (!dueTime) return 'non programmata';

  const diff = dueTime - now.getTime();

  if (diff <= 0) return 'adesso';
  if (diff < 60 * 60 * 1000) return `tra ${Math.ceil(diff / (60 * 1000))} min`;
  if (diff < dayMs) return `tra ${Math.ceil(diff / (60 * 60 * 1000))} ore`;
  if (diff < dayMs * 2) return 'domani';

  return `tra ${Math.ceil(diff / dayMs)} giorni`;
}
