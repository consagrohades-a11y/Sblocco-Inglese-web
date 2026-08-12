import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildRecoveryPlan,
  buildRecoveryTopicStates,
  recoveryModeForDays,
  recoveryStudyDates,
} from '../src/lib/recoveryPlanEngine.js';
import { validateExerciseBuilderJson } from '../src/lib/exerciseBuilderSchema.js';
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

// O: the plan has a real calendar, not only a sequence number.
assert.deepEqual(recoveryStudyDates('2026-08-14', new Date('2026-08-11T12:00:00')), [
  '2026-08-11',
  '2026-08-12',
  '2026-08-13',
]);
assert.equal(completePlan.workload.availableStudyDays, 18);
assert.ok(completePlan.days.length > 0);
assert.equal(completePlan.days[0].scheduledFor, '2026-08-11');
assert.equal(completePlan.days.at(-1).scheduledFor, '2026-08-28', 'The final active study day should stay immediately before the exam.');
assert.equal(completePlan.sessions.at(-1).scheduledFor, completePlan.days.at(-1).scheduledFor, 'The final mock belongs to the final active study day.');
for (const session of completePlan.sessions) {
  assert.ok(session.planDayIndex > 0, 'Every recovery session must belong to a plan day.');
  assert.ok(session.scheduledFor, 'Every recovery session must have a date.');
  assert.ok(session.dailyOrder > 0, 'Every recovery session must have a stable order inside its day.');
}
for (const day of completePlan.days) {
  const daySessions = completePlan.sessions.filter((session) => session.planDayIndex === day.dayIndex);
  assert.ok(daySessions.length > 0, 'An active recovery day must never be empty.');
  assert.equal(
    day.targetMinutes,
    daySessions.reduce((sum, session) => sum + session.estimatedMinutes, 0),
    'Daily workload must match the sessions assigned to that day.',
  );
}

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
assert.ok(sosPlan.days.length <= 4, 'SOS must fit inside the actual days left before the exam.');
assert.equal(sosPlan.days.at(-1).scheduledFor, '2026-08-14');

// I / P: missed days make the plan more urgent and the new queue starts today, never in the past.
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
assert.equal(afterMissedDays.days[0].scheduledFor, '2026-08-18');
assert.ok(afterMissedDays.sessions.every((session) => session.scheduledFor >= '2026-08-18'));
assert.equal(afterMissedDays.days.at(-1).scheduledFor, '2026-08-21');

const app = readFileSync('src/App.jsx', 'utf8');
const navbar = readFileSync('src/components/Navbar.jsx', 'utf8');
const learnerHome = readFileSync('src/pages/LearnerHome.jsx', 'utf8');
const diagnosticPage = readFileSync('src/pages/RecoveryDiagnostic.jsx', 'utf8');
const onboardingPage = readFileSync('src/pages/RecoveryOnboarding.jsx', 'utf8');
const recoveryApi = readFileSync('src/lib/recoveryApi.js', 'utf8');
const recoverySchema = readFileSync('supabase/migrations/20260811010000_recovery_debt_foundation.sql', 'utf8');
const recoveryBridge = readFileSync('supabase/migrations/20260811011000_recovery_debt_exercise_bridge.sql', 'utf8');
const hardening = readFileSync('supabase/migrations/20260811014000_recovery_debt_hardening.sql', 'utf8');
const dailyPlanSchema = readFileSync('supabase/migrations/20260812131323_recovery_daily_plan_foundation.sql', 'utf8');
const dailyPlanHardening = readFileSync('supabase/migrations/20260812131337_recovery_daily_plan_hardening.sql', 'utf8');
const dailyPlanPrivileges = readFileSync('supabase/migrations/20260812131409_recovery_daily_plan_privilege_lockdown.sql', 'utf8');
const dailyPlanPolicyCleanup = readFileSync('supabase/migrations/20260812131553_recovery_daily_plan_policy_cleanup.sql', 'utf8');
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

