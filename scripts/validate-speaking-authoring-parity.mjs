import assert from 'node:assert/strict';
import fs from 'node:fs';

const kit = JSON.parse(fs.readFileSync('public/templates/sblocco-speaking-authoring-kit-v1.json', 'utf8'));
const importer = fs.readFileSync('src/components/admin/SpeakingItemImportModal.jsx', 'utf8');
const editor = fs.readFileSync('src/components/admin/SpeakingActivityEditorModal.jsx', 'utf8');

assert.equal(kit.block_registry_version, 2);
assert.equal(kit.speaking_round_contract_version, 1);
assert.equal(kit.structured_formats.length, 5);
assert.ok(kit.system_owned_fields.some((field) => /IDs/i.test(field)));
assert.ok(kit.supported_levels.includes('A0'));
assert.ok(kit.supported_levels.includes('Mixed'));

for (const format of ['number_mission','picture_detective','explain_without_saying','conversation_detective','make_the_choice']) {
  assert.ok(kit.completed_examples[format], 'Missing completed example: ' + format);
  const item = kit.completed_examples[format].items[0];
  assert.equal(item.format, format);
  assert.ok(item.text);
  assert.ok(item.title);
  assert.ok(item.instructions);
}

assert.ok(importer.includes('normalizeSpeakingRoundBlock'));
assert.ok(importer.includes('validateSpeakingRoundBlock'));
assert.ok(editor.includes('StudioSpeakingRoundEditor'));
assert.ok(editor.includes('createDefaultSpeakingRound'));
assert.ok(editor.includes('validateSpeakingRoundBlock'));

console.log('Speaking authoring kit, import and manual editor parity validated.');
