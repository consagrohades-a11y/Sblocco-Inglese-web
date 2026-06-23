export const expectedSrsCategoryCounts = {
  'Interview English': 85,
  'Business English': 35,
  'Meetings & Calls': 65,
  'Emails & Follow-ups': 45,
  'Customer-facing English': 10,
  'Small Talk & Natural Reactions': 10,
};

export const requiredSrsCardFields = [
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

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function validateSrsCards(cards, expectedCategories = expectedSrsCategoryCounts) {
  const warnings = [];
  const categoryCounts = Object.fromEntries(Object.keys(expectedCategories).map((category) => [category, 0]));
  const ids = new Map();
  const expressions = new Map();

  if (!Array.isArray(cards)) {
    return {
      count: 0,
      categoryCounts,
      warnings: ['srsCards is not an array.'],
    };
  }

  cards.forEach((card, index) => {
    const label = card?.id || `card at index ${index}`;

    requiredSrsCardFields.forEach((field) => {
      if (!hasText(card?.[field])) {
        warnings.push(`${label}: missing required field "${field}".`);
      }
    });

    if (hasText(card?.id)) {
      ids.set(card.id, [...(ids.get(card.id) || []), index]);
    }

    if (hasText(card?.expression)) {
      const expressionKey = card.expression.toLowerCase().trim();
      expressions.set(expressionKey, [...(expressions.get(expressionKey) || []), label]);
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
  });

  ids.forEach((indexes, id) => {
    if (indexes.length > 1) {
      warnings.push(`Duplicate card id "${id}" at indexes ${indexes.join(', ')}.`);
    }
  });

  expressions.forEach((labels, expression) => {
    if (labels.length > 1) {
      warnings.push(`Duplicate expression "${expression}" in cards ${labels.join(', ')}.`);
    }
  });

  Object.entries(categoryCounts).forEach(([category, count]) => {
    if (count === 0) {
      warnings.push(`Category "${category}" has zero cards.`);
    }
  });

  return {
    count: cards.length,
    categoryCounts,
    duplicateIds: Array.from(ids.values()).filter((indexes) => indexes.length > 1).length,
    duplicateExpressions: Array.from(expressions.values()).filter((labels) => labels.length > 1).length,
    warnings,
  };
}

export function warnAboutSrsCardIssues(cards, logger = console) {
  const result = validateSrsCards(cards);

  if (result.warnings.length > 0 && logger && typeof logger.warn === 'function') {
    logger.warn('SRS card validation warnings:', result.warnings);
  }

  return result;
}
