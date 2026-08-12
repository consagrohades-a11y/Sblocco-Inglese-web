import { supabase } from './supabaseClient.js';

export async function createExerciseListeningSignedUrl(audio, expiresIn = 3600) {
  const path = String(audio?.storage_path || '').trim();
  if (!path) return null;
  const bucket = String(audio?.storage_bucket || 'exercise-listening').trim() || 'exercise-listening';
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}
