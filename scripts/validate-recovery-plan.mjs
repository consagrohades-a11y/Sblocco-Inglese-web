import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildRecoveryPlan,
  buildRecoveryTopicStates,
  recoveryModeForDays,
} from '../src/lib/recoveryPlanEngine.js';
import { RECOVERY_MODE } from '../src/config/recovery.js';
import { recoveryDiagnosticQuestions } from '../src/data/recoveryDiagnostic.js';

// D / E / F: exam proximity selects the configured study mode.
assert.equal(recoveryModeForDays(18), RECOVERY_MODE.COMPLETE);
assert.equal(recoveryModeForDays(14), RECOVERY_MODE.COMPLETE);
assert.equal(recoveryModeForDays(13), RECOVERY_MODE.INTENSIVE);
assert.equal(recoveryModeForDays(9), RECOVERY_MODE.INTENSIVE);
assert.equal(recoveryModeForDays(7), RECOVERY_MODE.INTENSIVE);
assert.equal(recoveryModeForDays(6), RECOVERY_MODE.SOS);
assert.equal(recoveryModeForDays(4), RECOVERY_MODE.SOS);

// G / H: weak required topics rise; strong required topics stay as verification.
const topicStates = buildRecoveryTopicStates({
  requiredTopicKeys: ['past-simple', 'present-perfect', 'comparatives'],
  diagnosticScores: {
    'past-simple': 42,
    'present-perfect': 58,
    'comparatives-superlatives': 91,
  },
  repeatedErrors: { 'past-simple': 4 },
  mode: RECOVERY_MODE.COMPLETE,
});

const pastSimple = topicStates.find((topic) => topic.topicKey === 'past-simple');
const presentPerfect = topicStates.find((topic) => topic.topicKey === 'present-perfect');
const comparatives = topicStates.find((topic) => topic.topicKey === 'comparatives');
assert.equal(pastSimple.priorityBand, 'high', 'Poor Past Simple performance should be high priority.');
assert.ok(pastSimple.priorityScore > presentPerfect.priorityScore, 'Repeated errors should raise Past Simple above Present Perfect.');
assert.equal(comparatives.verificationOnly, true, 'A strong school-required topic should stay in the plan as verification.');

const completePlan = buildRecoveryPlan({
  requiredTopicKeys: ['past-simple', 'present-perfect', 'comparatives'],
  examDate: '2026-08-29',
  now: new Date('2026-08-11T12:00:00'),
  diagnosticScores: {
    'past-simple': 42,
    'present-perfect': 58,
    'comparatives-superlatives': 91,
  },
});
assert.equal(completePlan.mode, RECOVERY_MODE.COMPLETE);
assert.ok(completePlan.sessions.some((session) => session.sessionType === 'checkpoint'));
assert.ok(completePlan.sessions.some((session) => session.sessionType === 'mock_intermediate'));
assert.equal(completePlan.sessions.at(-1).sessionType, 'mock_final');
assert.ok(completePlan.sessions.some((session) => session.topicKey === 'comparatives'), 'Strong required topics must not disappear.');

const intensivePlan = buildRecoveryPlan({
  requiredTopicKeys: ['past-simple', 'present-perfect', 'comparatives'],
  examDate: '2026-08-20',
  now: new Date('2026-08-11T12:00:00'),
  diagnosticScores: { 'past-simple': 45, 'present-perfect': 62, 'comparatives-superlatives': 88 },
});
assert.equal(intensivePlan.mode, RECOVERY_MODE.INTENSIVE);

const sosPlan = buildRecoveryPlan({
  requiredTopicKeys: ['past-simple', 'present-perfect', 'comparatives'],
  examDate: '2026-08-15',
  now: new Date('2026-08-11T12:00:00'),
  diagnosticScores: { 'past-simple': 45, 'present-perfect': 62, 'comparatives-superlatives': 88 },
});
assert.equal(sosPlan.mode, RECOVERY_MODE.SOS);
assert.ok(sosPlan.sessions.some((session) => session.sessionType === 'error_review'));
assert.equal(sosPlan.sessions.at(-1).sessionType, 'mock_final');

// I: the same evidence automatically produces a more urgent plan after missed days.
const beforeMissedDays = buildRecoveryPlan({
  requiredTopicKeys: ['past-simple'],
  examDate: '2026-08-22',
  now: new Date('2026-08-11T12:00:00'),
  diagnosticScores: { 'past-simple': 45 },
});
const afterMissedDays = buildRecoveryPlan({
  requiredTopicKeys: ['past-simple'],
  examDate: '2026-08-22',
  now: new Date('2026-08-18T12:00:00'),
  diagnosticScores: { 'past-simple': 45 },
});
assert.equal(beforeMissedDays.mode, RECOVERY_MODE.INTENSIVE);
assert.equal(afterMissedDays.mode, RECOVERY_MODE.SOS, 'Missed days should automatically change the mode as the exam approaches.');

