import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO.jsx';
import {
  ClassYearStep,
  DiagnosticSummaryStep,
  ExamDateStep,
  PlanBuildingStep,
  PlanRevealStep,
  ProgrammeConfidenceStep,
  ProgrammeSelectionStep,
  RecoveryOnboardingShell,
  WelcomeStep,
} from '../components/recovery/RecoveryOnboardingFlow.jsx';
import {
  claimRecoveryDiagnostic,
  configureRecoveryEnrollment,
  hasRecoveryEntitlement,
  loadRecoveryEnrollment,
  loadRecoveryState,
  materializeRecoverySession,
  recalculateRecoveryPlan,
  storedRecoveryDiagnosticToken,
} from '../lib/recoveryApi.js';
import { recoveryModeForExamDate } from '../lib/recoveryPlanEngine.js';
import {
  buildRecoveryPlanReveal,
  clearRecoveryOnboardingDraft,
  readRecoveryOnboardingDraft,
  RECOVERY_PROGRAMME_CONFIDENCE,
  sanitizeRecoveryOnboardingDraft,
  TYPICAL_RECOVERY_TOPICS_BY_YEAR,
  writeRecoveryOnboardingDraft,
} from '../lib/recoveryOnboarding.js';
import { supabase } from '../lib/supabaseClient.js';
import '../styles/learnerEditorial.css';
import '../styles/recoveryOnboarding.css';

const SETUP_STEP = Object.freeze({
  WELCOME: 0,
  CLASS_YEAR: 1,
  EXAM_DATE: 2,
  PROGRAMME: 3,
  CONFIDENCE: 4,
  DIAGNOSTIC: 5,
  BUILDING: 6,
  REVEAL: 7,
});

export const EMPTY_RECOVERY_ONBOARDING_DRAFT = Object.freeze({
  step: SETUP_STEP.WELCOME,
  classYear: '',
  examDate: '',
  topicKeys: [],
  programmeConfidence: '',
});

function sessionStorageSafe() {
  return typeof window !== 'undefined' ? window.sessionStorage : null;
}

