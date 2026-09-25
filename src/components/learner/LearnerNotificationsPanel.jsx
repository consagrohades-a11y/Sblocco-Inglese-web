import React, { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Bell,
  BookOpenCheck,
  CheckCheck,
  ChevronRight,
  Layers3,
  MessageCircleHeart,
  NotebookPen,
  Target,
  Trophy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import {
  archiveLearnerNotification,
  loadLearnerMilestoneProgress,
  loadLearnerNotifications,
  markAllLearnerNotificationsRead,
  markLearnerNotificationRead,
  subscribeToLearnerNotifications,
} from "../../lib/learnerNotificationsApi.js";

function formatDate(value) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function notificationPresentation(type, read) {
  const muted = "bg-white text-ink/60 dark:bg-white/10 dark:text-white/60";
  if (type === "assignment_published") return {
    Icon: BookOpenCheck,
    iconClass: read ? muted : "bg-coral text-white",
  };
  if (type === "writing_review_published") return {
    Icon: NotebookPen,
    iconClass: read ? muted : "bg-clay text-white dark:bg-[#f0a27d] dark:text-surface-950",
  };
  if (type === "exercise_review_published") return {
    Icon: MessageCircleHeart,
    iconClass: read ? muted : "bg-ink text-white dark:bg-white dark:text-surface-950",
  };
  if (type === "milestone_srs") return {
    Icon: Layers3,
    iconClass: read ? muted : "bg-emerald-600 text-white dark:bg-emerald-300 dark:text-surface-950",
  };
  if (type === "milestone_exercise") return {
    Icon: Trophy,
    iconClass: read ? muted : "bg-amber-500 text-white dark:bg-amber-300 dark:text-surface-950",
  };
  if (type === "milestone_practice") return {
    Icon: Target,
    iconClass: read ? muted : "bg-coral text-white",
  };
  return { Icon: Bell, iconClass: read ? muted : "bg-ink text-white dark:bg-white dark:text-surface-950" };
}

export default function LearnerNotificationsPanel({ limit = 6 }) {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  const [showArchive, setShowArchive] = useState(false);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!session?.access_token) {
      setNotifications([]);
      setUnreadCount(0);
      setProgress(null);
      setError("");
      setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    try {
      const [notificationsResult, milestoneResult] = await Promise.allSettled([
        loadLearnerNotifications(limit, { archived: showArchive }),
        loadLearnerMilestoneProgress(),
      ]);

      if (notificationsResult.status === "fulfilled") {
        setNotifications(notificationsResult.value.notifications);
        setUnreadCount(notificationsResult.value.unreadCount);
        setError("");
      } else {
        setNotifications([]);
        setUnreadCount(0);
        setError(
          notificationsResult.reason?.message ||
            "Non è stato possibile caricare gli aggiornamenti.",
        );
      }

      setProgress(
        milestoneResult.status === "fulfilled"
          ? milestoneResult.value
          : null,
      );
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [limit, session?.access_token, showArchive]);

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false);
      return undefined;
    }

    refresh();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh({ quiet: true });
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let unsubscribe = () => {};
    try {
      unsubscribe = user?.id && session?.access_token
        ? subscribeToLearnerNotifications(user.id, () => refresh({ quiet: true }))
        : () => {};
    } catch {
      // Visibility refresh remains as a safe fallback when realtime is unavailable.
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      try {
        unsubscribe();
      } catch {
        // Cleanup must never block learner navigation.
      }
    };
  }, [refresh, session?.access_token, user?.id]);

  async function openNotification(notification) {
    try {
      const operational = ["assignment_published", "writing_review_published", "exercise_review_published"]
        .includes(notification.notification_type);
      if (!showArchive && operational) {
        await archiveLearnerNotification(notification.id);
        setNotifications((current) => current.filter((item) => item.id !== notification.id));
        if (!notification.read_at) setUnreadCount((current) => Math.max(0, current - 1));
      } else if (!notification.read_at) {
        await markLearnerNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, read_at: new Date().toISOString() }
              : item,
          ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      navigate(notification.route || "/assignments");
    } catch (readError) {
      setError(
        readError.message || "Non è stato possibile aprire la revisione.",
      );
    }
  }

  async function markAllRead() {
    try {
      await markAllLearnerNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at || readAt })),
      );
      setUnreadCount(0);
    } catch (readError) {
      setError(
        readError.message || "Non è stato possibile aggiornare le notifiche.",
      );
    }
  }

  return (
    <section id="learner-notifications" className="mt-6 scroll-mt-28 overflow-hidden rounded-3xl border border-clay/20 bg-[#fffdf9] shadow-sm dark:border-white/10 dark:bg-surface-900">
      <header className="flex flex-col gap-3 border-b border-clay/15 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0e7] text-coral dark:bg-coral/10 dark:text-[#ff9678]">
            <Bell className="h-5 w-5" />
            {unreadCount ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[0.65rem] font-black text-white">
                {unreadCount}
              </span>
            ) : null}
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-coral dark:text-[#ff9678]">
              I tuoi progressi
            </p>
            <h2 className="mt-1 text-xl font-black text-ink dark:text-white">
              {showArchive ? "Archivio notifiche" : unreadCount ? "Nuove attività e revisioni" : "I tuoi aggiornamenti"}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!showArchive && unreadCount ? (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-2 text-xs font-black text-clay underline dark:text-[#f0a27d]"
            >
              <CheckCheck className="h-4 w-4" />
              Segna tutte come lette
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowArchive((value) => !value)}
            className="inline-flex items-center gap-2 text-xs font-black text-ink/55 underline transition hover:text-clay dark:text-white/55 dark:hover:text-coral"
          >
            <Archive className="h-4 w-4" />
            {showArchive ? "Torna agli aggiornamenti" : "Archivio"}
          </button>
        </div>
      </header>

      {loading ? (
        <p className="p-6 text-sm font-bold text-ink/65 dark:text-white/65">
          Caricamento aggiornamenti...
        </p>
      ) : null}
      {error ? (
        <p className="p-6 text-sm font-bold text-red-800 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {!loading && !error && progress ? (
        <div className="border-b border-clay/15 bg-white/45 px-5 py-4 dark:border-white/10 dark:bg-white/[0.025] sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-black text-ink/65 dark:text-white/65"><span>{progress.srs_reviews} ripassi SRS · {progress.mastered_cards} card consolidate</span>{progress.next_srs_milestone ? <span>{progress.reviews_to_next_milestone} al prossimo traguardo</span> : <span>Traguardi SRS completati</span>}</div>
          {progress.next_srs_milestone ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-clay/10 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-coral to-amber-400" style={{ width: `${Math.min(100, (Number(progress.srs_reviews || 0) / Number(progress.next_srs_milestone || 1)) * 100)}%` }} /></div> : null}
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="divide-y divide-clay/15 dark:divide-white/10">
          {!notifications.length ? <p className="p-6 text-sm font-semibold text-ink/60 dark:text-white/60">{showArchive ? "Nessuna notifica archiviata." : "Qui compariranno nuove attività, correzioni e traguardi del tuo percorso."}</p> : null}
          {notifications.map((notification) => {
            const presentation = notificationPresentation(notification.notification_type, Boolean(notification.read_at));
            const NotificationIcon = presentation.Icon;
            return <button
              key={notification.id}
              type="button"
              onClick={() => openNotification(notification)}
              className={`flex w-full items-start gap-4 p-5 text-left transition hover:bg-white/70 dark:hover:bg-white/[0.05] sm:px-7 ${notification.read_at ? "opacity-70" : "bg-white/55 dark:bg-coral/[0.05]"}`}
            >
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${presentation.iconClass}`}
              >
                <NotificationIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm font-black text-ink dark:text-white">
                    {notification.title}
                  </strong>
                  {!notification.read_at ? (
                    <span className="rounded-full bg-coral/10 px-2 py-1 text-[0.62rem] font-bold uppercase text-coral dark:text-[#ff9678]">
                      Nuovo
                    </span>
                  ) : null}
                </span>
                {notification.message ? (
                  <span className="mt-1 block text-sm font-semibold leading-6 text-ink/60 dark:text-white/60">
                    {notification.message}
                  </span>
                ) : null}
                <span className="mt-2 block text-xs font-bold text-ink/35 dark:text-white/35">
                  {formatDate(notification.created_at)}
                </span>
              </span>
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-clay dark:text-[#f0a27d]" />
            </button>;
          })}
        </div>
      ) : null}
    </section>
  );
}
