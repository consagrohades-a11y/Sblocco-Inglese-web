import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FileCheck2, LockKeyhole } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import {
  EditorialContinuation,
  EditorialLessonHero,
  EditorialLearningShell,
} from '../components/learning/EditorialLearning.jsx';
import RecoveryNav from '../components/recovery/RecoveryNav.jsx';
import { recoverySessionDisplayTitle } from '../lib/recoveryPresentation.js';
import { recoveryTopicLabel } from '../config/recovery.js';
import {
  loadRecoveryTopicFollowup,
  materializeRecoverySession,
  startRecoveryTopicCycleSession,
  startRecoveryTopicRedo,
  syncRecoverySession,
} from '../lib/recoveryApi.js';
import { recoveryFollowupCopy } from '../lib/recoveryRemediationPolicy.js';
import { supabase } from '../lib/supabaseClient.js';
import '../styles/learnerEditorial.css';

const stageLabels = {
  recupera: 'Recupera',
  recupera_essenziale: 'Recupera',
  ripasso_rapido: 'Ripasso rapido',
  allenati: 'Allenati',
  modalita_scuola: 'Modalità scuola',
  mini_verifica: 'Mini-verifica',
  errori_ricorrenti: 'Errori ricorrenti',
  richiamo_attivo: 'Richiamo attivo',
  pratica_mista: 'Pratica mista',
  verifica_mista: 'Verifica mista',
  simulazione: 'Simulazione',
};

function sessionEyebrow(session, mock, checkpoint) {
  if (mock) return 'Simulazione prova di recupero';
  if (checkpoint) return 'Verifica di percorso';
  if (session?.session_type === 'quick_review') return 'Ripasso rapido';
  if (session?.session_type === 'error_review') return 'Ripassa gli errori';
  return 'Recupero Debito Inglese';
}

