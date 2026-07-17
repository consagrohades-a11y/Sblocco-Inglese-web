import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Heart,
  Leaf,
  ListChecks,
  NotebookPen,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import LearnerNotificationsPanel from '../components/learner/LearnerNotificationsPanel.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

function formatDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function firstNameFromProfile(profile, user) {
  const value = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'studente';
  return String(value).trim().split(/\s+/)[0] || 'studente';
}

const statusLabels = {
  published: 'Da fare ora',
  completed: 'Completata',
};

const activeAccents = [
  {
    shell: 'border-coral/20 bg-gradient-to-br from-white via-white to-blush/55 dark:border-coral/20 dark:from-[#211b18] dark:to-coral/[0.07]',
    rail: 'bg-gradient-to-b from-coral to-[#f2a067]',
    badge: 'border-coral/20 bg-blush text-clay dark:border-coral/20 dark:bg-coral/10 dark:text-[#f7a98d]',
    icon: 'bg-blush text-coral dark:bg-coral/10 dark:text-[#ff9678]',
  },
  {
    shell: 'border-[#c9b8dc]/45 bg-gradient-to-br from-white via-white to-[#f2edf8] dark:border-[#9d83bd]/20 dark:from-[#211b18] dark:to-[#9d83bd]/[0.07]',
    rail: 'bg-gradient-to-b from-[#9d83bd] to-[#c57b93]',
    badge: 'border-[#c9b8dc]/45 bg-[#eee8f8] text-[#745b91] dark:border-[#9d83bd]/20 dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]',
    icon: 'bg-[#eee8f8] text-[#745b91] dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]',
  },
  {
    shell: 'border-[#ddb8c5]/45 bg-gradient-to-br from-white via-white to-[#f9edf1] dark:border-[#c57b93]/20 dark:from-[#211b18] dark:to-[#c57b93]/[0.07]',
    rail: 'bg-gradient-to-b from-[#c57b93] to-coral',
    badge: 'border-[#ddb8c5]/45 bg-[#f8e7ed] text-[#9c5870] dark:border-[#c57b93]/20 dark:bg-[#c57b93]/15 dark:text-[#e4aec0]',
    icon: 'bg-[#f8e7ed] text-[#9c5870] dark:bg-[#c57b93]/15 dark:text-[#e4aec0]',
  },
];

function AssignmentCard({ assignment, activeIndex }) {
  const completed = assignment.status === 'completed';
  const accent = completed
    ? {
        shell: 'border-[#a9bda9]/40 bg-gradient-to-br from-white via-white to-[#edf3ed] dark:border-[#8ba58b]/20 dark:from-[#211b18] dark:to-[#8ba58b]/[0.07]',
        rail: 'bg-[#789078]',
        badge: 'border-[#a9bda9]/40 bg-[#e7efe7] text-[#617861] dark:border-[#8ba58b]/20 dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]',
        icon: 'bg-[#e7efe7] text-[#617861] dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]',
      }
    : activeAccents[activeIndex % activeAccents.length];

  return (
    <article className={`relative overflow-hidden rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft sm:p-7 ${accent.shell}`}>
      <div aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${accent.rail}`} />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${accent.icon}`}>
            {completed ? <CheckCircle2 className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${accent.badge}`}>
              {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {statusLabels[assignment.status] || assignment.status}
            </span>
            <h2 className="mt-3 text-xl font-black text-ink dark:text-white sm:text-2xl">{assignment.title}</h2>
            {assignment.learner_note ? <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm font-medium leading-6 text-ink/65 dark:text-white/65">{assignment.learner_note}</p> : null}
          </div>
        </div>

        <Link to={`/assignments/${assignment.id}`} className={`focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-black transition hover:-translate-y-0.5 ${completed ? 'border border-[#a9bda9]/45 bg-white text-[#617861] hover:bg-[#edf3ed] dark:border-[#8ba58b]/20 dark:bg-white/[0.06] dark:text-[#b7cdb7] dark:hover:bg-[#8ba58b]/10' : 'bg-coral text-white shadow-sm hover:bg-clay dark:bg-[#ff9678] dark:text-[#21140f]'}`}>
          {completed ? 'Rivedi attività' : 'Continua attività'}<ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/8 pt-4 text-xs font-bold dark:border-white/8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-ink/60 dark:bg-white/[0.07] dark:text-white/60"><ListChecks className="h-3.5 w-3.5" />{assignment.required ? 'Obbligatoria' : 'Facoltativa'}</span>
        {assignment.estimated_minutes ? <span className="inline-flex items-center gap-1.5 rounded-full bg-butter/65 px-3 py-1.5 text-clay dark:bg-butter/10 dark:text-[#ffd98a]"><Clock3 className="h-3.5 w-3.5" />{assignment.estimated_minutes} min stimati</span> : null}
        {assignment.deadline_at ? <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${completed ? 'bg-[#e7efe7] text-[#617861] dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]' : 'bg-[#f8e7ed] text-[#9c5870] dark:bg-[#c57b93]/15 dark:text-[#e4aec0]'}`}><CalendarClock className="h-3.5 w-3.5" />Scadenza: {formatDate(assignment.deadline_at)}</span> : null}
      </div>
    </article>
  );
}

