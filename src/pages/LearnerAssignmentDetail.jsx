import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Coffee,
  ListChecks,
  NotebookPen,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../auth/AuthContext.jsx';
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
  if (resource.resource_type === 'practice_session') return 'Pratica mirata';
  if (resource.resource_type === 'custom_exercise') return 'Esercizio personalizzato';
  if (resource.resource_type === 'trainer') return 'Trainer';
  return 'Unità grammaticale';
}

function resourceDestination(resource, assignmentId) {
  if (resource.resource_type === 'practice_session') return `/practice?assignmentId=${assignmentId}&resourceId=${resource.id}`;
  if (resource.resource_type === 'custom_exercise') return `/exercises?assignmentId=${assignmentId}&resourceId=${resource.id}`;
  return resource.route;
}

function firstNameFromProfile(profile, user) {
  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'studente';
  return String(displayName).trim().split(/\s+/)[0] || 'studente';
}

export default function LearnerAssignmentDetail() {
  const { assignmentId } = useParams();
  const { profile, user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [resources, setResources] = useState([]);
  const [studyScope, setStudyScope] = useState(null);
  const [trainerBreakdown, setTrainerBreakdown] = useState([]);
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
      ] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, title, learner_note, status, required, deadline_at, estimated_minutes, published_at, created_at')
          .eq('id', assignmentId)
          .in('status', ['published', 'completed'])
          .maybeSingle(),
        supabase
          .from('assignment_resources')
          .select('id, resource_key, resource_type, title, description, route, sequence_index, practice_config, exercise_config')
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
      } else {
        setAssignment(data ?? null);
        setResources(resourceData ?? []);
        setStudyScope(studyData ?? null);
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
  const firstName = useMemo(() => firstNameFromProfile(profile, user), [profile, user]);
  const totalActivities = resources.length + (studyScope?.include_in_srs ? trainerBreakdown.length : 0);

  return (
    <>
      <SEO title={`${title} | Sblocco Inglese`} description="Dettaglio della tua attività Sblocco Inglese." />
      <section className="section-shell py-10 dark:bg-[#171310] lg:py-14">
        <div className="mx-auto max-w-4xl">
          <Link to="/assignments" className="inline-flex items-center gap-2 text-sm font-black text-clay underline dark:text-[#f7a98d]">
            <ArrowLeft className="h-4 w-4" />Torna alle attività
          </Link>

          <header className="mt-5 overflow-hidden rounded-3xl border border-clay/15 bg-[#fffdf9] shadow-soft dark:border-white/10 dark:bg-[#211b18]">
            <div className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
              <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-blush blur-3xl dark:bg-coral/10" />
              <div className="pointer-events-none absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-butter/80 blur-3xl dark:bg-butter/5" />
              <Sun className="pointer-events-none absolute right-8 top-7 h-12 w-12 rotate-12 text-coral/55 dark:text-coral/35" strokeWidth={1.7} />
              <Star className="pointer-events-none absolute right-24 top-24 h-6 w-6 -rotate-12 fill-butter text-clay/65 dark:fill-clay/20 dark:text-[#f7a98d]" />
              <Sparkles className="pointer-events-none absolute bottom-9 right-12 h-7 w-7 text-clay/45 dark:text-[#f7a98d]/55" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-coral/25 bg-blush px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-clay dark:border-coral/25 dark:bg-coral/10 dark:text-[#f7a98d]">
                  <Coffee className="h-3.5 w-3.5" />Benvenuto nel tuo spazio
                </span>
                <h1 className="mt-5 text-3xl font-black leading-tight text-ink dark:text-white sm:text-5xl">
                  <span className="text-coral dark:text-[#ff9678]">{firstName}</span>,{' '}
                  <span className="relative inline-block">
                    <span className="relative z-10">come stai?</span>
                    <span className="absolute inset-x-0 bottom-1 -z-0 h-3 -rotate-1 rounded-full bg-butter/90 dark:bg-clay/30" aria-hidden="true" />
                  </span>
                </h1>
                <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-ink/65 dark:text-white/65">Ecco cosa devi fare oggi e fino a quando ci rivediamo.</p>
              </div>
            </div>

            {!loading && !error && assignment ? (
              <div className="grid gap-3 border-t border-clay/10 bg-linen/35 p-5 dark:border-white/10 dark:bg-white/[0.035] sm:grid-cols-3 sm:px-8 lg:px-10">
                <div className="flex items-center gap-3 rounded-2xl border border-coral/15 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blush text-coral dark:bg-coral/10 dark:text-[#ff9678]"><ListChecks className="h-5 w-5" /></span>
                  <div><p className="text-xs font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Da completare</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{totalActivities || 1} attività</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-clay/15 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-butter text-clay dark:bg-butter/10 dark:text-[#ffd98a]"><NotebookPen className="h-5 w-5" /></span>
                  <div><p className="text-xs font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Tempo stimato</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{assignment.estimated_minutes ? `${assignment.estimated_minutes} minuti` : 'Segui il tuo ritmo'}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-coral/15 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fde9dc] text-coral dark:bg-coral/10 dark:text-[#ff9678]"><CalendarDays className="h-5 w-5" /></span>
                  <div><p className="text-xs font-black uppercase tracking-wide text-ink/40 dark:text-white/40">Quando</p><p className="mt-1 text-sm font-black text-ink dark:text-white">{assignment.deadline_at ? formatDate(assignment.deadline_at) : 'Prima della prossima lezione'}</p></div>
                </div>
              </div>
            ) : null}
          </header>

          {loading ? <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65 dark:border-white/10 dark:bg-[#211b18] dark:text-white/65">Caricamento attività...</div> : null}
          {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-900 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-100">{error}</div> : null}

          {!loading && !error && !assignment ? (
            <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-[#211b18]">
              <h2 className="text-2xl font-black text-ink dark:text-white">Attività non disponibile</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">L’attività potrebbe non appartenere al tuo account, non essere ancora pubblicata oppure non essere più accessibile.</p>
            </div>
          ) : null}

          {!loading && !error && assignment ? (
            <article className="mt-6 overflow-hidden rounded-3xl border border-clay/15 bg-[#fffdf9] shadow-soft dark:border-white/10 dark:bg-[#211b18]">
              <div className="p-6 sm:p-8">
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-clay dark:text-[#f7a98d]"><NotebookPen className="h-4 w-4" />Il tuo piano</span>
                <h2 className="mt-4 text-3xl font-black leading-tight text-ink dark:text-white sm:text-4xl">{assignment.title}</h2>

                <div className="mt-6 flex flex-wrap gap-3 text-xs font-black text-ink/60 dark:text-white/70">
                  <span className="rounded-full border border-coral/15 bg-blush px-3 py-1.5 dark:border-coral/20 dark:bg-coral/10">{assignment.required ? 'Obbligatoria' : 'Facoltativa'}</span>
                  {assignment.estimated_minutes ? <span className="rounded-full border border-clay/15 bg-butter/60 px-3 py-1.5 dark:border-butter/10 dark:bg-butter/10">{assignment.estimated_minutes} min stimati</span> : null}
                  {assignment.deadline_at ? <span className="rounded-full border border-coral/15 bg-[#fde9dc] px-3 py-1.5 dark:border-coral/20 dark:bg-coral/10">Scadenza: {formatDate(assignment.deadline_at)}</span> : null}
                </div>

                <section className="mt-8 rounded-2xl border border-coral/20 bg-blush/65 p-5 dark:border-coral/20 dark:bg-coral/[0.08] sm:p-6">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-clay dark:text-[#f7a98d]"><Coffee className="h-4 w-4" />Messaggio per te</p>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-ink/75 dark:text-white/75">
                    {assignment.learner_note || 'Completa le attività qui sotto con calma. Tutto ciò che salvi resterà disponibile fino alla prossima lezione.'}
                  </p>
                </section>

                <section className="mt-8">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-coral dark:text-[#ff9678]"><Sun className="h-4 w-4" />Oggi</p>
                  <h3 className="mt-2 text-2xl font-black text-ink dark:text-white">Completa queste attività</h3>

                  {studyScope?.include_in_srs ? (
                    <div className="mt-5 rounded-2xl border border-clay/20 bg-butter/30 p-5 dark:border-butter/10 dark:bg-butter/[0.05]">
                      <div>
                        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-clay dark:text-[#ffd98a]"><BookOpen className="h-4 w-4" />Card assegnate nei Trainer SRS</p>
                        <h4 className="mt-2 text-lg font-black text-ink dark:text-white">{studyScope.snapshot_item_count} card totali</h4>
                        <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">Apri direttamente il Trainer che contiene le card assegnate per questa attività.</p>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {trainerBreakdown.map((trainer) => (
                          <Link key={trainer.id} to={`${trainer.route}?returnTo=${encodeURIComponent(`/assignments/${assignment.id}`)}`} className="focus-ring flex min-h-14 items-center justify-between gap-3 rounded-xl border border-clay/15 bg-white px-4 py-3 text-ink transition hover:border-coral hover:bg-blush/35 dark:border-white/15 dark:bg-white/[0.08] dark:text-white dark:hover:border-coral/40 dark:hover:bg-coral/[0.08]">
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
                    <div className="mt-5 grid gap-4">
                      {resources.map((resource, index) => (
                        <article key={resource.id} className="rounded-2xl border border-clay/15 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-coral/35 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06]">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-coral dark:text-[#ff9678]"><Star className="h-3.5 w-3.5 fill-butter text-clay" />{index + 1}. {resourceTypeLabel(resource)}</p>
                              <h4 className="mt-2 text-lg font-black text-ink dark:text-white">{resource.title}</h4>
                              {resource.description ? <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">{resource.description}</p> : null}
                              {resource.resource_type === 'custom_exercise' ? <p className="mt-2 text-xs font-bold text-clay dark:text-[#f7a98d]">Autosave attivo · nuove domande a ogni tentativo quando usa una pool</p> : null}
                            </div>
                            <Link to={resourceDestination(resource, assignment.id)} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-black text-white transition hover:bg-clay dark:bg-[#ff8b6c] dark:text-[#21140f] dark:hover:bg-[#f7a98d]">
                              Inizia
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </>
  );
}
