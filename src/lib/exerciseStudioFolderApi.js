import { supabase } from './supabaseClient.js';

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user?.id || null;
}

export async function listStudioFolders() {
  const { data, error } = await supabase
    .from('exercise_studio_folders')
    .select('id, name, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createStudioFolder(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Give the folder a name.');

  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('exercise_studio_folders')
    .insert({
      name: trimmed,
      created_by: userId,
      updated_by: userId,
    })
    .select('id, name, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A folder with this name already exists.');
    throw error;
  }
  return data;
}

export async function renameStudioFolder(folderId, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Folder name cannot be empty.');

  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('exercise_studio_folders')
    .update({
      name: trimmed,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', folderId)
    .select('id, name, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A folder with this name already exists.');
    throw error;
  }
  return data;
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
