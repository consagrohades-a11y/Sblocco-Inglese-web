import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  Globe2,
  Heart,
  Leaf,
  ListChecks,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import LearnerNotificationsPanel from '../components/learner/LearnerNotificationsPanel.jsx';
import AuthNotice from '../components/auth/AuthNotice';
import { useAuth } from '../auth/AuthContext.jsx';
import { getAuthErrorMessage } from '../auth/authMessages';
import { supabase } from '../lib/supabaseClient.js';

const languageLabels = { it: 'Italiano', en: 'English' };
const roleLabels = { learner: 'Studente', admin: 'Amministratore' };

function firstNameFromProfile(profile, user) {
  const value = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'studente';
  return String(value).trim().split(/\s+/)[0] || 'studente';
}

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

function DetailRow({ icon: Icon, label, value, tone = 'coral' }) {
  const tones = {
    coral: 'bg-blush text-coral dark:bg-coral/10 dark:text-[#ff9678]',
    sage: 'bg-[#e7efe7] text-[#617861] dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]',
    violet: 'bg-[#eee8f8] text-[#745b91] dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]',
    pink: 'bg-[#f8e7ed] text-[#9c5870] dark:bg-[#c57b93]/15 dark:text-[#e4aec0]',
  };

  return (
    <div className="flex items-center gap-3 border-b border-ink/8 py-4 last:border-b-0 dark:border-white/8">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone] || tones.coral}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-ink/40 dark:text-white/40">{label}</p>
        <p className="mt-1 break-words text-sm font-black text-ink dark:text-white">{value || '-'}</p>
      </div>
    </div>
  );
}

