import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function loadExerciseAttemptResults(limit = 200) {
  const { data, error } = await supabase.rpc('admin_list_exercise_builder_attempts', {
    p_limit: limit,
  });
  throwIfError(error);
  return Array.isArray(data) ? data : [];
}

export async function loadExerciseAttemptDetail(attemptId) {
  const { data, error } = await supabase.rpc('admin_get_exercise_builder_attempt_detail', {
    p_attempt_id: attemptId,
  });
  throwIfError(error);
  return data || null;
}

export async function saveExerciseAttemptReview({
  attemptId,
  reviews = [],
  teacherNote = '',
  reviewStatus = 'reviewed',
}) {
  const { data, error } = await supabase.rpc('admin_save_exercise_builder_attempt_review', {
    p_attempt_id: attemptId,
    p_reviews: reviews.map((review) => ({
      attempt_question_id: review.attemptQuestionId,
      clear_override: Boolean(review.clearOverride),
      status: review.status || null,
      earned_points: review.earnedPoints ?? null,
      comment: review.comment || null,
    })),
    p_teacher_note: teacherNote || null,
    p_review_status: reviewStatus,
  });
  throwIfError(error);
  return data;
}
