import { readFileSync } from 'node:fs';
import {
  SPEAKING_ROUND_FORMATS,
  createSpeakingMaterial,
  normalizeSpeakingMaterial,
  validateSpeakingMaterial,
} from '../src/lib/speakingRoundContract.js';

const expected = [
  'number_mission',
  'picture_detective',
  'explain_without_saying',
  'conversation_detective',
  'make_the_choice',
];

const implemented = SPEAKING_ROUND_FORMATS.map((item) => item.value);
for (const format of expected) {
  if (!implemented.includes(format)) throw new Error('Missing structured speaking format: ' + format);
  if (!createSpeakingMaterial(format)) throw new Error('Missing default material for: ' + format);
}

const explain = normalizeSpeakingMaterial({
  format: 'explain_without_saying',
  target: 'deadline',
  forbidden_words: ['work', 'finish'],
});
if (validateSpeakingMaterial(explain).length) throw new Error('Valid Explain Without Saying material was rejected.');

const invalidPicture = validateSpeakingMaterial({
  format: 'picture_detective',
  question: 'What changed?',
});
if (!invalidPicture.some((item) => item.field === 'material.image_src')) {
  throw new Error('Picture Detective must require a real image asset.');
}

const promptSource = readFileSync('src/components/speaking/SpeakingPromptContent.jsx', 'utf8');
const editorSource = readFileSync('src/components/admin/SpeakingActivityEditorModal.jsx', 'utf8');
const importSource = readFileSync('src/components/admin/SpeakingItemImportModal.jsx', 'utf8');
const controllerSource = readFileSync('src/components/admin/SpeakingLiveController.jsx', 'utf8');

if (!promptSource.includes('<SpeakingRoundContent')) throw new Error('Learner presenter is not using the structured speaking renderer.');
if (!editorSource.includes('<SpeakingRoundEditor')) throw new Error('Speaking editor is not exposing structured material fields.');
if (!importSource.includes('validateSpeakingMaterial')) throw new Error('Speaking importer is not validating structured material.');
if (!controllerSource.includes('normalizeSpeakingItem')) throw new Error('Live controller is not preserving structured material.');

console.log('Structured speaking round contract validation passed.');
