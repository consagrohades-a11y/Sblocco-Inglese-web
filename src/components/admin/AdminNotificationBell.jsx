import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { loadTeacherUnreadCount, markAllTeacherNotificationsRead, subscribeToTeacherNotifications } from '../../lib/teacherNotificationsApi.js';

export default function AdminNotificationBell({ compact = false, onNavigate, tone = 'dark' }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setUnreadCount(await loadTeacherUnreadCount());
    } catch {
      // Notifications should never block the admin shell.
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    refresh();
    return subscribeToTeacherNotifications(user.id, refresh);
  }, [refresh, user?.id]);

  function openNotifications() {
    setUnreadCount(0);
    markAllTeacherNotificationsRead().catch(() => {
      // A later realtime event reconciles the badge if the write fails.
    });
    onNavigate?.();
  }

  if (compact) {
    const compactClass = tone === 'light'
      ? 'border-ink/15 bg-white text-ink shadow-sm hover:border-clay hover:text-clay dark:border-white/15 dark:bg-white/10 dark:text-white'
      : 'border-white/15 text-white/80 hover:bg-white/10 hover:text-white';

    return (
      <Link
        to="/admin/notifications"
        onClick={openNotifications}
        className={`focus-ring relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${compactClass}`}
        aria-label={unreadCount ? `Notifiche, ${unreadCount} nuove` : 'Notifiche'}
        title="Notifiche"
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[0.62rem] font-black text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      to="/admin/notifications"
      onClick={openNotifications}
      className="focus-ring mt-2 flex min-h-10 items-center justify-between gap-3 rounded-xl border border-white/15 px-3 py-2 text-xs font-black text-white/85 transition hover:bg-white/10 hover:text-white"
    >
      <span className="flex items-center gap-2">
        <Bell aria-hidden="true" className="h-4 w-4" />
        Notifiche
      </span>
      {unreadCount ? (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-clay px-1.5 text-[0.65rem] font-black text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
