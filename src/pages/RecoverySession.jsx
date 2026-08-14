import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, FileCheck2, LockKeyhole } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import {
  EditorialContinuation,
  EditorialLessonHero,
  EditorialLearningShell,
} from '../components/learning/EditorialLearning.jsx';
import RecoveryNav from '../components/recovery/RecoveryNav.jsx';
import RecoveryGuidancePanel from '../components/recovery/RecoveryGuidancePanel.jsx';
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

const stageDescriptions = {
  recupera: 'Riprendi la regola e il tipo di errore che ti sta bloccando. Subito dopo passerai ad applicarli con una guida.',
  recupera_essenziale: 'Rivedi soltanto la regola essenziale che ti serve adesso. Poi la userai in esercizi guidati.',
  ripasso_rapido: 'Richiama i punti chiave di un argomento già abbastanza stabile. Poi li controllerai con meno aiuti.',
  allenati: 'Applica ciò che hai appena ripassato in esercizi guidati. Il passaggio successivo sarà più vicino al lavoro scolastico.',
  modalita_scuola: 'Ricevi meno suggerimenti e scegli la struttura in modo più autonomo, come in una verifica scolastica.',
  mini_verifica: 'Questo controllo decide se l’argomento può scendere di priorità. Non predice il voto: se resta instabile, il piano proporrà lavoro nuovo e mirato.',
  verifica_mista: 'Argomenti e strutture sono mescolati: devi scegliere autonomamente la regola adatta al contesto.',
};

