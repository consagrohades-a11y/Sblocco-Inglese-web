import React, { useEffect, useState } from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';
import { loadOwnNextLesson } from '../../lib/nextLessonApi.js';

function formatLessonDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function LearnerNextLessonCard() {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadOwnNextLesson()
      .then((value) => { if (active) setLesson(value); })
      .catch(() => { if (active) setLesson(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading || !lesson) return null;

  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-white via-violet-50/70 to-blush/45 p-6 shadow-sm dark:border-violet-300/20 dark:from-surface-900 dark:via-violet-300/[0.06] dark:to-coral/[0.05] sm:p-8">
      <Sparkles className="pointer-events-none absolute right-8 top-7 h-9 w-9 text-amber-400/70" />
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-sm dark:bg-violet-300 dark:text-surface-950"><CalendarDays className="h-6 w-6" /></span>
        <div className="min-w-0 pr-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-200">Il tuo prossimo incontro</p><h2 className="mt-2 text-2xl font-black text-ink dark:text-white">Nella prossima lezione</h2>{lesson.scheduled_at ? <p className="mt-2 text-sm font-black capitalize text-coral dark:text-[#ffab91]">{formatLessonDate(lesson.scheduled_at)}</p> : null}<p className="mt-4 whitespace-pre-wrap break-words text-base font-semibold leading-7 text-ink/75 dark:text-white/75">{lesson.plan}</p></div>
      </div>
    </section>
  );
}
