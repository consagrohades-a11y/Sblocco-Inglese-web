import { supabase } from './supabaseClient.js';

export async function loadLearnerLearningSignals(learnerId, days = 90) {
  const { data, error } = await supabase.rpc('admin_get_learner_learning_signals', {
    p_learner_id: learnerId,
    p_days: days,
  });
  if (error) throw error;
  return data || {
    period_days: days,
    evidence: { scored_questions: 0, attempt_count: 0, topic_skill_pairs: 0 },
    signals: [],
  };
}
