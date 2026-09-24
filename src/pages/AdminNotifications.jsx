import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import SEO from '../components/SEO';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import LearnerAvatar from '../components/learner/LearnerAvatar.jsx';
import LearnerQuickFacts from '../components/admin/LearnerQuickFacts.jsx';
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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchive, setShowArchive] = useState(false);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const result = await loadTeacherNotifications(60, { archived: showArchive });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Non è stato possibile caricare le notifiche.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [showArchive]);

  useEffect(() => {
    let active = true;

    async function initialise() {
      await refresh();
      if (!active || showArchive) return;
      try {
        await markAllTeacherNotificationsRead();
        if (!active) return;
        const readAt = new Date().toISOString();
        setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
        setUnreadCount(0);
      } catch {
        // Reading the notification center should not fail the page if marking read fails.
      }
    }

    initialise();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh({ quiet: true });
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let unsubscribe = () => {};
    try {
      unsubscribe = user?.id
        ? subscribeToTeacherNotifications(user.id, () => refresh({ quiet: true }))
        : () => {};
    } catch {
      // Visibility refresh remains as a safe fallback when realtime is unavailable.
    }

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      try {
        unsubscribe();
      } catch {
        // Cleanup must never block navigation.
      }
    };
  }, [refresh, showArchive, user?.id]);

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
            title={showArchive ? "Archivio notifiche" : "Notifiche"}
            description={showArchive
              ? "Qui trovi le notifiche operative già risolte. Le registrazioni non vengono archiviate automaticamente."
              : "In primo piano restano solo le notifiche ancora rilevanti. Le consegne già gestite passano automaticamente in archivio."}
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                {!showArchive && unreadCount ? (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink transition hover:border-clay hover:text-clay dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                  >
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    Segna tutte come lette
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowArchive((value) => !value)}
                  className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-black text-ink transition hover:border-clay hover:text-clay dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                >
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  {showArchive ? "Torna alle recenti" : "Archivio"}
                </button>
              </div>
            )}
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
                <h2 className="mt-4 text-lg font-black text-ink dark:text-white">{showArchive ? 'Archivio vuoto' : 'Tutto tranquillo'}</h2>
                <p className="mt-1 max-w-md text-sm leading-6 text-ink/60 dark:text-white/60">
                  {showArchive ? 'Le notifiche operative risolte compariranno qui.' : 'Qui restano le nuove iscrizioni e le attività che richiedono ancora attenzione.'}
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
                      className={`flex w-full items-start gap-4 px-5 py-5 text-left transition hover:bg-linen/45 dark:hover:bg-white/[0.04] sm:px-6 ${notification.read_at ? 'bg-white dark:bg-surface-900' : notification.notification_type === 'learner_signed_up' ? 'bg-clay/[0.08] dark:bg-clay/[0.09]' : 'bg-clay/[0.035] dark:bg-clay/[0.045]'}`}
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

                        {learner ? (
                          <span className="mt-1.5 block text-xs font-bold leading-5 text-ink/60 dark:text-white/60">
                            <LearnerQuickFacts learner={learner} />
                          </span>
                        ) : null}

                        <span className="mt-2 block text-xs font-bold text-ink/40 dark:text-white/40">
                          {formatDate(notification.created_at)}
                        </span>
                      </span>
                      <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-ink/45 dark:text-white/45" aria-hidden="true" />
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
