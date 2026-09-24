import { supabase } from './supabaseClient.js';

function throwIfError(error) {
  if (error) throw error;
}

export async function loadTeacherNotifications(limit = 40, { archived = false } = {}) {
  let listQuery = supabase
    .from('teacher_notifications')
    .select('id, notification_type, title, message, route, related_learner_id, related_attempt_id, metadata, created_at, read_at, archived_at')
    .order(archived ? 'archived_at' : 'created_at', { ascending: false })
    .limit(limit);

  listQuery = archived
    ? listQuery.not('archived_at', 'is', null)
    : listQuery.is('archived_at', null);

  const [listResult, unreadResult, learnersResult] = await Promise.all([
    listQuery,
    supabase
      .from('teacher_notifications')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .is('read_at', null),
    supabase.rpc('admin_list_learners'),
  ]);

  throwIfError(listResult.error || unreadResult.error);

  const learnerById = new Map(
    (learnersResult.error ? [] : (learnersResult.data || []))
      .map((learner) => [learner.id, learner]),
  );

  return {
    notifications: (listResult.data || []).map((notification) => ({
      ...notification,
      learner: notification.related_learner_id
        ? learnerById.get(notification.related_learner_id) || null
        : null,
    })),
    unreadCount: unreadResult.count || 0,
  };
}

export async function loadTeacherUnreadCount() {
  const { count, error } = await supabase
    .from('teacher_notifications')
    .select('id', { count: 'exact', head: true })
    .is('archived_at', null)
    .is('read_at', null);

  throwIfError(error);
  return count || 0;
}

export async function markTeacherNotificationRead(notificationId) {
  const { error } = await supabase.rpc('mark_teacher_notification_read', {
    p_notification_id: notificationId,
  });
  throwIfError(error);
}

export async function markAllTeacherNotificationsRead() {
  const { error } = await supabase.rpc('mark_all_teacher_notifications_read');
  throwIfError(error);
}

export async function archiveTeacherNotification(notificationId) {
  const { error } = await supabase.rpc('archive_teacher_notification', {
    p_notification_id: notificationId,
  });
  throwIfError(error);
}

export function subscribeToTeacherNotifications(teacherId, onChange) {
  if (!teacherId) return () => {};

  let channel = null;
  try {
    channel = supabase
      .channel(`teacher-notifications:${teacherId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_notifications',
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          try {
            onChange?.();
          } catch {
            // Notification refresh failures must never break the surrounding UI.
          }
        },
      )
      .subscribe();
  } catch {
    return () => {};
  }

  return () => {
    if (!channel) return;
    try {
      supabase.removeChannel(channel);
    } catch {
      // Realtime cleanup must never block navigation or unmounting.
    }
  };
}
