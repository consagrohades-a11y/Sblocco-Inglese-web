import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function loadExerciseComposerCatalog() {
  const { data: exercises, error: exerciseError } = await supabase
    .from('exercise_builder_exercises')
    .select('id, public_id, status, current_version_id, created_at, updated_at')
    .order('created_at', { ascending: false });
  throwIfError(exerciseError);

  const versionIds = (exercises || []).map((item) => item.current_version_id).filter(Boolean);
  const { data: versions, error: versionError } = versionIds.length
    ? await supabase
      .from('exercise_builder_exercise_versions')
      .select('id, exercise_id, version_number, title, description, instructions, level, topic, estimated_minutes, review_status, settings')
      .in('id', versionIds)
    : { data: [], error: null };
  throwIfError(versionError);
  const versionMap = new Map((versions || []).map((version) => [version.id, version]));

  return (exercises || []).map((exercise) => ({
    id: exercise.id,
    publicId: exercise.public_id,
    status: exercise.status,
    createdAt: exercise.created_at,
    updatedAt: exercise.updated_at,
    versionId: exercise.current_version_id,
    ...(versionMap.get(exercise.current_version_id) || {}),
  }));
}

export async function loadExerciseComposerDetail(exerciseId) {
  const { data, error } = await supabase.rpc('admin_get_exercise_builder_exercise_detail', {
    p_exercise_id: exerciseId,
  });
  throwIfError(error);
  return data || null;
}

export async function saveExerciseComposerVersion({ exerciseId = null, exercise, sections }) {
  const { data, error } = await supabase.rpc('admin_save_exercise_builder_exercise_version', {
    p_exercise_id: exerciseId,
    p_payload: {
      title: exercise.title,
      description: exercise.description || null,
      instructions: exercise.instructions || null,
      instruction_language: exercise.instructionLanguage || 'it',
      level: exercise.level,
      topic: exercise.topic,
      estimated_minutes: exercise.estimatedMinutes || null,
      settings: exercise.settings || {},
      foundation_links: exercise.foundationLinks || [],
    },
    p_sections: sections.map((section) => ({
      title: section.title,
      instructions: section.instructions || null,
      selection_mode: section.selectionMode,
      feedback_timing: section.feedbackTiming,
      settings: section.settings || {},
      fixed_questions: section.fixedQuestions.map((item, index) => ({
        question_id: item.questionId,
        question_version_id: item.questionVersionId,
        sequence_index: index + 1,
      })),
      pool_rules: section.poolRules.map((rule, index) => ({
        pool_id: rule.poolId,
        pool_version_id: rule.poolVersionId,
        sequence_index: index + 1,
        question_count: rule.questionCount,
        selection_strategy: rule.selectionStrategy,
        filters: rule.filters || {},
        distribution_rules: rule.distributionRules || {},
      })),
    })),
  });
  throwIfError(error);
  return data;
}

export async function setExerciseComposerStatus(exerciseId, status) {
  const { error } = await supabase.rpc('admin_set_exercise_builder_status', {
    p_entity_type: 'exercise',
    p_entity_id: exerciseId,
    p_next_status: status,
  });
  throwIfError(error);
}
