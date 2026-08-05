import { supabase } from './supabaseClient.js';

const NOTE_COLUMNS = 'id, learner_id, author_id, note, created_at, updated_at, updated_by';

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

function normalizedNoteValue(note) {
  const value = String(note ?? '').trim();
  if (!value) throw new Error('La nota non può essere vuota.');
  if (value.length > 5000) throw new Error('La nota non può superare 5000 caratteri.');
  return value;
}

export async function updateLearnerNote(noteId, note) {
  const { data, error } = await supabase
    .from('learner_admin_notes')
    .update({
      note: normalizedNoteValue(note),
      updated_at: new Date().toISOString(),
      updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .eq('id', noteId)
    .select(NOTE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLearnerNote(noteId) {
  const { error } = await supabase
    .from('learner_admin_notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
}
