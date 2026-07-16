import { supabase } from './supabaseClient.js';

const BUCKET = 'exercise-submissions';

function extensionForMimeType(mimeType) {
  const value = String(mimeType || '').toLowerCase();
  if (value.includes('ogg')) return 'ogg';
  if (value.includes('mp4') || value.includes('m4a')) return 'm4a';
  if (value.includes('mpeg') || value.includes('mp3')) return 'mp3';
  if (value.includes('wav')) return 'wav';
  return 'webm';
}

export async function uploadExerciseAudioSubmission({
  attemptId,
  attemptQuestionId,
  turnKey = null,
  blob,
  durationSeconds,
  previousAnswer = null,
}) {
  if (!attemptId || !attemptQuestionId) throw new Error('Tentativo audio non disponibile.');
  if (!(blob instanceof Blob) || blob.size <= 0) throw new Error('La registrazione audio è vuota.');

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData?.user?.id;
  if (!userId) throw new Error('Accedi di nuovo prima di caricare la registrazione.');

  const mimeType = blob.type || 'audio/webm';
  const extension = extensionForMimeType(mimeType);
  const safeTurnKey = turnKey ? String(turnKey).replace(/[^a-zA-Z0-9_-]/g, '_') : null;
  const path = `${userId}/${attemptId}/${attemptQuestionId}/${safeTurnKey ? `${safeTurnKey}/` : ''}${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadError) throw uploadError;

  try {
    const { data, error } = await supabase.rpc('register_exercise_builder_submission_file', {
      p_attempt_question_id: attemptQuestionId,
      p_storage_path: path,
      p_mime_type: mimeType,
      p_size_bytes: blob.size,
      p_duration_seconds: durationSeconds || null,
      p_turn_key: turnKey || null,
    });
    if (error) throw error;

    const previousPath = previousAnswer?.storage_path;
    if (previousPath && previousPath !== path) {
      await supabase.storage.from(BUCKET).remove([previousPath]);
    }

    return data;
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

export async function createExerciseAudioSignedUrl(answer, expiresIn = 3600) {
  const path = answer?.storage_path;
  if (!path) return null;
  const bucket = answer?.storage_bucket || BUCKET;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}
