import { supabase } from './supabaseClient.js';

const OPTIONAL_RPC_CODES = new Set(['42883', 'PGRST202']);

export async function loadLearnerAssignmentProgress(assignmentId) {
  const { data, error } = await supabase.rpc('learner_assignment_progress', {
    p_assignment_id: assignmentId,
  });
  if (!error) return data || null;
  if (OPTIONAL_RPC_CODES.has(error.code) || /learner_assignment_progress/i.test(error.message || '')) return null;
  throw error;
}
