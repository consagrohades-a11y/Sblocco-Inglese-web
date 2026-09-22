import { supabase } from './supabaseClient.js';

export const SPEAKING_ACTIVITY_COLUMNS = 'id,title,summary,activity_type,levels,goals,tags,duration_minutes,group_size,instructions,prompts,variants,teacher_notes,favorite,status,student_intro,student_steps,useful_language,presenter_style,created_at,updated_at';

export async function loadSpeakingActivities() {
  const { data, error } = await supabase
    .from('admin_speaking_activities')
    .select(SPEAKING_ACTIVITY_COLUMNS)
    .neq('status', 'archived')
    .order('favorite', { ascending: false })
    .order('title', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function loadSpeakingActivity(id) {
  const { data, error } = await supabase
    .from('admin_speaking_activities')
    .select(SPEAKING_ACTIVITY_COLUMNS)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createSpeakingActivity(activity) {
  const { data, error } = await supabase
    .from('admin_speaking_activities')
    .insert(activity)
    .select(SPEAKING_ACTIVITY_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSpeakingActivity(id, patch) {
  const safePatch = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('admin_speaking_activities')
    .update(safePatch)
    .eq('id', id)
    .select(SPEAKING_ACTIVITY_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}


export async function startSpeakingSession({ learnerId, activityId, levels = [] }) {
  const { data, error } = await supabase.rpc('admin_start_speaking_session', {
    p_learner_id: learnerId,
    p_activity_id: activityId,
    p_levels: levels,
  });
  if (error) throw error;
  return data;
}

export async function recordSpeakingItem({ sessionId, itemText, itemIndex = null }) {
  const { data, error } = await supabase.rpc('admin_record_speaking_item', {
    p_session_id: sessionId,
    p_item_text: itemText,
    p_item_index: itemIndex,
  });
  if (error) throw error;
  return data;
}

export async function loadSpeakingItemHistory(learnerId, activityId, recentDays = 60) {
  const { data, error } = await supabase.rpc('admin_get_speaking_item_history', {
    p_learner_id: learnerId,
    p_activity_id: activityId,
    p_recent_days: recentDays,
  });
  if (error) throw error;
  return data || [];
}

export async function loadSpeakingActivityHistory(learnerId) {
  const { data, error } = await supabase.rpc('admin_get_speaking_activity_history', {
    p_learner_id: learnerId,
  });
  if (error) throw error;
  return data || [];
}

export async function finishSpeakingSession(sessionId) {
  if (!sessionId) return;
  const { error } = await supabase.rpc('admin_finish_speaking_session', {
    p_session_id: sessionId,
  });
  if (error) throw error;
}
