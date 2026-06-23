import { srsCards } from '../src/data/srsCards.js';
import { validateSrsCards } from '../src/utils/validateSrsCards.js';

const result = validateSrsCards(srsCards);

console.log(JSON.stringify(result, null, 2));

if (result.warnings.length > 0) {
  process.exitCode = 1;
}
