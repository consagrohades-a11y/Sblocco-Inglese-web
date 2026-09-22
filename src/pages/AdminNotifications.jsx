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
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import LearnerAvatar from '../components/learner/LearnerAvatar.jsx';
import {
  loadTeacherNotifications,
  markAllTeacherNotificationsRead,
  markTeacherNotificationRead,
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

function NotificationAvatar({ notification }) {
  const learner = notification.learner;
  if (!learner) return <NotificationIcon type={notification.notification_type} />;

  return (
    <LearnerAvatar
      avatarKey={learner.avatar_key}
      backgroundKey={learner.avatar_background_key}
      displayName={learner.display_name || learner.email || notification.title}
      size="md"
      eager
      className="ring-2 ring-white shadow-sm dark:ring-surface-900"
    />
  );
}

export default function AdminNotifications() {
  const navigate = useNavigate();
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
    const timer = window.setInterval(() => refresh({ quiet: true }), 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

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
          <AdminPageHeader
            eyebrow="Workspace"
            title="Notifiche"
            description="Le nuove registrazioni hanno priorità. Da qui apri direttamente il profilo learner o il risultato che richiede attenzione."
            actions={unreadCount ? (
              <button
                type="button"
                onClick={markAllRead}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink transition hover:border-clay hover:text-clay dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                Segna tutte come lette
              </button>
            ) : null}
          />

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
                {notifications.map((notification) => {
                  const learner = notification.learner;
                  const learnerName = learner?.display_name || learner?.email || null;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={`flex w-full items-start gap-4 px-5 py-5 text-left transition hover:bg-linen/45 dark:hover:bg-white/[0.04] sm:px-6 ${notification.read_at ? 'opacity-65' : notification.notification_type === 'learner_signed_up' ? 'bg-clay/[0.08] dark:bg-clay/[0.09]' : 'bg-clay/[0.035] dark:bg-clay/[0.045]'}`}
                    >
                      <NotificationAvatar notification={notification} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm font-black text-ink dark:text-white">
                            {learnerName || notification.title}
                          </strong>
                          {notification.notification_type === 'learner_signed_up' ? (
                            <span className="rounded-full border border-clay/20 bg-clay/[0.08] px-2 py-1 text-[0.6rem] font-black uppercase tracking-wide text-clay dark:border-coral/20 dark:bg-coral/10 dark:text-coral">
                              Registrazione
                            </span>
                          ) : null}
                          {!notification.read_at ? (
                            <span className="rounded-full bg-clay/10 px-2 py-1 text-[0.62rem] font-black uppercase tracking-wide text-clay dark:bg-clay/15 dark:text-[#f0a27d]">
                              Nuovo
                            </span>
                          ) : null}
                        </span>

                        {learnerName ? (
                          <span className="mt-1 block text-xs font-black uppercase tracking-[0.08em] text-ink/40 dark:text-white/40">
                            {notification.title}
                          </span>
                        ) : null}

                        {notification.message ? (
                          <span className="mt-1 block text-sm font-semibold leading-6 text-ink/65 dark:text-white/65">
                            {notification.message}
                          </span>
                        ) : null}

                        {learner?.admin_context_note ? (
                          <span className="mt-1.5 block text-xs font-bold leading-5 text-clay dark:text-coral">
                            {learner.admin_context_note}
                          </span>
                        ) : null}

                        <span className="mt-2 block text-xs font-bold text-ink/40 dark:text-white/40">
                          {formatDate(notification.created_at)}
                        </span>
                      </span>
                      <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-ink/30 dark:text-white/30" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
