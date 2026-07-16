import { srsCards } from '../src/data/srsCards.js';
import { generalExpressionCards } from '../src/data/generalExpressionCards.js';
import { hospitalityExpressionCards } from '../src/data/hospitalityExpressionCards.js';
import { travelExpressionCards } from '../src/data/travelExpressionCards.js';
import { trainerConfig } from '../src/data/trainerConfig.js';
import { wordTrainerCards } from '../src/data/wordTrainerCards.js';
import {
  buildExpectedCategoryCounts,
  expressionRequiredSrsCardFields,
  validateSrsCards,
  wordTrainerRequiredSrsCardFields,
} from '../src/utils/validateSrsCards.js';

const datasets = [
  {
    id: 'business-expression',
    name: 'businessExpressionCards',
    cards: srsCards,
    targetField: 'expression',
    requiredFields: expressionRequiredSrsCardFields,
  },
  {
    id: 'general-expression',
    name: 'generalExpressionCards',
    cards: generalExpressionCards,
    targetField: 'expression',
    requiredFields: expressionRequiredSrsCardFields,
  },
  {
    id: 'hospitality-expression',
    name: 'hospitalityExpressionCards',
    cards: hospitalityExpressionCards,
    targetField: 'expression',
    requiredFields: expressionRequiredSrsCardFields,
    strictExamples: true,
  },
  {
    id: 'travel-expression',
    name: 'travelExpressionCards',
    cards: travelExpressionCards,
    targetField: 'expression',
    requiredFields: expressionRequiredSrsCardFields,
    strictExamples: true,
  },
  {
    id: 'word-trainer',
    name: 'wordTrainerCards',
    cards: wordTrainerCards,
    targetField: 'word',
    requiredFields: wordTrainerRequiredSrsCardFields,
  },
];

const results = Object.fromEntries(
  datasets.map((dataset) => {
    const trainer = trainerConfig.find((item) => item.id === dataset.id);

    return [
      dataset.name,
      validateSrsCards(dataset.cards, {
        expectedCategories: buildExpectedCategoryCounts(trainer?.categories || []),
        requiredFields: dataset.requiredFields,
        targetField: dataset.targetField,
        expectedCount: trainer?.cardCount,
        strictExamples: dataset.strictExamples === true,
      }),
    ];
  }),
);

const hasWarnings = Object.values(results).some((result) => result.warnings.length > 0);

console.log(JSON.stringify({
  status: hasWarnings ? 'fail' : 'pass',
  datasets: results,
}, null, 2));

if (hasWarnings) {
  process.exitCode = 1;
}