function AssignmentCard({ assignment, index }) {
  const accents = [
    {
      shell: 'border-coral/20 bg-gradient-to-br from-white via-white to-blush/55 dark:border-coral/20 dark:from-[#211b18] dark:to-coral/[0.07]',
      icon: 'bg-blush text-coral dark:bg-coral/10 dark:text-[#ff9678]',
      pill: 'border-coral/20 bg-blush text-clay dark:border-coral/20 dark:bg-coral/10 dark:text-[#f7a98d]',
    },
    {
      shell: 'border-[#a9bda9]/40 bg-gradient-to-br from-white via-white to-[#edf3ed] dark:border-[#8ba58b]/20 dark:from-[#211b18] dark:to-[#8ba58b]/[0.07]',
      icon: 'bg-[#e7efe7] text-[#617861] dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]',
      pill: 'border-[#a9bda9]/40 bg-[#e7efe7] text-[#617861] dark:border-[#8ba58b]/20 dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]',
    },
    {
      shell: 'border-[#c9b8dc]/45 bg-gradient-to-br from-white via-white to-[#f2edf8] dark:border-[#9d83bd]/20 dark:from-[#211b18] dark:to-[#9d83bd]/[0.07]',
      icon: 'bg-[#eee8f8] text-[#745b91] dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]',
      pill: 'border-[#c9b8dc]/45 bg-[#eee8f8] text-[#745b91] dark:border-[#9d83bd]/20 dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]',
    },
  ];
  const accent = accents[index % accents.length];

  return (
    <article className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${accent.shell}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${accent.icon}`}>
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${accent.pill}`}>
                {assignment.status === 'completed' ? 'Completata' : 'Da fare'}
              </span>
              {assignment.estimated_minutes ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/8 bg-white/70 px-2.5 py-1 text-[11px] font-black text-ink/55 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/55">
                  <Clock3 className="h-3.5 w-3.5" />{assignment.estimated_minutes} min
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-lg font-black text-ink dark:text-white">{assignment.title}</h3>
            {assignment.learner_note ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/65 dark:text-white/65">{assignment.learner_note}</p> : null}
            {assignment.deadline_at ? <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-ink/50 dark:text-white/50"><CalendarDays className="h-4 w-4" />Entro {formatDate(assignment.deadline_at)}</p> : null}
          </div>
        </div>
        <Link to={`/assignments/${assignment.id}`} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-clay dark:bg-[#ff9678] dark:text-[#21140f]">
          {assignment.status === 'completed' ? 'Rivedi' : 'Apri'}<ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export default function Account() {
  const { loading, profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const isAdmin = profile?.role === 'admin' && profile?.status === 'active';
  const isLearner = profile?.role === 'learner' && profile?.status === 'active';

  useEffect(() => {
    let active = true;

    async function loadAssignments() {
      if (!isLearner) return;
      setAssignmentsLoading(true);
      const { data } = await supabase
        .from('assignments')
        .select('id, title, learner_note, status, required, deadline_at, estimated_minutes, created_at')
        .in('status', ['published', 'completed'])
        .order('created_at', { ascending: false })
        .limit(3);

      if (active) {
        const ordered = [...(data ?? [])].sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'));
        setAssignments(ordered);
        setAssignmentsLoading(false);
      }
    }

    loadAssignments();
    return () => { active = false; };
  }, [isLearner]);

  async function handleSignOut() {
    setError('');
    setSubmitting(true);
    const { error: signOutError } = await signOut();
    setSubmitting(false);

    if (signOutError) {
      setError(getAuthErrorMessage(signOutError));
      return;
    }

    navigate('/', { replace: true });
  }

  const displayName = profile?.display_name || user?.user_metadata?.display_name || '';
  const firstName = useMemo(() => firstNameFromProfile(profile, user), [profile, user]);
  const language = languageLabels[profile?.interface_language] || profile?.interface_language;
  const role = roleLabels[profile?.role] || profile?.role;
  const activeAssignments = assignments.filter((assignment) => assignment.status === 'published').length;
  const nearestDeadline = assignments
    .filter((assignment) => assignment.status === 'published' && assignment.deadline_at)
    .sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at))[0]?.deadline_at;

  return (
    <>
      <SEO title={`${isLearner ? `Ciao, ${firstName}` : 'Account'} | Sblocco Inglese`} description="Il tuo spazio personale Sblocco Inglese." />
      <section className="section-shell py-10 dark:bg-[#171310] lg:py-14">
        <div className="mx-auto max-w-6xl">
          <header className="relative overflow-hidden rounded-3xl border border-clay/15 bg-[#fffdf9] shadow-soft dark:border-white/10 dark:bg-[#211b18]">
            <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#eee8f8] blur-3xl dark:bg-[#9d83bd]/10" />
            <div className="pointer-events-none absolute -bottom-20 left-16 h-52 w-52 rounded-full bg-blush blur-3xl dark:bg-coral/10" />
            <Star className="pointer-events-none absolute right-10 top-8 h-8 w-8 rotate-12 fill-butter text-clay/55 dark:fill-clay/15 dark:text-[#f7a98d]/55" />
            <Leaf className="pointer-events-none absolute right-28 top-24 h-9 w-9 -rotate-12 text-[#789078]/55 dark:text-[#b7cdb7]/40" strokeWidth={1.6} />

            <div className="relative p-6 sm:p-9 lg:p-11">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c9b8dc]/45 bg-[#eee8f8] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#745b91] dark:border-[#9d83bd]/20 dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]">
                <Sparkles className="h-3.5 w-3.5" />Il tuo spazio
              </span>
              <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight text-ink dark:text-white sm:text-5xl">
                Ciao, <span className="text-coral dark:text-[#ff9678]">{firstName}</span>.{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">Come stai?</span>
                  <span className="absolute inset-x-0 bottom-1 h-3 -rotate-1 rounded-full bg-butter/90 dark:bg-clay/30" aria-hidden="true" />
                </span>
              </h1>
              <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-ink/65 dark:text-white/65">
                Qui trovi ciò che devi fare oggi, i tuoi prossimi passi e le informazioni del tuo account.
              </p>
            </div>

            {isLearner ? (
              <div className="relative grid gap-3 border-t border-clay/10 bg-linen/30 p-5 dark:border-white/10 dark:bg-white/[0.035] sm:grid-cols-3 sm:px-9 lg:px-11">
                <div className="flex items-center gap-3 rounded-2xl border border-coral/15 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blush text-coral dark:bg-coral/10 dark:text-[#ff9678]"><ListChecks className="h-5 w-5" /></span>
                  <div><p className="text-xs font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Da fare</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{activeAssignments} attività</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-[#a9bda9]/35 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7efe7] text-[#617861] dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]"><Leaf className="h-5 w-5" /></span>
                  <div><p className="text-xs font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Il tuo ritmo</p><p className="mt-1 text-sm font-black text-ink dark:text-white">Un passo alla volta</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-[#c9b8dc]/40 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eee8f8] text-[#745b91] dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]"><CalendarDays className="h-5 w-5" /></span>
                  <div><p className="text-xs font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Prossima scadenza</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{nearestDeadline ? formatDate(nearestDeadline) : 'Nessuna urgenza'}</p></div>
                </div>
              </div>
            ) : null}
          </header>

          {isLearner ? <LearnerNotificationsPanel limit={3} /> : null}

          {loading ? <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65 dark:border-white/10 dark:bg-[#211b18] dark:text-white/65">Caricamento profilo...</div> : null}
          {error ? <div className="mt-6"><AuthNotice tone="error">{error}</AuthNotice></div> : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.6fr)]">
            <main className="grid gap-6">
              {isLearner ? (
                <section className="rounded-3xl border border-clay/15 bg-[#fffdf9] p-6 shadow-soft dark:border-white/10 dark:bg-[#211b18] sm:p-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-clay dark:text-[#f7a98d]"><Heart className="h-4 w-4" />Oggi</p>
                      <h2 className="mt-2 text-2xl font-black text-ink dark:text-white sm:text-3xl">Cosa devi fare adesso</h2>
                      <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">Parti da qui e continua fino alla prossima lezione.</p>
                    </div>
                    <Link to="/assignments" className="inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]">Vedi tutte<ArrowRight className="h-4 w-4" /></Link>
                  </div>

                  {assignmentsLoading ? <p className="mt-6 text-sm font-bold text-ink/60 dark:text-white/60">Caricamento attività...</p> : null}
                  {!assignmentsLoading && assignments.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-[#a9bda9]/45 bg-[#edf3ed] p-6 dark:border-[#8ba58b]/25 dark:bg-[#8ba58b]/[0.08]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#617861] dark:bg-white/10 dark:text-[#b7cdb7]"><Leaf className="h-5 w-5" /></span>
                        <div><p className="text-sm font-black text-ink dark:text-white">Sei in pari</p><p className="mt-1 text-sm leading-6 text-ink/60 dark:text-white/60">Quando verrà pubblicata una nuova attività, apparirà qui.</p></div>
                      </div>
                    </div>
                  ) : null}
                  {!assignmentsLoading && assignments.length > 0 ? (
                    <div className="mt-6 grid gap-4">
                      {assignments.map((assignment, index) => <AssignmentCard key={assignment.id} assignment={assignment} index={index} />)}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {isAdmin ? (
                <section className="rounded-3xl border border-[#a9bda9]/40 bg-gradient-to-br from-white to-[#edf3ed] p-7 shadow-soft dark:border-[#8ba58b]/20 dark:from-[#211b18] dark:to-[#8ba58b]/[0.08]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#e7efe7] px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#617861] dark:bg-[#8ba58b]/15 dark:text-[#b7cdb7]"><ShieldCheck className="h-4 w-4" />Accesso amministratore</span>
                  <h2 className="mt-4 text-2xl font-black text-ink dark:text-white">Gestisci Sblocco Inglese</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">Il tuo profilo può accedere agli strumenti di gestione della piattaforma.</p>
                  <Link to="/admin" className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#617861] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#506650]">Apri il pannello admin<ArrowRight className="h-4 w-4" /></Link>
                </section>
              ) : null}
            </main>

            <aside className="grid content-start gap-5">
              <details className="group overflow-hidden rounded-3xl border border-[#c9b8dc]/45 bg-[#fffdf9] shadow-soft dark:border-[#9d83bd]/20 dark:bg-[#211b18]" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 text-sm font-black text-ink dark:text-white [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eee8f8] text-[#745b91] dark:bg-[#9d83bd]/15 dark:text-[#cbb9df]"><UserRound className="h-5 w-5" /></span><span>Il tuo account</span></span>
                  <ChevronDown className="h-5 w-5 text-ink/45 transition group-open:rotate-180 dark:text-white/45" />
                </summary>
                <div className="border-t border-ink/8 px-6 pb-2 dark:border-white/8">
                  <DetailRow icon={UserRound} label="Nome" value={displayName} tone="coral" />
                  <DetailRow icon={Mail} label="Email" value={user?.email} tone="pink" />
                  <DetailRow icon={Globe2} label="Lingua" value={language} tone="sage" />
                  <DetailRow icon={ShieldCheck} label="Tipo di account" value={role} tone="violet" />
                </div>
              </details>

              <button type="button" disabled={submitting} onClick={handleSignOut} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-clay/15 bg-white px-5 py-3 text-sm font-black text-clay shadow-sm transition hover:border-coral/35 hover:bg-blush/45 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/[0.06] dark:text-[#f7a98d] dark:hover:bg-coral/10">
                <LogOut className="h-4 w-4" />{submitting ? 'Uscita in corso...' : 'Esci dall account'}
              </button>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
