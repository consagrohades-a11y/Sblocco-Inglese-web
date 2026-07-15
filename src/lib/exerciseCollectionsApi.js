import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function loadExerciseCollections() {
  const [{ data: collections, error: collectionError }, { data: items, error: itemError }] = await Promise.all([
    supabase
      .from('exercise_builder_collections')
      .select('id, public_id, title, description, catalog_status, color_key, completion_rule, required_percent, current_version_id, published_at, created_at, updated_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('exercise_builder_collection_items')
      .select('collection_id, entity_type, entity_id, sequence_index')
      .not('entity_type', 'is', null)
      .not('entity_id', 'is', null),
  ]);
  throwIfError(collectionError || itemError);

  const stats = new Map();
  (items || []).forEach((item) => {
    const current = stats.get(item.collection_id) || { itemCount: 0, questions: 0, pools: 0, exercises: 0 };
    current.itemCount += 1;
    if (item.entity_type === 'question') current.questions += 1;
    if (item.entity_type === 'question_pool') current.pools += 1;
    if (item.entity_type === 'exercise') current.exercises += 1;
    stats.set(item.collection_id, current);
  });

  return (collections || []).map((collection) => ({
    id: collection.id,
    publicId: collection.public_id,
    title: collection.title,
    description: collection.description,
    status: collection.catalog_status,
    colorKey: collection.color_key,
    completionRule: collection.completion_rule,
    requiredPercent: Number(collection.required_percent || 100),
    currentVersionId: collection.current_version_id,
    publishedAt: collection.published_at,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
    ...(stats.get(collection.id) || { itemCount: 0, questions: 0, pools: 0, exercises: 0 }),
  }));
}

export async function loadExerciseCollectionDetail(collectionId) {
  const { data, error } = await supabase.rpc('admin_get_exercise_builder_collection_detail', {
    p_collection_id: collectionId,
  });
  throwIfError(error);
  return data || null;
}

export async function saveExerciseCollection({ collectionId = null, collection, items }) {
  const { data, error } = await supabase.rpc('admin_save_exercise_builder_collection', {
    p_collection_id: collectionId,
    p_payload: {
      title: collection.title,
      description: collection.description || null,
      catalog_status: collection.status === 'archived' ? 'archived' : collection.status === 'in_review' ? 'in_review' : 'draft',
      color_key: collection.colorKey || 'emerald',
      completion_rule: collection.completionRule || 'all_items',
      required_percent: collection.requiredPercent || 100,
    },
    p_items: items.map((item, index) => ({
      entity_type: item.entityType,
      entity_id: item.entityId,
      sequence_index: index + 1,
    })),
  });
  throwIfError(error);
  return data;
}

export async function setExerciseCollectionStatus(collectionId, status) {
  const { data, error } = await supabase.rpc('admin_set_exercise_builder_collection_status', {
    p_collection_id: collectionId,
    p_status: status,
  });
  throwIfError(error);
  return data;
}

export async function loadPublishedExerciseCollections() {
  const { data: collections, error: collectionError } = await supabase
    .from('exercise_builder_collections')
    .select('id, public_id, title, description, color_key, current_version_id')
    .eq('catalog_status', 'published')
    .not('current_version_id', 'is', null)
    .order('published_at', { ascending: false });
  throwIfError(collectionError);

  const versionIds = (collections || []).map((item) => item.current_version_id);
  if (!versionIds.length) return [];
  const [{ data: versions, error: versionError }, { data: items, error: itemError }] = await Promise.all([
    supabase
      .from('exercise_builder_collection_versions')
      .select('id, version_number, completion_rule, required_percent')
      .in('id', versionIds),
    supabase
      .from('exercise_builder_collection_version_items')
      .select('collection_version_id')
      .in('collection_version_id', versionIds),
  ]);
  throwIfError(versionError || itemError);
  const versionMap = new Map((versions || []).map((item) => [item.id, item]));
  const itemCounts = new Map();
  (items || []).forEach((item) => itemCounts.set(item.collection_version_id, (itemCounts.get(item.collection_version_id) || 0) + 1));

  return (collections || []).map((collection) => {
    const version = versionMap.get(collection.current_version_id);
    return version ? {
      collectionId: collection.id,
      collectionVersionId: version.id,
      publicId: collection.public_id,
      title: collection.title,
      description: collection.description,
      colorKey: collection.color_key,
      versionNumber: version.version_number,
      completionRule: version.completion_rule,
      requiredPercent: Number(version.required_percent || 100),
      itemCount: itemCounts.get(version.id) || 0,
      requiredScore: 70,
    } : null;
  }).filter(Boolean);
}

export async function loadAssignedCollectionPath({ assignmentId, resourceId }) {
  const { data, error } = await supabase.rpc('learner_get_assigned_collection_path', {
    p_assignment_id: assignmentId,
    p_resource_id: resourceId,
  });
  throwIfError(error);
  return data || null;
}

export async function loadCollectionQuestionCandidates(collectionId) {
  const { data, error } = await supabase.rpc('admin_get_collection_question_candidates', {
    p_collection_id: collectionId,
  });
  throwIfError(error);
  return data || { candidates: [], incompatible_count: 0 };
}
