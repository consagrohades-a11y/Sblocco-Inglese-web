import { supabase } from './supabaseClient.js';

const RECOVERABLE_ATTEMPT_MESSAGES = [
  'open attempt not found',
  'open section not found',
];

function throwIfError(error) {
  if (error) throw error;
}

function isRecoverableAttemptError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return RECOVERABLE_ATTEMPT_MESSAGES.some((candidate) => message.includes(candidate));
}

async function recoverExerciseAttemptState(error, attemptId, sectionId = null) {
  if (!isRecoverableAttemptError(error)) throw error;

  let payload;
  try {
    payload = await openExerciseAttempt(attemptId);
  } catch {
    throw error;
  }

  if (payload?.attempt?.status === 'submitted') return payload;
  if (sectionId && payload?.sections?.some((section) => section.id === sectionId && section.status === 'completed')) {
    return payload;
  }

  throw error;
}

function currentExerciseVersion(row) {
  const relation = Array.isArray(row.exercise_builder_exercise_versions)
    ? row.exercise_builder_exercise_versions[0]
    : row.exercise_builder_exercise_versions;

  if (!relation) return null;

  const { id: relationVersionId, ...versionFields } = relation;
  return {
    ...versionFields,
    id: row.id,
    publicId: row.public_id,
    status: row.status,
    versionId: row.current_version_id || relationVersionId,
  };
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

export async function openExerciseAttempt(attemptId) {
  const { data, error } = await supabase.rpc('exercise_builder_attempt_payload', {
    p_attempt_id: attemptId,
  });
  throwIfError(error);
  if (!data) throw new Error('Tentativo non disponibile.');
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
  if (error) return recoverExerciseAttemptState(error, attemptId);
  return data;
}

export async function completeExerciseSection({ attemptId, sectionId }) {
  const { data, error } = await supabase.rpc('complete_exercise_builder_section', {
    p_attempt_id: attemptId,
    p_section_id: sectionId,
  });
  if (error) return recoverExerciseAttemptState(error, attemptId, sectionId);
  return data;
}

export async function checkExerciseQuestion({ attemptId, attemptQuestionId }) {
  const { data, error } = await supabase.rpc('complete_exercise_builder_question', {
    p_attempt_id: attemptId,
    p_attempt_question_id: attemptQuestionId,
  });
  if (error) return recoverExerciseAttemptState(error, attemptId);
  return data;
}

export async function submitExerciseAttempt(attemptId) {
  const { data, error } = await supabase.rpc('submit_exercise_builder_attempt', {
    p_attempt_id: attemptId,
  });
  if (error) return recoverExerciseAttemptState(error, attemptId);
  return data;
}

export async function loadPublishedExerciseCatalog() {
  const { data, error } = await supabase
    .from('exercise_builder_exercises')
    .select(`
      id,
      public_id,
      status,
      generated_from_collection,
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
    .eq('generated_from_collection', false)
    .not('current_version_id', 'is', null)
    .order('published_at', { ascending: false });
  throwIfError(error);

  return (data || []).map((row) => {
    const item = currentExerciseVersion(row);
    return item ? { ...item, publishedAt: row.published_at } : null;
  }).filter((item) => item?.review_status === 'approved');
}

export async function loadExerciseBuilderCatalogForAdmin() {
  const { data, error } = await supabase
    .from('exercise_builder_exercises')
    .select(`
      id,
      public_id,
      status,
      generated_from_collection,
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
    .eq('generated_from_collection', false)
    .not('current_version_id', 'is', null)
    .order('created_at', { ascending: false });
  throwIfError(error);

  return (data || []).map((row) => {
    const item = currentExerciseVersion(row);
    return item ? {
      ...item,
      createdAt: row.created_at,
      publishedAt: row.published_at,
    } : null;
  }).filter(Boolean);
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
