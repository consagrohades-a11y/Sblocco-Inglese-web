import { supabase } from './supabaseClient.js';

const COLUMNS = 'id,title,summary,activity_type,levels,goals,tags,duration_minutes,group_size,instructions,prompts,variants,teacher_notes,favorite,status,created_at,updated_at';

export async function loadSpeakingActivities() {
  const { data, error } = await supabase
    .from('admin_speaking_activities')
    .select(COLUMNS)
    .neq('status', 'archived')
    .order('favorite', { ascending: false })
    .order('title', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateSpeakingActivity(id, patch) {
  const safePatch = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('admin_speaking_activities')
    .update(safePatch)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data;
}
