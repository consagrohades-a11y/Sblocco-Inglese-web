import { supabase } from './supabaseClient.js';

export async function listQuickAssignLearners() {
  const { data, error } = await supabase.rpc('admin_list_learners');
  if (error) throw error;

  return (data || [])
    .filter((learner) => learner?.status !== 'deleted')
    .sort((a, b) => String(a.display_name || a.email || '').localeCompare(String(b.display_name || b.email || '')));
}

export async function quickAssignStudioExercise({
  learnerId,
  exerciseId,
  assignmentTitle = null,
  deadlineAt = null,
  required = true,
  completionRule = 'passed',
  requiredScore = 70,
  requiredAttempts = 1,
  allowRetry = true,
  showScore = true,
  showCorrectAnswers = true,
  showExplanations = true,
  showDiagnosticSummary = true,
}) {
  if (!learnerId) throw new Error('Choose a learner.');
  if (!exerciseId) throw new Error('Publish the activity before assigning it.');

  const { data, error } = await supabase.rpc('admin_quick_assign_exercise', {
    p_learner_id: learnerId,
    p_exercise_id: exerciseId,
    p_assignment_title: assignmentTitle?.trim() || null,
    p_deadline_at: deadlineAt || null,
    p_required: Boolean(required),
    p_completion_rule: completionRule,
    p_required_score: Number(requiredScore),
    p_required_attempts: Number(requiredAttempts),
    p_allow_retry: Boolean(allowRetry),
    p_show_score: Boolean(showScore),
    p_show_correct_answers: Boolean(showCorrectAnswers),
    p_show_explanations: Boolean(showExplanations),
    p_show_diagnostic_summary: Boolean(showDiagnosticSummary),
  });

  if (error) throw error;
  return data;
}
