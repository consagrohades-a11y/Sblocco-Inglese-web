import React, { useState } from 'react';
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
import { TYPICAL_RECOVERY_TOPICS_BY_YEAR } from '../lib/recoveryOnboarding.js';
import '../styles/learnerEditorial.css';
import '../styles/recoveryOnboarding.css';

const diagnostic = {
  topic_scores: {
    'present-simple': 0,
    'present-continuous': 50,
    'past-simple': 0,
    'present-perfect': 50,
    'future-forms': 0,
    'comparatives-superlatives': 0,
    'modal-verbs': 50,
    prepositions: 100,
  },
};

const reveal = {
  days: 18,
  sessionCount: 11,
  totalMinutes: 440,
  priorities: 4,
  assessments: 2,
  today: { title: 'Present Simple', stages: ['allenati'], estimatedMinutes: 10 },
};

export default function RecoveryOnboardingPreview() {
  const [step, setStep] = useState(0);
  const [classYear, setClassYear] = useState('2');
  const [examDate, setExamDate] = useState('2026-09-01');
  const [topicKeys, setTopicKeys] = useState(['present-simple', 'past-simple', 'question-formation']);
  const [confidence, setConfidence] = useState('following');
  const next = () => setStep((current) => Math.min(7, current + 1));
  const back = () => setStep((current) => Math.max(0, current - 1));

  return (
    <RecoveryOnboardingShell step={step}>
      {step === 0 ? <WelcomeStep onNext={next} /> : null}
      {step === 1 ? <ClassYearStep value={classYear} onChange={setClassYear} onBack={back} onNext={next} /> : null}
      {step === 2 ? <ExamDateStep value={examDate} onChange={setExamDate} onBack={back} onNext={next} now={new Date('2026-08-13T12:00:00')} /> : null}
      {step === 3 ? <ProgrammeSelectionStep classYear={classYear} topicKeys={topicKeys} onChange={setTopicKeys} onBack={back} onNext={next} /> : null}
      {step === 4 ? <ProgrammeConfidenceStep value={confidence} onChange={setConfidence} onUseTypical={() => setTopicKeys(TYPICAL_RECOVERY_TOPICS_BY_YEAR[Number(classYear)] || [])} onBack={back} onNext={next} /> : null}
      {step === 5 ? <DiagnosticSummaryStep diagnostic={diagnostic} onBack={back} onSubmit={next} /> : null}
      {step === 6 ? <PlanBuildingStep stage={4} /> : null}
      {step === 7 ? <PlanRevealStep reveal={reveal} onStart={() => {}} onViewPlan={() => {}} /> : null}
      <div className="recovery-preview-controls" aria-label="Controlli anteprima">
        <button type="button" onClick={back} disabled={step === 0}>Precedente</button>
        <span>Step {step + 1}/8</span>
        <button type="button" onClick={next} disabled={step === 7}>Successivo</button>
      </div>
    </RecoveryOnboardingShell>
  );
}
