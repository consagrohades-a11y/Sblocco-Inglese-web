import { supabase } from './supabaseClient.js';

const OPTIONAL_RPC_CODES = new Set(['42883', 'PGRST202']);

export async function loadLearnerAssignmentProgress(assignmentId) {
  const { data, error } = await supabase.rpc('learner_assignment_progress', {
    p_assignment_id: assignmentId,
  });
  if (!error) return data || null;
  if (OPTIONAL_RPC_CODES.has(error.code)) return null;
  throw error;
}

export async function loadLearnerAssignmentProgressMap(assignments = [], batchSize = 8) {
  const ids = Array.from(new Set((assignments || []).map((assignment) => assignment?.id).filter(Boolean)));
  const progressById = new Map();

  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    const rows = await Promise.all(batch.map(async (assignmentId) => {
      try {
        return [assignmentId, await loadLearnerAssignmentProgress(assignmentId)];
      } catch (error) {
        console.error('Unable to load learner assignment progress', assignmentId, error);
        return [assignmentId, null];
      }
    }));
    rows.forEach(([assignmentId, progress]) => progressById.set(assignmentId, progress));
  }

  return progressById;
}

export function learnerAssignmentState(assignment, progress) {
  if (assignment?.status === 'completed') return 'completed';

  const resources = Array.isArray(progress?.resources) ? progress.resources : [];
  const total = Number(progress?.total_activities || 0);
  const completed = Number(progress?.completed_activities || 0);
  const allDone = total > 0 && completed >= total;
  const waitingForReview = resources.some((resource) => resource?.state === 'review');

  if (allDone && waitingForReview) return 'review';
  if (allDone) return 'completed';
  return 'published';
}

export async function decorateLearnerAssignmentsWithProgress(assignments = []) {
  const progressById = await loadLearnerAssignmentProgressMap(assignments);
  return (assignments || []).map((assignment) => {
    const learnerProgress = progressById.get(assignment.id) || null;
    return {
      ...assignment,
      learner_progress: learnerProgress,
      learner_state: learnerAssignmentState(assignment, learnerProgress),
    };
  });
}