export default function RecoveryOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entitled, setEntitled] = useState(false);
  const [diagnostic, setDiagnostic] = useState(null);
  const [draft, setDraft] = useState(() => readRecoveryOnboardingDraft(sessionStorageSafe()) || EMPTY_RECOVERY_ONBOARDING_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [buildingStage, setBuildingStage] = useState(0);
  const [reveal, setReveal] = useState(null);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);
  const submissionRef = useRef(false);
  const editModeRef = useRef(false);

  const { step, classYear, examDate, topicKeys, programmeConfidence } = draft;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (loading || step > SETUP_STEP.DIAGNOSTIC) return;
    writeRecoveryOnboardingDraft(sessionStorageSafe(), draft);
  }, [draft, loading, step]);

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

        const storedDraft = readRecoveryOnboardingDraft(sessionStorageSafe());
        if (storedDraft) {
          setDraft(storedDraft);
        } else if (existingEnrollment) {
          editModeRef.current = true;
          const state = await loadRecoveryState(existingEnrollment.id);
          if (!active) return;
          setDraft(sanitizeRecoveryOnboardingDraft({
            step: SETUP_STEP.CLASS_YEAR,
            classYear: existingEnrollment.class_year ? String(existingEnrollment.class_year) : '',
            examDate: existingEnrollment.exam_date || '',
            topicKeys: state.topics.filter((topic) => topic.required).map((topic) => topic.topic_key),
            programmeConfidence: RECOVERY_PROGRAMME_CONFIDENCE.FOLLOWING,
          }) || EMPTY_RECOVERY_ONBOARDING_DRAFT);
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

  useEffect(() => {
    if (step !== SETUP_STEP.BUILDING) return undefined;
    const timer = window.setInterval(() => {
      setBuildingStage((current) => Math.min(4, current + 1));
    }, 260);
    return () => window.clearInterval(timer);
  }, [step]);

  function updateDraft(patch) {
    setDraft((current) => sanitizeRecoveryOnboardingDraft({ ...current, ...patch }) || EMPTY_RECOVERY_ONBOARDING_DRAFT);
  }

  function goTo(nextStep) {
    setError('');
    updateDraft({ step: nextStep });
  }

  function useTypicalProgramme() {
    const typical = TYPICAL_RECOVERY_TOPICS_BY_YEAR[Number(classYear)] || [];
    if (typical.length) updateDraft({ topicKeys: typical });
  }

  async function handleSubmit() {
    if (submissionRef.current || submitting) return;
    setError('');
    if (!diagnostic) {
      setError('Completa prima il test diagnostico: il piano usa quel risultato come primo punto di partenza.');
      return;
    }
    const mode = recoveryModeForExamDate(examDate);
    if (!classYear || !examDate || !topicKeys.length || !mode) {
      setError('Inserisci classe, data della prova e almeno un argomento del programma.');
      return;
    }

    submissionRef.current = true;
    setSubmitting(true);
    setBuildingStage(0);
    updateDraft({ step: SETUP_STEP.BUILDING });
    try {
      const enrollmentId = await configureRecoveryEnrollment({
        classYear,
        examDate,
        topicKeys,
        mode,
        diagnosticToken: diagnostic.result_token || storedRecoveryDiagnosticToken(),
      });
      if (mountedRef.current) setBuildingStage(1);
      const enrollment = await loadRecoveryEnrollment();
      const initialState = await loadRecoveryState(enrollmentId);
      if (mountedRef.current) setBuildingStage(2);
      const plan = await recalculateRecoveryPlan({ enrollment: enrollment || { id: enrollmentId, exam_date: examDate }, state: initialState });
      if (mountedRef.current) setBuildingStage(3);
      const state = await loadRecoveryState(enrollmentId);
      if (mountedRef.current) {
        setBuildingStage(4);
        setReveal(buildRecoveryPlanReveal({ plan, state }));
        clearRecoveryOnboardingDraft(sessionStorageSafe());
        setDraft((current) => ({ ...current, step: SETUP_STEP.REVEAL }));
      }
    } catch (submitError) {
      if (mountedRef.current) {
        setError(submitError.message || 'Non è stato possibile creare il piano. Riprova.');
        updateDraft({ step: SETUP_STEP.DIAGNOSTIC });
      }
    } finally {
      submissionRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }

  async function startFirstSession() {
    const session = reveal?.today;
    if (!session) {
      navigate('/recupero-debito/percorso');
      return;
    }
    const sessionId = session.id;
    const assignmentId = session.assignment_id;
    const resourceId = session.assignment_resource_id;
    if (assignmentId && resourceId) {
      navigate(`/exercises?assignmentId=${assignmentId}&resourceId=${resourceId}`);
      return;
    }
    if (sessionId) {
      try {
        const prepared = await materializeRecoverySession(sessionId);
        if (prepared?.ready && prepared.assignment_id && prepared.resource_id) {
          navigate(`/exercises?assignmentId=${prepared.assignment_id}&resourceId=${prepared.resource_id}`);
          return;
        }
      } catch {
        // The full plan remains available even if content mapping is not ready yet.
      }
      navigate(`/recupero-debito/sessione/${sessionId}`);
      return;
    }
    navigate('/recupero-debito/percorso');
  }

  if (loading) {
    return <RecoveryOnboardingShell step={SETUP_STEP.WELCOME}><div className="recovery-onboarding-loading" role="status">Preparazione del percorso...</div></RecoveryOnboardingShell>;
  }

  if (!entitled) {
    return (
      <RecoveryOnboardingShell step={SETUP_STEP.WELCOME}>
        <SEO title="Recupero Debito Inglese | Sblocco Inglese" description="Configura il tuo percorso di recupero." />
        <section className="recovery-onboarding-step">
          <div className="recovery-onboarding-step__heading">
            <p className="learner-kicker">Recupero Debito Inglese</p>
            <h1 className="learner-display">Questo spazio si apre dopo <em>l’acquisto.</em></h1>
            <p>Se hai appena completato il pagamento, torna qui dalla pagina di conferma. L’accesso viene assegnato dal webhook Stripe, non dal browser.</p>
          </div>
          <div className="recovery-onboarding-actions"><span /><Link to="/percorsi/recupero-debito#sblocca" className="learner-primary-button">Vai al percorso <ArrowRight aria-hidden="true" /></Link></div>
        </section>
      </RecoveryOnboardingShell>
    );
  }

  return (
    <RecoveryOnboardingShell step={step}>
      <SEO title="Configura Recupero Debito | Sblocco Inglese" description="Costruisci il tuo piano di recupero passo dopo passo." />
      {step === SETUP_STEP.WELCOME ? <WelcomeStep onNext={() => goTo(SETUP_STEP.CLASS_YEAR)} /> : null}
      {step === SETUP_STEP.CLASS_YEAR ? <ClassYearStep value={classYear} onChange={(value) => updateDraft({ classYear: value })} onBack={() => goTo(SETUP_STEP.WELCOME)} onNext={() => goTo(SETUP_STEP.EXAM_DATE)} /> : null}
      {step === SETUP_STEP.EXAM_DATE ? <ExamDateStep value={examDate} onChange={(value) => updateDraft({ examDate: value })} onBack={() => goTo(SETUP_STEP.CLASS_YEAR)} onNext={() => goTo(SETUP_STEP.PROGRAMME)} /> : null}
      {step === SETUP_STEP.PROGRAMME ? <ProgrammeSelectionStep classYear={classYear} topicKeys={topicKeys} onChange={(value) => updateDraft({ topicKeys: value })} onBack={() => goTo(SETUP_STEP.EXAM_DATE)} onNext={() => goTo(SETUP_STEP.CONFIDENCE)} /> : null}
      {step === SETUP_STEP.CONFIDENCE ? <ProgrammeConfidenceStep value={programmeConfidence} onChange={(value) => updateDraft({ programmeConfidence: value })} onUseTypical={useTypicalProgramme} onBack={() => goTo(SETUP_STEP.PROGRAMME)} onNext={() => goTo(SETUP_STEP.DIAGNOSTIC)} /> : null}
      {step === SETUP_STEP.DIAGNOSTIC ? <DiagnosticSummaryStep diagnostic={diagnostic} diagnosticAction={<Link to="/test-recupero-inglese" className="learner-primary-button focus-ring">Fai il test diagnostico <ArrowRight aria-hidden="true" /></Link>} onBack={() => goTo(SETUP_STEP.CONFIDENCE)} onSubmit={handleSubmit} submitting={submitting} error={error} editMode={editModeRef.current} /> : null}
      {step === SETUP_STEP.BUILDING ? <PlanBuildingStep stage={buildingStage} /> : null}
      {step === SETUP_STEP.REVEAL && reveal ? <PlanRevealStep reveal={reveal} onStart={startFirstSession} onViewPlan={() => navigate('/recupero-debito/percorso')} /> : null}
    </RecoveryOnboardingShell>
  );
}
