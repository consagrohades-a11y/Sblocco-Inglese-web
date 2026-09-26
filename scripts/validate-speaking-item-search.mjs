import assert from 'node:assert/strict';
import { findMatchingSpeakingItems } from '../src/lib/speakingItemSearch.js';

const activity = {
  title: 'Real-life missions', levels: ['A1', 'B2'], tags: ['speaking'],
  prompts: [
    { text: 'Ask for the bill.', levels: ['A1'], context_tags: ['restaurant'] },
    { text: 'Negotiate a refund.', levels: ['B2'], context_tags: ['shopping'] },
    { text: 'Ask about the train.', levels: ['A1'], context_tags: ['travel'] },
  ],
};

assert.deepEqual(findMatchingSpeakingItems(activity, { query: 'refund', level: 'A1' }), []);
assert.deepEqual(findMatchingSpeakingItems(activity, { query: 'travel', level: 'A1' }).map((match) => match.sourceIndex), [2]);
assert.deepEqual(findMatchingSpeakingItems(activity, { query: 'Real-life', level: 'A1' }).map((match) => match.sourceIndex), [0, 2]);
console.log('Speaking search applies level and content filters to the same item.');