export default function RecoverySession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [followup, setFollowup] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error: loadError } = await supabase
        .from('recovery_plan_sessions')
        .select('id, enrollment_id, sequence_index, session_type, topic_key, title, rationale, estimated_minutes, stages, metadata, status, assignment_id, assignment_resource_id, score')
        .eq('id', sessionId)
        .maybeSingle();
      if (!active) return;
      if (loadError || !data) {
        setError('Sessione non disponibile.');
      } else {
        let resolved = data;
        if (data.assignment_id && !['completed', 'skipped'].includes(data.status)) {
          try {
            const syncResult = await syncRecoverySession(data.id);
            if (syncResult?.completed || syncResult?.already_completed) {
              const { data: refreshed } = await supabase
                .from('recovery_plan_sessions')
                .select('id, enrollment_id, sequence_index, session_type, topic_key, title, rationale, estimated_minutes, stages, metadata, status, assignment_id, assignment_resource_id, score')
                .eq('id', sessionId)
                .maybeSingle();
              if (refreshed) resolved = refreshed;
            }
          } catch {
            // The assignment may simply be incomplete; the normal launch flow remains available.
          }
        }
        setSession(resolved);
        if (resolved.status === 'completed' && resolved.topic_key) {
          try {
            const next = await loadRecoveryTopicFollowup(resolved.id);
            if (next?.ready) setFollowup(next);
          } catch {
            setFollowup(null);
          }
        }
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [sessionId]);

  async function launch() {
    if (!session) return;
    setLaunching(true);
    setError('');
    try {
      if (session.metadata?.recovery_cycle) {
        const result = await startRecoveryTopicCycleSession(session.id);
        if (!result?.ready || !result.assignment_id) {
          setError('Il nuovo ciclo è stato registrato, ma il contenuto necessario non è ancora disponibile.');
          return;
        }
        navigate(`/assignments/${result.assignment_id}`);
        return;
      }
      if (session.assignment_id) {
        navigate(`/assignments/${session.assignment_id}`);
        return;
      }
      const result = await materializeRecoverySession(session.id);
      if (!result?.ready || !result.assignment_id) {
        setError('Questa sessione non ha ancora un esercizio pubblicato collegato. Il piano resta valido, ma il contenuto deve essere associato dall’area admin prima di poterla avviare.');
        return;
      }
      navigate(`/assignments/${result.assignment_id}`);
    } catch (launchError) {
      setError(launchError.message || 'Non è stato possibile preparare la sessione.');
    } finally {
      setLaunching(false);
    }
  }

  async function redoFullPath() {
    if (!session?.enrollment_id || !session?.topic_key || redoing) return;
    setRedoing(true);
    setError('');
    try {
      const result = await startRecoveryTopicRedo(session.enrollment_id, session.topic_key);
      if (!result?.session_id) throw new Error('Il nuovo ciclo non è ancora disponibile.');
      navigate(`/recupero-debito/sessione/${result.session_id}`);
    } catch (redoError) {
      setError(redoError.message || 'Non è stato possibile preparare il nuovo ciclo completo.');
    } finally {
      setRedoing(false);
    }
  }

  const mock = session?.session_type?.startsWith('mock_');
  const checkpoint = session?.session_type === 'checkpoint';
  const topic = session?.topic_key ? recoveryTopicLabel(session.topic_key) : null;
  const followupCopy = followup?.ready ? recoveryFollowupCopy(followup.verify_score, followup.mastery_state) : null;
  const followupScore = followup?.ready ? Math.round(Number(followup.verify_score || 0)) : null;
  const canOfferFullRedo = followup?.remediation_required && followupScore >= 60 && followupScore < 80;

  return (
    <EditorialLearningShell className="learner-editorial learner-workspace-page">
      <SEO title={`${session?.title || 'Sessione'} | Recupero Debito`} description="Sessione del percorso Recupero Debito Inglese." />
      <div className="learner-shell">
        <RecoveryNav />
        <Link to="/dashboard" className="learner-text-link"><ArrowLeft size={15} /> Torna a oggi</Link>

        {loading ? <p className="learner-empty">Preparazione della sessione...</p> : null}

        {!loading && session ? (
          <>
            <div style={{ marginTop: '1rem' }}>
              <EditorialLessonHero
                eyebrow={sessionEyebrow(session, mock, checkpoint)}
                title={recoverySessionDisplayTitle(session.title)}
                intro={session.rationale}
                compact
                meta={[
                  { label: `~ ${session.estimated_minutes} min`, icon: 'time' },
                  ...(topic ? [{ label: topic, icon: 'topic' }] : []),
                  { label: `Sessione ${session.sequence_index}` },
                ]}
              />
            </div>

            <section className="learner-form-card" style={{ marginTop: '1rem' }}>
              {mock ? (
                <section className="learner-form-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                  <h2>Come funziona questa simulazione</h2>
                  <div className="learner-plan-update"><LockKeyhole size={16} aria-hidden="true" /> <strong>Niente correzioni durante la prova.</strong> Non vedrai suggerimenti, risposta corretta o spiegazioni mentre stai svolgendo le domande.</div>
                  <ul className="learner-list">
                    <li className="learner-list__row"><span className="learner-list__index">1</span><div><strong>Leggi le istruzioni prima di iniziare</strong><p>La prova può contenere sezioni e formati diversi.</p></div></li>
                    <li className="learner-list__row"><span className="learner-list__index">2</span><div><strong>Completa la prova senza interrompere il flusso</strong><p>Puoi navigare tra le domande previste dal player, ma non ricevi feedback didattico immediato.</p></div></li>
                    <li className="learner-list__row"><span className="learner-list__index">3</span><div><strong>Consegna e poi guarda il risultato</strong><p>Punteggio e breakdown vengono raccolti dopo la consegna e usati per aggiornare il piano.</p></div></li>
                  </ul>
                </section>
              ) : checkpoint ? (
                <section className="learner-form-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                  <h2>Verifica mista</h2>
                  <div className="learner-plan-update"><FileCheck2 size={16} aria-hidden="true" /> Le domande non anticipano la regola da usare. Il risultato serve a ricalcolare le priorità del percorso.</div>
                </section>
              ) : (
                <section className="learner-form-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                  <p className="learner-kicker">La sessione di oggi</p>
                  <h2>Un passo alla volta</h2>
                  <ol className="learner-list">
                    {(session.stages || []).map((stage, index) => (
                      <li className="learner-list__row" key={`${stage}-${index}`}><span className="learner-list__index">{index + 1}</span><div><strong>{stageLabels[stage] || stage}</strong><p>{stage === 'modalita_scuola' ? 'Formati di esercizio vicini alle verifiche scolastiche.' : stage === 'mini_verifica' ? 'Controllo breve prima di chiudere la sessione.' : stage.startsWith('recupera') || stage === 'ripasso_rapido' ? 'Spiegazione breve e mirata prima della pratica.' : 'Una tappa breve, in ordine.'}</p></div></li>
                    ))}
                  </ol>
                </section>
              )}

              {error ? <p className="learner-error" role="alert">{error}</p> : null}
            </section>

            {session.status === 'completed' && followup?.ready ? (
              <EditorialContinuation
                eyebrow={`Verifica argomento · ${followupScore}%`}
                title={followupCopy.title}
                body={followupCopy.body}
              >
                <div className="learner-form-actions" style={{ marginTop: 0 }}>
                  {followup.remediation_required && followup.next_session_id ? (
                    <Link to={`/recupero-debito/sessione/${followup.next_session_id}`} className="sblocco-learning-action focus-ring">
                      {followupCopy.primaryAction} <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <Link to="/recupero-debito/argomenti" className="sblocco-learning-action focus-ring">Torna agli argomenti <ArrowRight size={16} /></Link>
                  )}
                  {canOfferFullRedo ? (
                    <button type="button" className="learner-secondary-button" onClick={redoFullPath} disabled={redoing}>
                      {redoing ? 'Preparazione...' : 'Rifai tutto il percorso'}
                    </button>
                  ) : null}
                  <Link to="/recupero-debito/percorso" className="learner-secondary-button">Vedi il percorso</Link>
                </div>
              </EditorialContinuation>
            ) : session.status === 'completed' ? (
              <EditorialContinuation eyebrow="Sessione completata" title="Risultato salvato" body="La cronologia del primo tentativo resta disponibile. Torna al percorso per vedere il prossimo passo.">
                <div className="learner-form-actions" style={{ marginTop: 0 }}>
                  <Link to="/recupero-debito/percorso" className="sblocco-learning-action focus-ring">Vedi il percorso <ArrowRight size={16} /></Link>
                </div>
              </EditorialContinuation>
            ) : (
              <EditorialContinuation
                eyebrow="Continua da qui"
                title={mock ? 'Quando inizi, sei in modalità prova.' : 'Adesso passiamo al lavoro vero.'}
                body={mock ? 'Prenditi il tempo necessario e consegna soltanto quando hai finito. Le correzioni arrivano dopo.' : 'La teoria resta breve: il resto della sessione serve a usare ciò che hai appena ripassato.'}
              >
                <div className="learner-form-actions" style={{ marginTop: 0 }}>
                  <button type="button" className="sblocco-learning-action focus-ring" onClick={launch} disabled={launching}>
                    {launching ? 'Preparazione...' : session.assignment_id ? 'Continua' : mock ? 'Inizia la simulazione' : 'Inizia la sessione'} {!launching ? <ArrowRight size={16} /> : null}
                  </button>
                  <Link to="/recupero-debito/percorso" className="learner-secondary-button">Vedi il percorso</Link>
                </div>
              </EditorialContinuation>
            )}
          </>
        ) : null}

        {!loading && !session && error ? <p className="learner-error">{error}</p> : null}
      </div>
    </EditorialLearningShell>
  );
}