const app = readFileSync('src/App.jsx', 'utf8');
const navbar = readFileSync('src/components/Navbar.jsx', 'utf8');
const learnerHome = readFileSync('src/pages/LearnerHome.jsx', 'utf8');
const diagnosticPage = readFileSync('src/pages/RecoveryDiagnostic.jsx', 'utf8');
const onboardingPage = readFileSync('src/pages/RecoveryOnboarding.jsx', 'utf8');
const recoveryApi = readFileSync('src/lib/recoveryApi.js', 'utf8');
const recoverySchema = readFileSync('supabase/migrations/20260811010000_recovery_debt_foundation.sql', 'utf8');
const recoveryBridge = readFileSync('supabase/migrations/20260811011000_recovery_debt_exercise_bridge.sql', 'utf8');
const hardening = readFileSync('supabase/migrations/20260811014000_recovery_debt_hardening.sql', 'utf8');
const learnerCss = readFileSync('src/styles/learnerEditorial.css', 'utf8');

// A: anonymous diagnostic is public and does not require purchase.
assert.match(app, /path="\/test-recupero-inglese" element={<RecoveryDiagnostic \/>}/);
assert.match(diagnosticPage, /submitRecoveryDiagnostic\(answers\)/);
assert.match(recoverySchema, /grant execute on function public\.submit_public_recovery_diagnostic\(jsonb, text\) to anon, authenticated/);
assert.match(diagnosticPage, /6–8 minuti/);
assert.match(diagnosticPage, /Non lo so/);
assert.match(diagnosticPage, /UNKNOWN_ANSWER = 'unknown'/);

const diagnosticAnswerKeys = new Map(
  [...recoverySchema.matchAll(/\('(rdq\d{2})', '[^']+', '([a-d])', \d+\)/g)]
    .map((match) => [match[1], match[2]]),
);
assert.equal(recoveryDiagnosticQuestions.length, 24);
assert.equal(diagnosticAnswerKeys.size, 24);
for (const question of recoveryDiagnosticQuestions) {
  assert.equal(question.options.length, 4, `${question.id} should offer four credible alternatives.`);
  assert.ok(
    question.options.some((option) => option.key === diagnosticAnswerKeys.get(question.id)),
    `${question.id} must retain the server-side correct answer key.`,
  );
}

// B: an anonymous diagnostic can be claimed after login/purchase and reused.
assert.match(recoveryApi, /claim_recovery_diagnostic/);
assert.match(onboardingPage, /storedRecoveryDiagnosticToken\(\)/);
assert.match(onboardingPage, /claimRecoveryDiagnostic\(token\)/);
assert.match(recoverySchema, /diagnostic_attempt_id uuid references public\.recovery_diagnostic_attempts/);

// C: an authenticated learner who bought first is sent through diagnostic/onboarding.
assert.match(onboardingPage, /Completa prima il test diagnostico/);
assert.match(onboardingPage, /to="\/test-recupero-inglese"/);
assert.match(recoverySchema, /has_active_recovery_entitlement/);

// J: mock exams are technically distinct and cannot expose section feedback while mapped.
assert.match(recoveryBridge, /new\.phase in \('mock_intermediate', 'mock_final'\)/);
assert.match(recoveryBridge, /section\.feedback_timing <> 'hidden'/);
assert.match(recoveryBridge, /'show_score', not v_is_mock/);
assert.match(recoveryBridge, /'show_correct_answers', not v_is_mock/);
assert.match(hardening, /feedback_released = true/);

// K: both theme implementations are intentionally styled.
assert.match(learnerCss, /\.learner-editorial \{/);
assert.match(learnerCss, /\.dark \.learner-editorial \{/);
assert.match(learnerCss, /--learner-orange: #ef5b28/);

// L: existing learner surfaces remain routed alongside the new dashboard.
assert.match(app, /path="\/dashboard" element={<ProtectedRoute><LearnerHome \/><\/ProtectedRoute>}/);
assert.match(app, /path="\/assignments" element={<ProtectedRoute><LearnerAssignments \/><\/ProtectedRoute>}/);
assert.match(app, /path="\/progressi" element={<ProtectedRoute><LearnerProgress \/><\/ProtectedRoute>}/);

// M: the adaptive dashboard is the learner entry point, while account settings stay separate.
assert.match(app, /function AccountEntry\(\)/);
assert.match(app, /profile\?\.role === 'learner'.*profile\?\.status === 'active'/s);
assert.match(app, /<Navigate to="\/dashboard" replace \/>/);
assert.match(app, /path="\/account\/settings" element={<ProtectedRoute><Account \/><\/ProtectedRoute>}/);
assert.match(navbar, /label: 'Dashboard', to: '\/dashboard'/);
assert.match(navbar, /to="\/account\/settings"/);

// N: recovery access selects the dedicated experience; all other learners keep a useful dashboard.
assert.match(learnerHome, /access\?\.entitled \? <RecoveryDashboard/);
assert.match(learnerHome, /!access\?\.entitled \? <GenericDashboard/);
assert.match(learnerHome, /function GenericDashboard/);
assert.match(learnerHome, /Il tuo prossimo passo/);
assert.match(learnerHome, /Ripasso SRS/);

console.log('Recovery MVP validation passed.');
