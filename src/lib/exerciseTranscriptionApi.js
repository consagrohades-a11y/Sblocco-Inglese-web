import { supabase } from './supabaseClient.js';

// Teacher-triggered transcription does not persist text in student submissions.
export async function transcribeExerciseAudio(fileId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(fileId || ''))) {
    throw new Error('Registrazione non valida.');
  }
  const { data, error } = await supabase.functions.invoke('transcribe-exercise-audio', {
    body: { file_id: fileId },
  });
  if (error) {
    let message = 'Trascrizione non disponibile. Verifica la configurazione del servizio.';
    try {
      const payload = await error.context?.json?.();
      if (payload?.error) message = payload.error;
    } catch { /* Preserve a useful fallback error. */ }
    throw new Error(message);
  }
  if (typeof data?.transcript !== 'string' || !data.transcript.trim()) {
    throw new Error('Nessun testo riconosciuto nella registrazione.');
  }
  return data.transcript.trim();
}
