import { supabase } from './supabaseClient.js';

export async function loadLearnerVocabularyBank() {
  const { data, error } = await supabase
    .from('learner_vocab_bank_items')
    .select('id, bank_kind, display_text, english_meaning, italian_support, example, level, topic, source_activity_title, encounter_count, first_seen_at, last_seen_at')
    .order('last_seen_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function removeLearnerVocabularyBankItem(id) {
  const { error } = await supabase
    .from('learner_vocab_bank_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
