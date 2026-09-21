import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListChecks,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient.js';

function formatDeadline(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function MetricCard({ icon: Icon, eyebrow, value, detail, tone = 'navy' }) {
  const toneClasses = tone === 'orange'
    ? 'border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-300/20 dark:bg-orange-300/[0.07] dark:text-orange-100'
    : 'border-ink/10 bg-white text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-white';

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${toneClasses}`}>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 text-orange-700 shadow-sm dark:bg-white/[0.08] dark:text-orange-200">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.1em] opacity-55">{eyebrow}</p>
      <p className="mt-1 text-3xl font-black tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-sm font-semibold leading-6 opacity-60">{detail}</p>
    </article>
  );
}

export default function LearnerProgress() {
  const { profile, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;

    async function loadProgress() {
      setLoading(true);
      setError('');

      const { data, error: queryError } = await supabase
        .from('assignments')
        .select('id, title, learner_note, status, required, deadline_at, estimated_minutes, updated_at, created_at, display_order')
        .in('status', ['published', 'completed'])
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!active) return;

      if (queryError) {
        setAssignments([]);
        setError('Non è stato possibile aggiornare i progressi. Riprova tra poco.');
      } else {
        setAssignments(data || []);
      }
      setLoading(false);
    }

    loadProgress();
    return () => { active = false; };
  }, [user?.id]);

  const stats = useMemo(() => {
    const open = assignments.filter((item) => item.status === 'published');
    const completed = assignments.filter((item) => item.status === 'completed');
    const completion = assignments.length ? Math.round((completed.length / assignments.length) * 100) : 0;
    const minutes = open.reduce((sum, item) => sum + Number(item.estimated_minutes || 0), 0);
    const nearest = open
      .filter((item) => item.deadline_at)
      .sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at))[0] || null;
    const recentCompleted = [...completed]
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .slice(0, 4);

    return { open, completed, completion, minutes, nearest, recentCompleted };
  }, [assignments]);

  const displayName = profile?.display_name || user?.user_metadata?.display_name || '';

  return (
    <div className="learner-editorial">
      <SEO
        title="I miei progressi | Sblocco Inglese"
        description="Attività completate, scadenze e prossimi passi nel tuo percorso Sblocco Inglese."
      />

      <div className="learner-shell learner-dashboard learner-dashboard--standard">
        <header className="learner-home-intro">
          <div>
            <p className="learner-kicker">Progressi</p>
            <h1 className="learner-display">Il tuo percorso{displayName ? <>, <em>{displayName}</em></> : '.'}</h1>
            <p>Qui vedi ciò che hai completato e cosa conviene fare dopo. Non è un voto.</p>
          </div>
          {!loading ? (
            <div className="learner-home-status">
              <CheckCircle2 aria-hidden="true" />
              <span>{stats.completion}% completato</span>
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="learner-panel learner-panel--main">
            <p className="learner-empty"><RefreshCw aria-hidden="true" className="inline h-4 w-4 animate-spin" /> Aggiornamento dei progressi...</p>
          </div>
        ) : null}

        {error ? <p className="learner-error" role="alert">{error}</p> : null}

        {!loading && !error ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Clock3} eyebrow="Da fare" value={String(stats.open.length)} detail="attività ancora aperte" />
              <MetricCard icon={CheckCircle2} eyebrow="Completate" value={String(stats.completed.length)} detail="attività concluse" tone="orange" />
              <MetricCard icon={BarChart3} eyebrow="Percorso" value={`${stats.completion}%`} detail="delle attività disponibili completato" />
              <MetricCard
                icon={CalendarDays}
                eyebrow="Prossima scadenza"
                value={stats.nearest ? formatDeadline(stats.nearest.deadline_at) : 'Nessuna'}
                detail={stats.nearest ? stats.nearest.title : 'Puoi seguire il tuo ritmo.'}
                tone="orange"
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
              <section className="learner-panel learner-panel--main">
                <div className="learner-panel__heading">
                  <div>
                    <span className="learner-panel__eyebrow">Continua</span>
                    <h2>Il prossimo passo</h2>
                  </div>
                  <Link to="/assignments" className="learner-text-link">Tutte le attività <ArrowRight size={14} /></Link>
                </div>

                {stats.open.length ? (
                  <div className="mt-4 grid gap-3">
                    {stats.open.slice(0, 4).map((assignment, index) => (
                      <Link
                        key={assignment.id}
                        to={`/assignments/${assignment.id}`}
                        className="group flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 transition hover:border-orange-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-orange-300/30"
                      >
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">
                            {index === 0 ? 'Da qui' : 'Poi'}
                          </p>
                          <h3 className="mt-1 truncate text-base font-black text-ink dark:text-white">{assignment.title}</h3>
                          <p className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-ink/55 dark:text-white/55">
                            {assignment.estimated_minutes ? <span>~ {assignment.estimated_minutes} min</span> : null}
                            {assignment.deadline_at ? <span>Scadenza {formatDeadline(assignment.deadline_at)}</span> : null}
                          </p>
                        </div>
                        <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-orange-600 transition group-hover:translate-x-1 dark:text-orange-300" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-ink/15 bg-linen/35 p-5 dark:border-white/15 dark:bg-white/[0.03]">
                    <p className="flex items-center gap-2 font-black text-ink dark:text-white">
                      <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                      Hai completato le attività disponibili.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">
                      Puoi ritrovare parole e chunk incontrati durante il percorso nel tuo Vocabolario.
                    </p>
                    <Link to="/vocab-bank" className="learner-secondary-button mt-4 inline-flex">
                      Apri il vocabolario <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </section>

              <aside className="learner-panel learner-panel--side">
                <div className="learner-panel__heading">
                  <div>
                    <span className="learner-panel__eyebrow">Riepilogo</span>
                    <h3>{stats.completion}% completato</h3>
                  </div>
                </div>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
                  <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${stats.completion}%` }} />
                </div>
                <div className="mt-5 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="text-ink/60 dark:text-white/60">Completate</span><strong>{stats.completed.length}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-ink/60 dark:text-white/60">Da fare</span><strong>{stats.open.length}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-ink/60 dark:text-white/60">Tempo stimato restante</span><strong>{stats.minutes ? `~ ${stats.minutes} min` : '—'}</strong></div>
                </div>
                <Link to="/vocab-bank" className="learner-text-link mt-6 inline-flex items-center gap-2">
                  <ListChecks size={15} /> Vocabolario
                </Link>
              </aside>
            </div>

            <section className="mt-6 learner-panel learner-panel--main">
              <div className="learner-panel__heading">
                <div>
                  <span className="learner-panel__eyebrow">Completate</span>
                  <h2>Le ultime attività concluse</h2>
                </div>
              </div>

              {stats.recentCompleted.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {stats.recentCompleted.map((assignment) => (
                    <Link
                      key={assignment.id}
                      to={`/assignments/${assignment.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 transition hover:border-orange-300 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-300/10 dark:text-orange-200">
                        <BookOpenCheck className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-black text-ink dark:text-white">{assignment.title}</p>
                        <p className="mt-1 text-xs font-semibold text-ink/50 dark:text-white/50">Completata</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="learner-empty">Le attività completate compariranno qui.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
