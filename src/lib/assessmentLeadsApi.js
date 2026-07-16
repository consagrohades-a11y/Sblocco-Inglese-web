import { supabase } from './supabaseClient.js';

function firstRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export async function submitAssessmentLead(payload) {
  const { data, error } = await supabase.rpc('submit_public_assessment_lead', { p_payload: payload });
  if (error) throw error;
  return firstRow(data);
}

export async function loadAssessmentResult(token) {
  const { data, error } = await supabase.rpc('get_public_assessment_result', { p_token: token });
  if (error) throw error;
  return firstRow(data);
}

export async function requestAssessmentFollowup(token, followupType) {
  const { data, error } = await supabase.rpc('request_public_assessment_followup', {
    p_token: token,
    p_followup_type: followupType,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function markAssessmentEmailStatus(token, status) {
  const { error } = await supabase.rpc('mark_public_assessment_email_status', {
    p_token: token,
    p_status: status,
  });
  if (error) throw error;
}

export async function loadAssessmentLeads() {
  const { data, error } = await supabase.rpc('admin_list_assessment_leads');
  if (error) throw error;
  return data || [];
}

export async function updateAssessmentLead(id, updates) {
  const { data, error } = await supabase.rpc('admin_update_assessment_lead', {
    p_id: id,
    p_status: updates.status,
    p_notes: updates.notes ?? null,
  });
  if (error) throw error;
  return firstRow(data);
}
