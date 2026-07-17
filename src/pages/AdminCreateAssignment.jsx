import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient.js';

export default function AdminCreateAssignment() {
  const { learnerId } = useParams();
  const navigate = useNavigate();
  const [learner, setLearner] = useState(null);
  const [loadingLearner, setLoadingLearner] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [learnerMessage, setLearnerMessage] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [required, setRequired] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  useEffect(() => {
    let active = true;

    async function loadLearner() {
      setLoadingLearner(true);
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

      setLoadingLearner(false);
    }

    loadLearner();

    return () => {
      active = false;
    };
  }, [learnerId]);

  async function createAssignment() {
    setError('');

    if (!title.trim()) {
      setError('Inserisci un titolo per l’assegnazione.');
      return;
    }

    const parsedMinutes = estimatedMinutes ? Number.parseInt(estimatedMinutes, 10) : null;

    if (parsedMinutes !== null && (!Number.isInteger(parsedMinutes) || parsedMinutes <= 0)) {
      setError('Il tempo stimato deve essere un numero maggiore di zero.');
      return;
    }

    setSubmitting(true);

    const { data: createdAssignmentId, error: createError } = await supabase.rpc('admin_create_assignment', {
      target_learner_id: learnerId,
      assignment_title: title.trim(),
      learner_message: learnerMessage.trim() || null,
      private_admin_note: privateNote.trim() || null,
      is_required: required,
      deadline_at_value: deadline ? new Date(deadline).toISOString() : null,
      estimated_minutes_value: parsedMinutes,
      publish_now: false,
    });

    setSubmitting(false);

    if (createError || !createdAssignmentId) {
      setError('Non è stato possibile creare l’assegnazione. Verifica che la migrazione admin_create_assignment sia stata applicata in Supabase.');
      return;
    }

    navigate(`/admin/learners/${learnerId}/assignments/${createdAssignmentId}/content`, {
      replace: true,
      state: { assignmentCreated: true },
    });
  }

  const fieldClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint/40 dark:border-white/20 dark:bg-[#101a17] dark:text-white dark:focus:border-emerald-300 dark:focus:ring-emerald-400/15';

  return (
    <>
      <SEO
        title="Crea assegnazione | Pannello admin | Sblocco Inglese"
        description="Crea una nuova assegnazione per uno studente."
      />
      <section className="section-shell py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-[#16211e] sm:p-8">
            <span className="eyebrow">Nuova assegnazione</span>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-black text-ink dark:text-white sm:text-4xl">1. Informazioni principali</h1>
                <p className="mt-3 text-base leading-7 text-ink/70 dark:text-white/65">
                  {loadingLearner
                    ? 'Caricamento studente...'
                    : learner
                      ? `Prepara una nuova attività per ${learner.display_name || learner.email}. Nel passaggio successivo sceglierai deck, batch, esercizi e Trainer.`
                      : 'Studente non trovato.'}
                </p>
              </div>
              <Link
                to={`/admin/learners/${learnerId}`}
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-black text-ink transition hover:bg-linen dark:border-white/20 dark:bg-white/10 dark:text-white"
              >
                Annulla
              </Link>
            </div>
          </div>

          {error ? (
            <div className="mt-6 border-l-4 border-red-400 bg-red-50 p-5 text-sm font-bold leading-6 text-red-900">
              {error}
            </div>
          ) : null}

          {!loadingLearner && learner ? (
            <form className="mt-6 grid gap-6" onSubmit={(event) => event.preventDefault()}>
              <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-8">
                <h2 className="text-xl font-black text-ink dark:text-white">Titolo e messaggi</h2>

                <label className="mt-6 block">
                  <span className="text-sm font-black text-ink dark:text-white">Titolo</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={160}
                    required
                    placeholder="Esempio: Ripasso present simple"
                    className={fieldClass}
                  />
                </label>

                <label className="mt-5 block">
                  <span className="text-sm font-black text-ink dark:text-white">Messaggio per lo studente</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-ink/65 dark:text-white/65">Visibile allo studente nella pagina dell’attività.</span>
                  <textarea
                    value={learnerMessage}
                    onChange={(event) => setLearnerMessage(event.target.value)}
                    rows={6}
                    maxLength={3000}
                    placeholder="Scrivi istruzioni, contesto o indicazioni personali..."
                    className={fieldClass}
                  />
                </label>

                <label className="mt-5 block rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-300/30 dark:bg-amber-300/10">
                  <span className="text-sm font-black text-amber-950 dark:text-amber-100">Nota privata admin</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-amber-900/70 dark:text-amber-100/60">Visibile soltanto nell’area amministrativa.</span>
                  <textarea
                    value={privateNote}
                    onChange={(event) => setPrivateNote(event.target.value)}
                    rows={4}
                    maxLength={3000}
                    placeholder="Difficoltà osservate, obiettivo della prossima lezione, motivo dell’assegnazione..."
                    className={fieldClass}
                  />
                </label>
              </section>

              <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#16211e] sm:p-8">
                <h2 className="text-xl font-black text-ink dark:text-white">Impostazioni</h2>

                <label className="mt-6 flex items-start gap-3 rounded-xl border border-ink/10 bg-linen p-4 dark:border-white/10 dark:bg-white/[0.05]">
                  <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} className="mt-1 h-4 w-4" />
                  <span><span className="block text-sm font-black text-ink dark:text-white">Attività obbligatoria</span><span className="mt-1 block text-xs font-semibold leading-5 text-ink/65 dark:text-white/65">Disattiva questa opzione per un’attività facoltativa.</span></span>
                </label>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="block"><span className="text-sm font-black text-ink dark:text-white">Scadenza</span><input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={fieldClass} /></label>
                  <label className="block"><span className="text-sm font-black text-ink dark:text-white">Tempo stimato, minuti</span><input type="number" min="1" step="1" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} placeholder="20" className={fieldClass} /></label>
                </div>
              </section>

              <section className="rounded-2xl border border-moss/20 bg-mint/25 p-5 dark:border-emerald-300/20 dark:bg-emerald-400/[0.06]">
                <p className="text-sm font-black text-ink dark:text-white">Passaggio successivo</p>
                <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white/60">L’assegnazione verrà creata come bozza e si aprirà subito l’editor completo. Potrai aggiungere contenuti e pubblicarla senza tornare indietro.</p>
                <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Link to={`/admin/learners/${learnerId}`} className="focus-ring min-h-12 rounded-full border border-ink/15 bg-white px-6 py-3 text-center text-sm font-black text-ink transition hover:bg-linen dark:border-white/20 dark:bg-white/10 dark:text-white">Annulla</Link>
                  <button type="button" disabled={submitting} onClick={createAssignment} className="focus-ring min-h-12 rounded-full bg-ink px-6 py-3 text-sm font-black text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                    {submitting ? 'Creazione...' : 'Crea e scegli i contenuti'}
                  </button>
                </div>
              </section>
            </form>
          ) : null}
        </div>
      </section>
    </>
  );
}
