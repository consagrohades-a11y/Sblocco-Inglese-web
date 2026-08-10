import assert from 'node:assert/strict';
import {
  buildRecoveryPlan,
  buildRecoveryTopicStates,
  recoveryModeForDays,
} from '../src/lib/recoveryPlanEngine.js';
import { RECOVERY_MODE } from '../src/config/recovery.js';

assert.equal(recoveryModeForDays(18), RECOVERY_MODE.COMPLETE);
assert.equal(recoveryModeForDays(14), RECOVERY_MODE.COMPLETE);
assert.equal(recoveryModeForDays(13), RECOVERY_MODE.INTENSIVE);
assert.equal(recoveryModeForDays(9), RECOVERY_MODE.INTENSIVE);
assert.equal(recoveryModeForDays(7), RECOVERY_MODE.INTENSIVE);
assert.equal(recoveryModeForDays(6), RECOVERY_MODE.SOS);
assert.equal(recoveryModeForDays(4), RECOVERY_MODE.SOS);

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

console.log('Recovery plan validation passed.');
