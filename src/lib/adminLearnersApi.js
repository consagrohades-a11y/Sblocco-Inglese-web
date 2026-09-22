import { supabase } from './supabaseClient.js';

export async function loadAdminLearners() {
  const { data, error } = await supabase.rpc('admin_list_learners');
  if (error) throw error;
  return data || [];
}

export async function loadAdminLearnerDetail(learnerId) {
  if (!learnerId) return null;

  const { data, error } = await supabase.rpc('admin_get_learner_detail', {
    target_learner_id: learnerId,
  });

  if (error) throw error;
  return data?.[0] || null;
}
