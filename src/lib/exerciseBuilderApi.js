import { supabase } from './supabaseClient.js';

function countStatuses(items) {
  return items.reduce((counts, item) => {
    if (item.status === 'valid') counts.valid += 1;
    if (item.status === 'warning') counts.warning += 1;
    if (item.status === 'invalid') counts.invalid += 1;
    return counts;
  }, { valid: 0, warning: 0, invalid: 0 });
}

export async function createExerciseBuilderImportBatch({
  validation,
  rawPayload,
  sourceName = 'Pasted JSON',
  selectedIndexes = [],
  createdBy = null,
}) {
  if (!validation || validation.errors?.length) {
    throw new Error('Il JSON principale non è valido.');
  }

  const selectedSet = new Set(selectedIndexes);
  const counts = countStatuses(validation.items || []);
  const parsedPayload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;

  const { data: batch, error: batchError } = await supabase
    .from('exercise_builder_import_batches')
    .insert({
      source_name: sourceName,
      schema_version: validation.schemaVersion,
      entity_type: validation.entityType,
      status: 'validated',
      raw_payload: parsedPayload,
      valid_count: counts.valid,
      warning_count: counts.warning,
      invalid_count: counts.invalid,
      created_by: createdBy,
    })
    .select('id, source_name, entity_type, status, valid_count, warning_count, invalid_count, created_at')
    .single();

  if (batchError) throw batchError;

  const rows = (validation.items || []).map((item) => ({
    batch_id: batch.id,
    item_index: item.index,
    client_key: item.clientKey,
    entity_type: item.entityType,
    validation_status: item.status,
    selected: item.status !== 'invalid' && selectedSet.has(item.index),
    payload: item.payload,
    errors: item.errors || [],
    warnings: item.warnings || [],
  }));

  if (rows.length > 0) {
    const { error: itemError } = await supabase
      .from('exercise_builder_import_items')
      .insert(rows);

    if (itemError) {
      await supabase.from('exercise_builder_import_batches').delete().eq('id', batch.id);
      throw itemError;
    }
  }

  return batch;
}

export async function loadExerciseBuilderOverview() {
  const [
    { count: questionCount, error: questionError },
    { count: poolCount, error: poolError },
    { count: exerciseCount, error: exerciseError },
    { count: reviewCount, error: reviewError },
    { data: recentBatches, error: batchesError },
  ] = await Promise.all([
    supabase.from('exercise_builder_questions').select('*', { count: 'exact', head: true }),
    supabase.from('exercise_builder_pools').select('*', { count: 'exact', head: true }),
    supabase.from('exercise_builder_exercises').select('*', { count: 'exact', head: true }),
    supabase
      .from('exercise_builder_import_items')
      .select('*', { count: 'exact', head: true })
      .eq('selected', true)
      .in('validation_status', ['valid', 'warning'])
      .is('promoted_entity_id', null),
    supabase
      .from('exercise_builder_import_batches')
      .select('id, source_name, entity_type, status, valid_count, warning_count, invalid_count, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const firstError = questionError || poolError || exerciseError || reviewError || batchesError;
  if (firstError) throw firstError;

  return {
    questionCount: questionCount || 0,
    poolCount: poolCount || 0,
    exerciseCount: exerciseCount || 0,
    reviewCount: reviewCount || 0,
    recentBatches: recentBatches || [],
  };
}

export async function loadExerciseBuilderReviewQueue() {
  const { data: batches, error: batchError } = await supabase
    .from('exercise_builder_import_batches')
    .select('id, source_name, entity_type, status, valid_count, warning_count, invalid_count, created_at, updated_at')
    .in('status', ['validated', 'in_review', 'partially_imported', 'imported'])
    .order('created_at', { ascending: false })
    .limit(30);

  if (batchError) throw batchError;
  const batchIds = (batches || []).map((batch) => batch.id);
  if (batchIds.length === 0) return [];

  const { data: items, error: itemError } = await supabase
    .from('exercise_builder_import_items')
    .select('id, batch_id, item_index, client_key, entity_type, validation_status, selected, payload, errors, warnings, promoted_entity_id, created_at')
    .in('batch_id', batchIds)
    .order('item_index', { ascending: true });

  if (itemError) throw itemError;
  const itemsByBatch = new Map();
  (items || []).forEach((item) => {
    const list = itemsByBatch.get(item.batch_id) || [];
    list.push(item);
    itemsByBatch.set(item.batch_id, list);
  });

  return (batches || []).map((batch) => ({
    ...batch,
    items: itemsByBatch.get(batch.id) || [],
  }));
}

export async function updateExerciseBuilderImportItemSelection(itemId, selected) {
  const { error } = await supabase
    .from('exercise_builder_import_items')
    .update({ selected })
    .eq('id', itemId)
    .is('promoted_entity_id', null);

  if (error) throw error;
}

export async function promoteExerciseBuilderImportItems(batchId, itemIds) {
  if (!batchId) throw new Error('Batch mancante.');
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error('Seleziona almeno un elemento da promuovere.');
  }

  const { data, error } = await supabase.rpc('promote_exercise_builder_import_batch', {
    p_batch_id: batchId,
    p_item_ids: itemIds,
  });

  if (error) throw error;
  return data;
}

export async function deleteExerciseBuilderImportBatch(batchId) {
  const { data, error } = await supabase.rpc('admin_delete_exercise_builder_import_batch', {
    p_batch_id: batchId,
  });
  if (error) throw error;
  return data || {};
}
