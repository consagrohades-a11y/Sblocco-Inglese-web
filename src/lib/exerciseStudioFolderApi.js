import { supabase } from './supabaseClient.js';

const STUDIO_FOLDER_COLORS = new Set(['sand', 'orange', 'navy', 'coral', 'gold', 'blue', 'rose']);

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user?.id || null;
}

function cleanFolderName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Give the folder a name.');
  return trimmed;
}

function cleanColorKey(colorKey) {
  return STUDIO_FOLDER_COLORS.has(colorKey) ? colorKey : 'sand';
}

export async function listStudioFolders() {
  const { data, error } = await supabase
    .from('exercise_studio_folders')
    .select('id, name, parent_id, color_key, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createStudioFolder(name, { parentId = null, colorKey = 'sand' } = {}) {
  const trimmed = cleanFolderName(name);
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('exercise_studio_folders')
    .insert({
      name: trimmed,
      parent_id: parentId || null,
      color_key: cleanColorKey(colorKey),
      created_by: userId,
      updated_by: userId,
    })
    .select('id, name, parent_id, color_key, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A folder with this name already exists here.');
    throw error;
  }
  return data;
}

export async function updateStudioFolder(folderId, {
  name,
  parentId,
  colorKey,
} = {}) {
  const userId = await currentUserId();
  const payload = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) payload.name = cleanFolderName(name);
  if (parentId !== undefined) payload.parent_id = parentId || null;
  if (colorKey !== undefined) payload.color_key = cleanColorKey(colorKey);

  const { data, error } = await supabase
    .from('exercise_studio_folders')
    .update(payload)
    .eq('id', folderId)
    .select('id, name, parent_id, color_key, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A folder with this name already exists here.');
    throw error;
  }
  return data;
}

export async function renameStudioFolder(folderId, name) {
  return updateStudioFolder(folderId, { name });
}

export async function moveStudioFolder(folderId, parentId = null) {
  return updateStudioFolder(folderId, { parentId });
}

export async function deleteStudioFolder(folderId) {
  const { error } = await supabase
    .from('exercise_studio_folders')
    .delete()
    .eq('id', folderId);

  if (error) throw error;
}

export async function bulkMoveStudioDraftsToFolder(draftIds, folderId = null) {
  const ids = [...new Set((draftIds || []).filter(Boolean))];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('exercise_studio_drafts')
    .update({
      folder_id: folderId || null,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .select('id, folder_id, updated_at');

  if (error) throw error;
  return data || [];
}

export async function moveStudioDraftToFolder(draftId, folderId = null) {
  const { data, error } = await supabase
    .from('exercise_studio_drafts')
    .update({
      folder_id: folderId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .select('id, folder_id, updated_at')
    .single();

  if (error) throw error;
  return data;
}
