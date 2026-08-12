import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260812144057_recovery_wave_mapping_sync.sql', 'utf8');
const page = readFileSync('src/pages/AdminRecoveryContent.jsx', 'utf8');
const api = readFileSync('src/lib/exerciseBuilderApi.js', 'utf8');

// Mapping provenance is explicit so manual mappings can safely override managed Wave mappings.
assert.match(migration, /mapping_source text not null default 'manual'/);
assert.match(migration, /source_import_item_id uuid references public\.exercise_builder_import_items/);
assert.match(migration, /mapping_source in \('manual', 'recovery_wave_import'\)/);
assert.match(migration, /create or replace function public\.admin_sync_recovery_wave_mappings\(\)/);
assert.match(migration, /batch\.source_name like 'recovery-wave-1:%'/);
assert.match(migration, /exercise\.status = 'published'/);
assert.match(migration, /version\.review_status = 'approved'/);
assert.match(migration, /manual\.mapping_source = 'manual'/);
assert.match(migration, /managed\.mapping_source = 'recovery_wave_import'/);

// Admin import discovers repository bundles automatically and passes through the real validator/import pipeline.
assert.match(page, /import\.meta\.glob\([\s\S]*content\/recovery\/wave-1\/\*\.bundle\.json/);
assert.match(page, /validateExerciseBuilderJson\(entry\.bundle\)/);
assert.match(page, /createExerciseBuilderImportBatch\(/);
assert.match(page, /listExerciseBuilderImportItems\(/);
assert.match(page, /promoteExerciseBuilderImportItems\(/);
assert.match(page, /recovery-wave-1:\$\{entry\.fileName\}:\$\{hash\}/);
assert.match(page, /admin_sync_recovery_wave_mappings/);
assert.match(page, /mapping_source: 'manual'/);

// A changed bundle receives a new hash/source name; an identical bundle reuses the prior batch.
assert.match(page, /crypto\.subtle\.digest\('SHA-256'/);
assert.match(page, /findExistingBatch\(sourceName\)/);
assert.match(page, /if \(!batch\)[\s\S]*createExerciseBuilderImportBatch/);

// Import may create reviewable Exercise Builder entities, but publication must remain an explicit editorial step.
assert.doesNotMatch(page, /\.from\(['"]exercise_builder_exercises['"]\)\s*\.insert/);
assert.doesNotMatch(page, /\.from\(['"]exercise_builder_exercise_versions['"]\)\s*\.insert/);
assert.doesNotMatch(page, /status\s*:\s*['"]published['"]/);
assert.doesNotMatch(page, /review_status\s*:\s*['"]approved['"]/);
assert.doesNotMatch(page, /\.update\([^)]*published/);
assert.doesNotMatch(page, /\.update\([^)]*approved/);

// The shared API exposes import items rather than making the Recovery page duplicate import-table logic.
assert.match(api, /export async function listExerciseBuilderImportItems\(batchId\)/);
assert.match(api, /promote_exercise_builder_import_batch/);

console.log('Recovery Wave import pipeline validation passed.');
