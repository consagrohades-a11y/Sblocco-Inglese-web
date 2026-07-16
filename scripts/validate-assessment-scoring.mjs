import assert from 'node:assert/strict';
import {
  assessmentQuestions,
  buildAssessmentResult,
} from '../src/data/assessmentQuiz.js';

function completeAnswers() {
  const answers = {
    goal: 'business',
    situations: ['meetings'],
    speaking_blocker: 'translate',
    listening_blocker: 'details',
    foundations: 'developing',
    level: 'b1',
    urgency: 'three_months',
    commitment: 'two_three',
    format: 'group',
  };

  assessmentQuestions.forEach((question) => {
    if (question.type === 'listening') {
      answers[question.id] = Object.fromEntries(
        question.items.map((item) => [item.id, item.correctAnswer]),
      );
      answers[question.replayKey] = 1;
    } else if (question.correctAnswer) {
      answers[question.id] = question.correctAnswer;
    }
  });

  return answers;
}

const standardAnswers = completeAnswers();
const standardResult = buildAssessmentResult(standardAnswers);
assert.equal(
  standardResult.version,
  3,
  'The assessment result schema must use version 3.',
);
assert.equal(standardResult.performance.listeningCorrect, 6);
assert.equal(standardResult.performance.listeningTotal, 6);
assert.equal(standardResult.performance.listeningUnavailable, 0);

const lowCommitment = buildAssessmentResult({
  ...standardAnswers,
  commitment: 'under_one',
});
const highCommitment = buildAssessmentResult({
  ...standardAnswers,
  commitment: 'four_plus',
});
const responseScore = (result) =>
  result.dimensions.find((item) => item.key === 'response')?.score;
assert.equal(
  responseScore(lowCommitment),
  responseScore(highCommitment),
  'Available study time must not change the observed response score.',
);
assert.equal(
  lowCommitment.performance.observedScore,
  highCommitment.performance.observedScore,
  'Available study time must not change observed language performance.',
);

const inaccessibleAnswers = { ...standardAnswers };
assessmentQuestions
  .filter((question) => question.type === 'listening')
  .forEach((question) => {
    inaccessibleAnswers[question.id] = { _unavailable: true };
    inaccessibleAnswers[question.replayKey] = 0;
  });
const inaccessibleResult = buildAssessmentResult(inaccessibleAnswers);
assert.equal(inaccessibleResult.performance.listeningScore, null);
assert.equal(inaccessibleResult.performance.listeningCorrect, 0);
assert.equal(inaccessibleResult.performance.listeningTotal, 0);
assert.equal(inaccessibleResult.performance.listeningUnavailable, 3);

const partiallyAccessibleAnswers = { ...standardAnswers };
const firstListening = assessmentQuestions.find(
  (question) => question.type === 'listening',
);
partiallyAccessibleAnswers[firstListening.id] = { _unavailable: true };
partiallyAccessibleAnswers[firstListening.replayKey] = 0;
const partiallyAccessibleResult = buildAssessmentResult(
  partiallyAccessibleAnswers,
);
assert.equal(partiallyAccessibleResult.performance.listeningTotal, 4);
assert.equal(partiallyAccessibleResult.performance.listeningUnavailable, 1);
assert.ok(
  Number.isFinite(partiallyAccessibleResult.performance.listeningScore),
);

console.log('Assessment scoring validation passed.');