// Q: daily scheduling is additive, owner-scoped and protects future work from legacy auto-unlock.
assert.match(dailyPlanSchema, /create table public\.recovery_plan_days/);
assert.match(dailyPlanSchema, /add column if not exists plan_day_id/);
assert.match(dailyPlanSchema, /create or replace function public\.activate_due_recovery_plan/);
assert.match(dailyPlanSchema, /create or replace function public\.get_today_recovery_plan/);
assert.match(dailyPlanSchema, /create or replace function public\.replace_recovery_plan_v2/);
assert.match(dailyPlanSchema, /new\.scheduled_for > current_date/);
assert.match(dailyPlanSchema, /session\.status in \('planned', 'available'\)/);
assert.match(dailyPlanHardening, /p_user_id = auth\.uid\(\) or public\.is_admin\(\)/);
assert.match(dailyPlanPrivileges, /revoke all privileges on table public\.recovery_plan_days from anon, authenticated/);
assert.match(dailyPlanPrivileges, /grant select on table public\.recovery_plan_days to authenticated/);
assert.match(dailyPlanPolicyCleanup, /drop policy if exists recovery_plan_days_admin/);
assert.match(recoveryApi, /replace_recovery_plan_v2/);
assert.match(recoveryApi, /activate_due_recovery_plan/);
assert.match(recoveryApi, /isMissingDailyPlanCapability/);

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

// R: Recovery curriculum and production content are source-controlled and importable.
const recoveryCurriculum = JSON.parse(readFileSync('content/recovery/curriculum-years-1-3.json', 'utf8'));
assert.equal(recoveryCurriculum.school_programme_is_authoritative, true);
assert.ok(recoveryCurriculum.topics.length >= 35, 'Years 1-3 curriculum should include core and programme-dependent coverage.');
assert.ok(recoveryCurriculum.content_waves[0].topics.includes('present-simple'));
assert.ok(recoveryCurriculum.topics.some((topic) => topic.key === 'reported-speech' && topic.introduced_by_year === 3));
assert.ok(recoveryCurriculum.topics.some((topic) => topic.key === 'relative-clauses'));
assert.ok(recoveryCurriculum.topics.some((topic) => topic.key === 'passive-voice'));

const presentSimpleBundle = JSON.parse(readFileSync('content/recovery/wave-1/present-simple.bundle.json', 'utf8'));
const presentSimpleValidation = validateExerciseBuilderJson(presentSimpleBundle);
assert.deepEqual(presentSimpleValidation.errors, [], `Present Simple bundle import errors: ${presentSimpleValidation.errors.join(' | ')}`);
const invalidPresentSimpleItems = presentSimpleValidation.items.filter((item) => item.status === 'invalid');
assert.equal(invalidPresentSimpleItems.length, 0, `Present Simple invalid items: ${invalidPresentSimpleItems.flatMap((item) => item.errors || []).join(' | ')}`);
assert.equal(presentSimpleBundle.exercises.length, 4, 'Present Simple gold-standard batch must contain four Recovery phases.');

const presentSimpleExercises = new Map(presentSimpleBundle.exercises.map((exercise) => [exercise.client_key, exercise]));
const recoverExercise = presentSimpleExercises.get('recovery_present_simple_recover');
const practiceExercise = presentSimpleExercises.get('recovery_present_simple_practice');
const schoolExercise = presentSimpleExercises.get('recovery_present_simple_school');
const verifyExercise = presentSimpleExercises.get('recovery_present_simple_verify');
assert.ok(recoverExercise && practiceExercise && schoolExercise && verifyExercise, 'Present Simple batch must include recover, practice, school and verify exercises.');
assert.equal(presentSimpleBundle.exercises.reduce((sum, exercise) => sum + exercise.estimated_minutes, 0), 42, 'Complete Present Simple session should match the 42-minute Recovery Complete target.');
assert.ok(recoverExercise.sections.flatMap((section) => section.questions).some((question) => question.type === 'content_block' && question.content?.educational_schema_version === 1), 'Recover must begin from structured teaching input.');
assert.ok(practiceExercise.sections.flatMap((section) => section.questions).length >= 7, 'Practice must contain enough retrieval to be meaningful.');
assert.ok(schoolExercise.sections.every((section) => section.feedback_timing === 'exercise_end'), 'Modalità scuola must not coach after each question.');
assert.ok(verifyExercise.sections.every((section) => section.feedback_timing === 'exercise_end'), 'Mini-verifica must release feedback only at the end.');
assert.ok(verifyExercise.sections.flatMap((section) => section.questions).length >= 6, 'Mini-verifica must sample the full objective, not one narrow rule.');
assert.equal(verifyExercise.sections.flatMap((section) => section.questions).some((question) => question.type === 'content_block'), false, 'Mini-verifica must not teach before measuring mastery.');
for (const exercise of presentSimpleBundle.exercises) {
  assert.equal(exercise.topic, 'present-simple');
  for (const question of exercise.sections.flatMap((section) => section.questions)) {
    assert.equal(question.topic, 'present-simple', `${question.client_key} must use the Recovery topic key so checkpoint evidence can aggregate correctly.`);
  }
}

console.log('Recovery MVP, daily-plan and curriculum-content validation passed.');
