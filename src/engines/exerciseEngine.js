const DIAGNOSTIC_DIMENSIONS = ['skills', 'grammar', 'errorPatterns', 'contexts', 'production'];

const FEEDBACK_KEY_DIAGNOSTIC_EQUIVALENTS = {
  'normal-verb-question-needs-do': ['missing-auxiliary'],
  'third-person-s-missing': ['missing-third-person-s'],
  'be-and-do-confusion': ['be-do-confusion'],
  'present-simple-negative-needs-dont-doesnt': ['missing-auxiliary'],
  'short-answer-uses-auxiliary': ['short-answer-omission'],
};

export function normalizeAnswer(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function removeTerminalPunctuation(value) {
  return value.replace(/[.!?]+$/u, '').trim();
}

function answerCandidates(item = {}) {
  if (Array.isArray(item.correctAnswers) && item.correctAnswers.length) {
    return item.correctAnswers;
  }

  if (item.answer !== undefined && item.answer !== null) return [item.answer];

  if (Number.isInteger(item.correctIndex) && Array.isArray(item.options)) {
    return [item.options[item.correctIndex]];
  }

  return [];
}

export function getCorrectAnswer(item = {}) {
  return answerCandidates(item)[0] ?? '';
}

export function evaluateItemAnswer(item = {}, answer) {
  const normalizedAnswer = normalizeAnswer(answer);
  if (!normalizedAnswer) return { correct: false, status: 'empty' };

  if (Number.isInteger(item.correctIndex) && Array.isArray(item.options)) {
    const selectedByIndex = Number.isInteger(Number(answer)) && Number(answer) === item.correctIndex;
    const selectedByValue = normalizedAnswer === normalizeAnswer(item.options[item.correctIndex]);
    if (selectedByIndex || selectedByValue) return { correct: true, status: 'exact' };
  }

  const candidates = answerCandidates(item).map(normalizeAnswer);
  if (candidates.includes(normalizedAnswer)) return { correct: true, status: 'exact' };

  const toleratedAnswer = removeTerminalPunctuation(normalizedAnswer);
  const hasToleratedPunctuation = toleratedAnswer !== normalizedAnswer;
  const toleratedMatch = hasToleratedPunctuation
    && candidates.some((candidate) => removeTerminalPunctuation(candidate) === toleratedAnswer);

  if (toleratedMatch) return { correct: true, status: 'tolerated' };
  return { correct: false, status: 'wrong' };
}

export function isItemCorrect(item = {}, answer) {
  return evaluateItemAnswer(item, answer).correct;
}

export function scoreExercise(exercise = {}, answers = {}) {
  const items = Array.isArray(exercise.items) ? exercise.items : [];
  const correct = items.filter((item) => isItemCorrect(item, answers[item.id])).length;
  const total = items.length;

  return {
    correct,
    total,
    percent: total ? Math.round((correct / total) * 100) : 0,
  };
}

export function collectItemDiagnostics(item = {}) {
  const diagnostic = item.diagnostic || {};
  const severity = Number.isFinite(Number(diagnostic.severity)) ? Number(diagnostic.severity) : 1;
  const contexts = Array.isArray(diagnostic.contexts) ? diagnostic.contexts.filter(Boolean) : [];
  const productionModes = diagnostic.production
    ? (Array.isArray(diagnostic.production) ? diagnostic.production : [diagnostic.production])
    : [];

  return DIAGNOSTIC_DIMENSIONS.flatMap((dimension) => {
    const rawTags = diagnostic[dimension];
    const tags = Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : [];

    return tags.filter(Boolean).map((tag) => ({
      tag,
      dimension,
      severity,
      contexts,
      productionModes,
    }));
  });
}

export function collectFeedbackKeyDiagnostics(item = {}) {
  const existingErrorPatterns = new Set(
    collectItemDiagnostics(item)
      .filter(({ dimension }) => dimension === 'errorPatterns')
      .map(({ tag }) => tag),
  );
  const feedbackKeys = Array.isArray(item.feedbackKeys) ? item.feedbackKeys : [];

  return [...new Set(feedbackKeys)].filter((key) => {
    const equivalentTags = FEEDBACK_KEY_DIAGNOSTIC_EQUIVALENTS[key] || [];
    return !equivalentTags.some((tag) => existingErrorPatterns.has(tag));
  }).map((tag) => ({
    tag,
    dimension: 'errorPatterns',
    severity: Number.isFinite(Number(item.diagnostic?.severity))
      ? Number(item.diagnostic.severity)
      : 1,
    contexts: [],
    productionModes: [item.productionMode].filter(Boolean),
  }));
}

export function evaluateExerciseAttempt(exercise = {}, answers = {}) {
  const items = Array.isArray(exercise.items) ? exercise.items : [];
  const score = scoreExercise(exercise, answers);
  const evaluatedItems = items.map((item, index) => {
    const userAnswer = answers[item.id] ?? '';
    const answerResult = evaluateItemAnswer(item, userAnswer);
    const correct = answerResult.correct;
    const diagnostic = [...collectItemDiagnostics(item), ...collectFeedbackKeyDiagnostics(item)].map((evidence) => ({
      ...evidence,
      exerciseId: exercise.id ?? null,
      itemId: item.id ?? `item-${index + 1}`,
      productionModes: [...new Set([...evidence.productionModes, exercise.type].filter(Boolean))],
    }));
    const feedback = item.feedback || {};

    return {
      itemId: item.id ?? `item-${index + 1}`,
      correct,
      answerStatus: answerResult.status,
      userAnswer,
      correctAnswer: getCorrectAnswer(item),
      diagnostic,
      feedback: typeof feedback === 'string'
        ? feedback
        : (correct ? feedback.correct : feedback.incorrect) || '',
      explanation: item.visibleExplanation || item.explanation || '',
    };
  });

  return {
    exerciseId: exercise.id ?? null,
    ...score,
    items: evaluatedItems,
    diagnosticEvidence: evaluatedItems.flatMap((item) => (item.correct ? [] : item.diagnostic)),
  };
}

