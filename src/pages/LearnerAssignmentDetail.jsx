import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  NotebookPen,
  Target,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import RecoveryAssignmentFollowup from '../components/recovery/RecoveryAssignmentFollowup.jsx';
import { loadLearnerAssignmentProgress } from '../lib/assignmentProgressApi.js';
import { supabase } from '../lib/supabaseClient.js';

const trainerDestinations = {
  word: { id: 'word-trainer', label: 'Word Trainer', route: '/trainers/word-trainer' },
  general: { id: 'general-expression', label: 'General Expressions', route: '/trainers/general-expression' },
  business: { id: 'business-expression', label: 'Business Expressions', route: '/trainers/business-expression' },
  hospitality: { id: 'hospitalality-expression', label: 'Hospitality Expressions', route: '/trainers/hospitality-expression' },
};

function trainerForLearningItem(item) {
  if (item.item_type === 'word') return trainerDestinations.word;
  return trainerDestinations[item.primary_domain] || trainerDestinations.general;
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

function resourceTypeLabel(resource) {
  if (resource.resource_type === 'exercise_collection') return 'Percorso Collection';
  if (resource.resource_type === 'practice_session') return 'Pratica mirata';
  if (resource.resource_type === 'custom_exercise') return 'Esercizio personalizzato';
  if (resource.resource_type === 'trainer') return 'Trainer';
  return 'Unità grammaticale';
}

function resourceDestination(resource, assignmentId) {
  if (resource.resource_type === 'exercise_collection') return `/collections?assignmentId=${assignmentId}&resourceId=${resource.id}`;
  if (resource.resource_type === 'practice_session') return `/practice?assignmentId=${assignmentId}&resourceId=${resource.id}`;
  if (resource.resource_type === 'custom_exercise') return `/exercises?assignmentId=${assignmentId}&resourceId=${resource.id}`;
  if (resource.resource_type === 'trainer') return `${resource.route}?assignmentId=${encodeURIComponent(assignmentId)}&returnTo=${encodeURIComponent(`/assignments/${assignmentId}`)}`;
  return resource.route;
}

function ResourceCard({ resource, assignmentId, progress }) {
  const completed = ['completed', 'review'].includes(progress?.state);

  return (
    <article className="rounded-2xl border border-clay/15 bg-[#fffdf9] px-5 py-4 shadow-sm transition hover:border-coral/35 hover:shadow-md dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff1e8] text-coral dark:bg-coral/10 dark:text-[#ff9678]">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-coral dark:text-[#ff9678]">{resourceTypeLabel(resource)}</p>
              {completed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-butter bg-butter/45 px-2.5 py-1 text-[11px] font-black text-ink dark:border-butter/20 dark:bg-butter/10 dark:text-[#ffe1a3]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {progress?.state === 'review' ? 'In valutazione' : 'Completata'}
                </span>
              ) : null}
            </div>
            <h4 className="mt-1.5 text-base font-black leading-snug text-ink dark:text-white sm:text-lg">{resource.title}</h4>
            {resource.description ? <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-white/60">{resource.description}</p> : null}
            {resource.resource_type === 'custom_exercise' ? <p className="mt-2 text-xs font-bold text-coral/85 dark:text-[#f7a98d]">Autosave attivo · nuove domande a ogni tentativo quando usa una pool</p> : null}
            {resource.resource_type === 'exercise_collection' ? <p className="mt-2 text-xs font-bold text-coral/85 dark:text-[#f7a98d]">Versione {resource.collection_config?.version_number} · {resource.collection_snapshot?.items?.length || 0} tappe in ordine · avanzamento salvato</p> : null}
            {resource.resource_type === 'practice_session' ? <p className="mt-2 text-xs font-bold text-coral/85 dark:text-[#f7a98d]">Parole e modalità del quiz selezionate dall’insegnante</p> : null}
          </div>
        </div>
        <Link
          to={resourceDestination(resource, assignmentId)}
          className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-clay dark:bg-[#ff8b6c] dark:text-surface-950 dark:hover:bg-[#f7a98d]"
        >
          {completed ? 'Vedi risultato' : progress?.state === 'in_progress' ? 'Continua' : 'Inizia'}
        </Link>
      </div>
    </article>
  );
}

export default function LearnerAssignmentDetail() {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [resources, setResources] = useState([]);
  const [studyScope, setStudyScope] = useState(null);
  const [trainerBreakdown, setTrainerBreakdown] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAssignment() {
      setLoading(true);
      setError('');

      const [
        { data, error: queryError },
        { data: resourceData, error: resourceError },
        { data: studyData, error: studyError },
        { data: assignmentItemData, error: assignmentItemError },
        progressData,
      ] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, learner_note, status, required, deadline_at, estimated_minutes, published_at, created_at')
          .eq('id', assignmentId)
          .in('status', ['published', 'completed'])
          .maybeSingle(),
        supabase
          .from('assignment_resources')
          .select('id, resource_key, resource_type, title, description, route, sequence_index, practice_config, exercise_config, collection_config, collection_snapshot, collection_parent_resource_id')
          .eq('assignment_id', assignmentId)
          .order('sequence_index', { ascending: true }),
        supabase
          .from('assignment_study_settings')
          .select('include_in_srs, exercise_modes, snapshot_item_count')
          .eq('assignment_id', assignmentId)
          .maybeSingle(),
        supabase
          .from('assignment_items')
          .select('learning_item_id')
          .eq('assignment_id', assignmentId),
        loadLearnerAssignmentProgress(assignmentId).catch(() => null),
      ]);

      const learningItemIds = (assignmentItemData ?? []).map((item) => item.learning_item_id).filter(Boolean);
      const { data: learningItemData, error: learningItemError } = learningItemIds.length
        ? await supabase.from('learning_items').select('id, item_type, primary_domain').in('id', learningItemIds)
        : { data: [], error: null };

      if (!active) return;

      if (queryError || resourceError || studyError || assignmentItemError || learningItemError) {
        setError('Non è stato possibile caricare questa attività.');
        setAssignment(null);
        setResources([]);
        setStudyScope(null);
        setTrainerBreakdown([]);
        setProgress(null);
      } else {
        setAssignment(data ?? null);
        setResources((resourceData ?? []).filter((item) => !item.collection_parent_resource_id));
        setStudyScope(studyData ?? null);
        setProgress(progressData ?? null);
        const grouped = new Map();
        (learningItemData ?? []).forEach((item) => {
          const trainer = trainerForLearningItem(item);
          const current = grouped.get(trainer.id) || { ...trainer, count: 0 };
          current.count += 1;
          grouped.set(trainer.id, current);
        });
        setTrainerBreakdown(Array.from(grouped.values()));
      }

      setLoading(false);
    }

    loadAssignment();

    return () => {
      active = false;
    };
  }, [assignmentId]);

  const title = assignment?.title || 'Attività';
  const fallbackActivities = resources.length + (studyScope?.include_in_srs ? trainerBreakdown.length : 0);
  const resourceProgress = useMemo(() => new Map((progress?.resources || []).map((item) => [item.resource_id, item])), [progress]);
  const exerciseResources = useMemo(() => resources.filter((resource) => ['custom_exercise', 'exercise_collection', 'grammar_unit'].includes(resource.resource_type)), [resources]);
  const practiceResources = useMemo(() => resources.filter((resource) => resource.resource_type === 'practice_session'), [resources]);
  const supportingResources = useMemo(() => resources.filter((resource) => !['custom_exercise', 'exercise_collection', 'grammar_unit', 'practice_session'].includes(resource.resource_type)), [resources]);
  const completedResources = useMemo(() => (progress?.resources || []).filter((item) => ['completed', 'review'].includes(item.state)).length, [progress]);
  const remainingActivities = progress ? Number(progress.remaining_activities || 0) : fallbackActivities;
  const totalActivities = Math.max(fallbackActivities, completedResources + remainingActivities, 1);
  const progressPercent = Math.min(100, Math.round((completedResources / totalActivities) * 100));

  return (
    <>
      <SEO title={`${title} | Sblocco Inglese`} description="Dettaglio della tua attività Sblocco Inglese." />
      <section className="section-shell bg-[#fbf6ef] py-8 dark:bg-surface-950 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <Link to="/assignments" className="inline-flex items-center gap-2 text-sm font-black text-coral underline decoration-coral/35 underline-offset-4 dark:text-[#f7a98d]">
            <ArrowLeft className="h-4 w-4" />Torna alle attività
          </Link>

          {loading ? <div className="mt-5 rounded-2xl border border-ink/10 bg-[#fffdf9] p-6 text-sm font-bold text-ink/65 dark:border-white/10 dark:bg-surface-900 dark:text-white/65">Caricamento attività...</div> : null}
          {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-900 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}

          {!loading && !error && !assignment ? (
            <div className="mt-5 rounded-2xl border border-ink/10 bg-[#fffdf9] p-7 shadow-sm dark:border-white/10 dark:bg-surface-900">
              <h2 className="font-editorial text-3xl text-ink dark:text-white">Attività non disponibile</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">L’attività potrebbe non appartenere al tuo account, non essere ancora pubblicata oppure non essere più accessibile.</p>
            </div>
          ) : null}

          {!loading && !error && assignment ? (
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
              <main className="min-w-0">
                <header className="pb-2">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-coral dark:text-[#ff9678]"><NotebookPen className="h-4 w-4" />Il tuo piano</p>
                  <h1 className="mt-3 font-editorial text-5xl leading-none text-ink dark:text-white sm:text-6xl">{assignment.title}</h1>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-coral/15 bg-[#fff0e7] px-3 py-1.5 text-xs font-black text-ink/75 dark:border-coral/20 dark:bg-coral/10 dark:text-white/75">{assignment.required ? 'Obbligatoria' : 'Facoltativa'}</span>
                    {assignment.estimated_minutes ? <span className="rounded-full border border-butter bg-butter/30 px-3 py-1.5 text-xs font-black text-ink/70 dark:border-butter/15 dark:bg-butter/10 dark:text-white/70">{assignment.estimated_minutes} min stimati</span> : null}
                  </div>
                </header>

                <section className="mt-6 rounded-2xl border border-coral/20 bg-[#fff4ed] px-5 py-4 dark:border-coral/20 dark:bg-coral/[0.07] sm:px-6">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-coral dark:text-[#f7a98d]"><Info className="h-4 w-4" />Messaggio per te</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink/70 dark:text-white/70">
                    {assignment.learner_note || 'Completa le attività qui sotto con calma. Tutto ciò che salvi resterà disponibile fino alla prossima lezione.'}
                  </p>
                </section>

                <RecoveryAssignmentFollowup assignmentId={assignment.id} remainingActivities={remainingActivities} />

                <section className="mt-6 rounded-3xl border border-clay/15 bg-[#fffdf9] p-5 shadow-sm dark:border-white/10 dark:bg-surface-900 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-coral dark:text-[#ff9678]">Oggi</p>
                  <h2 className="mt-2 font-editorial text-3xl text-ink dark:text-white sm:text-4xl">Completa queste attività</h2>

                  {studyScope?.include_in_srs ? (
                    <div className="mt-5 rounded-2xl border border-butter bg-butter/20 p-5 dark:border-butter/15 dark:bg-butter/[0.05]">
                      <div>
                        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-clay dark:text-[#ffd98a]"><BookOpen className="h-4 w-4" />Card assegnate nei Trainer SRS</p>
                        <h3 className="mt-2 text-lg font-black text-ink dark:text-white">{studyScope.snapshot_item_count} card totali</h3>
                        <p className="mt-1 text-sm leading-6 text-ink/60 dark:text-white/60">Apri direttamente il Trainer che contiene le card assegnate per questa attività.</p>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {trainerBreakdown.map((trainer) => (
                          <Link key={trainer.id} to={`${trainer.route}?assignmentId=${encodeURIComponent(assignment.id)}&returnTo=${encodeURIComponent(`/assignments/${assignment.id}`)}`} className="focus-ring flex min-h-14 items-center justify-between gap-3 rounded-xl border border-clay/15 bg-[#fffdf9] px-4 py-3 text-ink transition hover:border-coral/35 hover:bg-[#fff7f2] dark:border-white/15 dark:bg-white/[0.07] dark:text-white dark:hover:border-coral/35 dark:hover:bg-coral/[0.06]">
                            <span className="text-sm font-black">{trainer.label}</span>
                            <span className="rounded-full bg-coral px-2.5 py-1 text-xs font-black text-white">{trainer.count}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {resources.length === 0 && !studyScope?.include_in_srs ? (
                    <div className="mt-5 rounded-xl border border-dashed border-clay/20 bg-linen/35 p-5 dark:border-white/15 dark:bg-white/[0.04]">
                      <p className="text-sm font-black text-ink dark:text-white">Nessun contenuto collegato</p>
                      <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">Segui le istruzioni scritte sopra. Non è stato collegato un trainer o un’unità specifica.</p>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-5">
                      {exerciseResources.length ? (
                        <section className="grid gap-3">
                          {exerciseResources.map((resource) => <ResourceCard key={resource.id} resource={resource} assignmentId={assignment.id} progress={resourceProgress.get(resource.id)} />)}
                        </section>
                      ) : null}

                      {practiceResources.length ? (
                        <section className="rounded-2xl border border-coral/20 bg-[#fff4ed] p-4 dark:border-coral/20 dark:bg-coral/[0.055] sm:p-5">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffe8dc] text-coral dark:bg-coral/10 dark:text-[#ff9b7d]"><Target className="h-5 w-5" /></span>
                            <div><p className="text-xs font-black uppercase tracking-wide text-coral dark:text-[#ff9b7d]">Pratica mirata</p><h3 className="mt-1 font-black text-ink dark:text-white">Quiz sulle parole scelte dall’insegnante</h3></div>
                          </div>
                          <div className="mt-4 grid gap-3">{practiceResources.map((resource) => <ResourceCard key={resource.id} resource={resource} assignmentId={assignment.id} progress={resourceProgress.get(resource.id)} />)}</div>
                        </section>
                      ) : null}

                      {supportingResources.length ? (
                        <section className="rounded-2xl border border-clay/15 bg-linen/30 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
                          <p className="text-xs font-black uppercase tracking-wide text-clay dark:text-[#ffd5c7]">Materiali collegati</p>
                          <div className="mt-4 grid gap-3">{supportingResources.map((resource) => <ResourceCard key={resource.id} resource={resource} assignmentId={assignment.id} progress={resourceProgress.get(resource.id)} />)}</div>
                        </section>
                      ) : null}
                    </div>
                  )}
                </section>
              </main>

              <aside className="grid gap-5 lg:sticky lg:top-28">
                <section className="rounded-3xl border border-clay/20 bg-[#fffdf9] p-6 shadow-sm dark:border-white/10 dark:bg-surface-900">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-coral dark:text-[#ff9678]">Il tuo progresso</p>
                  <h2 className="mt-2 font-editorial text-3xl text-ink dark:text-white">{assignment.title}</h2>
                  <div className="mt-6 grid place-items-center">
                    <div className="grid h-36 w-36 place-items-center rounded-full border-[10px] border-[#f6e3d5] dark:border-white/10">
                      <div className="text-center">
                        <p className="text-3xl font-black text-ink dark:text-white">{progressPercent}%</p>
                        <p className="mt-0.5 text-xs font-bold text-ink/55 dark:text-white/55">completate</p>
                      </div>
                    </div>
                    <p className="mt-4 font-editorial italic text-ink/65 dark:text-white/65">Ogni passo conta.</p>
                  </div>
                  <div className="mt-6 grid gap-4 border-t border-clay/15 pt-5 dark:border-white/10">
                    <div className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-xs font-bold"><span className="text-ink/70 dark:text-white/70">Completate</span><span className="h-1.5 overflow-hidden rounded-full bg-[#f2e8df] dark:bg-white/10"><span className="block h-full rounded-full bg-clay" style={{ width: `${progressPercent}%` }} /></span><span className="text-ink dark:text-white">{completedResources}</span></div>
                    <div className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-xs font-bold"><span className="text-coral">Da fare</span><span className="h-1.5 overflow-hidden rounded-full bg-[#f2e8df] dark:bg-white/10"><span className="block h-full rounded-full bg-coral" style={{ width: `${Math.max(8, 100 - progressPercent)}%` }} /></span><span className="text-coral">{remainingActivities}</span></div>
                    <div className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-xs font-bold"><span className="text-ink/70 dark:text-white/70">Minuti</span><span className="h-1.5 rounded-full bg-[#f2e8df] dark:bg-white/10" /><span className="text-ink dark:text-white">{assignment.estimated_minutes || 0}</span></div>
                  </div>
                  <p className="mt-6 border-t border-clay/15 pt-5 text-sm leading-6 text-ink/60 dark:border-white/10 dark:text-white/60">Il progresso mostra ciò che hai completato. Non è un voto.</p>
                  <Link to="/progress" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-ink hover:text-coral dark:text-white dark:hover:text-[#ff9678]">Vai al progresso →</Link>
                </section>

                <section className="rounded-3xl border border-butter bg-[#fff9e9] p-5 dark:border-butter/15 dark:bg-butter/[0.055]">
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-butter/45 text-clay dark:bg-butter/10 dark:text-[#ffd98a]"><CalendarDays className="h-5 w-5" /></span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-clay dark:text-[#ffd98a]">Il tuo ritmo</p>
                      <h2 className="mt-1 font-editorial text-2xl text-ink dark:text-white">{assignment.deadline_at ? 'Hai una scadenza' : 'Nessuna urgenza'}</h2>
                      <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-white/60">{assignment.deadline_at ? formatDate(assignment.deadline_at) : 'Puoi seguire il tuo ritmo.'}</p>
                    </div>
                  </div>
                  {assignment.estimated_minutes ? <div className="mt-5 flex items-center gap-2 border-t border-butter/60 pt-4 text-sm font-bold text-ink/65 dark:border-white/10 dark:text-white/65"><Clock3 className="h-4 w-4" />Circa {assignment.estimated_minutes} minuti</div> : null}
                </section>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
