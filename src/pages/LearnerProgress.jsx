import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Layers3,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient.js';

const trainerScopes = [
  ['word', null],
  ['expression', 'general'],
  ['expression', 'business'],
  ['expression', 'hospitality'],
];

const strongStates = new Set(['strong', 'mastered']);
const learningStates = new Set(['introduced', 'learning', 'reviewing', 'lapsed']);

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDeadline(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function MetricCard({ icon: Icon, eyebrow, value, detail, tone = 'emerald' }) {
  const toneClasses = tone === 'violet'
    ? 'bg-[#8b5cf6]/12 text-[#d3c8ff] ring-[#8b5cf6]/20'
    : 'bg-[#19a684]/12 text-[#9ce8d3] ring-[#19a684]/20';

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${toneClasses}`}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-white/55">{eyebrow}</p>
      <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-white/58">{detail}</p>
    </article>
  );
}

function ProgressBar({ label, value, total, color = 'bg-[#22a988]' }) {
  const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-extrabold text-white/78">{label}</span>
        <span className="font-black text-white">{value}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function buildWeek(reviewHistory) {
  const today = startOfDay();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = dateKey(date);
    return {
      key,
      label: new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(date).replace('.', ''),
      count: reviewHistory.filter((review) => dateKey(new Date(review.created_at)) === key).length,
    };
  });
}

export default function LearnerProgress() {
  const { profile, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [itemIds, setItemIds] = useState([]);
  const [states, setStates] = useState([]);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;

    async function loadProgress() {
      setLoading(true);
      setError('');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [assignmentResponse, historyResponse, ...scopeResponses] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, status, required, deadline_at, updated_at, created_at')
          .in('status', ['published', 'completed'])
          .order('created_at', { ascending: false }),
        supabase
          .from('learner_review_history')
          .select('id, created_at, objective_result, self_rating')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1000),
        ...trainerScopes.map(([itemType, domain]) => supabase.rpc('get_learner_srs_scope', {
          p_item_type: itemType,
          p_domain: domain,
        })),
      ]);

      if (!active) return;

      const queryError = assignmentResponse.error
        || historyResponse.error
        || scopeResponses.find((response) => response.error)?.error;

      if (queryError) {
        setError('Non è stato possibile aggiornare i progressi. Riprova tra poco.');
        setLoading(false);
        return;
      }

      const uniqueIds = [...new Set(scopeResponses.flatMap((response) => response.data?.item_ids ?? []))];
      const stateMap = new Map();
      scopeResponses.forEach((response) => {
        (response.data?.states ?? []).forEach((state) => stateMap.set(state.learning_item_id, state));
      });

      setAssignments(assignmentResponse.data ?? []);
      setReviewHistory(historyResponse.data ?? []);
      setItemIds(uniqueIds);
      setStates([...stateMap.values()].filter((state) => uniqueIds.includes(state.learning_item_id)));
      setLoading(false);
    }

    loadProgress();
    return () => { active = false; };
  }, [user?.id]);

  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    const openAssignments = assignments.filter((assignment) => assignment.status === 'published');
    const completedAssignments = assignments.filter((assignment) => assignment.status === 'completed');
    const reviewedToday = reviewHistory.filter((review) => new Date(review.created_at) >= today).length;
    const reviewedThisWeek = reviewHistory.filter((review) => new Date(review.created_at) >= weekStart).length;
    const strong = states.filter((state) => strongStates.has(state.state)).length;
    const learning = states.filter((state) => learningStates.has(state.state)).length;
    const due = states.filter((state) => state.due_at && new Date(state.due_at) <= now && state.state !== 'mastered' && state.state !== 'suspended').length;
    const newCards = Math.max(0, itemIds.length - states.length);

    return {
      openAssignments,
      completedAssignments,
      reviewedToday,
      reviewedThisWeek,
      strong,
      learning,
      due,
      newCards,
      introduced: states.length,
      assigned: itemIds.length,
      progressPercentage: itemIds.length > 0 ? Math.round((states.length / itemIds.length) * 100) : 0,
    };
  }, [assignments, itemIds, reviewHistory, states]);

  const week = useMemo(() => buildWeek(reviewHistory), [reviewHistory]);
  const weekMax = Math.max(1, ...week.map((day) => day.count));
  const displayName = profile?.display_name || user?.user_metadata?.display_name || '';

  return (
    <>
      <SEO title="I miei progressi | Sblocco Inglese" description="Assegnazioni, ripasso SRS e attività completate nel tuo percorso." />
      <section className="relative overflow-hidden bg-[#0b1311] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 top-4 h-80 w-80 rounded-full bg-[#7c3aed]/[0.11] blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#0e7c66]/[0.15] blur-3xl" />
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        </div>

        <div className="section-shell relative py-10 sm:py-14 lg:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#8de1c9]/20 bg-[#19a684]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#a6ead7]">
                <BarChart3 aria-hidden="true" className="h-4 w-4" />
                Il tuo percorso
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
                I tuoi progressi{displayName ? `, ${displayName}` : ''}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/65 sm:text-lg">
                Qui vedi quanto hai completato, cosa stai consolidando e qual è il prossimo passo utile.
              </p>
            </div>

            <Link to={stats.openAssignments.length > 0 ? '/assignments' : '/trainers'} className="focus-ring inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#16866f] px-6 py-3 text-sm font-black text-white shadow-[0_14px_36px_rgba(14,124,102,0.25),0_0_26px_rgba(139,92,246,0.12)] transition hover:-translate-y-0.5 hover:bg-[#1a9e83]">
              {stats.openAssignments.length > 0 ? 'Continua le attività' : 'Apri i Trainer'}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-5 text-sm font-bold text-white/65">
              <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin text-[#81d7c0]" />
              Aggiornamento dei progressi...
            </div>
          ) : null}

          {error ? (
            <div className="mt-10 rounded-2xl border border-red-300/20 bg-red-400/10 p-5 text-sm font-bold text-red-100">{error}</div>
          ) : null}

          {!loading && !error ? (
            <>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Clock3} eyebrow="Da completare" value={stats.openAssignments.length} detail="assegnazioni pubblicate" />
                <MetricCard icon={CheckCircle2} eyebrow="Completate" value={stats.completedAssignments.length} detail="assegnazioni concluse" tone="violet" />
                <MetricCard icon={Flame} eyebrow="Questa settimana" value={stats.reviewedThisWeek} detail="ripassi registrati" />
                <MetricCard icon={Brain} eyebrow="Card consolidate" value={stats.strong} detail={`su ${stats.assigned} assegnate`} tone="violet" />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <article className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8edfc8]">Ripasso SRS</p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Stato delle tue card</h2>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-right">
                      <p className="text-2xl font-black text-white">{stats.progressPercentage}%</p>
                      <p className="text-xs font-bold text-white/50">già incontrate</p>
                    </div>
                  </div>

                  {stats.assigned > 0 ? (
                    <div className="mt-7 grid gap-5">
                      <ProgressBar label="Da iniziare" value={stats.newCards} total={stats.assigned} color="bg-white/35" />
                      <ProgressBar label="In apprendimento" value={stats.learning} total={stats.assigned} />
                      <ProgressBar label="Consolidate" value={stats.strong} total={stats.assigned} color="bg-[#8b5cf6]" />
                      <div className="flex items-center justify-between rounded-2xl border border-[#8de1c9]/15 bg-[#19a684]/[0.08] px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-extrabold text-white/75"><RefreshCw aria-hidden="true" className="h-4 w-4 text-[#8edfc8]" />Da ripassare ora</span>
                        <span className="text-lg font-black text-white">{stats.due}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-7 rounded-2xl border border-dashed border-white/15 bg-black/10 p-5">
                      <p className="font-black text-white">Nessuna card assegnata</p>
                      <p className="mt-1 text-sm leading-6 text-white/55">Quando riceverai nuove card, il loro avanzamento apparirà qui.</p>
                    </div>
                  )}
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#c8baff]">Ultimi 7 giorni</p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Ritmo di ripasso</h2>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#8b5cf6]/12 text-[#d3c8ff] ring-1 ring-[#8b5cf6]/20">
                      <CalendarDays aria-hidden="true" className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-8 flex h-52 items-end gap-2 sm:gap-3" aria-label={`${stats.reviewedThisWeek} ripassi negli ultimi sette giorni`}>
                    {week.map((day, index) => {
                      const height = day.count > 0 ? Math.max(18, Math.round((day.count / weekMax) * 100)) : 5;
                      const isToday = index === week.length - 1;
                      return (
                        <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                          <span className="text-xs font-black text-white/65">{day.count || ''}</span>
                          <div className="flex h-36 w-full items-end overflow-hidden rounded-xl bg-white/[0.05]">
                            <div className={`w-full rounded-xl transition-all duration-500 ${isToday ? 'bg-gradient-to-t from-[#14846d] to-[#66d7b9]' : 'bg-gradient-to-t from-[#5b3aa7] to-[#9a7cea]'}`} style={{ height: `${height}%` }} />
                          </div>
                          <span className={`text-[0.68rem] font-black uppercase ${isToday ? 'text-[#9ce8d3]' : 'text-white/45'}`}>{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-5 text-sm font-semibold text-white/55">Oggi hai registrato <strong className="text-white">{stats.reviewedToday}</strong> ripassi.</p>
                </article>
              </div>

              <article className="mt-6 rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8edfc8]">Assegnazioni</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Il prossimo passo</h2>
                  </div>
                  <Link to="/assignments" className="text-sm font-black text-[#9ce8d3] underline decoration-[#9ce8d3]/35 underline-offset-4 hover:text-white">Vedi tutte le attività</Link>
                </div>

                {stats.openAssignments.length > 0 ? (
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {stats.openAssignments.slice(0, 4).map((assignment) => (
                      <Link key={assignment.id} to={`/assignments/${assignment.id}`} className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-[#8edfc8]/30 hover:bg-white/[0.075]">
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">{assignment.title}</p>
                          <p className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-white/48">
                            <span>{assignment.required ? 'Obbligatoria' : 'Facoltativa'}</span>
                            {assignment.deadline_at ? <span>Scadenza {formatDeadline(assignment.deadline_at)}</span> : null}
                          </p>
                        </div>
                        <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-[#8edfc8] transition group-hover:translate-x-1" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#8b5cf6]/15 bg-[#8b5cf6]/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-black text-white"><BookOpenCheck aria-hidden="true" className="h-5 w-5 text-[#c8baff]" />Hai completato le attività disponibili</p>
                      <p className="mt-1 text-sm leading-6 text-white/55">Puoi continuare con il ripasso oppure scegliere un Trainer.</p>
                    </div>
                    <Link to="/trainers" className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-5 py-2.5 text-sm font-black text-white transition hover:bg-white/[0.13]">
                      Scegli un Trainer
                      <Layers3 aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </article>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
