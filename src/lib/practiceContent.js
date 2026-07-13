import { supabase } from './supabaseClient.js';

export const PRACTICE_TRAINERS = {
  word: { id: 'word', label: 'Word Trainer', itemType: 'word', domain: null },
  mixed: { id: 'mixed', label: 'Deck misti', itemType: 'mixed', domain: null },
  general: { id: 'general', label: 'General Expressions', itemType: 'expression', domain: 'general' },
  business: { id: 'business', label: 'Business Expressions', itemType: 'expression', domain: 'business' },
  hospitality: { id: 'hospitality', label: 'Hospitality Expressions', itemType: 'expression', domain: 'hospitality' },
};

function compact(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

const explanatoryItalianNote = /^(?:(?:intes[oaie]\s+come)|(?:nel\s+senso\s+di)|(?:in\s+questo\s+senso)|(?:riferit[oaie]\s+a)|cioè|ossia|qui\s+come)\b/i;

export function buildItalianAnswerVariants(value, { wordCard = false } = {}) {
  const meaning = String(value || '').trim();
  const alternatives = meaning.split(/[;/|]/);
  const commaParts = wordCard ? meaning.split(',').map((part) => part.trim()).filter(Boolean) : [];
  const lexicalCommaVariants = commaParts.filter((part, index) => index === 0 || !explanatoryItalianNote.test(part));
  const withoutParentheticalNote = meaning.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const explanatoryNote = meaning.match(
    /^(.+?),\s*(?:(?:intes[oaie]\s+come)|(?:nel\s+senso\s+di)|(?:in\s+questo\s+senso)|(?:riferit[oaie]\s+a)|cioè|ossia|qui\s+come)\b/i,
  )?.[1];

  return compact([
    meaning,
    ...alternatives,
    ...lexicalCommaVariants,
    withoutParentheticalNote,
    explanatoryNote,
  ]);
}

function batchFromTags(tags = []) {
  const tag = tags.find((value) => String(value).toLowerCase().startsWith('batch:'));
  return tag ? tag.slice(tag.indexOf(':') + 1).trim() : '';
}

function normaliseWord(card) {
  return {
    id: card.id,
    publicId: card.public_id,
    trainerId: 'word',
    itemType: 'word',
    domain: 'general',
    level: card.level,
    category: card.category || 'Senza categoria',
    batch: batchFromTags(card.tags),
    decks: (card.deck_ids || []).map((id, index) => ({ id, publicId: card.deck_public_ids?.[index] || '', title: card.deck_titles?.[index] || '' })),
    english: card.lemma,
    italian: card.italian_meaning,
    acceptedEnglish: compact([card.lemma, ...(card.accepted_answers || [])]),
    acceptedItalian: buildItalianAnswerVariants(card.italian_meaning, { wordCard: true }),
    examples: compact([card.example_1, card.example_2]),
    explanation: card.english_definition || card.usage_note || '',
    tags: card.tags || [],
  };
}

function normaliseExpression(card, trainerId) {
  return {
    id: card.id,
    publicId: card.public_id,
    trainerId,
    itemType: 'expression',
    domain: card.primary_domain,
    level: card.level,
    category: card.category || 'Senza categoria',
    batch: batchFromTags(card.tags),
    decks: (card.deck_ids || []).map((id, index) => ({ id, publicId: card.deck_public_ids?.[index] || '', title: card.deck_titles?.[index] || '' })),
    english: card.canonical_text,
    italian: card.italian_meaning,
    acceptedEnglish: compact([card.canonical_text, ...(card.accepted_answers || [])]),
    acceptedItalian: buildItalianAnswerVariants(card.italian_meaning),
    examples: compact([card.example_1, card.example_2]),
    explanation: card.english_explanation || card.usage_note || '',
    tags: card.tags || [],
  };
}

function normaliseMixed(card) {
  const isWord = card.item_type === 'word';
  return {
    id: card.id,
    publicId: card.public_id,
    trainerId: 'mixed',
    itemType: card.item_type,
    domain: card.primary_domain,
    level: card.level,
    category: card.category || 'Senza categoria',
    batch: batchFromTags(card.tags),
    decks: (card.deck_ids || []).map((id, index) => ({
      id,
      publicId: card.deck_public_ids?.[index] || '',
      title: card.deck_titles?.[index] || '',
    })),
    english: card.english,
    italian: card.italian,
    acceptedEnglish: compact([card.english, ...(card.accepted_answers || [])]),
    acceptedItalian: buildItalianAnswerVariants(card.italian, { wordCard: isWord }),
    examples: compact([card.example_1, card.example_2]),
    explanation: card.explanation || '',
    tags: card.tags || [],
  };
}

export async function loadPublishedPracticeCards(trainerId) {
  const trainer = PRACTICE_TRAINERS[trainerId];
  if (!trainer) throw new Error('Trainer non riconosciuto.');

  if (trainer.itemType === 'word') {
    const { data, error } = await supabase.rpc('list_published_word_cards');
    if (error) throw error;
    return (data || []).map(normaliseWord);
  }

  if (trainer.itemType === 'mixed') {
    const { data, error } = await supabase.rpc('list_published_mixed_deck_cards', {
      p_domain: null,
    });
    if (error) throw error;
    return (data || []).map(normaliseMixed);
  }

  const { data, error } = await supabase.rpc('list_published_expression_cards', {
    p_domain: trainer.domain,
  });
  if (error) throw error;
  return (data || []).map((card) => normaliseExpression(card, trainerId));
}

export async function recordPracticeAttempt(question, response, evaluation, responseTimeMs) {
  const { data, error } = await supabase.rpc('record_practice_attempt', {
    p_learning_item_id: question.learningItemId,
    p_exercise_type: question.exerciseType,
    p_result: evaluation.result,
    p_score: evaluation.score,
    p_context: JSON.stringify({
      trainer: question.trainerId,
      prompt: question.prompt,
      direction: question.direction,
    }),
    p_submitted_response: response,
    p_response_time_ms: Math.max(0, Math.round(responseTimeMs)),
  });

  if (error) throw error;
  return data;
}
