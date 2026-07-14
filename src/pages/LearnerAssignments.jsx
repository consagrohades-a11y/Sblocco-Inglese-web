import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Clock3, Sparkles } from 'lucide-react';
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
  published: 'Da fare ora',
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
          <div className="relative overflow-hidden rounded-2xl border border-moss/15 bg-gradient-to-br from-white via-white to-mint/35 p-6 shadow-soft dark:border-white/10 dark:from-[#16211e] dark:via-[#16211e] dark:to-[#17352c] sm:p-8">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-moss via-coral to-[#ffc457]" />
            <div aria-hidden="true" className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-coral/10 blur-3xl" />
            <div className="relative">
              <span className="eyebrow"><ClipboardList aria-hidden="true" className="h-4 w-4" />Il tuo percorso</span>
              <h1 className="mt-4 text-3xl font-black text-ink dark:text-white sm:text-4xl">Le mie attività</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70 dark:text-white/65">
                Parti dalle attività da fare ora. Trovi già istruzioni, scadenze e tempo stimato.
              </p>
            </div>
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
                <article key={assignment.id} className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${assignment.status === 'completed' ? 'border-moss/15 bg-gradient-to-br from-white to-mint/25 dark:border-emerald-300/15 dark:from-[#16211e] dark:to-[#17352c]' : 'border-coral/20 bg-gradient-to-br from-white via-white to-[#fff7e3] dark:border-coral/25 dark:from-[#1a221f] dark:via-[#1a221f] dark:to-[#30231c]'}`}>
                  <div aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${assignment.status === 'completed' ? 'bg-moss' : 'bg-gradient-to-b from-coral to-[#ffc457]'}`} />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${assignment.status === 'completed' ? 'border-moss/20 bg-mint text-moss dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-mint' : 'border-coral/20 bg-[#fff1df] text-[#9a3f29] dark:border-coral/25 dark:bg-coral/15 dark:text-[#ffc7b0]'}`}>
                        {assignment.status === 'completed' ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}
                        {statusLabels[assignment.status] || assignment.status}
                      </span>
                      <h2 className="mt-3 text-xl font-black text-ink dark:text-white sm:text-2xl">{assignment.title}</h2>
                      {assignment.learner_note ? <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm font-medium leading-6 text-ink/65 dark:text-white/65">{assignment.learner_note}</p> : null}
                    </div>
                    <Link to={`/assignments/${assignment.id}`} className={`focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-black transition ${assignment.status === 'completed' ? 'border border-moss/20 bg-white text-moss hover:bg-mint dark:border-white/15 dark:bg-white/[0.07] dark:text-mint dark:hover:bg-white/[0.12]' : 'bg-gradient-to-r from-moss to-[#15977c] text-white shadow-lift hover:-translate-y-0.5 hover:brightness-110'}`}>
                      {assignment.status === 'completed' ? 'Rivedi attività' : 'Continua attività'}
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/10 pt-4 text-xs font-bold dark:border-white/10">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 text-ink/60 dark:bg-white/[0.07] dark:text-white/60"><ClipboardList aria-hidden="true" className="h-3.5 w-3.5" />{assignment.required ? 'Obbligatoria' : 'Facoltativa'}</span>
                    {assignment.estimated_minutes ? <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 text-ink/60 dark:bg-white/[0.07] dark:text-white/60"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{assignment.estimated_minutes} min stimati</span> : null}
                    {assignment.deadline_at ? <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${assignment.status === 'completed' ? 'bg-ink/5 text-ink/60 dark:bg-white/[0.07] dark:text-white/60' : 'bg-[#fff1df] text-[#9a3f29] dark:bg-coral/15 dark:text-[#ffc7b0]'}`}><CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />Scadenza: {formatDate(assignment.deadline_at)}</span> : null}
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
