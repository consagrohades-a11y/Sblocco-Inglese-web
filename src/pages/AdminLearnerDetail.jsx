import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient.js';

const languageLabels = { it: 'Italiano', en: 'English' };
const statusLabels = {
  active: 'Attivo', suspended: 'Sospeso', deleted: 'Eliminato',
  draft: 'Bozza', published: 'Pubblicata', completed: 'Completata', archived: 'Archiviata',
  paused: 'In pausa', ended: 'Terminata',
};
const relationshipLabels = {
  preply: 'Preply', public_cohort: 'Cohort pubblico', company_cohort: 'Cohort aziendale', private_programme: 'Percorso privato',
};

function formatDate(value, includeTime = false) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

function SummaryRow({ label, value }) {
  return (
    <div className="border-b border-ink/10 py-4 last:border-b-0">
      <p className="text-xs font-black uppercase tracking-wide text-ink/45">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-ink sm:text-base">{value || '-'}</p>
    </div>
  );
}

export default function AdminLearnerDetail() {
  const { learnerId } = useParams();
  const [learner, setLearner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadLearner() {
      setLoading(true);
      setError('');
      const { data, error: rpcError } = await supabase.rpc('admin_get_learner_detail', {
        target_learner_id: learnerId,
      });
      if (!active) return;
      if (rpcError) {
        setError('Non è stato possibile caricare lo studente.');
        setLearner(null);
      } else {
        setLearner(data?.[0] ?? null);
      }
      setLoading(false);
    }
    loadLearner();
    return () => { active = false; };
  }, [learnerId]);

  const assignments = Array.isArray(learner?.assignments) ? learner.assignments : [];
  const relationships = Array.isArray(learner?.relationships) ? learner.relationships : [];
  const pageTitle = learner?.display_name || 'Dettaglio studente';

  return (
    <>
      <SEO title={`${pageTitle} | Studenti | Sblocco Inglese`} description="Dettaglio amministrativo dello studente." />
      <section className="section-shell py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 rounded-2xl border border-ink/10 bg-white p-6 shadow-soft sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="eyebrow">Studente</span>
              <h1 className="mt-4 text-3xl font-black text-ink sm:text-4xl">{pageTitle}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70">Profilo, relazioni didattiche e assegnazioni collegate a questo account.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/admin/learners" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink transition hover:bg-linen">Torna agli studenti</Link>
              {learner ? (
                <Link to={`/admin/learners/${learnerId}/assignments/new`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition hover:bg-moss">Crea assegnazione</Link>
              ) : null}
            </div>
          </div>

          {loading ? <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 text-sm font-bold text-ink/65 shadow-sm">Caricamento studente...</div> : null}
          {error ? <div className="mt-6 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold leading-6 text-red-900">{error}</div> : null}
          {!loading && !error && !learner ? <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm"><h2 className="text-xl font-black text-ink">Studente non trovato</h2></div> : null}

          {!loading && !error && learner ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              <div className="grid content-start gap-6">
                <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-moss">Profilo</p>
                  <div className="mt-3">
                    <SummaryRow label="Nome" value={learner.display_name || 'Nome non impostato'} />
                    <SummaryRow label="Email" value={learner.email} />
                    <SummaryRow label="Stato account" value={statusLabels[learner.status] || learner.status} />
                    <SummaryRow label="Lingua" value={languageLabels[learner.interface_language] || learner.interface_language} />
                    <SummaryRow label="Fuso orario" value={learner.timezone} />
                    <SummaryRow label="Registrazione" value={formatDate(learner.created_at, true)} />
                  </div>
                </section>

                <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-moss">Relazioni didattiche</p>
                  <h2 className="mt-2 text-xl font-black text-ink">{relationships.length}</h2>
                  {relationships.length === 0 ? <p className="mt-4 text-sm leading-6 text-ink/65">Nessuna relazione didattica registrata.</p> : (
                    <div className="mt-4 divide-y divide-ink/10">
                      {relationships.map((relationship) => (
                        <article key={relationship.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-black text-ink">{relationshipLabels[relationship.relationship_type] || relationship.relationship_type}</p>
                            <span className="rounded-full border border-ink/10 bg-linen px-3 py-1 text-xs font-black text-ink">{statusLabels[relationship.status] || relationship.status}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div><p className="text-xs font-black uppercase tracking-wide text-moss">Assegnazioni</p><h2 className="mt-2 text-2xl font-black text-ink">Attività dello studente</h2></div>
                  <p className="text-sm font-bold text-ink/50">Totale: {assignments.length}</p>
                </div>

                {assignments.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-ink/15 bg-linen/40 p-5">
                    <p className="text-sm font-black text-ink">Nessuna assegnazione</p>
                    <p className="mt-2 text-sm leading-6 text-ink/65">Crea la prima attività e scegli se salvarla come bozza o pubblicarla subito per lo studente.</p>
                  </div>
                ) : (
                  <div className="mt-6 divide-y divide-ink/10">
                    {assignments.map((assignment) => (
                      <article key={assignment.id} className="py-5 first:pt-0 last:pb-0">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-base font-black text-ink">{assignment.title}</h3>
                            <p className="mt-1 text-xs font-bold text-ink/45">Creata il {formatDate(assignment.created_at)}</p>
                          </div>
                          <span className="w-fit rounded-full border border-ink/10 bg-linen px-3 py-1.5 text-xs font-black text-ink">{statusLabels[assignment.status] || assignment.status}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-ink/55">
                          <span>{assignment.required ? 'Obbligatoria' : 'Facoltativa'}</span>
                          {assignment.estimated_minutes ? <span>{assignment.estimated_minutes} min stimati</span> : null}
                          {assignment.deadline_at ? <span>Scadenza: {formatDate(assignment.deadline_at, true)}</span> : null}
                        </div>
                        <Link
                          to={`/admin/learners/${learnerId}/assignments/${assignment.id}/content`}
                          className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-black text-ink transition hover:bg-linen"
                        >
                          Gestisci contenuti
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