function checkpointSummary(attempt) {
  const topicScores = Object.entries(attempt?.topic_scores || {})
    .filter(([, score]) => Number.isFinite(Number(score)))
    .map(([topicKey, score]) => ({ topicKey, label: recoveryTopicLabel(topicKey), score: Math.round(Number(score)) }));
  const stable = topicScores.filter((item) => item.score >= 85);
  const consolidate = topicScores.filter((item) => item.score >= 70 && item.score < 85);
  const priority = topicScores.filter((item) => item.score < 70);
  const changedMessage = priority.length
    ? `Il piano è già stato aggiornato: ${priority.map((item) => item.label).join(', ')} ${priority.length === 1 ? 'torna' : 'tornano'} tra le priorità con lavoro nuovo.`
    : consolidate.length
      ? 'Il piano è già stato aggiornato: gli argomenti da consolidare restano nel lavoro futuro, mentre quelli stabili non vengono ripetuti subito.'
      : 'Il piano è già stato aggiornato: gli argomenti stabili non vengono ripetuti subito e il percorso continua con il lavoro ancora necessario.';
  return {
    overallScore: attempt?.score == null ? null : Math.round(Number(attempt.score)),
    stable,
    consolidate,
    priority,
    changedMessage,
  };
}

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
  const [checkpointResult, setCheckpointResult] = useState(null);
  const [checkpointUpdating, setCheckpointUpdating] = useState(false);
  const [error, setError] = useState('');
  const checkpointHandled = useRef(false);

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
        if (resolved.status === 'completed' && resolved.session_type === 'checkpoint' && !checkpointHandled.current) {
          checkpointHandled.current = true;
          setCheckpointUpdating(true);
          try {
            const { data: attempts, error: attemptError } = await supabase
              .from('recovery_assessment_attempts')
              .select('id, score, topic_scores, submitted_at, feedback_released, created_at')
              .eq('session_id', resolved.id)
              .order('created_at', { ascending: false })
              .limit(1);
            if (attemptError) throw attemptError;
            const attempt = attempts?.[0] || null;
            const summary = resolved.metadata?.checkpoint_plan_update_summary || checkpointSummary(attempt);
            setCheckpointResult({ attempt, summary });
          } catch (checkpointError) {
            setError(checkpointError.message || 'Il risultato è stato salvato, ma non siamo riusciti a caricare il riepilogo.');
          } finally {
            setCheckpointUpdating(false);
          }
        }
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
                  <RecoveryGuidancePanel concept="mixed-checkpoint" title="Perché questa verifica è diversa?">
                    <p>Serve a controllare se sai scegliere la regola da usare senza che il nome dell’argomento venga anticipato.</p>
                  </RecoveryGuidancePanel>
                  <div className="learner-plan-update"><FileCheck2 size={16} aria-hidden="true" /> <span><strong>Che cosa fai:</strong> rispondi a parti brevi con argomenti mescolati. <strong>Perché:</strong> controlliamo la scelta autonoma della regola. <strong>Dopo:</strong> vedrai risultato, aree da consolidare e cambiamenti del piano.</span></div>
                  <ul className="learner-list">
                    <li className="learner-list__row"><span className="learner-list__index">1</span><div><strong>Gli argomenti sono mescolati intenzionalmente</strong><p>Il nome della struttura da usare non compare accanto alla domanda.</p></div></li>
                    <li className="learner-list__row"><span className="learner-list__index">2</span><div><strong>Correzioni e punteggio restano nascosti</strong><p>Li vedrai soltanto dopo la consegna finale, non domanda per domanda.</p></div></li>
                    <li className="learner-list__row"><span className="learner-list__index">3</span><div><strong>Il risultato aggiorna le priorità future</strong><p>Non è una previsione del voto scolastico. Serve a decidere che cosa riprendere nel percorso.</p></div></li>
                  </ul>
                </section>
              ) : (
                <section className="learner-form-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                  <p className="learner-kicker">La sessione di oggi</p>
                  <h2>Un passo alla volta</h2>
                  <div className="learner-plan-update"><FileCheck2 size={16} aria-hidden="true" /> <span><strong>Perché questo argomento adesso:</strong> {session.rationale} <strong>Dopo:</strong> il controllo finale stabilirà se può scendere di priorità o se serve un nuovo ciclo mirato.</span></div>
                  {(session.stages || []).includes('modalita_scuola') ? (
                    <RecoveryGuidancePanel concept="school-mode" title="Che cos’è la Modalità scuola?">
                      <p>In questa fase ricevi meno aiuti e devi decidere più autonomamente, perché il formato è più vicino al lavoro che fai a scuola.</p>
                    </RecoveryGuidancePanel>
                  ) : null}
                  <ol className="learner-list">
                    {(session.stages || []).map((stage, index) => (
                      <li className="learner-list__row" key={`${stage}-${index}`}><span className="learner-list__index">{index + 1}</span><div><strong>{stageLabels[stage] || stage}</strong><p>{stageDescriptions[stage] || 'Una tappa breve, in ordine.'}</p></div></li>
                    ))}
                  </ol>
                </section>
              )}

              {error ? <p className="learner-error" role="alert">{error}</p> : null}
            </section>

            {session.status === 'completed' && checkpoint ? (
              <EditorialContinuation
                eyebrow={checkpointResult?.summary?.overallScore == null ? 'Verifica mista completata' : `Verifica mista · ${checkpointResult.summary.overallScore}%`}
                title="Che cosa cambia nel tuo piano?"
                body={checkpointUpdating ? 'Caricamento del piano già aggiornato...' : checkpointResult?.summary?.changedMessage || 'Il risultato è stato salvato. Il piano mostrerà il prossimo passo disponibile.'}
              >
                {checkpointResult?.summary ? (
                  <div className="learner-checkpoint-breakdown">
                    <div><strong>Bene</strong><span>{checkpointResult.summary.stable.length ? checkpointResult.summary.stable.map((item) => `${item.label} ${item.score}%`).join(' · ') : 'Nessun dato sufficiente in questa fascia.'}</span></div>
                    <div><strong>Da consolidare</strong><span>{checkpointResult.summary.consolidate.length ? checkpointResult.summary.consolidate.map((item) => `${item.label} ${item.score}%`).join(' · ') : 'Nessun dato sufficiente in questa fascia.'}</span></div>
                    <div><strong>Torna tra le priorità</strong><span>{checkpointResult.summary.priority.length ? checkpointResult.summary.priority.map((item) => `${item.label} ${item.score}%`).join(' · ') : 'Nessun argomento torna in priorità alta.'}</span></div>
                  </div>
                ) : null}
                <p className="learner-form-card__intro">Gli argomenti stabili possono comunque ricomparire più avanti in controlli misti. Questo risultato non predice il voto della scuola.</p>
                <div className="learner-form-actions" style={{ marginTop: '1rem' }}>
                  <Link to="/recupero-debito/percorso" className="sblocco-learning-action focus-ring">Continua con il piano aggiornato <ArrowRight size={16} /></Link>
                </div>
              </EditorialContinuation>
            ) : session.status === 'completed' && followup?.ready ? (
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
                title={mock ? 'Quando inizi, sei in modalità prova.' : checkpoint ? 'Quando inizi, il feedback resta nascosto.' : 'Adesso passiamo al lavoro vero.'}
                body={mock ? 'Prenditi il tempo necessario e consegna soltanto quando hai finito. Le correzioni arrivano dopo.' : checkpoint ? 'Completa tutte le parti e consegna una sola volta. Poi vedrai il risultato e il prossimo passo.' : 'La teoria resta breve: il resto della sessione serve a usare ciò che hai appena ripassato.'}
              >
                <div className="learner-form-actions" style={{ marginTop: 0 }}>
                  <button type="button" className="sblocco-learning-action focus-ring" onClick={launch} disabled={launching}>
                    {launching ? 'Preparazione...' : session.assignment_id ? 'Continua da dove avevi lasciato' : mock ? 'Inizia la simulazione' : checkpoint ? 'Inizia la verifica mista' : 'Inizia la sessione'} {!launching ? <ArrowRight size={16} /> : null}
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
