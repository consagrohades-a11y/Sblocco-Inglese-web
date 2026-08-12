import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import RecoveryNav from '../components/recovery/RecoveryNav.jsx';
import { RECOVERY_MODE_LABELS, recoveryTopicLabel } from '../config/recovery.js';
import {
  loadRecoveryAccessState,
  syncMaterializedRecoverySessions,
} from '../lib/recoveryApi.js';
import { supabase } from '../lib/supabaseClient.js';
import '../styles/learnerEditorial.css';

const viewCopy = {
  percorso: ['Il mio percorso', 'Le sessioni restano ordinate per priorità, ma gli argomenti non sono bloccati in sequenza rigida.'],
  argomenti: ['Argomenti', 'Il programma della scuola resta sempre visibile. Puoi aprire un argomento manualmente, mentre “Oggi” continua a indicare la priorità consigliata.'],
  errori: ['Ripassa gli errori', 'Qui compaiono i pattern già rilevati dal sistema di diagnostica degli esercizi Sblocco.'],
  simulazioni: ['Simulazioni', 'Le simulazioni sono separate dalla pratica normale: niente correzioni durante la prova, risultati dopo la consegna.'],
};

function priorityLabel(topic) {
  if (topic.priority_band === 'high') return 'Priorità alta';
  if (topic.priority_band === 'medium') return 'Priorità media';
  return topic.verification_only ? 'Verifica rapida' : 'Priorità bassa';
}

function sessionStatus(session) {
  if (session.status === 'completed') return 'Completata';
  if (session.status === 'in_progress') return 'In corso';
  if (session.status === 'available') return 'Da fare ora';
  return 'Più avanti';
}

