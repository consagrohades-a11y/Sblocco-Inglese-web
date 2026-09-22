import { supabase } from "./supabaseClient.js";

function throwIfError(error) {
  if (error) throw error;
}

export async function loadLearnerNotifications(limit = 20, { archived = false } = {}) {
  let listQuery = supabase
    .from("learner_notifications")
    .select(
      "id, notification_type, milestone_key, title, message, route, related_attempt_id, related_assignment_id, created_at, read_at, archived_at",
    )
    .order(archived ? "archived_at" : "created_at", { ascending: false })
    .limit(limit);

  listQuery = archived
    ? listQuery.not("archived_at", "is", null)
    : listQuery.is("archived_at", null);

  const [listResult, unreadResult] = await Promise.all([
    listQuery,
    supabase
      .from("learner_notifications")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .is("read_at", null),
  ]);
  throwIfError(listResult.error || unreadResult.error);
  return {
    notifications: listResult.data || [],
    unreadCount: unreadResult.count || 0,
  };
}

export async function loadLearnerMilestoneProgress() {
  const { data, error } = await supabase.rpc("get_learner_milestone_progress");
  throwIfError(error);
  return data || { srs_reviews: 0, mastered_cards: 0, next_srs_milestone: 10, reviews_to_next_milestone: 10 };
}

export async function markLearnerNotificationRead(notificationId) {
  const { error } = await supabase.rpc("mark_learner_notification_read", {
    p_notification_id: notificationId,
  });
  throwIfError(error);
}

export async function markAllLearnerNotificationsRead() {
  const { error } = await supabase.rpc("mark_all_learner_notifications_read");
  throwIfError(error);
}

export async function archiveLearnerNotification(notificationId) {
  const { error } = await supabase.rpc("archive_learner_notification", {
    p_notification_id: notificationId,
  });
  throwIfError(error);
}

export async function archiveLearnerReviewNotificationsForAttempt(attemptId) {
  const { error } = await supabase.rpc("archive_learner_review_notifications_for_attempt", {
    p_attempt_id: attemptId,
  });
  throwIfError(error);
}

export async function loadLearnerUnreadCount() {
  const { count, error } = await supabase
    .from("learner_notifications")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .is("read_at", null);
  throwIfError(error);
  return count || 0;
}
