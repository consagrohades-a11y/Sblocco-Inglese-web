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
assert.ok(kit.documentation_revision, 'Detailed speaking authoring kit must carry a documentation revision.');
assert.ok(Array.isArray(kit.authoring_workflow) && kit.authoring_workflow.length >= 10, 'Detailed authoring workflow is missing.');
assert.ok(kit.pedagogical_quality_standard?.required_characteristics?.length >= 6, 'Pedagogical quality standard is incomplete.');
for (const level of kit.supported_levels) {
  assert.ok(kit.cefr_authoring_guide?.[level], 'Missing CEFR authoring guidance for ' + level);
}
assert.ok(kit.field_reference?.standard_item?.text, 'Standard speaking item field reference is missing.');
assert.ok(kit.visibility_and_privacy?.teacher_only_fields?.length >= 3, 'Teacher/student visibility rules are incomplete.');
assert.ok(kit.support_design_guide?.strong_support_examples?.length >= 3, 'Support design guidance is incomplete.');
assert.ok(kit.challenge_design_guide?.strong_patterns?.length >= 5, 'Challenge design guidance is incomplete.');
assert.ok(kit.batch_design_guide?.distribution_rules?.length >= 5, 'Batch design guidance is incomplete.');
assert.ok(kit.novelty_and_duplicate_guide?.preflight_questions?.length >= 4, 'Novelty guidance is incomplete.');
assert.equal(Object.keys(kit.activity_mechanics_detailed || {}).length, Object.keys(kit.activity_mechanics || {}).length, 'Every speaking activity needs a detailed authoring profile.');
assert.equal(Object.keys(kit.activity_mechanics || {}).length, 72, 'Authoring kit must cover the complete 72-game Speaking Library.');
assert.equal(kit.lower_level_game_pack?.games?.length, 10, 'Authoring kit must document all ten lower-level-first games.');
assert.deepEqual(kit.activity_level_policy?.activity_supported_levels, ['A0','A1','A1+','A2','B1','B1+','B2','C1','C2'], 'Every activity must be available A0-C2.');
assert.equal(Object.keys(kit.activity_pedagogy_audit || {}).length, 72, 'Pedagogy audit must cover all 72 activities.');
assert.ok(kit.image_support_contract?.standard_item_fields?.image_url, 'Standard image_url authoring contract is missing.');
assert.ok(kit.image_support_contract?.standard_item_fields?.visuals, 'Multi-visual authoring contract is missing.');
assert.equal(kit.activity_pedagogy_audit['Picture Detective']?.image_support, 'required');
assert.equal(kit.activity_pedagogy_audit['Mini Map Mission']?.image_support, 'required');
assert.equal(kit.activity_pedagogy_audit['What Changed?']?.image_support, 'recommended');
for (const [title, profile] of Object.entries(kit.activity_pedagogy_audit || {})) {
  assert.deepEqual(profile.supported_levels, ['A0','A1','A1+','A2','B1','B1+','B2','C1','C2'], 'Activity support must remain universal: ' + title);
  assert.ok(profile.recommended_levels?.length, 'Recommended level ranking missing: ' + title);
  assert.ok(['S','A','B'].includes(profile.importance), 'Importance ranking missing: ' + title);
  assert.ok(['required','recommended','optional','none'].includes(profile.image_support), 'Image support classification missing: ' + title);
}
assert.ok(kit.quality_assurance?.per_item_gate?.length >= 10, 'Per-item authoring QA is incomplete.');
assert.ok(kit.quality_assurance?.per_batch_gate?.length >= 8, 'Per-batch authoring QA is incomplete.');
assert.ok(kit.common_failure_modes?.length >= 8, 'Common failure-mode guidance is incomplete.');
assert.ok(kit.ai_forbidden_actions?.length >= 8, 'AI forbidden-action guidance is incomplete.');
assert.ok(kit.standard_item_examples?.length >= 3, 'Standard speaking items need completed examples.');
assert.ok(kit.final_self_review_algorithm?.length >= 10, 'Final author self-review algorithm is incomplete.');

for (const format of ['number_mission','picture_detective','explain_without_saying','conversation_detective','make_the_choice']) {
  assert.ok(kit.structured_format_specs?.[format], 'Missing detailed structured format specification: ' + format);
  assert.ok(kit.structured_format_specs[format].authoring_rules?.length >= 3, 'Structured format guidance is too thin: ' + format);
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
assert.ok(editor.includes('levels: [...ALL_SPEAKING_LEVELS]'), 'Manual activity saves must keep every game A0-C2.');
assert.ok(importer.includes('levels: [...ALL_SPEAKING_LEVELS]'), 'Imported item batches must not narrow activity availability.');
assert.ok(importer.includes('const fallbackLevels = [];'), 'Imports without item levels must not silently inherit A0-C2.');

console.log('Speaking authoring kit, import and manual editor parity validated.');
