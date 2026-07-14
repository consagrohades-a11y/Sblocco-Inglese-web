import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function openAssignedExercise({ assignmentId, resourceId, startNew = false }) {
  const { data, error } = await supabase.rpc('open_assigned_exercise_attempt', {
    p_assignment_id: assignmentId,
    p_resource_id: resourceId,
    p_start_new: startNew,
  });
  throwIfError(error);
  if (!data) throw new Error('Esercizio non disponibile.');
  return data;
}

export async function saveExerciseAnswer({
  attemptId,
  attemptQuestionId,
  answer,
  currentSectionIndex,
  currentQuestionIndex,
}) {
  const { data, error } = await supabase.rpc('save_exercise_builder_answer', {
    p_attempt_id: attemptId,
    p_attempt_question_id: attemptQuestionId,
    p_answer: answer,
    p_current_section_index: currentSectionIndex,
    p_current_question_index: currentQuestionIndex,
  });
  throwIfError(error);
  return data;
}

export async function completeExerciseSection({ attemptId, sectionId }) {
  const { data, error } = await supabase.rpc('complete_exercise_builder_section', {
    p_attempt_id: attemptId,
    p_section_id: sectionId,
  });
  throwIfError(error);
  return data;
}

export async function submitExerciseAttempt(attemptId) {
  const { data, error } = await supabase.rpc('submit_exercise_builder_attempt', {
    p_attempt_id: attemptId,
  });
  throwIfError(error);
  return data;
}

export async function loadPublishedExerciseCatalog() {
  const { data, error } = await supabase
    .from('exercise_builder_exercises')
    .select(`
      id,
      public_id,
      status,
      current_version_id,
      published_at,
      exercise_builder_exercise_versions!exercise_builder_exercises_current_version_fk(
        id,
        title,
        description,
        instructions,
        level,
        topic,
        estimated_minutes,
        settings,
        review_status
      )
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  throwIfError(error);

  return (data || []).map((row) => ({
    id: row.id,
    publicId: row.public_id,
    status: row.status,
    versionId: row.current_version_id,
    ...(Array.isArray(row.exercise_builder_exercise_versions)
      ? row.exercise_builder_exercise_versions[0]
      : row.exercise_builder_exercise_versions),
  }));
}

export async function loadExerciseBuilderCatalogForAdmin() {
  const { data, error } = await supabase
    .from('exercise_builder_exercises')
    .select(`
      id,
      public_id,
      status,
      current_version_id,
      created_at,
      published_at,
      exercise_builder_exercise_versions!exercise_builder_exercises_current_version_fk(
        id,
        title,
        description,
        level,
        topic,
        estimated_minutes,
        review_status,
        created_at
      )
    `)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data || []).map((row) => ({
    id: row.id,
    publicId: row.public_id,
    status: row.status,
    versionId: row.current_version_id,
    publishedAt: row.published_at,
    ...(Array.isArray(row.exercise_builder_exercise_versions)
      ? row.exercise_builder_exercise_versions[0]
      : row.exercise_builder_exercise_versions),
  }));
}

export async function setExerciseBuilderCatalogStatus(entityType, entityId, nextStatus) {
  const { error } = await supabase.rpc('admin_set_exercise_builder_status', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_next_status: nextStatus,
  });
  throwIfError(error);
}

export async function deleteUnusedExerciseBuilderExercise(exerciseId) {
  const { data, error } = await supabase.rpc('admin_delete_unused_exercise_builder_exercise', {
    p_exercise_id: exerciseId,
  });
  throwIfError(error);
  return data || {};
}
