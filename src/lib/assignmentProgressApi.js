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
  const resources = Array.isArray(progress?.resources) ? progress.resources : [];
  const total = Number(progress?.total_activities || 0);
  const completed = Number(progress?.completed_activities || 0);
  const allDone = total > 0 && completed >= total;
  const waitingForReview = resources.some((resource) => resource?.state === 'review');

  if (waitingForReview && allDone) return 'review';
  if (assignment?.status === 'completed') return 'completed';
  if (allDone) return 'completed';
  return 'published';
}

export function learnerAssignmentProgressPercent(assignment, progress) {
  const explicit = Number(progress?.progress_percent);
  if (Number.isFinite(explicit)) return Math.max(0, Math.min(100, explicit));
  if (assignment?.status === 'completed') return 100;

  const total = Number(progress?.total_activities || 0);
  const completed = Number(progress?.completed_activities || 0);
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 1000) / 10));
}

export async function decorateLearnerAssignmentsWithProgress(assignments = []) {
  const progressById = await loadLearnerAssignmentProgressMap(assignments);
  return (assignments || []).map((assignment) => {
    const learnerProgress = progressById.get(assignment.id) || null;
    return {
      ...assignment,
      learner_progress: learnerProgress,
      learner_progress_percent: learnerAssignmentProgressPercent(assignment, learnerProgress),
      learner_state: learnerAssignmentState(assignment, learnerProgress),
    };
  });
}
