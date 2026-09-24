import { supabase } from './supabaseClient.js';

export async function loadLearnerLearningPulse() {
  const { data, error } = await supabase.rpc('learner_get_learning_pulse');
  if (error) throw error;
  return data || { memory: { due_count: 0, total_count: 0 }, latest_attempt: null };
}
