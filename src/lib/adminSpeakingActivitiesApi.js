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

export async function loadSpeakingPresenterActivity(id) {
  const { data, error } = await supabase.rpc('admin_get_speaking_presenter_activity', {
    p_activity_id: id,
  });
  if (error) throw error;
  return data || null;
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


export async function startSpeakingSession({ learnerId, activityId, levels = [], controlId = null }) {
  const { data, error } = await supabase.rpc('admin_start_or_resume_speaking_session', {
    p_learner_id: learnerId,
    p_activity_id: activityId,
    p_levels: levels,
    p_control_id: controlId,
  });
  if (error) throw error;
  return data;
}

export async function finishSpeakingControl(controlId) {
  if (!controlId) return 0;
  const { data, error } = await supabase.rpc('admin_finish_speaking_control', {
    p_control_id: controlId,
  });
  if (error) throw error;
  return Number(data || 0);
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
  const { data, error } = await supabase.rpc('admin_get_speaking_item_history_v2', {
    p_learner_id: learnerId,
    p_activity_id: activityId,
    p_recent_days: recentDays,
  });
  if (error) throw error;
  return data || [];
}

export async function loadSpeakingActivityHistory(learnerId) {
  const { data, error } = await supabase.rpc('admin_get_speaking_activity_history_v2', {
    p_learner_id: learnerId,
  });
  if (error) throw error;
  return data || [];
}

export async function loadSpeakingPracticeCatalog(learnerId) {
  const { data, error } = await supabase.rpc('admin_get_speaking_practice_catalog', {
    p_learner_id: learnerId,
  });
  if (error) throw error;
  return data || [];
}

export async function confirmSpeakingPractice({ sessionId, itemText, itemIndex = null }) {
  const { data, error } = await supabase.rpc('admin_confirm_speaking_practice', {
    p_session_id: sessionId,
    p_item_text: itemText,
    p_item_index: itemIndex,
  });
  if (error) throw error;
  return data || null;
}

export async function undoLatestSpeakingPractice(sessionId) {
  const { data, error } = await supabase.rpc('admin_undo_latest_speaking_practice', {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data || null;
}

function isAuthFailure(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return status === 401
    || code === 'PGRST301'
    || /jwt|unauthori[sz]ed|not authenticated|auth session/i.test(message);
}

export async function finishSpeakingSession(sessionId) {
  if (!sessionId) return;

  async function finish() {
    return supabase.rpc('admin_finish_speaking_session', {
      p_session_id: sessionId,
    });
  }

  let result = await finish();

  if (result.error && isAuthFailure(result.error)) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed?.session?.access_token) {
      result = await finish();
    }
  }

  if (result.error) throw result.error;
}
