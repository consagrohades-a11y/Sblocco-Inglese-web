import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/pages/AdminRecoveryContent.jsx', 'utf8');

assert.match(source, /async function publishValidatedRecoveryWave\(\)/, 'missing explicit Wave 1 publish action');
assert.match(source, /window\.confirm\(/, 'Wave 1 production publish must require explicit confirmation');
assert.match(source, /validateExerciseBuilderJson\(entry\.bundle\)/, 'publish path must use the real Exercise Builder validator');
assert.match(source, /isTopicReady\(mappings, entry\.topicKey\)/, 'publish path must skip already-covered topics');
assert.match(source, /item\.entity_type === 'exercise'/, 'publish path must scope publication to exercise import items');
assert.match(source, /admin_set_exercise_builder_status/, 'publish path must use the canonical Exercise Builder status RPC');
assert.match(source, /p_entity_type: 'exercise'/, 'publish path must only publish exercise entities');
assert.match(source, /p_next_status: 'published'/, 'publish path must explicitly request published status');
assert.match(source, /admin_sync_recovery_wave_mappings/, 'publish path must sync Recovery mappings after publication');
assert.match(source, /Pubblica Wave 1 validata/, 'admin must expose an explicit production publish control');
assert.equal((source.match(/publishValidatedRecoveryWave/g) || []).length, 2, 'publish action should only be defined and wired to its button');

console.log('Recovery Wave 1 explicit publish validation passed.');
