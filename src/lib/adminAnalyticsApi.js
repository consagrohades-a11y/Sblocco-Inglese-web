import { supabase } from "./supabaseClient.js";

export async function loadAdminLearningAnalytics(days = 30) {
  const { data, error } = await supabase.rpc("admin_get_learning_analytics", {
    p_days: days,
  });
  if (error) throw error;
  return (
    data || {
      overview: {},
      daily_activity: [],
      learners: [],
      difficult_cards: [],
      exercises: [],
      diagnostics: [],
    }
  );
}

export async function loadAdminLearnerAnalytics(learnerId, days = 30) {
  const { data, error } = await supabase.rpc("admin_get_learner_analytics", {
    p_learner_id: learnerId,
    p_days: days,
  });
  if (error) throw error;
  return data;
}
