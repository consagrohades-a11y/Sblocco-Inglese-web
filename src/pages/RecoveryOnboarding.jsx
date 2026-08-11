import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import {
  RECOVERY_MODE_LABELS,
  RECOVERY_TOPICS,
} from '../config/recovery.js';
import {
  claimRecoveryDiagnostic,
  configureRecoveryEnrollment,
  hasRecoveryEntitlement,
  loadRecoveryEnrollment,
  loadRecoveryState,
  recalculateRecoveryPlan,
  storedRecoveryDiagnosticToken,
} from '../lib/recoveryApi.js';
import { recoveryModeForExamDate } from '../lib/recoveryPlanEngine.js';
import { supabase } from '../lib/supabaseClient.js';
import '../styles/learnerEditorial.css';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function RecoveryOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entitled, setEntitled] = useState(false);
  const [diagnostic, setDiagnostic] = useState(null);
  const [classYear, setClassYear] = useState('');
  const [examDate, setExamDate] = useState('');
  const [topicKeys, setTopicKeys] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const mode = useMemo(() => examDate ? recoveryModeForExamDate(examDate) : null, [examDate]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const hasAccess = await hasRecoveryEntitlement();
        if (!active) return;
        setEntitled(hasAccess);
        if (!hasAccess) return;

        const token = storedRecoveryDiagnosticToken();
        if (token) await claimRecoveryDiagnostic(token).catch(() => null);

        const [{ data: latestDiagnostic }, existingEnrollment] = await Promise.all([
          supabase
            .from('recovery_diagnostic_attempts')
            .select('id, result_token, overall_score, topic_scores, completed_at')
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          loadRecoveryEnrollment(),
        ]);
        if (!active) return;
        setDiagnostic(latestDiagnostic || null);
        if (existingEnrollment) {
          setClassYear(existingEnrollment.class_year ? String(existingEnrollment.class_year) : '');
          setExamDate(existingEnrollment.exam_date || '');
          const state = await loadRecoveryState(existingEnrollment.id);
          if (active) setTopicKeys(state.topics.filter((topic) => topic.required).map((topic) => topic.topic_key));
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Non è stato possibile caricare il percorso.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  function toggleTopic(topicKey) {
    setTopicKeys((current) => current.includes(topicKey)
      ? current.filter((key) => key !== topicKey)
      : [...current, topicKey]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!diagnostic) {
      setError('Completa prima il test diagnostico: il piano usa quel risultato come primo punto di partenza.');
      return;
    }
    if (!classYear || !examDate || !topicKeys.length || !mode) {
      setError('Inserisci classe, data della prova e almeno un argomento del programma.');
      return;
    }

    setSubmitting(true);
    try {
      const enrollmentId = await configureRecoveryEnrollment({
        classYear,
        examDate,
        topicKeys,
        mode,
        diagnosticToken: diagnostic.result_token || storedRecoveryDiagnosticToken(),
      });
      const enrollment = await loadRecoveryEnrollment();
      const state = await loadRecoveryState(enrollmentId);
      await recalculateRecoveryPlan({ enrollment: enrollment || { id: enrollmentId, exam_date: examDate }, state });
      navigate('/dashboard', { replace: true, state: { recoveryPlanUpdated: true } });
    } catch (submitError) {
      setError(submitError.message || 'Non è stato possibile creare il piano. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="learner-editorial learner-form-page"><div className="learner-shell"><div className="learner-form-card"><p className="learner-empty">Preparazione del percorso...</p></div></div></div>;
  }

  if (!entitled) {
    return (
      <div className="learner-editorial learner-form-page">
        <SEO title="Recupero Debito Inglese | Sblocco Inglese" description="Configura il tuo percorso di recupero." />
        <div className="learner-shell"><div className="learner-form-card">
          <p className="learner-kicker">Recupero Debito Inglese</p>
          <h1 className="learner-display">Questo spazio si apre dopo <em style={{ color: 'var(--learner-orange)', fontStyle: 'normal' }}>l’acquisto.</em></h1>
          <p className="learner-form-card__intro">Se hai appena completato il pagamento, torna qui dalla pagina di conferma. L’accesso viene assegnato dal webhook Stripe, non dal browser.</p>
          <div className="learner-form-actions"><Link to="/percorsi/recupero-debito#sblocca" className="learner-primary-button">Vai al percorso <ArrowRight size={16} /></Link></div>
        </div></div>
      </div>
    );
  }

  return (
    <div className="learner-editorial learner-form-page">
      <SEO title="Configura Recupero Debito | Sblocco Inglese" description="Inserisci data, classe e programma della prova di recupero." />
      <div className="learner-shell">
        <form className="learner-form-card" onSubmit={handleSubmit}>
          <p className="learner-kicker">Prima di iniziare</p>
          <h1 className="learner-display">Dimmi cosa c’è nella tua <em style={{ color: 'var(--learner-orange)', fontStyle: 'normal' }}>prova.</em></h1>
          <p className="learner-form-card__intro">Non devi scegliere un corso. Queste informazioni servono a decidere cosa mettere prima nel piano e cosa può essere soltanto verificato rapidamente.</p>

          <section className="learner-form-section">
            <h2>1. Test diagnostico</h2>
            {diagnostic ? (
              <div className="learner-plan-update"><CheckCircle2 size={16} aria-hidden="true" /> <strong>Risultato trovato: {Math.round(Number(diagnostic.overall_score || 0))}%.</strong> Verrà riutilizzato, quindi non devi rifare il test.</div>
            ) : (
              <div className="learner-plan-update"><strong>Serve un primo punto di partenza.</strong> Completa il test gratuito; poi torna qui e il risultato verrà collegato al tuo account.</div>
            )}
            {!diagnostic ? <div className="learner-form-actions"><Link to="/test-recupero-inglese" className="learner-primary-button">Fai il test diagnostico <ArrowRight size={16} /></Link></div> : null}
          </section>

          <section className="learner-form-section">
            <h2>2. Classe e data della prova</h2>
            <div className="learner-choice-grid">
              {[1, 2, 3, 4, 5].map((year) => (
                <button key={year} type="button" className={`learner-choice focus-ring ${classYear === String(year) ? 'is-selected' : ''}`} onClick={() => setClassYear(String(year))}>
                  <span>{classYear === String(year) ? '●' : '○'}</span>{year}ª superiore
                </button>
              ))}
            </div>
            <div className="learner-field">
              <label htmlFor="recovery-exam-date">Data della prova</label>
              <input id="recovery-exam-date" type="date" min={todayIso()} value={examDate} onChange={(event) => setExamDate(event.target.value)} required />
            </div>
            {mode ? <div className="learner-plan-update"><CalendarDays size={16} aria-hidden="true" /> Con questa data il piano parte in modalità <strong>{RECOVERY_MODE_LABELS[mode]}</strong>. La modalità si aggiorna automaticamente se il tempo rimasto cambia.</div> : null}
          </section>

          <section className="learner-form-section">
            <h2>3. Programma dato dalla scuola</h2>
            <p className="learner-form-card__intro">Seleziona tutto ciò che compare nel programma di recupero. Un argomento richiesto non verrà eliminato solo perché il test è andato bene.</p>
            <div className="learner-choice-grid">
              {RECOVERY_TOPICS.map((topic) => (
                <label key={topic.key} className={`learner-choice ${topicKeys.includes(topic.key) ? 'is-selected' : ''}`}>
                  <input type="checkbox" checked={topicKeys.includes(topic.key)} onChange={() => toggleTopic(topic.key)} />
                  <span>{topic.label}</span>
                </label>
              ))}
            </div>
          </section>

          {error ? <p className="learner-error" role="alert">{error}</p> : null}
          <div className="learner-form-actions">
            <button type="submit" className="learner-primary-button focus-ring" disabled={submitting || !diagnostic}>
              {submitting ? 'Creazione del piano...' : 'Crea il mio piano'} {!submitting ? <ArrowRight size={16} aria-hidden="true" /> : null}
            </button>
            <Link to="/dashboard" className="learner-secondary-button focus-ring">Torna alla dashboard</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
