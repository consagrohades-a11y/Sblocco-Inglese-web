import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRecoveryPlanReveal,
  RECOVERY_PROGRAMME_CATEGORIES,
  recoveryExamWindowFeedback,
  sanitizeRecoveryOnboardingDraft,
  summarizeRecoveryDiagnostic,
  SUPPORTED_RECOVERY_CLASS_YEARS,
  TYPICAL_RECOVERY_TOPICS_BY_YEAR,
} from '../src/lib/recoveryOnboarding.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const onboardingPage = fs.readFileSync(path.join(root, 'src/pages/RecoveryOnboarding.jsx'), 'utf8');
const flow = fs.readFileSync(path.join(root, 'src/components/recovery/RecoveryOnboardingFlow.jsx'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/styles/recoveryOnboarding.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');

assert.deepEqual(SUPPORTED_RECOVERY_CLASS_YEARS, [1, 2, 3]);
assert.equal(RECOVERY_PROGRAMME_CATEGORIES.length, 8);
assert.ok(Object.values(TYPICAL_RECOVERY_TOPICS_BY_YEAR).every((topics) => topics.length > 0));

const draft = sanitizeRecoveryOnboardingDraft({
  step: 4,
  classYear: '2',
  examDate: '2026-09-01',
  topicKeys: ['past-simple', 'past-simple', 'not-a-topic'],
  programmeConfidence: 'missing',
});
assert.equal(draft.classYear, '2');
assert.deepEqual(draft.topicKeys, ['past-simple']);
assert.equal(sanitizeRecoveryOnboardingDraft({ step: 6 }).step, 6);
assert.equal(sanitizeRecoveryOnboardingDraft({ step: 7 }).step, 7);
assert.equal(sanitizeRecoveryOnboardingDraft({ classYear: '5' }).classYear, '');

const longWindow = recoveryExamWindowFeedback('2026-09-01', new Date('2026-08-01T12:00:00'));
const mediumWindow = recoveryExamWindowFeedback('2026-08-11', new Date('2026-08-01T12:00:00'));
const shortWindow = recoveryExamWindowFeedback('2026-08-05', new Date('2026-08-01T12:00:00'));
assert.match(longWindow.supportCopy, /calma/);
assert.match(mediumWindow.supportCopy, /priorità/);
assert.match(shortWindow.supportCopy, /più concentrato/);

assert.deepEqual(summarizeRecoveryDiagnostic({ a: 20, b: 50, c: 84, d: 85 }), {
  priorities: 1,
  consolidating: 2,
  solid: 1,
});

const reveal = buildRecoveryPlanReveal({
  plan: {
    daysRemaining: 18,
    topics: [{ priorityBand: 'high' }, { priorityBand: 'medium' }],
    sessions: [
      { sessionType: 'topic', estimatedMinutes: 10 },
      { sessionType: 'checkpoint', estimatedMinutes: 20 },
      { sessionType: 'mock_final', estimatedMinutes: 30 },
    ],
  },
  state: null,
});
assert.equal(reveal.days, 18);
assert.equal(reveal.sessionCount, 3);
assert.equal(reveal.totalMinutes, 60);
assert.equal(reveal.assessments, 2);

assert.match(onboardingPage, /configureRecoveryEnrollment\(/);
assert.match(onboardingPage, /recalculateRecoveryPlan\(/);
assert.match(onboardingPage, /submissionRef\.current/);
assert.match(onboardingPage, /sessionStorage/);
assert.match(flow, /role="progressbar"/);
assert.match(flow, /role="radiogroup"/);
assert.match(flow, /aria-checked/);
assert.match(flow, /to="\/test-recupero-inglese"/);
assert.match(app, /!isStandaloneRecoveryOnboarding \? <Navbar/);
assert.match(app, /!isStandaloneRecoveryOnboarding \? <Footer/);
assert.match(flow, /Il tuo piano è pronto/);
assert.match(styles, /@media \(max-width: 390px\)/);
assert.match(styles, /prefers-reduced-motion/);
assert.doesNotMatch(styles, /purple|violet/i);

console.log('Recovery onboarding v2 validation passed.');
