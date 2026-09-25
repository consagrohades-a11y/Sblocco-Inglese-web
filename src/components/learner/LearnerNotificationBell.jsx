import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import {
  archiveLearnerNotification,
  loadLearnerNotifications,
  loadLearnerUnreadCount,
  markAllLearnerNotificationsRead,
  subscribeToLearnerNotifications,
} from '../../lib/learnerNotificationsApi.js';

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function LearnerNotificationBell({ mobile = false, onNavigate }) {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.access_token) {
      setUnreadCount(0);
      return;
    }
    try {
      setUnreadCount(await loadLearnerUnreadCount());
    } catch {
      // Notifications must never block learner navigation.
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!user?.id || !session?.access_token) return undefined;

    refresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeToLearnerNotifications(user.id, refresh);
    } catch {
      // Visibility refresh remains as a safe fallback when realtime is unavailable.
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      try {
        unsubscribe();
      } catch {
        // Cleanup must never block learner navigation.
      }
    };
  }, [refresh, session?.access_token, user?.id]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function clearUnread() {
    if (!unreadCount || !session?.access_token) return;
    setUnreadCount(0);
    try {
      await markAllLearnerNotificationsRead();
    } catch {
      // Keep the badge cleared for this interaction; next refresh can reconcile.
    }
  }

  async function openDropdown() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;

    if (!session?.access_token) {
      setNotifications([]);
      setLoadingPreview(false);
      return;
    }

    clearUnread();
    setLoadingPreview(true);
    try {
      const result = await loadLearnerNotifications(6);
      const now = new Date().toISOString();
      setNotifications((result.notifications || []).map((item) => ({
        ...item,
        read_at: item.read_at || now,
      })));
    } catch {
      setNotifications([]);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function openNotification(notification) {
    const operational = ['assignment_published', 'writing_review_published', 'exercise_review_published']
      .includes(notification.notification_type);
    setOpen(false);
    if (operational) {
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      archiveLearnerNotification(notification.id).catch(() => {
        // Navigation should not be blocked by notification housekeeping.
      });
    }
    onNavigate?.();
    navigate(notification.route || '/assignments');
  }

  const label = unreadCount
    ? `Notifiche, ${unreadCount} nuove`
    : 'Notifiche';

  if (mobile) {
    return (
      <Link
        to="/attivita/esercizi#learner-notifications"
        onClick={() => {
          clearUnread();
          onNavigate?.();
        }}
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={openDropdown}
        className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 bg-white/70 text-ink transition hover:border-coral/40 hover:bg-white dark:border-white/12 dark:bg-white/[0.055] dark:text-white dark:hover:bg-white/[0.09]"
        aria-label={label}
        aria-expanded={open}
        title="Notifiche"
      >
        <Bell aria-hidden="true" className="h-4.5 w-4.5" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[0.62rem] font-black text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-[90] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink/10 bg-[#fffdf9] shadow-2xl dark:border-white/10 dark:bg-surface-900">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3.5 dark:border-white/10">
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-clay dark:text-coral">Aggiornamenti</p>
              <p className="mt-0.5 text-sm font-black text-ink dark:text-white">Notifiche</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="focus-ring grid h-8 w-8 place-items-center rounded-full text-ink/45 hover:bg-ink/[0.05] dark:text-white/45 dark:hover:bg-white/[0.08]" aria-label="Chiudi notifiche">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loadingPreview ? <p className="px-4 py-5 text-sm font-semibold text-ink/50 dark:text-white/50">Caricamento…</p> : null}
            {!loadingPreview && !notifications.length ? <p className="px-4 py-6 text-sm font-semibold text-ink/50 dark:text-white/50">Nessun nuovo aggiornamento.</p> : null}
            {!loadingPreview ? notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => openNotification(notification)}
                className="flex w-full items-start gap-3 border-b border-ink/8 px-4 py-4 text-left transition last:border-b-0 hover:bg-linen/55 dark:border-white/8 dark:hover:bg-white/[0.05]"
              >
                <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-coral/10 text-coral"><Bell className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-black text-ink dark:text-white">{notification.title}</strong>
                  {notification.message ? <span className="mt-1 block line-clamp-2 text-xs font-semibold leading-5 text-ink/55 dark:text-white/55">{notification.message}</span> : null}
                  <span className="mt-1.5 block text-[0.65rem] font-bold text-ink/35 dark:text-white/35">{formatDate(notification.created_at)}</span>
                </span>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-clay" />
              </button>
            )) : null}
          </div>

          <Link
            to="/attivita/esercizi#learner-notifications"
            onClick={() => setOpen(false)}
            className="focus-ring flex min-h-11 items-center justify-between border-t border-ink/10 px-4 text-xs font-black text-ink transition hover:bg-linen/50 dark:border-white/10 dark:text-white dark:hover:bg-white/[0.05]"
          >
            Vedi tutti gli aggiornamenti
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
