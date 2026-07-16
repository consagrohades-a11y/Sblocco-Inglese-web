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
  const [{ data, error }, { data: turnRows, error: turnError }] = await Promise.all([
    supabase.rpc('admin_get_exercise_builder_attempt_detail', { p_attempt_id: attemptId }),
    supabase.from('exercise_builder_attempt_questions').select('id, teacher_turn_reviews').eq('attempt_id', attemptId),
  ]);
  throwIfError(error);
  throwIfError(turnError);
  if (!data) return null;
  const turnReviews = new Map((turnRows || []).map((row) => [row.id, row.teacher_turn_reviews || {}]));
  return {
    ...data,
    sections: (data.sections || []).map((section) => ({
      ...section,
      questions: (section.questions || []).map((question) => ({ ...question, teacher_turn_reviews: turnReviews.get(question.id) || {} })),
    })),
  };
}

export async function saveExerciseAttemptReview({
  attemptId,
  reviews = [],
  teacherNote = '',
  reviewStatus = 'reviewed',
}) {
  const normalizedReviews = reviews.map((review) => ({
    attempt_question_id: review.attemptQuestionId,
    clear_override: Boolean(review.clearOverride),
    status: review.status || null,
    earned_points: review.earnedPoints ?? null,
    comment: review.comment || null,
    turn_reviews: review.turnReviews || {},
  }));
  const { error: turnError } = await supabase.rpc('admin_save_exercise_builder_attempt_turn_reviews', {
    p_attempt_id: attemptId,
    p_reviews: normalizedReviews,
  });
  throwIfError(turnError);
  const { data, error } = await supabase.rpc('admin_save_exercise_builder_attempt_review', {
    p_attempt_id: attemptId,
    p_reviews: normalizedReviews,
    p_teacher_note: teacherNote || null,
    p_review_status: reviewStatus,
  });
  throwIfError(error);
  const turnReviews = new Map(normalizedReviews.map((review) => [review.attempt_question_id, review.turn_reviews]));
  return {
    ...data,
    sections: (data?.sections || []).map((section) => ({
      ...section,
      questions: (section.questions || []).map((question) => ({ ...question, teacher_turn_reviews: turnReviews.get(question.id) || {} })),
    })),
  };
}
