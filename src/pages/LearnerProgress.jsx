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
  const toneClasses = tone === 'coral'
    ? 'bg-[#e86f51]/12 text-[#ffd3c2] ring-[#e86f51]/20'
    : 'bg-[#19a684]/12 text-[#9ce8d3] ring-[#19a684]/20';
  const cardClasses = tone === 'coral'
    ? 'border-[#e86f51]/20 bg-gradient-to-br from-[#e86f51]/[0.12] via-white/[0.055] to-white/[0.025]'
    : 'border-[#5ad6b3]/20 bg-gradient-to-br from-[#19a684]/[0.12] via-white/[0.055] to-white/[0.025]';

  return (
    <article className={`relative overflow-hidden rounded-2xl border p-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)] ${cardClasses}`}>
      <div aria-hidden="true" className={`absolute -right-10 -top-12 h-28 w-28 rounded-full blur-2xl ${tone === 'coral' ? 'bg-[#e86f51]/20' : 'bg-[#22c59d]/18'}`} />
      <div className={`relative grid h-11 w-11 place-items-center rounded-xl ring-1 ${toneClasses}`}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <p className="relative mt-5 text-xs font-black uppercase tracking-[0.12em] text-white/55">{eyebrow}</p>
      <p className="relative mt-2 text-3xl font-black tracking-[-0.04em] text-white">{value}</p>
      <p className="relative mt-1 text-sm font-semibold leading-6 text-white/58">{detail}</p>
      <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-0.5 ${tone === 'coral' ? 'bg-gradient-to-r from-transparent via-[#e86f51]/70 to-[#ffc457]/30' : 'bg-gradient-to-r from-transparent via-[#53d6b3]/70 to-transparent'}`} />
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

function ProgressIllustration() {
  return (
    <div className="relative mx-auto h-44 w-72" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#68d8ba]/20 bg-[#19a684]/[0.055] shadow-[0_0_60px_rgba(25,166,132,0.12)]" />
      <div className="absolute left-1/2 top-1/2 h-24 w-56 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-[50%] border border-[#e86f51]/25" />
      <div className="absolute left-1/2 top-1/2 h-20 w-52 -translate-x-1/2 -translate-y-1/2 rotate-[24deg] rounded-[50%] border border-[#68d8ba]/20" />

      <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl border border-[#80dfc5]/25 bg-gradient-to-br from-[#1b8f76]/35 to-[#6f4bb7]/20 text-[#b9f1e1] shadow-[0_18px_50px_rgba(0,0,0,0.25),0_0_28px_rgba(139,92,246,0.14)]">
        <Brain className="h-9 w-9" />
      </div>

      <div className="absolute left-5 top-5 grid h-10 w-10 place-items-center rounded-2xl border border-[#68d8ba]/20 bg-[#10241f] text-[#8fe5cc] shadow-lg">
        <BookOpenCheck className="h-5 w-5" />
      </div>
      <div className="absolute right-4 top-8 grid h-9 w-9 place-items-center rounded-full border border-[#e86f51]/25 bg-[#291a16] text-[#ffc9b4] shadow-lg">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="absolute bottom-3 right-10 grid h-11 w-11 place-items-center rounded-2xl border border-[#68d8ba]/20 bg-[#10241f] text-[#8fe5cc] shadow-lg">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <div className="absolute bottom-5 left-8 grid h-9 w-9 place-items-center rounded-full border border-[#ffc457]/25 bg-[#2b2416] text-[#ffe29b] shadow-lg">
        <Flame className="h-4 w-4" />
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
          <div className="absolute -right-24 top-4 h-80 w-80 rounded-full bg-[#e86f51]/[0.10] blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#0e7c66]/[0.15] blur-3xl" />
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        </div>

        <div className="section-shell relative py-10 sm:py-14 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
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

            <div className="grid justify-items-start gap-3 lg:justify-items-center">
              <div className="hidden lg:block"><ProgressIllustration /></div>
              <Link to={stats.openAssignments.length > 0 ? '/assignments' : '/trainers'} className="focus-ring inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#16866f] to-[#1a9a7e] px-6 py-3 text-sm font-black text-white shadow-[0_14px_36px_rgba(14,124,102,0.25),0_0_26px_rgba(139,92,246,0.12)] transition hover:-translate-y-0.5 hover:brightness-110">
                {stats.openAssignments.length > 0 ? 'Continua le attività' : 'Apri i Trainer'}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
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
                <MetricCard icon={CheckCircle2} eyebrow="Completate" value={stats.completedAssignments.length} detail="assegnazioni concluse" tone="coral" />
                <MetricCard icon={Flame} eyebrow="Questa settimana" value={stats.reviewedThisWeek} detail="ripassi registrati" />
                <MetricCard icon={Brain} eyebrow="Card consolidate" value={stats.strong} detail={`su ${stats.assigned} assegnate`} tone="coral" />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <article className="rounded-3xl border border-[#65d6b8]/15 bg-gradient-to-br from-[#19a684]/[0.07] via-white/[0.05] to-transparent p-6 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-7">
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
                      <ProgressBar label="Consolidate" value={stats.strong} total={stats.assigned} color="bg-gradient-to-r from-[#e86f51] to-[#ffc457]" />
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

                <article className="rounded-3xl border border-[#e86f51]/15 bg-gradient-to-br from-[#e86f51]/[0.07] via-white/[0.05] to-[#ffc457]/[0.025] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#ffc7b0]">Ultimi 7 giorni</p>
                      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Ritmo di ripasso</h2>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e86f51]/12 text-[#ffd3c2] ring-1 ring-[#e86f51]/20">
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
                            <div className={`w-full rounded-xl transition-all duration-500 ${isToday ? 'bg-gradient-to-t from-[#14846d] to-[#66d7b9]' : 'bg-gradient-to-t from-[#c76545] to-[#ffc457]'}`} style={{ height: `${height}%` }} />
                          </div>
                          <span className={`text-[0.68rem] font-black uppercase ${isToday ? 'text-[#9ce8d3]' : 'text-white/45'}`}>{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-5 text-sm font-semibold text-white/55">Oggi hai registrato <strong className="text-white">{stats.reviewedToday}</strong> ripassi.</p>
                </article>
              </div>

              <article className="mt-5 rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.16)] sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8edfc8]">Assegnazioni</p>
                    <h2 className="mt-1.5 text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">Il prossimo passo</h2>
                  </div>
                  <Link to="/assignments" className="text-sm font-black text-[#9ce8d3] underline decoration-[#9ce8d3]/35 underline-offset-4 hover:text-white">Vedi tutte le attività</Link>
                </div>

                {stats.openAssignments.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {stats.openAssignments.slice(0, 4).map((assignment) => (
                      <Link key={assignment.id} to={`/assignments/${assignment.id}`} className="group flex min-w-[min(100%,18rem)] flex-1 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 transition hover:border-[#8edfc8]/30 hover:bg-white/[0.075]">
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
                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#e86f51]/15 bg-gradient-to-r from-[#e86f51]/[0.07] to-[#ffc457]/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-black text-white"><BookOpenCheck aria-hidden="true" className="h-5 w-5 text-[#ffc7b0]" />Hai completato le attività disponibili</p>
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
