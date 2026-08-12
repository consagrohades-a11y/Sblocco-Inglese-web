import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = 'content/recovery/curriculum-v2';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const audit = readJson(`${ROOT}/gap-analysis-technical.json`);
const meta = readJson(`${ROOT}/curriculum-meta.json`);
const blueprint = readJson(`${ROOT}/assessment-blueprint.json`);
const readiness = readJson(`${ROOT}/readiness-policy.json`);
const schema = readFileSync('src/lib/exerciseBuilderSchemaV2.js', 'utf8');
const listening = readFileSync('src/lib/listeningComprehension.js', 'utf8');
const planner = readFileSync('src/lib/recoveryPlanEngine.js', 'utf8');

assert.equal(audit.schema_version, 1);
assert.equal(audit.curriculum_id, meta.curriculum_id);
assert.equal(audit.audit_id, 'recovery-curriculum-v2-technical-gap-analysis');
assert.equal(audit.status, 'draft');
assert.match(audit.scope || '', /Technical capability/i);
assert.match(audit.scope || '', /Pedagogical coverage/i);

const inventory = audit.production_inventory || {};
assert.equal(inventory.recovery_topic_content?.active_topic_count, 24);
assert.deepEqual(inventory.recovery_topic_content?.active_phase_mappings, {
  recover: 24,
  practice: 24,
  school: 24,
  verify: 24,
  checkpoint: 0,
  mock_intermediate: 0,
  mock_final: 0,
  error_review: 0,
});

const capabilities = inventory.exercise_builder_capabilities || {};
for (const type of ['translation', 'written_response', 'dialogue_roleplay', 'audio_response', 'reading_comprehension']) {
  assert.ok(capabilities.supported_relevant_question_types?.includes(type), `Technical audit missing supported type ${type}`);
  assert.ok(schema.includes(`'${type}'`), `Exercise Builder no longer supports ${type}; update technical audit`);
}
assert.ok(capabilities.supported_relevant_question_types?.includes('listening_comprehension_via_native_bridge'));
assert.match(listening, /LISTENING_COMPREHENSION_TEMPLATE_KEY = 'listening_comprehension'/);

assert.equal(inventory.exercise_builder_published_question_inventory?.listening?.published_current_question_versions, 0);
assert.equal(inventory.exercise_builder_published_question_inventory?.listening?.engine_support_exists, true);

const evidence = inventory.current_recovery_evidence_storage || {};
assert.equal(evidence.recovery_mastery_evidence?.key_dimension, 'topic_key');
for (const field of ['outcome_id', 'primary_axis', 'assessment_mode']) {
  assert.ok(evidence.recovery_mastery_evidence?.missing_first_class_dimensions?.includes(field));
}
assert.ok(evidence.recovery_assessment_attempts?.missing?.includes('axis_scores'));
assert.ok(evidence.recovery_assessment_attempts?.missing?.includes('outcome_scores'));

assert.match(inventory.legacy_readiness_divergence?.client_runtime || '', /simple average/i);
assert.match(inventory.legacy_readiness_divergence?.database_runtime || '', /topic-based/i);
assert.match(planner, /calculateRecoveryReadiness\(topicStates = \[\]\)/);

const gaps = audit.technical_gaps || [];
assert.ok(gaps.length >= 10);
const ids = gaps.map((gap) => gap.gap_id);
assert.equal(new Set(ids).size, ids.length, 'Technical gap IDs must be unique.');
for (const gap of gaps) {
  assert.ok(['P0', 'P1', 'P2'].includes(gap.priority), `${gap.gap_id}: invalid priority`);
  assert.ok(gap.area && gap.title && gap.current_state && gap.required_state, `${gap.gap_id}: incomplete gap contract`);
  assert.ok(Array.isArray(gap.recommended_implementation) && gap.recommended_implementation.length >= 1, `${gap.gap_id}: missing implementation recommendation`);
}

for (const requiredP0 of ['TECH-P0-001', 'TECH-P0-002', 'TECH-P0-003', 'TECH-P0-004', 'TECH-P0-005', 'TECH-P0-006', 'TECH-P0-007']) {
  const gap = gaps.find((item) => item.gap_id === requiredP0);
  assert.ok(gap, `Missing required technical blocker ${requiredP0}`);
  assert.equal(gap.priority, 'P0');
  assert.equal(gap.blocking_for_readiness_v2, true);
}

const cumulative = gaps.find((gap) => gap.gap_id === 'TECH-P0-004');
assert.match(cumulative?.recommended_implementation?.join(' ') || '', /Reuse the current assignment\/session materialization flow/i);
const evidenceGap = gaps.find((gap) => gap.gap_id === 'TECH-P0-002');
assert.match(evidenceGap?.recommended_implementation?.join(' ') || '', /dedicated recovery_outcome_evidence table/i);

const batches = audit.recommended_implementation_batches || [];
assert.deepEqual(batches.map((batch) => batch.batch), ['T1', 'T2', 'T3', 'T4', 'T5']);
assert.equal(batches[0].priority, 'P0');
assert.equal(batches[3].title, 'Shadow Readiness v2');

const reuse = new Map((audit.reuse_decisions || []).map((item) => [item.component, item.decision]));
assert.equal(reuse.get('Exercise Builder renderer/schema'), 'reuse');
assert.equal(reuse.get('Recovery cumulative session/assignment materializer'), 'extend');
assert.equal(reuse.get('recovery_exercise_map'), 'retain_for_topic_phases');
assert.equal(reuse.get('legacy readiness'), 'shadow_then_replace');

const merge = audit.final_gap_analysis_merge_contract || {};
assert.equal(merge.final_output, 'content/recovery/curriculum-v2/gap-analysis.json');
for (const requiredInput of ['gap-analysis-pedagogical.json', 'gap-analysis-technical.json', 'readiness-policy.json', 'assessment-blueprint.json']) {
  assert.ok(merge.inputs_required?.includes(requiredInput), `Final merge contract missing ${requiredInput}`);
}
assert.ok(merge.merge_rules?.some((rule) => /renderer supports/i.test(rule) && /Recovery coverage/i.test(rule)));

assert.equal(readiness.runtime_status, 'contract_only_not_yet_active');
assert.ok(blueprint.assessment_fragment_contract);

console.log('Recovery Curriculum v2 technical gap analysis validation passed.');
