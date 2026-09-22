import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { loadLearnerUnreadCount } from '../../lib/learnerNotificationsApi.js';

export default function LearnerNotificationBell({ mobile = false, onNavigate }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setUnreadCount(await loadLearnerUnreadCount());
    } catch {
      // Notifications must never block learner navigation.
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    refresh();
    const timer = window.setInterval(refresh, 20000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh, user?.id]);

  const label = unreadCount
    ? `Notifiche, ${unreadCount} non lette`
    : 'Notifiche';

  if (mobile) {
    return (
      <Link
        to="/attivita/esercizi#learner-notifications"
        onClick={onNavigate}
        className="focus-ring flex min-h-12 items-center justify-between rounded-2xl bg-ink/[0.04] px-4 py-3 text-base font-extrabold text-ink/80 transition hover:bg-ink/[0.08] hover:text-ink dark:bg-white/[0.05] dark:text-white/80 dark:hover:bg-white/[0.10] dark:hover:text-white"
        aria-label={label}
      >
        <span className="flex items-center gap-3">
          <Bell aria-hidden="true" className="h-5 w-5 text-clay dark:text-[#f0a27d]" />
          Notifiche
        </span>
        {unreadCount ? (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-coral px-1.5 text-[0.65rem] font-black text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      to="/attivita/esercizi#learner-notifications"
      className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 bg-white/70 text-ink transition hover:border-coral/40 hover:bg-white dark:border-white/12 dark:bg-white/[0.055] dark:text-white dark:hover:bg-white/[0.09]"
      aria-label={label}
      title="Notifiche"
    >
      <Bell aria-hidden="true" className="h-4.5 w-4.5" />
      {unreadCount ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[0.62rem] font-black text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
