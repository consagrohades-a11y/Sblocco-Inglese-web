import React, { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  MessageCircleHeart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  loadLearnerNotifications,
  markAllLearnerNotificationsRead,
  markLearnerNotificationRead,
} from "../../lib/learnerNotificationsApi.js";

function formatDate(value) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function LearnerNotificationsPanel({ limit = 6 }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadLearnerNotifications(limit)
      .then((result) => {
        if (active) {
          setNotifications(result.notifications);
          setUnreadCount(result.unreadCount);
        }
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError.message ||
              "Non è stato possibile caricare gli aggiornamenti.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [limit]);

  async function openNotification(notification) {
    try {
      if (!notification.read_at) {
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

  if (!loading && !error && notifications.length === 0) return null;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-[#c9b8dc]/45 bg-gradient-to-br from-white to-[#f2edf8] shadow-sm dark:border-[#9d83bd]/25 dark:from-[#211b18] dark:to-[#9d83bd]/[0.08]">
      <header className="flex flex-col gap-3 border-b border-[#c9b8dc]/35 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#eee8f8] text-[#745b91] dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]">
            <Bell className="h-5 w-5" />
            {unreadCount ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[0.65rem] font-black text-white">
                {unreadCount}
              </span>
            ) : null}
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#745b91] dark:text-[#cbb9df]">
              Aggiornamenti dall’insegnante
            </p>
            <h2 className="mt-1 text-xl font-black text-ink dark:text-white">
              {unreadCount ? "Ho visto i tuoi esercizi!" : "Le tue revisioni"}
            </h2>
          </div>
        </div>
        {unreadCount ? (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-2 self-start text-xs font-black text-[#745b91] underline dark:text-[#cbb9df]"
          >
            <CheckCheck className="h-4 w-4" />
            Segna tutte come lette
          </button>
        ) : null}
      </header>

      {loading ? (
        <p className="p-6 text-sm font-bold text-ink/55 dark:text-white/55">
          Caricamento aggiornamenti...
        </p>
      ) : null}
      {error ? (
        <p className="p-6 text-sm font-bold text-red-800 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {!loading && !error ? (
        <div className="divide-y divide-[#c9b8dc]/30 dark:divide-white/10">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => openNotification(notification)}
              className={`flex w-full items-start gap-4 p-5 text-left transition hover:bg-white/70 dark:hover:bg-white/[0.05] sm:px-7 ${notification.read_at ? "opacity-70" : "bg-white/55 dark:bg-[#9d83bd]/[0.06]"}`}
            >
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notification.read_at ? "bg-white text-ink/40 dark:bg-white/10 dark:text-white/40" : "bg-coral text-white"}`}
              >
                <MessageCircleHeart className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm font-black text-ink dark:text-white">
                    {notification.title}
                  </strong>
                  {!notification.read_at ? (
                    <span className="rounded-full bg-coral/10 px-2 py-1 text-[0.62rem] font-black uppercase text-coral dark:text-[#ff9678]">
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
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#745b91] dark:text-[#cbb9df]" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
