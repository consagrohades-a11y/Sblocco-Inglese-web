import { supabase } from './supabaseClient.js';

const NEXT_LESSON_COLUMNS = 'learner_id, plan, scheduled_at, created_at, updated_at, created_by, updated_by';

function normalizePlan(plan) {
  const value = String(plan ?? '').trim();
  if (!value) throw new Error('Scrivi cosa farete nella prossima lezione.');
  if (value.length > 5000) throw new Error('Il programma non può superare 5000 caratteri.');
  return value;
}

export async function loadNextLessonForLearner(learnerId) {
  const { data, error } = await supabase
    .from('learner_next_lessons')
    .select(NEXT_LESSON_COLUMNS)
    .eq('learner_id', learnerId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function loadOwnNextLesson() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) return null;
  return loadNextLessonForLearner(authData.user.id);
}

export async function saveNextLesson(learnerId, { plan, scheduledAt = null }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) throw new Error('Autenticazione richiesta.');

  const { data, error } = await supabase
    .from('learner_next_lessons')
    .upsert({
      learner_id: learnerId,
      plan: normalizePlan(plan),
      scheduled_at: scheduledAt,
      created_by: authData.user.id,
      updated_by: authData.user.id,
    }, { onConflict: 'learner_id' })
    .select(NEXT_LESSON_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNextLesson(learnerId) {
  const { error } = await supabase
    .from('learner_next_lessons')
    .delete()
    .eq('learner_id', learnerId);

  if (error) throw error;
}
