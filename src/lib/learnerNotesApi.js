import { supabase } from './supabaseClient.js';

const NOTE_COLUMNS = 'id, learner_id, author_id, note, created_at';

export async function loadLearnerNotes(learnerId) {
  const { data, error } = await supabase
    .from('learner_admin_notes')
    .select(NOTE_COLUMNS)
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createLearnerNote(learnerId, note) {
  const normalizedNote = String(note ?? '').trim();

  if (!normalizedNote) {
    throw new Error('Scrivi una nota prima di salvarla.');
  }

  if (normalizedNote.length > 5000) {
    throw new Error('La nota non può superare 5000 caratteri.');
  }

  const { data, error } = await supabase
    .from('learner_admin_notes')
    .insert({
      learner_id: learnerId,
      note: normalizedNote,
    })
    .select(NOTE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
