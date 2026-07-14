import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function loadExerciseCollections() {
  const [{ data: collections, error: collectionError }, { data: items, error: itemError }] = await Promise.all([
    supabase
      .from('exercise_builder_collections')
      .select('id, public_id, title, description, catalog_status, color_key, created_at, updated_at')
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
      catalog_status: collection.status || 'active',
      color_key: collection.colorKey || 'emerald',
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
  const { error } = await supabase.rpc('admin_set_exercise_builder_collection_status', {
    p_collection_id: collectionId,
    p_status: status,
  });
  throwIfError(error);
}
