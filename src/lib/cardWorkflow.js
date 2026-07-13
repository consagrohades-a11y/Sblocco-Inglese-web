export const reviewFilterOptions = [
  { value: 'all', label: 'Tutte' },
  { value: 'pending', label: 'Da revisionare' },
  { value: 'approved', label: 'Approvate' },
  { value: 'rejected', label: 'Rifiutate' },
];

export function filterAdminCards(cards, reviewFilter, query, searchFields) {
  const normalized = query.trim().toLowerCase();

  return cards.filter((card) => {
    const matchesReview = reviewFilter === 'all' || card.review_status === reviewFilter;
    const matchesQuery = !normalized || searchFields
      .some((field) => String(card[field] || '').toLowerCase().includes(normalized));

    return matchesReview && matchesQuery;
  });
}

export function isCardPublishable(card, type) {
  if (!card || card.review_status !== 'approved' || card.status === 'published' || card.status === 'archived') return false;

  const answers = Array.isArray(card.accepted_answers) ? card.accepted_answers : [];
  const commonRequirements = answers.length > 0
    && String(card.pronunciation_ipa_us || '').trim()
    && String(card.example_1 || '').trim()
    && String(card.example_2 || '').trim()
    && String(card.usage_note || '').trim();

  if (!commonRequirements) return false;
  if (type === 'word') return Boolean(String(card.lemma || '').trim());
  return Boolean(String(card.canonical_text || '').trim());
}

export function getQueuePosition(cards, selectedId) {
  return cards.findIndex((card) => card.id === selectedId);
}

export function getNextQueueCard(cards, selectedIndex) {
  return selectedIndex >= 0 ? cards[selectedIndex + 1] ?? null : cards[0] ?? null;
}

export function getQueueLabel(cards, selectedIndex) {
  return selectedIndex >= 0
    ? `${selectedIndex + 1} di ${cards.length}`
    : `${cards.length} nella coda`;
}
