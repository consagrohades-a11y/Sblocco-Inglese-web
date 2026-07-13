import { loadPublishedPracticeCards, PRACTICE_TRAINERS } from './practiceContent.js';
import { supabase } from './supabaseClient.js';

export const SRS_TRAINER_SOURCES = {
  'word-trainer': 'word',
  'general-expression': 'general',
  'business-expression': 'business',
  'hospitality-expression': 'hospitality',
};

function mapState(state, publicId) {
  const statusMap = {
    new: 'new', introduced: 'learning', learning: 'learning', reviewing: 'review',
    due: 'review', strong: 'review', mastered: 'mastered', lapsed: 'learning', suspended: 'learning',
  };
  return {
    cardId: publicId,
    status: statusMap[state.state] || 'learning',
    easeFactor: Number(state.ease_factor || 2.5),
    intervalDays: Number(state.interval_days || 0),
    repetitions: Number(state.repetitions || 0),
    lapses: Number(state.lapses || 0),
    dueDate: state.due_at || new Date().toISOString(),
    lastReviewed: state.last_reviewed_at || null,
  };
}

function toSrsCard(card) {
  const isWord = card.itemType === 'word';
  return {
    id: card.publicId,
    databaseId: card.id,
    type: isWord ? 'Word' : 'Expression',
    level: card.level,
    category: card.category,
    ...(isWord ? { word: card.english } : { expression: card.english }),
    partOfSpeech: card.partOfSpeech || '',
    pronunciation: card.pronunciation || 'Pronuncia non disponibile',
    italian: card.italian,
    collocations: (card.collocations || []).join(' · '),
    example1: card.examples?.[0] || 'Example missing.',
    example2: card.examples?.[1] || 'Example missing.',
    note: card.explanation || 'Nota non disponibile.',
  };
}

export async function loadGuidedSrsTrainer(trainerConfigId) {
  const sourceId = SRS_TRAINER_SOURCES[trainerConfigId];
  const source = PRACTICE_TRAINERS[sourceId];
  if (!source) throw new Error('Trainer non riconosciuto.');

  const cards = await loadPublishedPracticeCards(sourceId);
  const { data: authData } = await supabase.auth.getSession();
  const session = authData?.session;
  let scope = { guided: false, item_ids: [], states: [] };

  if (session) {
    const { data, error } = await supabase.rpc('get_learner_srs_scope', {
      p_item_type: source.itemType,
      p_domain: source.domain,
    });
    if (error) throw error;
    scope = data || scope;
  }

  const allowedIds = new Set(scope.item_ids || []);
  const visibleCards = scope.guided ? cards.filter((card) => allowedIds.has(card.id)) : cards;
  const publicIdByDatabaseId = new Map(visibleCards.map((card) => [card.id, card.publicId]));
  const initialProgress = Object.fromEntries((scope.states || [])
    .filter((state) => publicIdByDatabaseId.has(state.learning_item_id))
    .map((state) => {
      const publicId = publicIdByDatabaseId.get(state.learning_item_id);
      return [publicId, mapState(state, publicId)];
    }));

  return {
    cards: visibleCards.map(toSrsCard),
    guided: Boolean(scope.guided),
    initialProgress,
  };
}

export async function recordGuidedSrsReview(card, rating) {
  if (!card?.databaseId) return null;
  const { data: authData } = await supabase.auth.getSession();
  if (!authData?.session) return null;
  const { data, error } = await supabase.rpc('record_learner_srs_review', {
    p_learning_item_id: card.databaseId,
    p_rating: rating,
  });
  if (error) throw error;
  return data;
}
