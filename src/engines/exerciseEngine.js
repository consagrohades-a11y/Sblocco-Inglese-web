const DIAGNOSTIC_DIMENSIONS = ['skills', 'grammar', 'errorPatterns', 'contexts', 'production'];

export function normalizeAnswer(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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

export function isItemCorrect(item = {}, answer) {
  if (Number.isInteger(item.correctIndex) && Array.isArray(item.options)) {
    const selectedByIndex = Number.isInteger(Number(answer)) && Number(answer) === item.correctIndex;
    const selectedByValue = normalizeAnswer(answer) === normalizeAnswer(item.options[item.correctIndex]);
    if (selectedByIndex || selectedByValue) return true;
  }

  const normalizedAnswer = normalizeAnswer(answer);
  if (!normalizedAnswer) return false;

  return answerCandidates(item).some((candidate) => normalizeAnswer(candidate) === normalizedAnswer);
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

export function evaluateExerciseAttempt(exercise = {}, answers = {}) {
  const items = Array.isArray(exercise.items) ? exercise.items : [];
  const score = scoreExercise(exercise, answers);
  const evaluatedItems = items.map((item, index) => {
    const userAnswer = answers[item.id] ?? '';
    const correct = isItemCorrect(item, userAnswer);
    const diagnostic = collectItemDiagnostics(item).map((evidence) => ({
      ...evidence,
      exerciseId: exercise.id ?? null,
      itemId: item.id ?? `item-${index + 1}`,
      productionModes: [...new Set([...evidence.productionModes, exercise.type].filter(Boolean))],
    }));
    const feedback = item.feedback || {};

    return {
      itemId: item.id ?? `item-${index + 1}`,
      correct,
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

