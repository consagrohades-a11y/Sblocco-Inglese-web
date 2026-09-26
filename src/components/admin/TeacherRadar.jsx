import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ClipboardCheck, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadExerciseAttemptResults } from '../../lib/exerciseResultsApi.js';
import { loadTeacherNotifications } from '../../lib/teacherNotificationsApi.js';

function ageLabel(value) {
  if (!value) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'adesso';
  if (minutes < 60) return minutes + ' min fa';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? ' ora fa' : ' ore fa');
  const days = Math.floor(hours / 24);
  return days + (days === 1 ? ' giorno fa' : ' giorni fa');
}

export default function TeacherRadar() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      loadExerciseAttemptResults(120),
      loadTeacherNotifications(40),
    ]).then(([attemptResult, notificationResult]) => {
      if (!active) return;

      const attemptsAvailable = attemptResult.status === 'fulfilled';
      const notificationsAvailable = notificationResult.status === 'fulfilled';

      setAttempts(attemptsAvailable ? (attemptResult.value || []) : []);
      setNotifications(
        notificationsAvailable
          ? (notificationResult.value?.notifications || [])
          : [],
      );
      setDegraded(!attemptsAvailable || !notificationsAvailable);
      setLoading(false);
    });

    return () => { active = false; };
  }, []);

  const pendingReviews = useMemo(() => attempts
    .filter((attempt) => attempt.status === 'submitted' && attempt.review_status === 'unreviewed')
    .sort((a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0)), [attempts]);

  const newLearners = useMemo(() => notifications
    .filter((notification) => notification.notification_type === 'learner_signed_up' && !notification.read_at)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)), [notifications]);

  const tasks = [
    ...pendingReviews.slice(0, 3).map((attempt) => ({
      key: 'review:' + attempt.id,
      kind: 'review',
      Icon: ClipboardCheck,
      eyebrow: 'Da revisionare',
      title: attempt.learner_name || 'Studente',
      detail: attempt.exercise_title || attempt.assignment_title || 'Esercizio inviato',
      meta: ageLabel(attempt.submitted_at || attempt.started_at),
      to: '/admin/content/exercises/results?attemptId=' + attempt.id,
    })),
    ...newLearners.slice(0, 2).map((notification) => ({
      key: 'learner:' + notification.id,
      kind: 'learner',
      Icon: UserPlus,
      eyebrow: 'Nuovo studente',
      title: notification.learner?.display_name || notification.metadata?.learner_name || 'Nuovo learner',
      detail: [notification.learner?.profession, notification.learner?.age ? notification.learner.age + ' anni' : ''].filter(Boolean).join(' · ') || notification.message,
      meta: ageLabel(notification.created_at),
      to: notification.route,
    })),
  ].slice(0, 5);

  return (
    <section className="mt-7 overflow-hidden rounded-[1.6rem] border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 px-5 py-5 dark:border-white/10 sm:px-6">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-clay dark:text-coral">Teacher Radar</p>
          <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Cosa richiede te, adesso.</h2>
          <p className="mt-1 text-sm font-semibold text-ink/50 dark:text-white/50">Solo decisioni umane. Il resto resta fuori dalla tua vista.</p>
        </div>
        {!loading ? (
          <div className="flex gap-2">
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-900 dark:bg-orange-300/10 dark:text-orange-100">{pendingReviews.length} review</span>
            <span className="rounded-full bg-linen px-3 py-1.5 text-xs font-black text-ink/55 dark:bg-white/[0.06] dark:text-white/55">{newLearners.length} nuovi</span>
          </div>
        ) : null}
      </header>

      {degraded && !loading ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-bold text-amber-900 dark:border-amber-300/15 dark:bg-amber-300/[0.06] dark:text-amber-100 sm:px-6">
          Alcuni dati non sono disponibili in questo momento; il Radar mostra comunque tutto ciò che è riuscito a leggere.
        </div>
      ) : null}

      {loading ? (
        <div className="p-6 text-sm font-semibold text-ink/45 dark:text-white/45">Controllo cosa richiede attenzione…</div>
      ) : tasks.length ? (
        <div className="divide-y divide-ink/10 dark:divide-white/10">
          {tasks.map((task) => {
            const Icon = task.Icon;
            return (
              <Link key={task.key} to={task.to} className="focus-ring group grid gap-3 px-5 py-4 transition hover:bg-linen/35 dark:hover:bg-white/[0.03] sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                <span className={task.kind === 'review' ? 'grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-800 dark:bg-orange-300/10 dark:text-orange-100' : 'grid h-10 w-10 place-items-center rounded-xl bg-[#e7edf2] text-[#35536a] dark:bg-white/10 dark:text-white/80'}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.62rem] font-black uppercase tracking-[0.11em] text-ink/35 dark:text-white/35">{task.eyebrow}</span>
                  <strong className="mt-0.5 block truncate text-sm font-black text-ink dark:text-white">{task.title}</strong>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-ink/50 dark:text-white/50">{task.detail}</span>
                </span>
                <span className="flex items-center gap-2 text-xs font-black text-clay dark:text-coral">{task.meta}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="p-6">
          <p className="text-lg font-black text-ink dark:text-white">Radar pulito.</p>
          <p className="mt-1 text-sm font-semibold text-ink/50 dark:text-white/50">Nessuna review o nuova registrazione richiede una tua decisione in questo momento.</p>
        </div>
      )}
    </section>
  );
}
