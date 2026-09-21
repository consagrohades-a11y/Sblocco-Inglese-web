import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import {
  loadTeacherUnreadCount,
  subscribeToTeacherNotifications,
} from '../../lib/teacherNotificationsApi.js';

export default function AdminNotificationBell({ compact = false, onNavigate }) {
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
    refresh();
    const unsubscribe = subscribeToTeacherNotifications(user?.id, refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh, user?.id]);

  if (compact) {
    return (
      <Link
        to="/admin/notifications"
        onClick={onNavigate}
        className="focus-ring relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
        aria-label={unreadCount ? `Notifiche, ${unreadCount} non lette` : 'Notifiche'}
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
      onClick={onNavigate}
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
