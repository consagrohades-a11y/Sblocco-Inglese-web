function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }
  return value;
}

function createRandom(seed) {
  if (seed === undefined || seed === null) return Math.random;

  let state = [...String(seed)].reduce((hash, character) => (
    Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  ), 2166136261);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function matchesValue(actual, expected) {
  if (Array.isArray(expected)) {
    const actualValues = Array.isArray(actual) ? actual : [actual];
    return expected.every((value) => actualValues.includes(value));
  }

  if (expected && typeof expected === 'object') {
    return Boolean(actual && typeof actual === 'object')
      && Object.entries(expected).every(([key, value]) => matchesValue(actual[key], value));
  }

  return Array.isArray(actual) ? actual.includes(expected) : actual === expected;
}

function matchesQuestion(question, match) {
  if (!match || typeof match !== 'object' || Array.isArray(match)) return true;

  return Object.entries(match).every(([key, expected]) => {
    const actual = question && Object.hasOwn(question, key)
      ? question[key]
      : question?.selection?.[key];
    return matchesValue(actual, expected);
  });
}

function normalizeCount(value, fallback = 0) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : fallback;
}

export function buildControlledAttempt({
  questionPool,
  questionCount,
  selectionRules,
  seed,
} = {}) {
  if (!Array.isArray(questionPool)) {
    throw new TypeError('questionPool must be an array');
  }

  const warnings = [];
  const random = createRandom(seed);
  const requestedCount = normalizeCount(questionCount, questionPool.length);
  const targetCount = Math.min(requestedCount, questionPool.length);
  const rules = Array.isArray(selectionRules)
    ? selectionRules
    : selectionRules && typeof selectionRules === 'object' ? [selectionRules] : [];
  const candidates = questionPool.map((question, index) => ({
    question,
    index,
    key: question?.id ?? `pool-index-${index}`,
  }));
  const selected = [];
  const selectedIndexes = new Set();
  const selectedKeys = new Set();
  const coverageRules = [];

  if (requestedCount > questionPool.length) {
    warnings.push(`Requested ${requestedCount} questions, but the pool contains only ${questionPool.length}.`);
  }

  rules.forEach((rule, ruleIndex) => {
    const count = normalizeCount(rule?.count, 0);
    const availableSlots = Math.max(0, targetCount - selected.length);
    const ruleTarget = Math.min(count, availableSlots);
    const matches = shuffle(candidates.filter((candidate) => (
      !selectedIndexes.has(candidate.index)
      && !selectedKeys.has(candidate.key)
      && matchesQuestion(candidate.question, rule?.match)
    )), random);
    const chosen = matches.slice(0, ruleTarget);

    chosen.forEach((candidate) => {
      selected.push(candidate);
      selectedIndexes.add(candidate.index);
      selectedKeys.add(candidate.key);
    });

    coverageRules.push({
      ruleIndex,
      count,
      match: cloneValue(rule?.match ?? {}),
      matched: matches.length,
      selected: chosen.length,
    });

    if (chosen.length < ruleTarget) {
      warnings.push(`Selection rule ${ruleIndex + 1} requested ${ruleTarget} matches, but only ${chosen.length} were available; remaining slots were filled from the same pool when possible.`);
    }
  });

  const remaining = shuffle(candidates.filter((candidate) => (
    !selectedIndexes.has(candidate.index) && !selectedKeys.has(candidate.key)
  )), random);
  selected.push(...remaining.slice(0, Math.max(0, targetCount - selected.length)));

  if (selected.length < targetCount) {
    warnings.push(`Only ${selected.length} unique questions could be selected from the supplied pool.`);
  }

  const questions = selected.map(({ question }) => cloneValue(question));
  const attemptSeed = seed ?? `${Date.now()}-${Math.random()}`;
  const attemptIdPart = [...`${attemptSeed}:${selected.map(({ key }) => key).join('|')}`]
    .reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261)
    .toString(36);

  return {
    attemptId: `attempt-${attemptIdPart}`,
    questions,
    coverage: {
      requested: requestedCount,
      selected: questions.length,
      rules: coverageRules,
    },
    warnings,
  };
}
