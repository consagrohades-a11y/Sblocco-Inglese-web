import fs from 'node:fs';
import assert from 'node:assert/strict';

const migrationPath = 'supabase/migrations/20260813084734_recovery_curriculum_v2_fragment_import_resolver.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');
const rpcHotfixMigrationPath = 'supabase/migrations/20260814152500_recovery_checkpoint_rpc_name.sql';
const rpcHotfixSql = fs.readFileSync(rpcHotfixMigrationPath, 'utf8');
const adminRecoverySource = fs.readFileSync('src/pages/AdminRecoveryContent.jsx', 'utf8');
const canonicalCheckpointRpc = 'admin_register_recovery_checkpoint_manifest';
const impossibleCheckpointRpc = 'admin_register_recovery_assessment_fragment_manifest_from_import';

for (const marker of [
  'admin_resolve_recovery_assessment_fragment_from_import',
  'admin_register_recovery_assessment_fragment_from_import',
  'admin_register_recovery_assessment_fragment_manifest_from_import',
  'if not public.is_admin()',
  'item.batch_id = p_batch_id',
  'item.client_key = v_exercise_client_key',
  "item.entity_type = 'exercise'",
  'v_item.promoted_entity_id',
  'v_exercise.current_version_id',
  'v_version.source_import_item_id is distinct from v_item.id',
  "v_item.payload -> 'sections'",
  "sections.section -> 'questions'",
  'with ordinality sections(section, section_ordinality)',
  'with ordinality questions(question, question_ordinality)',
  'section.sequence_index = v_section_index',
  'fixed.sequence_index = v_question_index',
  'v_question_version.source_import_item_id is distinct from v_item.id',
  "'question_version_id', v_question_version_id",
  "'source_section_index', v_section_index",
  "'source_question_index', v_question_index",
  "'source_resolver', 'recovery-v2-fragment-import-resolver-v1'",
  'public.admin_register_recovery_assessment_fragment(v_resolved)',
  'v_batch.invalid_count > 0',
  "'readiness_v2_active', false"
]) {
  assert.ok(sql.includes(marker), `Missing resolver contract marker: ${marker}`);
}

assert.ok(!/question_version\.prompt\s*=|question_version\.title\s*=|ilike\s+[^;]*(prompt|title)/i.test(sql), 'Resolver must never match immutable questions by prompt/title text.');
assert.ok(!/levenshtein|similarity\s*\(/i.test(sql), 'Resolver must not use fuzzy text matching.');

assert.match(sql, /Pool\/question_ref resolution is intentionally unsupported/);
assert.ok(sql.includes('exercise_builder_section_fixed_questions'));
assert.ok(!sql.includes('exercise_builder_pool_questions'));
assert.ok(!sql.includes('exercise_builder_section_pool_rules'));

assert.match(sql, /section_ordinality\s*-\s*1/);
assert.match(sql, /question_ordinality\s*-\s*1/);

assert.equal((sql.match(/public\.admin_register_recovery_assessment_fragment\(v_resolved\)/g) || []).length, 1);
assert.ok(!/insert\s+into\s+public\.recovery_assessment_fragments/i.test(sql), 'Resolver must not bypass the canonical guarded fragment registrar.');

assert.ok(!/create or replace function public\.get_recovery_readiness\s*\(/i.test(sql));
assert.ok(!/create or replace function public\.materialize_recovery_session\s*\(/i.test(sql));

assert.ok(Buffer.byteLength(impossibleCheckpointRpc, 'utf8') > 63, 'Historical checkpoint RPC should remain an explicit regression case for PostgreSQL identifier truncation.');
assert.ok(Buffer.byteLength(canonicalCheckpointRpc, 'utf8') <= 63, 'Canonical checkpoint RPC must fit PostgreSQL identifiers.');
assert.ok(!adminRecoverySource.includes(impossibleCheckpointRpc), 'Recovery Admin runtime must not call the impossible over-63-byte checkpoint RPC name.');
assert.ok(adminRecoverySource.includes(`supabase.rpc(\n        '${canonicalCheckpointRpc}'`), 'Recovery Admin must call the canonical checkpoint manifest RPC.');

assert.match(
  rpcHotfixSql,
  /alter function public\.admin_register_recovery_assessment_fragment_manifest_from_impor\s*\(\s*uuid\s*,\s*jsonb\s*\)\s*rename to admin_register_recovery_checkpoint_manifest\s*;/i,
);
assert.match(
  rpcHotfixSql,
  /revoke all on function public\.admin_register_recovery_checkpoint_manifest\s*\(\s*uuid\s*,\s*jsonb\s*\)\s*from public\s*,\s*anon\s*;/i,
);
assert.match(
  rpcHotfixSql,
  /grant execute on function public\.admin_register_recovery_checkpoint_manifest\s*\(\s*uuid\s*,\s*jsonb\s*\)\s*to authenticated\s*;/i,
);
assert.match(rpcHotfixSql, /notify pgrst\s*,\s*'reload schema'\s*;/i);

const recoveryRuntimeSources = [];
function collectRecoveryRuntimeSources(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      collectRecoveryRuntimeSources(path);
      continue;
    }
    if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name) && /recovery/i.test(path)) {
      recoveryRuntimeSources.push(path);
    }
  }
}
collectRecoveryRuntimeSources('src');
assert.ok(recoveryRuntimeSources.includes('src/pages/AdminRecoveryContent.jsx'));

const rpcLiteralPattern = /\.rpc\(\s*(['"])([^'"]+)\1/g;
for (const sourcePath of recoveryRuntimeSources) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  for (const match of source.matchAll(rpcLiteralPattern)) {
    const rpcName = match[2];
    assert.ok(
      Buffer.byteLength(rpcName, 'utf8') <= 63,
      `${sourcePath}: Recovery RPC identifier exceeds PostgreSQL's 63-byte limit: ${rpcName}`,
    );
  }
}

console.log('Recovery v2 fragment import resolver validation passed: source client keys resolve by immutable import provenance + fixed 0-based position.');
