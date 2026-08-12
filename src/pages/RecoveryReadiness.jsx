import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import RecoveryNav from '../components/recovery/RecoveryNav.jsx';
import { RECOVERY_MODE_LABELS, recoveryTopicLabel } from '../config/recovery.js';
import {
  loadRecoveryAccessState,
  syncMaterializedRecoverySessions,
} from '../lib/recoveryApi.js';
import { calculateRecoveryReadiness } from '../lib/recoveryPlanEngine.js';
import '../styles/learnerEditorial.css';

function roundScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function topicScore(topic) {
  return roundScore(topic.mastery_score ?? topic.mock_score ?? topic.checkpoint_score ?? topic.diagnostic_score ?? 0);
}

const MASTERY_STATE_LABELS = {
  needs_recovery: 'Da recuperare',
  training: 'In allenamento',
  almost_ready: 'Quasi solido',
  recovered: 'Recuperato',
  needs_recheck: 'Da ricontrollare',
};

const READINESS_BAND_LABELS = {
  da_costruire: 'Da costruire',
  in_consolidamento: 'In consolidamento',
  quasi_solido: 'Quasi solido',
  buona_preparazione: 'Buona preparazione',
  molto_solido: 'Molto solido',
};

const CONFIDENCE_BAND_LABELS = {
  prime_evidenze: 'Prime evidenze',
  evidenze_parziali: 'Evidenze parziali',
  evidenze_buone: 'Evidenze buone',
  evidenze_solide: 'Evidenze solide',
};

const NEXT_ACTION_LABELS = {
  configure_program: 'Completa prima il programma della scuola.',
  consolidate_priority: 'Consolida gli argomenti ancora fragili o da ricontrollare.',
  verify_remaining_topics: 'Verifica gli argomenti che hanno ancora poche evidenze affidabili.',
  take_checkpoint: 'Il prossimo salto informativo arriva da un checkpoint.',
  take_mock: 'È il momento di raccogliere una prima evidenza da simulazione.',
  take_final_mock: 'Completa la simulazione finale per una verifica più completa.',
  continue_targeted_review: 'Mantieni un ripasso mirato sugli ultimi punti deboli.',
};

function fallbackReadiness(topics) {
  return calculateRecoveryReadiness(topics.map((topic) => ({
    masteryScore: topic.mastery_score,
    diagnosticScore: topic.diagnostic_score,
  })));
}

function componentRows(current) {
  const components = current?.components || {};
  return [
    ['Padronanza argomenti', components.mastery, 'Quanto sono solidi gli argomenti del programma.'],
    ['Copertura delle prove', components.coverage, 'Quanto ogni argomento è stato verificato con evidenze utili.'],
    ['Checkpoint e simulazioni', components.assessment, 'Quanto reggono le competenze in prove più vicine alla scuola.'],
    ['Stabilità degli errori', components.error_stability, 'Quanto gli errori ricorrenti sono sotto controllo.'],
  ];
}

