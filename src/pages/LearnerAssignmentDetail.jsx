import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient.js';

const trainerDestinations = {
  word: { id: 'word-trainer', label: 'Word Trainer', route: '/trainers/word-trainer' },
  general: { id: 'general-expression', label: 'General Expressions', route: '/trainers/general-expression' },
  business: { id: 'business-expression', label: 'Business Expressions', route: '/trainers/business-expression' },
  hospitality: { id: 'hospitality-expression', label: 'Hospitality Expressions', route: '/trainers/hospitality-expression' },
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

export default function LearnerAssignmentDetail() {
  const { assignmentId } = useParams();
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
          .select('id, resource_key, resource_type, title, description, route, sequence_index, practice_config')
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

  return (
    <>
      <SEO title={`${title} | Sblocco Inglese`} description="Dettaglio della tua attività Sblocco Inglese." />
      <section className="section-shell py-12 dark:bg-[#0f1715] lg:py-16">
        <div className="mx-auto max-w-4xl">
          <Link to="/assignments" className="text-sm font-black text-moss underline dark:text-mint">Torna alle attività</Link>

          {loading ? <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65">Caricamento attività...</div> : null}
          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold text-red-900">{error}</div> : null}

          {!loading && !error && !assignment ? (
            <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-7 shadow-sm">
              <h1 className="text-2xl font-black text-ink">Attività non disponibile</h1>
              <p className="mt-2 text-sm leading-6 text-ink/65">L’attività potrebbe non appartenere al tuo account, non essere ancora pubblicata oppure non essere più accessibile.</p>
            </div>
          ) : null}

          {!loading && !error && assignment ? (
            <article className="mt-5 rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
              <span className="eyebrow">Attività assegnata</span>
              <h1 className="mt-4 text-3xl font-black leading-tight text-ink dark:text-white sm:text-4xl">{assignment.title}</h1>

              <div className="mt-6 flex flex-wrap gap-3 text-xs font-black text-ink/60">
                <span className="rounded-full border border-ink/10 bg-linen px-3 py-1.5 dark:border-white/10 dark:bg-white/10 dark:text-white/70">{assignment.required ? 'Obbligatoria' : 'Facoltativa'}</span>
                {assignment.estimated_minutes ? <span className="rounded-full border border-ink/10 bg-linen px-3 py-1.5 dark:border-white/10 dark:bg-white/10 dark:text-white/70">{assignment.estimated_minutes} min stimati</span> : null}
                {assignment.deadline_at ? <span className="rounded-full border border-ink/10 bg-linen px-3 py-1.5 dark:border-white/10 dark:bg-white/10 dark:text-white/70">Scadenza: {formatDate(assignment.deadline_at)}</span> : null}
              </div>

              <section className="mt-8 rounded-xl border border-moss/20 bg-mint/25 p-5 dark:border-emerald-300/25 dark:bg-emerald-400/10">
                <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-mint">Messaggio per te</p>
                <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-ink/75 dark:text-white/75">
                  {assignment.learner_note || 'Non ci sono istruzioni aggiuntive per questa attività.'}
                </p>
              </section>

              <section className="mt-8">
                <p className="text-xs font-black uppercase tracking-wide text-moss dark:text-mint">Contenuti</p>
                <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">Completa queste attività</h2>

                {studyScope?.include_in_srs ? (
                  <div className="mt-5 rounded-xl border border-sea/25 bg-sea/5 p-5 dark:border-cyan-300/25 dark:bg-cyan-300/[0.08]">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-sea dark:text-cyan-200">Card assegnate nei Trainer SRS</p>
                      <h3 className="mt-2 text-lg font-black text-ink dark:text-white">{studyScope.snapshot_item_count} card totali</h3>
                      <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">Apri direttamente il Trainer che contiene le card assegnate per questa attività.</p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {trainerBreakdown.map((trainer) => (
                        <Link key={trainer.id} to={`${trainer.route}?returnTo=${encodeURIComponent(`/assignments/${assignment.id}`)}`} className="focus-ring flex min-h-14 items-center justify-between gap-3 rounded-xl border border-sea/20 bg-white px-4 py-3 text-ink transition hover:border-sea hover:bg-cyan-50 dark:border-white/15 dark:bg-white/[0.08] dark:text-white dark:hover:border-cyan-300/45 dark:hover:bg-white/[0.12]">
                          <span className="text-sm font-black">{trainer.label}</span>
                          <span className="rounded-full bg-sea px-2.5 py-1 text-xs font-black text-white">{trainer.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {resources.length === 0 && !studyScope?.include_in_srs ? (
                  <div className="mt-5 rounded-xl border border-dashed border-ink/15 bg-linen/35 p-5">
                    <p className="text-sm font-black text-ink">Nessun contenuto collegato</p>
                    <p className="mt-2 text-sm leading-6 text-ink/65">Segui le istruzioni scritte sopra. Non è stato collegato un trainer o un’unità specifica.</p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4">
                    {resources.map((resource, index) => (
                      <article key={resource.id} className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-moss">
                              {index + 1}. {resource.resource_type === 'practice_session' ? 'Pratica mirata' : resource.resource_type === 'trainer' ? 'Trainer' : 'Unità grammaticale'}
                            </p>
                            <h3 className="mt-2 text-lg font-black text-ink dark:text-white">{resource.title}</h3>
                            {resource.description ? <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/65">{resource.description}</p> : null}
                          </div>
                          <Link to={resource.resource_type === 'practice_session' ? `/practice?assignmentId=${assignment.id}&resourceId=${resource.id}` : resource.route} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss">
                            Inizia
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </article>
          ) : null}
        </div>
      </section>
    </>
  );
}
