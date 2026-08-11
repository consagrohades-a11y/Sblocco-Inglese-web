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

function topicScore(topic) {
  return Math.round(Number(topic.mastery_score ?? topic.mock_score ?? topic.checkpoint_score ?? topic.diagnostic_score ?? 0));
}

function priorityLabel(topic) {
  if (topic.priority_band === 'high') return 'Da consolidare';
  if (topic.verification_only || topicScore(topic) >= 85) return 'Abbastanza solido';
  return 'Da verificare';
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
  const readiness = calculateRecoveryReadiness(topics.map((topic) => ({ masteryScore: topic.mastery_score, diagnosticScore: topic.diagnostic_score })));
  const highPriority = topics.filter((topic) => topic.priority_band === 'high');
  const latestMock = (state?.assessments || []).find((attempt) => attempt.assessment_type.startsWith('mock_')) || null;

  return (
    <div className="learner-editorial learner-workspace-page">
      <SEO title="Preparazione attuale | Recupero Debito Inglese" description="Quadro di preparazione sul programma scolastico basato sui risultati raccolti nel percorso." />
      <div className="learner-shell">
        <RecoveryNav />
        <header style={{ maxWidth: '55rem', padding: '1.7rem 0 1.1rem' }}>
          <p className="learner-kicker">Recupero Debito Inglese · {RECOVERY_MODE_LABELS[enrollment.mode] || enrollment.mode}</p>
          <h1 className="learner-display">Preparazione attuale</h1>
          <p className="learner-form-card__intro">Un quadro del programma basato sui risultati raccolti finora. Non è una previsione del voto della scuola.</p>
        </header>

        <div className="learner-summary-grid" style={{ marginTop: 0 }}>
          <div className="learner-summary-card"><div><small>Prontezza sul programma</small><strong>{readiness}%</strong><p>Media delle evidenze disponibili sugli argomenti richiesti.</p></div></div>
          <div className="learner-summary-card"><div><small>Da consolidare</small><strong>{highPriority.length}</strong><p>Argomenti ancora in priorità alta.</p></div></div>
          <div className="learner-summary-card"><div><small>Ultima simulazione</small><strong>{latestMock?.score == null ? 'Non ancora svolta' : `${Math.round(Number(latestMock.score))}%`}</strong><p>Risultato disponibile dopo la consegna.</p></div></div>
          <div className="learner-summary-card"><div><small>Modalità piano</small><strong>{RECOVERY_MODE_LABELS[enrollment.mode] || enrollment.mode}</strong><p>Dipende dal tempo rimasto alla prova.</p></div></div>
        </div>

        <section className="learner-panel learner-panel--main" style={{ marginTop: '1rem' }}>
          <div className="learner-panel__heading"><div><span className="learner-panel__eyebrow">Per argomento</span><h2>Cosa è solido e cosa no</h2></div></div>
          <ul className="learner-list">
            {topics.map((topic, index) => (
              <li className="learner-list__row" key={topic.topic_key}>
                <span className="learner-list__index">{index + 1}</span>
                <div><strong>{recoveryTopicLabel(topic.topic_key)} — {topicScore(topic)}%</strong><p>{topic.priority_band === 'high' ? 'Il piano la mantiene tra le priorità.' : topic.verification_only ? 'Resta una verifica rapida perché è nel programma della scuola.' : 'Continua a essere controllato nelle prossime attività.'}</p></div>
                <span className={`learner-list__status ${topic.priority_band === 'high' ? 'learner-list__status--high' : ''}`}>{priorityLabel(topic)}</span>
              </li>
            ))}
          </ul>
          <div className="learner-plan-update"><strong>Come leggere il report.</strong> La preparazione attuale usa diagnostico, sessioni, checkpoint e simulazioni completate. Non garantisce né predice il risultato della prova scolastica.</div>
        </section>
      </div>
    </div>
  );
}
