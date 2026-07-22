import { supabase } from './supabaseClient.js';
import { fetchRowsInChunks, throwSupabaseError } from './supabaseBatching.js';

function throwIfError(error, context = 'Caricamento banca esercizi') {
  throwSupabaseError(error, context);
}

function currentVersionMap(rows = []) {
  return new Map(rows.map((row) => [row.id, row]));
}

export async function loadExerciseQuestionBank() {
  const { data: questions, error: questionError } = await supabase
    .from('exercise_builder_questions')
    .select('id, public_id, status, current_version_id, created_at, updated_at')
    .not('current_version_id', 'is', null)
    .order('created_at', { ascending: false });
  throwIfError(questionError);

  const versionIds = (questions || []).map((item) => item.current_version_id).filter(Boolean);
  const versions = await fetchRowsInChunks(
    versionIds,
    (ids) => supabase
      .from('exercise_builder_question_versions')
      .select('id, question_id, version_number, question_type, title, prompt, instructions, level, topic, subtopic, primary_skill, learning_objective, difficulty, tags, review_status, content, grading, feedback, diagnostics')
      .in('id', ids),
    { context: 'Caricamento versioni delle domande' },
  );

  const questionIds = (questions || []).map((item) => item.id);
  const memberships = await fetchRowsInChunks(
    questionIds,
    (ids) => supabase
      .from('exercise_builder_pool_questions')
      .select('question_id, pool_version_id')
      .in('question_id', ids),
    { context: 'Caricamento appartenenze ai pool' },
  );

  const poolCounts = new Map();
  (memberships || []).forEach((membership) => {
    const current = poolCounts.get(membership.question_id) || new Set();
    current.add(membership.pool_version_id);
    poolCounts.set(membership.question_id, current);
  });
  const byVersion = currentVersionMap(versions);

  return (questions || []).map((question) => {
    const version = byVersion.get(question.current_version_id);
    if (!version || version.question_id !== question.id) return null;
    const { id: versionId, question_id: _questionId, ...versionFields } = version;
    return {
      ...versionFields,
      id: question.id,
      publicId: question.public_id,
      status: question.status,
      createdAt: question.created_at,
      updatedAt: question.updated_at,
      poolCount: poolCounts.get(question.id)?.size || 0,
      versionId,
    };
  }).filter(Boolean);
}

export async function loadExercisePools() {
  const { data: pools, error: poolError } = await supabase
    .from('exercise_builder_pools')
    .select('id, public_id, status, current_version_id, created_at, updated_at')
    .not('current_version_id', 'is', null)
    .order('created_at', { ascending: false });
  throwIfError(poolError);

  const versionIds = (pools || []).map((item) => item.current_version_id).filter(Boolean);
  const versions = await fetchRowsInChunks(
    versionIds,
    (ids) => supabase
      .from('exercise_builder_pool_versions')
      .select('id, pool_id, version_number, title, name, description, level, topic, subtopic, primary_skill, tags, selection_defaults, foundation_links, review_status')
      .in('id', ids),
    { context: 'Caricamento versioni dei pool' },
  );

  const memberships = await fetchRowsInChunks(
    versionIds,
    (ids) => supabase
      .from('exercise_builder_pool_questions')
      .select('pool_version_id, question_id, pinned')
      .in('pool_version_id', ids),
    { context: 'Caricamento domande dei pool' },
  );

  const stats = new Map();
  (memberships || []).forEach((membership) => {
    const current = stats.get(membership.pool_version_id) || { questionCount: 0, pinnedCount: 0 };
    current.questionCount += 1;
    if (membership.pinned) current.pinnedCount += 1;
    stats.set(membership.pool_version_id, current);
  });
  const byVersion = currentVersionMap(versions);

  return (pools || []).map((pool) => {
    const version = byVersion.get(pool.current_version_id);
    if (!version || version.pool_id !== pool.id) return null;
    const { id: versionId, pool_id: _poolId, ...versionFields } = version;
    return {
      ...versionFields,
      id: pool.id,
      publicId: pool.public_id,
      status: pool.status,
      createdAt: pool.created_at,
      updatedAt: pool.updated_at,
      ...(stats.get(pool.current_version_id) || { questionCount: 0, pinnedCount: 0 }),
      versionId,
    };
  }).filter(Boolean);
}

export async function loadExercisePoolDetail(poolId) {
  const { data, error } = await supabase.rpc('admin_get_exercise_builder_pool_detail', {
    p_pool_id: poolId,
  });
  throwIfError(error);
  return data || null;
}

export async function saveExercisePoolVersion({ poolId = null, pool, memberships }) {
  const { data, error } = await supabase.rpc('admin_save_exercise_builder_pool_version', {
    p_pool_id: poolId,
    p_payload: {
      title: pool.title,
      description: pool.description || null,
      level: pool.level,
      topic: pool.topic,
      subtopic: pool.subtopic || null,
      primary_skill: pool.primarySkill,
      tags: pool.tags || [],
      foundation_links: pool.foundationLinks || [],
      selection_defaults: pool.selectionDefaults || {},
    },
    p_memberships: memberships.map((membership, index) => ({
      question_id: membership.questionId,
      question_version_id: membership.questionVersionId,
      pinned: Boolean(membership.pinned),
      sequence_index: index + 1,
    })),
  });
  throwIfError(error);
  return data;
}

export async function setExerciseBankEntityStatus(entityType, entityId, status) {
  const { error } = await supabase.rpc('admin_set_exercise_builder_status', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_next_status: status,
  });
  throwIfError(error);
}
