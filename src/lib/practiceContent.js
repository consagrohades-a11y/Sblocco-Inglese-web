import { supabase } from './supabaseClient.js';

export const PRACTICE_TRAINERS = {
  word: { id: 'word', label: 'Word Trainer', itemType: 'word', domain: null },
  general: { id: 'general', label: 'General Expressions', itemType: 'expression', domain: 'general' },
  business: { id: 'business', label: 'Business Expressions', itemType: 'expression', domain: 'business' },
  hospitality: { id: 'hospitality', label: 'Hospitality Expressions', itemType: 'expression', domain: 'hospitality' },
};

function compact(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function italianVariants(value) {
  return compact([value, ...String(value || '').split(/[;/|]/)]);
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
    english: card.lemma,
    italian: card.italian_meaning,
    acceptedEnglish: compact([card.lemma, ...(card.accepted_answers || [])]),
    acceptedItalian: italianVariants(card.italian_meaning),
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
    english: card.canonical_text,
    italian: card.italian_meaning,
    acceptedEnglish: compact([card.canonical_text, ...(card.accepted_answers || [])]),
    acceptedItalian: italianVariants(card.italian_meaning),
    examples: compact([card.example_1, card.example_2]),
    explanation: card.english_explanation || card.usage_note || '',
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
