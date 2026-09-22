import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

const universal = readJson('public/templates/sblocco-learning-studio/universal-ai-authoring-kit-v1.json');
const grammar = readJson('public/templates/sblocco-learning-studio/grammar-mini-course-authoring-kit-v1.json');
const speaking = readJson('public/templates/sblocco-speaking-authoring-kit-v1.json');

for (const [name, kit] of [['universal', universal], ['grammar', grammar], ['speaking', speaking]]) {
  assert.equal(kit.delivery_contract?.mode, 'downloadable_json_file_only', `${name} authoring kit must require downloadable JSON delivery.`);
  assert.equal(kit.delivery_contract?.file_extension, '.json', `${name} authoring kit must require .json files.`);
  assert.equal(kit.delivery_contract?.chat_payload, false, `${name} authoring kit must prohibit pasted JSON payloads.`);
  assert.ok(
    kit.agent_instructions?.some((line) => /do not.*prompt.*copy|do not.*copy/i.test(line)),
    `${name} authoring kit must tell the AI to follow the file directly rather than hand back a prompt to copy.`,
  );
}

assert.equal(Object.keys(speaking.activity_mechanics || {}).length, 59, 'Speaking authoring kit must document all 59 activities.');
assert.equal(speaking.import_contract?.entity_type, 'speaking_item_batch', 'Speaking kit must document the import batch contract.');
assert.ok(!JSON.stringify(speaking).includes('Ready-to-use generation prompt'), 'Downloadable speaking kit must not contain a copyable prompt section.');

assert.equal(fs.existsSync(new URL('../public/templates/sblocco-learning-studio/universal-ai-authoring-kit-v1.md', import.meta.url)), false, 'Universal authoring kit must no longer be exposed as Markdown.');
assert.equal(fs.existsSync(new URL('../public/templates/sblocco-learning-studio/grammar-mini-course-authoring-kit-v1.md', import.meta.url)), false, 'Grammar authoring kit must no longer be exposed as Markdown.');

const commonContracts = read('src/lib/exerciseAuthoringTemplateContracts.js');
const educational = read('src/lib/educationalContentTemplate.js');
const listening = read('src/lib/listeningComprehension.js');
for (const [name, source] of [['exercise templates', commonContracts], ['educational content', educational], ['listening', listening]]) {
  assert.ok(source.includes("delivery: 'downloadable_json_file_only'"), `${name} authoring contract must require downloadable JSON files.`);
  assert.ok(source.includes("file_extension: '.json'"), `${name} authoring contract must require the .json extension.`);
  assert.ok(source.includes("chat_output: 'no_payload_or_commentary'"), `${name} authoring contract must prohibit pasted payloads.`);
}

const studioImport = read('src/components/admin/exercise-studio/StudioJsonImportPanel.jsx');
assert.ok(studioImport.includes('universal-ai-authoring-kit-v1.json'), 'Studio must link to the JSON authoring kit.');
assert.ok(!studioImport.includes('universal-ai-authoring-kit-v1.md'), 'Studio must not link to a Markdown authoring kit.');

const speakingLibrary = read('src/pages/AdminSpeakingActivities.jsx');
const speakingImport = read('src/components/admin/SpeakingItemImportModal.jsx');
const speakingPrompt = read('src/components/speaking/SpeakingPromptContent.jsx');
const notifications = read('src/pages/AdminNotifications.jsx');

assert.ok(speakingLibrary.includes('sblocco-speaking-authoring-kit-v1.json'), 'Speaking library must expose the downloadable JSON authoring kit.');
assert.ok(speakingLibrary.includes('SpeakingItemImportModal'), 'Speaking library must expose file import.');
assert.ok(speakingImport.includes('accept=".json,application/json,text/json"'), 'Speaking importer must accept JSON files.');
assert.ok(speakingImport.includes('prompts = [...asArray(current.prompts), ...plan.items]'), 'Speaking import must append rather than replace existing items.');
assert.ok(speakingImport.includes('analyseSpeakingItemSet'), 'Speaking import must run the duplicate/context quality gate.');

assert.ok(speakingPrompt.includes('splitBadGood'), 'Speaking prompt renderer must support Bad/Good split cards.');
assert.ok(speakingPrompt.includes('text-center'), 'Speaking prompts must remain centered.');
assert.ok(!notifications.includes('opacity-65'), 'Read notifications must not be globally washed out.');

console.log('Validated JSON-only downloadable authoring kits, speaking import, prompt formatting and notification contrast.');
