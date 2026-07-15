import { supabase } from "./supabaseClient.js";

function throwIfError(error) {
  if (error) throw error;
}

export async function loadLearnerNotifications(limit = 20) {
  const [listResult, unreadResult] = await Promise.all([
    supabase
      .from("learner_notifications")
      .select(
        "id, notification_type, title, message, route, related_attempt_id, created_at, read_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("learner_notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);
  throwIfError(listResult.error || unreadResult.error);
  return {
    notifications: listResult.data || [],
    unreadCount: unreadResult.count || 0,
  };
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
