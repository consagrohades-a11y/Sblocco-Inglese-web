import { beVsDoRecognitionPool as currentBeVsDoRecognitionPool } from '../beVsDoRecognitionPool.js';
import { presentSimpleNormalVerbsPool as currentPresentSimpleNormalVerbsPool } from '../presentSimpleNormalVerbsPool.js';
import {
  beVsDoRecognitionItems,
  dialogueScenarioPool,
  doDoesChoiceItems,
  finalTestItems,
  negativeFormItems,
  questionFormationItems,
  shortAnswerItems,
} from './index.js';

const dedupeById = (items) => {
  const seen = new Set();

  return items.filter((item) => {
    if (!item?.id) return true;
    if (seen.has(item.id)) return false;

    seen.add(item.id);
    return true;
  });
};

const toChoiceItem = (item) => ({
  ...item,
  type: item.type ?? 'choice',
  correctIndex: item.correctIndex ?? item.options?.indexOf(item.correctAnswer),
});

export const beVsDoRecognitionPool = dedupeById([
  ...beVsDoRecognitionItems.map(toChoiceItem),
  ...currentBeVsDoRecognitionPool,
]);

export const presentSimpleNormalVerbsPool = dedupeById([
  ...doDoesChoiceItems,
  ...questionFormationItems,
  ...negativeFormItems,
  ...shortAnswerItems,
  ...currentPresentSimpleNormalVerbsPool,
]);

export { dialogueScenarioPool, finalTestItems };
