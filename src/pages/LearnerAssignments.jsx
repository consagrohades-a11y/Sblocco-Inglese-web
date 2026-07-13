import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

const statusLabels = {
  published: 'Da completare',
  completed: 'Completata',
};

export default function LearnerAssignments() {
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
        setAssignments(data ?? []);
      }

      setLoading(false);
    }

    loadAssignments();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <SEO title="Le mie attività | Sblocco Inglese" description="Attività assegnate nel tuo percorso Sblocco Inglese." />
      <section className="section-shell py-12 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8">
            <span className="eyebrow">Il tuo percorso</span>
            <h1 className="mt-4 text-3xl font-black text-ink sm:text-4xl">Le mie attività</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70">
              Qui trovi le attività pubblicate per te, con istruzioni, scadenze e tempo stimato.
            </p>
          </div>

          {loading ? <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65">Caricamento attività...</div> : null}
          {error ? <div className="mt-6 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold text-red-900">{error}</div> : null}

          {!loading && !error && assignments.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-white p-7 text-center shadow-sm">
              <h2 className="text-xl font-black text-ink">Nessuna attività assegnata</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65">Quando verrà pubblicata una nuova attività, la troverai qui.</p>
            </div>
          ) : null}

          {!loading && !error && assignments.length > 0 ? (
            <div className="mt-6 grid gap-5">
              {assignments.map((assignment) => (
                <article key={assignment.id} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="inline-flex rounded-full border border-ink/10 bg-linen px-3 py-1 text-xs font-black text-ink">
                        {statusLabels[assignment.status] || assignment.status}
                      </span>
                      <h2 className="mt-3 text-xl font-black text-ink">{assignment.title}</h2>
                      {assignment.learner_note ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/70">{assignment.learner_note}</p> : null}
                    </div>
                    <Link to={`/assignments/${assignment.id}`} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss">
                      Apri attività
                    </Link>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink/10 pt-4 text-xs font-bold text-ink/55">
                    <span>{assignment.required ? 'Obbligatoria' : 'Facoltativa'}</span>
                    {assignment.estimated_minutes ? <span>{assignment.estimated_minutes} min stimati</span> : null}
                    {assignment.deadline_at ? <span>Scadenza: {formatDate(assignment.deadline_at)}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
