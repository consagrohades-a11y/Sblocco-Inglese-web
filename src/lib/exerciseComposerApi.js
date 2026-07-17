import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function loadExerciseComposerCatalog() {
  const { data: exercises, error: exerciseError } = await supabase
    .from('exercise_builder_exercises')
    .select('id, public_id, status, current_version_id, generated_from_collection, created_at, updated_at')
    .eq('generated_from_collection', false)
    .not('current_version_id', 'is', null)
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

  return (exercises || []).map((exercise) => {
    const version = versionMap.get(exercise.current_version_id);
    if (!version || version.exercise_id !== exercise.id) return null;

    const { id: versionId, exercise_id: _exerciseId, ...versionFields } = version;
    return {
      ...versionFields,
      id: exercise.id,
      publicId: exercise.public_id,
      status: exercise.status,
      createdAt: exercise.created_at,
      updatedAt: exercise.updated_at,
      versionId,
    };
  }).filter(Boolean);
}

export async function loadExerciseComposerDetail(exerciseId) {
  const { data, error } = await supabase.rpc('admin_get_exercise_builder_exercise_detail', {
    p_exercise_id: exerciseId,
  });
  throwIfError(error);
  return data || null;
}

function uniqueIds(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export async function loadExerciseComposerContentPreviews({
  questionVersionIds = [],
  poolVersionIds = [],
} = {}) {
  const requestedQuestionVersionIds = uniqueIds(questionVersionIds);
  const requestedPoolVersionIds = uniqueIds(poolVersionIds);

  const [{ data: poolVersions, error: poolVersionError }, { data: memberships, error: membershipError }] = await Promise.all([
    requestedPoolVersionIds.length
      ? supabase
        .from('exercise_builder_pool_versions')
        .select('id, pool_id, version_number, title, name, description, level, topic, review_status')
        .in('id', requestedPoolVersionIds)
      : Promise.resolve({ data: [], error: null }),
    requestedPoolVersionIds.length
      ? supabase
        .from('exercise_builder_pool_questions')
        .select('pool_version_id, question_id, question_version_id, pinned, sequence_index')
        .in('pool_version_id', requestedPoolVersionIds)
        .order('sequence_index', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);
  throwIfError(poolVersionError);
  throwIfError(membershipError);

  const referencedQuestionVersionIds = uniqueIds([
    ...requestedQuestionVersionIds,
    ...(memberships || []).map((item) => item.question_version_id),
  ]);
  const { data: referencedVersions, error: referencedVersionError } = referencedQuestionVersionIds.length
    ? await supabase
      .from('exercise_builder_question_versions')
      .select('id, question_id, version_number, question_type, title, prompt, instructions, level, topic, subtopic, primary_skill, review_status, content, grading, feedback, diagnostics')
      .in('id', referencedQuestionVersionIds)
    : { data: [], error: null };
  throwIfError(referencedVersionError);

  const questionIds = uniqueIds([
    ...(memberships || []).map((item) => item.question_id),
    ...(referencedVersions || []).map((item) => item.question_id),
  ]);
  const { data: questionEntities, error: questionEntityError } = questionIds.length
    ? await supabase
      .from('exercise_builder_questions')
      .select('id, public_id, status, current_version_id')
      .in('id', questionIds)
    : { data: [], error: null };
  throwIfError(questionEntityError);

  const loadedVersionIds = new Set((referencedVersions || []).map((item) => item.id));
  const missingCurrentVersionIds = uniqueIds(
    (questionEntities || [])
      .map((item) => item.current_version_id)
      .filter((id) => !loadedVersionIds.has(id)),
  );
  const { data: currentVersions, error: currentVersionError } = missingCurrentVersionIds.length
    ? await supabase
      .from('exercise_builder_question_versions')
      .select('id, question_id, version_number, question_type, title, prompt, instructions, level, topic, subtopic, primary_skill, review_status, content, grading, feedback, diagnostics')
      .in('id', missingCurrentVersionIds)
    : { data: [], error: null };
  throwIfError(currentVersionError);

  const entityMap = new Map((questionEntities || []).map((item) => [item.id, item]));
  const questionPreviews = [...(referencedVersions || []), ...(currentVersions || [])].map((version) => {
    const entity = entityMap.get(version.question_id) || {};
    return {
      ...version,
      questionId: version.question_id,
      questionVersionId: version.id,
      publicId: entity.public_id || null,
      status: entity.status || null,
      currentVersionId: entity.current_version_id || null,
      isCurrent: entity.current_version_id === version.id,
    };
  });
  const versionMap = new Map(questionPreviews.map((item) => [item.questionVersionId, item]));
  const currentByQuestion = new Map(
    questionPreviews.filter((item) => item.isCurrent).map((item) => [item.questionId, item]),
  );

  const resolvedPoolIds = uniqueIds((poolVersions || []).map((item) => item.pool_id));
  const { data: poolEntities, error: poolEntityError } = resolvedPoolIds.length
    ? await supabase
      .from('exercise_builder_pools')
      .select('id, public_id, status, current_version_id')
      .in('id', resolvedPoolIds)
    : { data: [], error: null };
  throwIfError(poolEntityError);
  const poolEntityMap = new Map((poolEntities || []).map((item) => [item.id, item]));

  return {
    questions: questionPreviews,
    pools: (poolVersions || []).map((version) => {
      const entity = poolEntityMap.get(version.pool_id) || {};
      return {
        ...version,
        poolId: version.pool_id,
        poolVersionId: version.id,
        publicId: entity.public_id || null,
        status: entity.status || null,
        currentVersionId: entity.current_version_id || null,
        isCurrent: entity.current_version_id === version.id,
        questions: (memberships || [])
          .filter((item) => item.pool_version_id === version.id)
          .map((membership) => ({
            ...membership,
            question:
              versionMap.get(membership.question_version_id) ||
              currentByQuestion.get(membership.question_id) ||
              null,
          })),
      };
    }),
  };
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
