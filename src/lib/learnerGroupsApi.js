import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function loadLearnerGroups() {
  const { data, error } = await supabase.rpc('admin_list_learner_groups');
  throwIfError(error);
  return data || [];
}

export async function loadLearnerGroup(groupId) {
  const { data, error } = await supabase.rpc('admin_get_learner_group', { p_group_id: groupId });
  throwIfError(error);
  return data;
}

export async function saveLearnerGroup(groupId, payload) {
  const { data, error } = await supabase.rpc('admin_save_learner_group', {
    p_group_id: groupId || null,
    p_payload: payload,
  });
  throwIfError(error);
  return data;
}

export async function replaceLearnerGroupMembers(groupId, learnerIds) {
  const { data, error } = await supabase.rpc('admin_replace_learner_group_members', {
    p_group_id: groupId,
    p_learner_ids: learnerIds,
  });
  throwIfError(error);
  return Number(data || 0);
}

export async function createGroupAssignmentBatch({ groupId, sourceAssignmentId, title, learnerNote, adminNote, required, deadlineAt, estimatedMinutes, publishNow }) {
  const { data, error } = await supabase.rpc('admin_create_group_assignment_batch', {
    p_group_id: groupId,
    p_source_assignment_id: sourceAssignmentId,
    p_title: title,
    p_learner_note: learnerNote || null,
    p_admin_note: adminNote || null,
    p_required: required,
    p_deadline_at: deadlineAt || null,
    p_estimated_minutes: estimatedMinutes || null,
    p_publish_now: publishNow,
  });
  throwIfError(error);
  return data;
}

export async function loadAssignmentGroupLinks() {
  const { data, error } = await supabase.rpc('admin_list_assignment_group_links');
  throwIfError(error);
  return data || [];
}