export default function LearnerAssignments() {
  const { profile, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAssignments() {
      setLoading(true);
      setError('');

      const { data, error: queryError } = await supabase
        .from('assignments')
        .select('id, title, learner_note, status, required, deadline_at, estimated_minutes, published_at, created_at')
        .in('status', ['published', 'completed'])
        .order('created_at', { ascending: false });

      if (!active) return;

      if (queryError) {
        setError('Non è stato possibile caricare le tue attività. Riprova tra poco.');
        setAssignments([]);
      } else {
        const ordered = [...(data ?? [])].sort((a, b) => {
          const statusDifference = Number(a.status === 'completed') - Number(b.status === 'completed');
          if (statusDifference !== 0) return statusDifference;
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
        setAssignments(ordered);
      }

      setLoading(false);
    }

    loadAssignments();

    return () => {
      active = false;
    };
  }, []);

  const firstName = useMemo(() => firstNameFromProfile(profile, user), [profile, user]);
  const activeCount = assignments.filter((assignment) => assignment.status === 'published').length;
  const completedCount = assignments.filter((assignment) => assignment.status === 'completed').length;
  const estimatedMinutes = assignments
    .filter((assignment) => assignment.status === 'published')
    .reduce((sum, assignment) => sum + Number(assignment.estimated_minutes || 0), 0);
  const nearestDeadline = assignments
    .filter((assignment) => assignment.status === 'published' && assignment.deadline_at)
    .sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at))[0]?.deadline_at;

  let activeIndex = 0;

  return (
    <>
      <SEO title="Le mie attività | Sblocco Inglese" description="Attività assegnate nel tuo percorso Sblocco Inglese." />
      <section className="section-shell py-10 dark:bg-[#171310] lg:py-14">
        <div className="mx-auto max-w-5xl">
          <header className="relative overflow-hidden rounded-3xl border border-clay/15 bg-[#fffdf9] shadow-soft dark:border-white/10 dark:bg-[#211b18]">
            <div className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-[#eee8f8] blur-3xl dark:bg-[#9d83bd]/10" />
            <div className="pointer-events-none absolute -bottom-20 left-12 h-52 w-52 rounded-full bg-blush blur-3xl dark:bg-coral/10" />
            <Sun className="pointer-events-none absolute right-10 top-8 h-12 w-12 rotate-12 text-coral/45 dark:text-coral/25" strokeWidth={1.6} />
            <Star className="pointer-events-none absolute right-28 top-24 h-7 w-7 -rotate-12 fill-butter text-clay/55 dark:fill-clay/15 dark:text-[#f7a98d]/50" />

            <div className="relative p-6 sm:p-9 lg:p-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ddb8c5]/45 bg-[#f8e7ed] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#9c5870] dark:border-[#c57b93]/20 dark:bg-[#c57b93]/15 dark:text-[#e4aec0]">
                <Heart className="h-3.5 w-3.5" />Il tuo percorso
              </span>
              <h1 className="mt-5 text-3xl font-black leading-tight text-ink dark:text-white sm:text-5xl">
                Ciao, <span className="text-coral dark:text-[#ff9678]">{firstName}</span>. Le tue attività sono qui.
              </h1>
              <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-ink/65 dark:text-white/65">
                Parti da ciò che devi fare ora. Trovi già istruzioni, scadenze e tempo stimato.
              </p>
            </div>

            <div className="relative grid gap-3 border-t border-clay/10 bg-linen/30 p-5 dark:border-white/10 dark:bg-white/[0.035] sm:grid-cols-4 sm:px-9 lg:px-10">
              <div className="flex items-center gap-3 rounded-2xl border border-coral/15 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blush text-coral dark:bg-coral/10 dark:text-[#ff9678]"><ListChecks className="h-5 w-5" /></span>
                <div><p className="text-xs font-black uppercase tracking-wide text-ink/60 dark:text-white/60">Da fare</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{activeCount}</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#a9bda9]/35 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7efe7] text-[#617861] dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]"><CheckCircle2 className="h-5 w-5" /></span>
                <div><p className="text-xs font-black uppercase tracking-wide text-ink/60 dark:text-white/60">Completate</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{completedCount}</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#c9b8dc]/40 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eee8f8] text-[#745b91] dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]"><NotebookPen className="h-5 w-5" /></span>
                <div><p className="text-xs font-black uppercase tracking-wide text-ink/60 dark:text-white/60">Tempo totale</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{estimatedMinutes ? `${estimatedMinutes} min` : 'Libero'}</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#ddb8c5]/40 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f8e7ed] text-[#9c5870] dark:bg-[#c57b93]/15 dark:text-[#e4aec0]"><CalendarClock className="h-5 w-5" /></span>
                <div><p className="text-xs font-black uppercase tracking-wide text-ink/60 dark:text-white/60">Prossima scadenza</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{nearestDeadline ? formatDate(nearestDeadline) : 'Nessuna'}</p></div>
              </div>
            </div>
          </header>

          <LearnerNotificationsPanel />

          {loading ? <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65 dark:border-white/10 dark:bg-[#211b18] dark:text-white/65">Caricamento attività...</div> : null}
          {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-900 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}

          {!loading && !error && assignments.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[#a9bda9]/45 bg-gradient-to-br from-white to-[#edf3ed] p-8 text-center shadow-sm dark:border-[#8ba58b]/25 dark:from-[#211b18] dark:to-[#8ba58b]/[0.08]">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e7efe7] text-[#617861] dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]"><Leaf className="h-7 w-7" /></span>
              <h2 className="mt-4 text-xl font-black text-ink dark:text-white">Sei in pari</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">Quando verrà pubblicata una nuova attività, la troverai qui.</p>
            </div>
          ) : null}

          {!loading && !error && assignments.length > 0 ? (
            <div className="mt-6 grid gap-5">
              {assignments.map((assignment) => {
                const currentActiveIndex = assignment.status === 'published' ? activeIndex++ : 0;
                return <AssignmentCard key={assignment.id} assignment={assignment} activeIndex={currentActiveIndex} />;
              })}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
