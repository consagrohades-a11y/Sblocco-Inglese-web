import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
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

export default function LearnerAssignmentDetail() {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [resources, setResources] = useState([]);
  const [studyScope, setStudyScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAssignment() {
      setLoading(true);
      setError('');

      const [{ data, error: queryError }, { data: resourceData, error: resourceError }, { data: studyData, error: studyError }] = await Promise.all([
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
      ]);

      if (!active) return;

      if (queryError || resourceError || studyError) {
        setError('Non è stato possibile caricare questa attività.');
        setAssignment(null);
        setResources([]);
        setStudyScope(null);
      } else {
        setAssignment(data ?? null);
        setResources(resourceData ?? []);
        setStudyScope(studyData ?? null);
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
      <section className="section-shell py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <Link to="/assignments" className="text-sm font-black text-moss underline">Torna alle attività</Link>

          {loading ? <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65">Caricamento attività...</div> : null}
          {error ? <div className="mt-5 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold text-red-900">{error}</div> : null}

          {!loading && !error && !assignment ? (
            <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-7 shadow-sm">
              <h1 className="text-2xl font-black text-ink">Attività non disponibile</h1>
              <p className="mt-2 text-sm leading-6 text-ink/65">L’attività potrebbe non appartenere al tuo account, non essere ancora pubblicata oppure non essere più accessibile.</p>
            </div>
          ) : null}

          {!loading && !error && assignment ? (
            <article className="mt-5 rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
              <span className="eyebrow">Attività assegnata</span>
              <h1 className="mt-4 text-3xl font-black leading-tight text-ink sm:text-4xl">{assignment.title}</h1>

              <div className="mt-6 flex flex-wrap gap-3 text-xs font-black text-ink/60">
                <span className="rounded-full border border-ink/10 bg-linen px-3 py-1.5">{assignment.required ? 'Obbligatoria' : 'Facoltativa'}</span>
                {assignment.estimated_minutes ? <span className="rounded-full border border-ink/10 bg-linen px-3 py-1.5">{assignment.estimated_minutes} min stimati</span> : null}
                {assignment.deadline_at ? <span className="rounded-full border border-ink/10 bg-linen px-3 py-1.5">Scadenza: {formatDate(assignment.deadline_at)}</span> : null}
              </div>

              <section className="mt-8 rounded-xl border border-moss/20 bg-mint/25 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Messaggio per te</p>
                <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-ink/75">
                  {assignment.learner_note || 'Non ci sono istruzioni aggiuntive per questa attività.'}
                </p>
              </section>

              <section className="mt-8">
                <p className="text-xs font-black uppercase tracking-wide text-moss">Contenuti</p>
                <h2 className="mt-2 text-2xl font-black text-ink">Completa queste attività</h2>

                {studyScope?.include_in_srs ? (
                  <div className="mt-5 rounded-xl border border-sea/25 bg-sea/5 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-xs font-black uppercase tracking-wide text-sea">Ripasso guidato</p><h3 className="mt-2 text-lg font-black text-ink">{studyScope.snapshot_item_count} card nel tuo SRS</h3><p className="mt-2 text-sm leading-6 text-ink/65">Le parole e le espressioni scelte dalla tua insegnante sono già entrate nei Trainer corretti.</p></div>
                      <Link to="/trainers" className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-sea px-5 py-2.5 text-sm font-black text-white transition hover:bg-ink">Apri i Trainer</Link>
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
                      <article key={resource.id} className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-moss">
                              {index + 1}. {resource.resource_type === 'practice_session' ? 'Pratica mirata' : resource.resource_type === 'trainer' ? 'Trainer' : 'Unità grammaticale'}
                            </p>
                            <h3 className="mt-2 text-lg font-black text-ink">{resource.title}</h3>
                            {resource.description ? <p className="mt-2 text-sm leading-6 text-ink/65">{resource.description}</p> : null}
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
