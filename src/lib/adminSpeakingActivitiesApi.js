import { supabase } from './supabaseClient.js';

const COLUMNS = 'id,title,summary,activity_type,levels,goals,tags,duration_minutes,group_size,instructions,prompts,variants,teacher_notes,favorite,status,created_at,updated_at';

function normalizeList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

export async function loadSpeakingActivities() {
  const { data, error } = await supabase
    .from('admin_speaking_activities')
    .select(COLUMNS)
    .eq('status', 'active')
    .order('favorite', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveSpeakingActivity(activity) {
  const payload = {
    title: String(activity.title || '').trim(),
    summary: String(activity.summary || '').trim() || null,
    activity_type: activity.activity_type || 'speaking_game',
    levels: normalizeList(activity.levels),
    goals: normalizeList(activity.goals),
    tags: normalizeList(activity.tags),
    duration_minutes: activity.duration_minutes ? Number(activity.duration_minutes) : null,
    group_size: String(activity.group_size || '').trim() || null,
    instructions: String(activity.instructions || '').trim(),
    prompts: normalizeList(activity.prompts),
    variants: normalizeList(activity.variants),
    teacher_notes: String(activity.teacher_notes || '').trim() || null,
    favorite: Boolean(activity.favorite),
    updated_at: new Date().toISOString(),
  };

  if (!payload.title) throw new Error('Inserisci un titolo.');

  const query = activity.id
    ? supabase.from('admin_speaking_activities').update(payload).eq('id', activity.id)
    : supabase.from('admin_speaking_activities').insert(payload);

  const { data, error } = await query.select(COLUMNS).single();
  if (error) throw error;
  return data;
}

export async function archiveSpeakingActivity(id) {
  const { error } = await supabase
    .from('admin_speaking_activities')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function setSpeakingActivityFavorite(id, favorite) {
  const { data, error } = await supabase
    .from('admin_speaking_activities')
    .update({ favorite, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
