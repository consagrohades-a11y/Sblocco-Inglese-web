import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, FileCheck2, LockKeyhole } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import RecoveryNav from '../components/recovery/RecoveryNav.jsx';
import { materializeRecoverySession } from '../lib/recoveryApi.js';
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

export default function RecoverySession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error: loadError } = await supabase
        .from('recovery_plan_sessions')
        .select('id, sequence_index, session_type, topic_key, title, rationale, estimated_minutes, stages, status, assignment_id, assignment_resource_id, score')
        .eq('id', sessionId)
        .maybeSingle();
      if (!active) return;
      if (loadError || !data) setError('Sessione non disponibile.');
      else setSession(data);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [sessionId]);

  async function launch() {
    if (!session) return;
    if (session.assignment_id) {
      navigate(`/assignments/${session.assignment_id}`);
      return;
    }
    setLaunching(true);
    setError('');
    try {
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

  const mock = session?.session_type?.startsWith('mock_');
  const checkpoint = session?.session_type === 'checkpoint';

  return (
    <div className="learner-editorial learner-workspace-page">
      <SEO title={`${session?.title || 'Sessione'} | Recupero Debito`} description="Sessione del percorso Recupero Debito Inglese." />
      <div className="learner-shell">
        <RecoveryNav />
        <Link to="/dashboard" className="learner-text-link"><ArrowLeft size={15} /> Torna a oggi</Link>
        <div className="learner-form-card" style={{ marginTop: '1rem' }}>
          {loading ? <p className="learner-empty">Preparazione della sessione...</p> : null}
          {!loading && session ? (
            <>
              <p className="learner-kicker">{mock ? 'Simulazione prova di recupero' : checkpoint ? 'Verifica di percorso' : `Sessione ${session.sequence_index}`}</p>
              <h1 className="learner-display">{session.title}</h1>
              <p className="learner-form-card__intro">{session.rationale}</p>
              <div className="learner-next-card__meta"><span><Clock3 size={16} />~ {session.estimated_minutes} min</span></div>

              {mock ? (
                <section className="learner-form-section">
                  <h2>Come funziona questa simulazione</h2>
                  <div className="learner-plan-update"><LockKeyhole size={16} aria-hidden="true" /> <strong>Niente correzioni durante la prova.</strong> Non vedrai suggerimenti, risposta corretta o spiegazioni mentre stai svolgendo le domande.</div>
                  <ul className="learner-list">
                    <li className="learner-list__row"><span className="learner-list__index">1</span><div><strong>Leggi le istruzioni prima di iniziare</strong><p>La prova può contenere sezioni e formati diversi.</p></div></li>
                    <li className="learner-list__row"><span className="learner-list__index">2</span><div><strong>Completa la prova senza interrompere il flusso</strong><p>Puoi navigare tra le domande previste dal player, ma non ricevi feedback didattico immediato.</p></div></li>
                    <li className="learner-list__row"><span className="learner-list__index">3</span><div><strong>Consegna e poi guarda il risultato</strong><p>Punteggio e breakdown vengono raccolti dopo la consegna e usati per aggiornare il piano.</p></div></li>
                  </ul>
                </section>
              ) : checkpoint ? (
                <section className="learner-form-section">
                  <h2>Verifica mista</h2>
                  <div className="learner-plan-update"><FileCheck2 size={16} aria-hidden="true" /> Le domande non anticipano la regola da usare. Il risultato serve a ricalcolare le priorità del percorso.</div>
                </section>
              ) : (
                <section className="learner-form-section">
                  <h2>La sessione di oggi</h2>
                  <ol className="learner-list">
                    {(session.stages || []).map((stage, index) => (
                      <li className="learner-list__row" key={`${stage}-${index}`}><span className="learner-list__index">{index + 1}</span><div><strong>{stageLabels[stage] || stage}</strong><p>{stage === 'modalita_scuola' ? 'Formati di esercizio vicini alle verifiche scolastiche.' : stage === 'mini_verifica' ? 'Controllo breve prima di chiudere la sessione.' : 'Una tappa breve, in ordine.'}</p></div></li>
                    ))}
                  </ol>
                </section>
              )}

              {error ? <p className="learner-error" role="alert">{error}</p> : null}
              <div className="learner-form-actions">
                <button type="button" className="learner-primary-button focus-ring" onClick={launch} disabled={launching}>
                  {launching ? 'Preparazione...' : session.assignment_id ? 'Continua' : mock ? 'Inizia la simulazione' : 'Inizia la sessione'} {!launching ? <ArrowRight size={16} /> : null}
                </button>
                <Link to="/recupero-debito/percorso" className="learner-secondary-button">Vedi il percorso</Link>
              </div>
            </>
          ) : null}
          {!loading && !session && error ? <p className="learner-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
