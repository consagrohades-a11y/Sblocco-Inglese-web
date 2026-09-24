import { supabase } from './supabaseClient.js';

function normalizeBankText(value) {
  return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export async function loadLearnerVocabularyBank(learnerId = null) {
  let query = supabase
    .from('learner_vocab_bank_items')
    .select('id, learner_id, bank_kind, display_text, english_meaning, italian_support, example, examples, level, topic, source_activity_title, encounter_count, practice_count, last_practiced_at, last_practice_sentence, self_added, activity_added, self_added_at, first_seen_at, last_seen_at, recall_strength, recall_count, forgotten_count, last_recall_rating, last_recalled_at, next_review_at')
    .order('last_seen_at', { ascending: false });

  if (learnerId) query = query.eq('learner_id', learnerId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addSelfVocabularyBankItem({
  bankKind,
  displayText,
  englishMeaning = '',
  italianSupport = '',
  example = '',
  topic = '',
}) {
  const normalizedText = normalizeBankText(displayText);
  if (!normalizedText) throw new Error('Add a word or chunk first.');
  if (!['word', 'chunk'].includes(bankKind)) throw new Error('Choose Word or Chunk.');

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const learnerId = authData?.user?.id;
  if (!learnerId) throw new Error('You need to be signed in.');

  const { data: existing, error: existingError } = await supabase
    .from('learner_vocab_bank_items')
    .select('id, self_added, activity_added')
    .eq('learner_id', learnerId)
    .eq('bank_kind', bankKind)
    .eq('normalized_text', normalizedText)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    if (existing.self_added) return { status: 'exists', id: existing.id };

    const { data, error } = await supabase
      .from('learner_vocab_bank_items')
      .update({
        self_added: true,
        self_added_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id, learner_id, bank_kind, display_text, english_meaning, italian_support, example, examples, level, topic, source_activity_title, encounter_count, practice_count, last_practiced_at, last_practice_sentence, self_added, activity_added, self_added_at, first_seen_at, last_seen_at, recall_strength, recall_count, forgotten_count, last_recall_rating, last_recalled_at, next_review_at')
      .single();

    if (error) throw error;
    return { status: 'marked_self_added', item: data };
  }

  const { data, error } = await supabase
    .from('learner_vocab_bank_items')
    .insert({
      learner_id: learnerId,
      bank_kind: bankKind,
      display_text: String(displayText || '').trim(),
      english_meaning: String(englishMeaning || '').trim() || null,
      italian_support: String(italianSupport || '').trim() || null,
      example: String(example || '').trim() || null,
      examples: String(example || '').trim() ? [String(example).trim()] : [],
      topic: String(topic || '').trim() || null,
      self_added: true,
      activity_added: false,
    })
    .select('id, learner_id, bank_kind, display_text, english_meaning, italian_support, example, examples, level, topic, source_activity_title, encounter_count, practice_count, last_practiced_at, last_practice_sentence, self_added, activity_added, self_added_at, first_seen_at, last_seen_at, recall_strength, recall_count, forgotten_count, last_recall_rating, last_recalled_at, next_review_at')
    .single();

  if (error) throw error;
  return { status: 'created', item: data };
}

export async function removeLearnerVocabularyBankItem(id) {
  const { error } = await supabase
    .from('learner_vocab_bank_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}


export async function rateLearnerVocabularyRecall(itemId, rating) {
  const { data, error } = await supabase.rpc('learner_rate_vocab_recall', {
    p_item_id: itemId,
    p_rating: rating,
  });
  if (error) throw error;
  return data || null;
}
