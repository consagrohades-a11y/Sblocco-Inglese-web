import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  loadTeacherNotifications,
  markAllTeacherNotificationsRead,
  markTeacherNotificationRead,
  subscribeToTeacherNotifications,
} from '../lib/teacherNotificationsApi.js';

function formatDate(value) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function NotificationIcon({ type }) {
  const Icon = type === 'learner_signed_up' ? UserPlus : ClipboardCheck;
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay/10 text-clay dark:bg-clay/15 dark:text-[#f0a27d]">
      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
    </span>
  );
}

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const result = await loadTeacherNotifications(60);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare le notifiche.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToTeacherNotifications(user?.id, () => refresh({ quiet: true }));
    return unsubscribe;
  }, [refresh, user?.id]);

  async function openNotification(notification) {
    try {
      if (!notification.read_at) {
        await markTeacherNotificationRead(notification.id);
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )));
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      navigate(notification.route || '/admin');
    } catch (readError) {
      setError(readError.message || 'Non è stato possibile aprire la notifica.');
    }
  }

  async function markAllRead() {
    try {
      await markAllTeacherNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
      setUnreadCount(0);
    } catch (readError) {
      setError(readError.message || 'Non è stato possibile aggiornare le notifiche.');
    }
  }

  return (
    <>
      <SEO title="Notifiche | Sblocco Inglese" description="Aggiornamenti operativi sui tuoi studenti." />
      <section className="section-shell py-8 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <header className="border-b border-ink/10 pb-6 dark:border-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="eyebrow">Studenti</span>
                <h1 className="mt-3 text-3xl font-black text-ink dark:text-white sm:text-4xl">Notifiche</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65 dark:text-white/65">
                  Nuove iscrizioni e attività completate, con accesso diretto al punto che richiede la tua attenzione.
                </p>
              </div>
              {unreadCount ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="focus-ring inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink transition hover:border-clay hover:text-clay dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                >
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  Segna tutte come lette
                </button>
              ) : null}
            </div>
          </header>

          {error ? (
            <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-4 text-sm font-bold text-red-950 dark:bg-red-400/10 dark:text-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-surface-900">
            {loading ? (
              <div className="p-6 text-sm font-bold text-ink/60 dark:text-white/60">Caricamento notifiche...</div>
            ) : null}

            {!loading && !notifications.length ? (
              <div className="grid place-items-center px-6 py-14 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-clay/10 text-clay">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-black text-ink dark:text-white">Tutto tranquillo</h2>
                <p className="mt-1 max-w-md text-sm leading-6 text-ink/60 dark:text-white/60">
                  Qui compariranno le nuove iscrizioni degli studenti e gli esercizi consegnati.
                </p>
              </div>
            ) : null}

            {!loading ? (
              <div className="divide-y divide-ink/10 dark:divide-white/10">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={`flex w-full items-start gap-4 px-5 py-5 text-left transition hover:bg-linen/45 dark:hover:bg-white/[0.04] sm:px-6 ${notification.read_at ? 'opacity-65' : 'bg-clay/[0.045] dark:bg-clay/[0.055]'}`}
                  >
                    <NotificationIcon type={notification.notification_type} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-black text-ink dark:text-white">{notification.title}</strong>
                        {!notification.read_at ? (
                          <span className="rounded-full bg-clay/10 px-2 py-1 text-[0.62rem] font-black uppercase tracking-wide text-clay dark:bg-clay/15 dark:text-[#f0a27d]">
                            Nuovo
                          </span>
                        ) : null}
                      </span>
                      {notification.message ? (
                        <span className="mt-1 block text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">
                          {notification.message}
                        </span>
                      ) : null}
                      <span className="mt-2 block text-xs font-bold text-ink/40 dark:text-white/40">
                        {formatDate(notification.created_at)}
                      </span>
                    </span>
                    <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-ink/30 dark:text-white/30" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
