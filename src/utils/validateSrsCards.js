export const expectedSrsCategoryCounts = {
  'Interview English': 85,
  'Business English': 35,
  'Meetings & Calls': 65,
  'Emails & Follow-ups': 45,
  'Customer-facing English': 10,
  'Small Talk & Natural Reactions': 10,
};

export const expressionRequiredSrsCardFields = [
  'id',
  'type',
  'level',
  'category',
  'expression',
  'pronunciation',
  'italian',
  'example1',
  'example2',
  'note',
];

export const wordTrainerRequiredSrsCardFields = [
  'id',
  'type',
  'level',
  'category',
  'word',
  'partOfSpeech',
  'pronunciation',
  'italian',
  'collocations',
  'example1',
  'example2',
  'note',
];

export const requiredSrsCardFields = expressionRequiredSrsCardFields;

export function buildExpectedCategoryCounts(categories = []) {
  return Object.fromEntries(categories.map((category) => [category, 0]));
}

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function validateSrsCards(cards, expectedCategories = expectedSrsCategoryCounts, options = {}) {
  if (expectedCategories?.expectedCategories || expectedCategories?.requiredFields || expectedCategories?.targetField) {
    options = expectedCategories;
    expectedCategories = options.expectedCategories || expectedSrsCategoryCounts;
  }

  const requiredFields = options.requiredFields || requiredSrsCardFields;
  const targetField = options.targetField || 'expression';
  const expectedCount = options.expectedCount;
  const strictExamples = options.strictExamples === true;
  const warnings = [];
  const categoryCounts = Object.fromEntries(Object.keys(expectedCategories).map((category) => [category, 0]));
  const ids = new Map();
  const targets = new Map();
  const examples = new Map();

  if (!Array.isArray(cards)) {
    return {
      count: 0,
      categoryCounts,
      warnings: ['srsCards is not an array.'],
    };
  }

  if (Number.isInteger(expectedCount) && cards.length !== expectedCount) {
    warnings.push(`Expected ${expectedCount} cards, found ${cards.length}.`);
  }

  cards.forEach((card, index) => {
    const label = card?.id || `card at index ${index}`;

    requiredFields.forEach((field) => {
      if (!hasText(card?.[field])) {
        warnings.push(`${label}: missing required field "${field}".`);
      }
    });

    if (hasText(card?.id)) {
      ids.set(card.id, [...(ids.get(card.id) || []), index]);
    }

    if (hasText(card?.[targetField])) {
      const targetKey = card[targetField].toLowerCase().trim();
      targets.set(targetKey, [...(targets.get(targetKey) || []), label]);
    }

    if (hasText(card?.category) && Object.prototype.hasOwnProperty.call(categoryCounts, card.category)) {
      categoryCounts[card.category] += 1;
    }

    if (!String(card?.example1 || '').includes('**')) {
      warnings.push(`${label}: example1 does not contain bold markdown.`);
    }

    if (!String(card?.example2 || '').includes('**')) {
      warnings.push(`${label}: example2 does not contain bold markdown.`);
    }

    if (strictExamples && hasText(card?.[targetField])) {
      const boldTarget = `**${String(card[targetField]).trim()}**`.toLowerCase();

      ['example1', 'example2'].forEach((exampleField) => {
        const example = String(card?.[exampleField] || '').trim();
        const normalizedExample = example.toLowerCase().replace(/\s+/g, ' ');
        const plainExample = example.replace(/\*\*/g, '').trim();

        if (!normalizedExample.includes(boldTarget)) {
          warnings.push(`${label}: ${exampleField} must contain the complete target in bold.`);
        }

        if (plainExample && !/[.!?]$/.test(plainExample)) {
          warnings.push(`${label}: ${exampleField} must end with sentence punctuation.`);
        }

        if (plainExample.split(/\s+/).length < 5) {
          warnings.push(`${label}: ${exampleField} is too short to provide useful context.`);
        }

        if (normalizedExample) {
          examples.set(normalizedExample, [...(examples.get(normalizedExample) || []), `${label}.${exampleField}`]);
        }
      });
    }
  });

  ids.forEach((indexes, id) => {
    if (indexes.length > 1) {
      warnings.push(`Duplicate card id "${id}" at indexes ${indexes.join(', ')}.`);
    }
  });

  targets.forEach((labels, target) => {
    if (labels.length > 1) {
      warnings.push(`Duplicate ${targetField} "${target}" in cards ${labels.join(', ')}.`);
    }
  });

  if (strictExamples) {
    examples.forEach((labels, example) => {
      if (labels.length > 1) {
        warnings.push(`Duplicate example "${example}" in ${labels.join(', ')}.`);
      }
    });
  }

  Object.entries(categoryCounts).forEach(([category, count]) => {
    if (count === 0) {
      warnings.push(`Category "${category}" has zero cards.`);
    }
  });

  return {
    count: cards.length,
    categoryCounts,
    duplicateIds: Array.from(ids.values()).filter((indexes) => indexes.length > 1).length,
    duplicateTargets: Array.from(targets.values()).filter((labels) => labels.length > 1).length,
    duplicateExpressions:
      targetField === 'expression' ? Array.from(targets.values()).filter((labels) => labels.length > 1).length : 0,
    warnings,
  };
}

export function warnAboutSrsCardIssues(cards, logger = console, options = {}) {
  const result = validateSrsCards(cards, options.expectedCategories, options);

  if (result.warnings.length > 0 && logger && typeof logger.warn === 'function') {
    logger.warn('SRS card validation warnings:', result.warnings);
  }

  return result;
}