export default function RecoveryWorkspace({ view }) {
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(null);
  const [errors, setErrors] = useState([]);
  const [reviewAvailability, setReviewAvailability] = useState({});
  const [reviewLaunching, setReviewLaunching] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [loadError, setLoadError] = useState('');
  const copy = viewCopy[view] || viewCopy.percorso;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError('');
      setReviewError('');
      try {
        let loaded = await loadRecoveryAccessState();
        if (!active) return;

        if (loaded.enrollment?.id && loaded.state?.sessions?.length) {
          const syncResults = await syncMaterializedRecoverySessions(loaded.state.sessions);
          if (syncResults.some((result) => result?.completed)) loaded = await loadRecoveryAccessState();
        }

        if (!active) return;
        setAccess(loaded);
        if (loaded.enrollment?.id && view === 'errori') {
          const { data, error } = await supabase.rpc('get_recovery_error_review', { p_enrollment_id: loaded.enrollment.id });
          if (error) throw error;
          if (active) setErrors(data || []);
        }
        if (loaded.enrollment?.id && view === 'argomenti') {
          const { data, error } = await supabase.rpc('get_recovery_topic_review_availability', { p_enrollment_id: loaded.enrollment.id });
          if (error) throw error;
          if (active) {
            setReviewAvailability(Object.fromEntries((data || []).map((item) => [item.topic_key, item])));
          }
        }
      } catch (error) {
        if (active) setLoadError(error.message || 'Non è stato possibile caricare questa sezione.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [view]);

  const assessmentsBySession = useMemo(() => new Map((access?.state?.assessments || []).map((attempt) => [attempt.session_id, attempt])), [access]);

  async function launchFullReview(topicKey) {
    if (!access?.enrollment?.id || reviewLaunching) return;
    setReviewLaunching(topicKey);
    setReviewError('');
    try {
      const { data, error } = await supabase.rpc('start_recovery_topic_full_review', {
        p_enrollment_id: access.enrollment.id,
        p_topic_key: topicKey,
      });
      if (error) throw error;
      if (!data?.ready || !data?.assignment_id) {
        setReviewError('Il ripasso completo non è ancora disponibile per questo argomento.');
        return;
      }
      window.location.assign(`/assignments/${data.assignment_id}`);
    } catch (error) {
      setReviewError(error.message || 'Non è stato possibile preparare il ripasso completo.');
    } finally {
      setReviewLaunching('');
    }
  }

  if (loading) return <div className="learner-editorial learner-workspace-page"><div className="learner-shell"><p className="learner-empty">Caricamento...</p></div></div>;
  if (loadError) return <div className="learner-editorial learner-workspace-page"><div className="learner-shell"><p className="learner-error">{loadError}</p><Link to="/dashboard" className="learner-secondary-button">Torna alla dashboard</Link></div></div>;

  if (!access?.entitled || !access.enrollment) {
    return <div className="learner-editorial learner-workspace-page"><div className="learner-shell"><p className="learner-kicker">Recupero Debito Inglese</p><h1 className="learner-display">Prima configura il tuo percorso.</h1><div className="learner-form-actions"><Link to="/recupero-debito/onboarding" className="learner-primary-button">Configura il percorso <ArrowRight size={16} /></Link></div></div></div>;
  }

  const { enrollment, state } = access;
  const sessions = state?.sessions || [];
  const topics = state?.topics || [];
  const mockSessions = sessions.filter((session) => session.session_type.startsWith('mock_'));
  const errorSession = sessions.find((session) => session.session_type === 'error_review' && !['completed', 'skipped'].includes(session.status));

  return (
    <div className="learner-editorial learner-workspace-page">
      <SEO title={`${copy[0]} | Recupero Debito Inglese`} description={copy[1]} />
      <div className="learner-shell">
        <RecoveryNav />
        <header style={{ maxWidth: '55rem', padding: '1.7rem 0 1.1rem' }}>
          <p className="learner-kicker">Recupero Debito Inglese · {RECOVERY_MODE_LABELS[enrollment.mode] || enrollment.mode}</p>
          <h1 className="learner-display">{copy[0]}</h1>
          <p className="learner-form-card__intro">{copy[1]}</p>
        </header>

        {view === 'percorso' ? (
          <section className="learner-panel learner-panel--main">
            <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Piano attuale</span><h2>{sessions.length} sessioni</h2></div></div>
            <ol className="learner-list">
              {sessions.map((session) => (
                <li className="learner-list__row" key={session.id}>
                  <span className="learner-list__index">{session.sequence_index}</span>
                  <div><strong>{session.title}</strong><p>{session.rationale || `${session.estimated_minutes} minuti circa.`}</p></div>
                  {session.status === 'completed'
                    ? <span className="learner-list__status"><CheckCircle2 size={14} style={{ display: 'inline' }} /> {sessionStatus(session)}</span>
                    : session.status === 'available' || session.status === 'in_progress'
                      ? <Link to={`/recupero-debito/sessione/${session.id}`} className="learner-text-link">{sessionStatus(session)} <ArrowRight size={14} /></Link>
                      : <span className="learner-list__status">{sessionStatus(session)}</span>}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {view === 'argomenti' ? (
          <section className="learner-panel learner-panel--main">
            <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Programma della scuola</span><h2>{topics.length} argomenti</h2></div><Link to="/recupero-debito/onboarding" className="learner-text-link">Modifica programma <ArrowRight /></Link></div>
            <ul className="learner-list">
              {topics.map((topic, index) => {
                const score = Math.round(Number(topic.mastery_score ?? topic.diagnostic_score ?? 0));
                const topicSession = sessions.find((session) => session.topic_key === topic.topic_key && !['completed', 'skipped'].includes(session.status));
                const review = reviewAvailability[topic.topic_key];
                return (
                  <li className="learner-list__row" key={topic.topic_key}>
                    <span className="learner-list__index">{index + 1}</span>
                    <div>
                      <strong>{recoveryTopicLabel(topic.topic_key)}</strong>
                      <p>{topic.verification_only
                        ? 'Risulta già abbastanza solido. Puoi fare la verifica rapida consigliata oppure riaprire l’intero argomento quando vuoi.'
                        : `${score}% sui dati attualmente disponibili.`}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.8rem', flexWrap: 'wrap' }}>
                      {topicSession
                        ? <Link to={`/recupero-debito/sessione/${topicSession.id}`} className="learner-text-link">{topic.verification_only ? 'Verifica rapida' : 'Apri'} <ArrowRight size={14} /></Link>
                        : <span className={`learner-list__status ${topic.priority_band === 'high' ? 'learner-list__status--high' : ''}`}>{priorityLabel(topic)}</span>}
                      {review?.available ? (
                        <button
                          type="button"
                          className="learner-text-link"
                          onClick={() => launchFullReview(topic.topic_key)}
                          disabled={Boolean(reviewLaunching)}
                          style={{ border: 0, padding: 0, background: 'transparent', cursor: reviewLaunching ? 'wait' : 'pointer' }}
                        >
                          {reviewLaunching === topic.topic_key ? 'Preparazione...' : `Rivedi tutto · ~${review.estimated_minutes} min`} {!reviewLaunching ? <RotateCcw size={14} /> : null}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {reviewError ? <p className="learner-error" role="alert">{reviewError}</p> : null}
            <p className="learner-empty" style={{ marginTop: '1rem' }}>“Rivedi tutto” è un ripasso volontario: non abbassa il livello già consolidato e non aggiunge una nuova sessione obbligatoria al piano.</p>
          </section>
        ) : null}

        {view === 'errori' ? (
          <section className="learner-panel learner-panel--main">
            <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Dati dagli esercizi</span><h2>{errors.length} pattern da rivedere</h2></div>{errorSession ? <Link to={`/recupero-debito/sessione/${errorSession.id}`} className="learner-text-link">Apri sessione errori <ArrowRight /></Link> : null}</div>
            {errors.length ? <ul className="learner-list">{errors.map((item) => (
              <li className="learner-list__row" key={item.diagnostic_code}><span className="learner-list__index"><RotateCcw size={14} /></span><div><strong>{item.label}</strong><p>{item.message} · {recoveryTopicLabel(item.topic_key)}</p></div><span className="learner-list__status learner-list__status--high">{Math.round(Number(item.recent_errors || 0))} errori</span></li>
            ))}</ul> : <p className="learner-empty">Non ci sono ancora errori ricorrenti sufficienti da mostrare. La lista si popola usando la diagnostica degli esercizi, senza creare un archivio parallelo.</p>}
          </section>
        ) : null}

        {view === 'simulazioni' ? (
          <section className="learner-panel learner-panel--main">
            <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Modalità prova</span><h2>Simulazioni</h2></div></div>
            <div className="learner-plan-update"><LockKeyhole size={16} aria-hidden="true" /> <strong>Feedback nascosto durante la prova.</strong> Le versioni collegate alle simulazioni devono avere tutte le sezioni in modalità feedback “hidden”; il database rifiuta una mappatura mock che non rispetta questa regola.</div>
            <ul className="learner-list">
              {mockSessions.map((session, index) => {
                const attempt = assessmentsBySession.get(session.id);
                return (
                  <li className="learner-list__row" key={session.id}>
                    <span className="learner-list__index">{index + 1}</span>
                    <div><strong>{session.title}</strong><p><Clock3 size={13} style={{ display: 'inline' }} /> ~{session.estimated_minutes} min{attempt?.score != null ? ` · risultato ${Math.round(Number(attempt.score))}%` : ''}</p>{attempt?.topic_scores && Object.keys(attempt.topic_scores).length ? <p>{Object.entries(attempt.topic_scores).slice(0, 6).map(([topic, score]) => `${recoveryTopicLabel(topic)}: ${Math.round(Number(score))}%`).join(' · ')}</p> : null}</div>
                    {attempt?.feedback_released
                      ? <span className="learner-list__status">Risultato disponibile</span>
                      : session.status === 'available' || session.status === 'in_progress'
                        ? <Link to={`/recupero-debito/sessione/${session.id}`} className="learner-text-link">Inizia <ArrowRight /></Link>
                        : <span className="learner-list__status">{sessionStatus(session)}</span>}
                  </li>
                );
              })}
            </ul>
            {!mockSessions.length ? <p className="learner-empty">Il piano non contiene ancora una simulazione. Può dipendere dal tempo rimasto o dalla configurazione iniziale.</p> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