export default function RecoveryReadiness() {
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        let loaded = await loadRecoveryAccessState();
        if (loaded.enrollment?.id && loaded.state?.sessions?.length) {
          const syncResults = await syncMaterializedRecoverySessions(loaded.state.sessions);
          if (syncResults.some((result) => result?.completed)) loaded = await loadRecoveryAccessState();
        }
        if (active) setAccess(loaded);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Non è stato possibile caricare il report.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="learner-editorial learner-workspace-page"><div className="learner-shell"><p className="learner-empty">Preparazione del report...</p></div></div>;
  if (error) return <div className="learner-editorial learner-workspace-page"><div className="learner-shell"><p className="learner-error">{error}</p></div></div>;
  if (!access?.entitled || !access.enrollment) {
    return <div className="learner-editorial learner-workspace-page"><div className="learner-shell"><p className="learner-kicker">Recupero Debito Inglese</p><h1 className="learner-display">Prima configura il tuo percorso.</h1><div className="learner-form-actions"><Link to="/recupero-debito/onboarding" className="learner-primary-button">Configura il percorso <ArrowRight size={16} /></Link></div></div></div>;
  }

  const { enrollment, state } = access;
  const topics = state?.topics || [];
  const backendCurrent = access.readiness?.current?.available ? access.readiness.current : null;
  const readiness = backendCurrent ? roundScore(backendCurrent.readiness_score) : fallbackReadiness(topics);
  const confidence = backendCurrent ? roundScore(backendCurrent.confidence_score) : null;
  const highPriority = topics.filter((topic) => topic.priority_band === 'high');
  const latestMock = (state?.assessments || []).find((attempt) => attempt.assessment_type.startsWith('mock_')) || null;
  const history = access.readiness?.history || [];

  return (
    <div className="learner-editorial learner-workspace-page">
      <SEO title="Preparazione attuale | Recupero Debito Inglese" description="Quadro di preparazione sul programma scolastico basato sui risultati raccolti nel percorso." />
      <div className="learner-shell">
        <RecoveryNav />
        <header style={{ maxWidth: '55rem', padding: '1.7rem 0 1.1rem' }}>
          <p className="learner-kicker">Recupero Debito Inglese · {RECOVERY_MODE_LABELS[enrollment.mode] || enrollment.mode}</p>
          <h1 className="learner-display">Preparazione attuale</h1>
          <p className="learner-form-card__intro">Un indice del livello di preparazione sul programma che hai indicato, costruito con le evidenze raccolte nel percorso. Non è una previsione del voto della scuola né una probabilità di promozione.</p>
        </header>

        <div className="learner-summary-grid" style={{ marginTop: 0 }}>
          <div className="learner-summary-card"><div><small>Prontezza sul programma</small><strong>{readiness}%</strong><p>{backendCurrent ? READINESS_BAND_LABELS[backendCurrent.readiness_band] || 'Preparazione attuale' : 'Stima di compatibilità.'}</p></div></div>
          <div className="learner-summary-card"><div><small>Qualità delle evidenze</small><strong>{confidence == null ? 'In raccolta' : `${confidence}%`}</strong><p>{confidence == null ? 'Aumenterà con verifiche e simulazioni.' : CONFIDENCE_BAND_LABELS[backendCurrent.confidence_band] || 'Evidenze disponibili'}</p></div></div>
          <div className="learner-summary-card"><div><small>Argomenti recuperati</small><strong>{backendCurrent ? `${backendCurrent.recovered_topics_count} / ${backendCurrent.required_topics_count}` : `${topics.filter((topic) => topic.mastery_state === 'recovered').length} / ${topics.length}`}</strong><p>{backendCurrent ? `${backendCurrent.reliable_topics_count} con almeno una verifica affidabile.` : `${highPriority.length} ancora in priorità alta.`}</p></div></div>
          <div className="learner-summary-card"><div><small>Ultima simulazione</small><strong>{backendCurrent?.mock_score != null ? `${roundScore(backendCurrent.mock_score)}%` : latestMock?.score == null ? 'Non ancora svolta' : `${roundScore(latestMock.score)}%`}</strong><p>Conta più delle attività guidate perché è più vicina alla prova.</p></div></div>
        </div>

        {backendCurrent ? (
          <section className="learner-panel learner-panel--main" style={{ marginTop: '1rem' }}>
            <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Da cosa nasce il numero</span><h2>Quattro componenti, non una media di esercizi</h2></div></div>
            <div className="learner-progress-list">
              {componentRows(backendCurrent).map(([label, value, detail]) => {
                const score = roundScore(value);
                return (
                  <div className="learner-progress-row" key={label} title={detail}>
                    <span>{label}</span>
                    <span className="learner-progress-row__track"><span className="learner-progress-row__fill" style={{ width: `${score}%` }} /></span>
                    <span>{score}%</span>
                  </div>
                );
              })}
            </div>
            <div className="learner-plan-update"><strong>Prossimo passo consigliato.</strong> {NEXT_ACTION_LABELS[backendCurrent.next_action] || 'Continua con il prossimo passo previsto dal piano.'}</div>
            <p className="learner-empty" style={{ paddingBottom: 0 }}>Completare molte attività non alza automaticamente la prontezza: contano soprattutto la padronanza dimostrata, le verifiche affidabili, checkpoint/simulazioni e la stabilità degli errori.</p>
          </section>
        ) : null}

        <section className="learner-panel learner-panel--main" style={{ marginTop: '1rem' }}>
          <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Per argomento</span><h2>Cosa è solido e cosa no</h2></div></div>
          <ul className="learner-list">
            {topics.map((topic, index) => (
              <li className="learner-list__row" key={topic.topic_key}>
                <span className="learner-list__index">{index + 1}</span>
                <div><strong>{recoveryTopicLabel(topic.topic_key)} — {topicScore(topic)}%</strong><p>{topic.mastery_state === 'needs_recheck' ? 'Era più solido, ma una prova recente o errori ricorrenti richiedono un nuovo controllo.' : topic.mastery_state === 'recovered' ? 'Ha già evidenze sufficientemente solide nel percorso.' : topic.verification_only ? 'Il diagnostico è forte, ma resta una verifica rapida perché è nel programma della scuola.' : 'Continua a essere controllato nelle prossime attività.'}</p></div>
                <span className={`learner-list__status ${['needs_recovery', 'needs_recheck'].includes(topic.mastery_state) || topic.priority_band === 'high' ? 'learner-list__status--high' : ''}`}>{MASTERY_STATE_LABELS[topic.mastery_state] || (topic.priority_band === 'high' ? 'Da consolidare' : 'Da verificare')}</span>
              </li>
            ))}
          </ul>
          <div className="learner-plan-update"><strong>Come leggere il report.</strong> La preparazione attuale usa padronanza per argomento, qualità delle evidenze, checkpoint/simulazioni e ricorrenza degli errori. Non è una previsione del voto.</div>
        </section>

        {history.length ? (
          <section className="learner-panel learner-panel--main" style={{ marginTop: '1rem' }}>
            <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Evoluzione</span><h2>Come sta cambiando la preparazione</h2></div></div>
            <ul className="learner-list">
              {history.slice(0, 8).map((snapshot, index) => (
                <li className="learner-list__row" key={snapshot.id || snapshot.snapshot_key || index}>
                  <span className="learner-list__index">{history.length - index}</span>
                  <div><strong>{roundScore(snapshot.readiness_score)}% preparazione · {roundScore(snapshot.confidence_score)}% evidenze</strong><p>{snapshot.captured_at ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(snapshot.captured_at)) : 'Snapshot del percorso'} · {snapshot.recovered_topics_count || 0} argomenti recuperati</p></div>
                  <span className="learner-list__status">{READINESS_BAND_LABELS[snapshot.readiness_band] || 'Snapshot'}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
