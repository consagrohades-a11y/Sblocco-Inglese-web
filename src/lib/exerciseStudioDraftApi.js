import { supabase } from './supabaseClient.js';
import { normalizeStudioDocument } from './exerciseStudioDocument.js';

function metadataFromDocument(document) {
  return {
    internal_title: document.internal_title || '',
    learner_title: document.learner_title || '',
    level: document.level || 'A2',
    topic: document.topic || '',
    activity_type: document.activity_type || 'exercise',
    status: document.status || 'draft',
    schema_version: Number(document.schema_version) || 1,
    document,
  };
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user?.id || null;
}

export async function listStudioDrafts({ status = null, search = '' } = {}) {
  let query = supabase
    .from('exercise_studio_drafts')
    .select('id, exercise_id, folder_id, internal_title, learner_title, level, topic, activity_type, status, origin, schema_version, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (search.trim()) {
    const escaped = search.trim().replace(/[,%]/g, '');
    query = query.or(`internal_title.ilike.%${escaped}%,learner_title.ilike.%${escaped}%,topic.ilike.%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function loadStudioDraft(draftId) {
  const { data, error } = await supabase
    .from('exercise_studio_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (error) throw error;
  const normalized = normalizeStudioDocument(data.document || {});
  return {
    ...data,
    document: normalized.document,
    repairs: normalized.repairs,
  };
}

export async function createStudioDraft(rawDocument, { origin = 'manual' } = {}) {
  const userId = await currentUserId();
  const normalized = normalizeStudioDocument(rawDocument).document;
  const payload = {
    ...metadataFromDocument(normalized),
    origin,
    created_by: userId,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('exercise_studio_drafts')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function saveStudioDraft(draftId, rawDocument) {
  const userId = await currentUserId();
  const normalized = normalizeStudioDocument(rawDocument).document;
  const payload = {
    ...metadataFromDocument(normalized),
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('exercise_studio_drafts')
    .update(payload)
    .eq('id', draftId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function archiveStudioDraft(draftId) {
  const { data, error } = await supabase.rpc('admin_archive_exercise_studio_draft', {
    p_draft_id: draftId,
  });
  if (error) throw error;
  return data;
}

export async function deleteStudioDraft(draftId) {
  const { error } = await supabase
    .from('exercise_studio_drafts')
    .delete()
    .eq('id', draftId);

  if (error) throw error;
}


export async function publishStudioDraft(draftId, runtime) {
  if (!draftId) throw new Error('Save the Studio draft before publishing.');
  if (!runtime || runtime.entity_type !== 'exercise') {
    throw new Error('Studio runtime is not publishable.');
  }

  const { data, error } = await supabase.rpc('admin_publish_exercise_studio_draft', {
    p_draft_id: draftId,
    p_runtime: runtime,
  });

  if (error) throw error;
  return data;
}
