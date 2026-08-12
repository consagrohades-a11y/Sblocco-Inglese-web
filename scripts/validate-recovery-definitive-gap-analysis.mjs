import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const ROOT = 'content/recovery/curriculum-v2';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const plan = readJson(`${ROOT}/gap-analysis.json`);
const pedagogical = readJson(`${ROOT}/gap-analysis-pedagogical.json`);
const technical = readJson(`${ROOT}/gap-analysis-technical.json`);
const readiness = readJson(`${ROOT}/readiness-policy.json`);
const blueprint = readJson(`${ROOT}/assessment-blueprint.json`);
const year1 = readJson(`${ROOT}/years/year-1.json`);
const year2 = readJson(`${ROOT}/years/year-2.json`);
const year3 = readJson(`${ROOT}/years/year-3.json`);

assert.equal(plan.schema_version, 1);
assert.equal(plan.curriculum_id, 'recovery-years-1-3-v2');
assert.equal(plan.plan_id, 'recovery-curriculum-v2-definitive-gap-analysis');
assert.equal(plan.status, 'active_planning_contract');

for (const input of plan.authoritative_inputs || []) {
  assert.ok(existsSync(input), `Definitive gap analysis references missing input ${input}`);
}
assert.ok(plan.authoritative_inputs.includes(`${ROOT}/gap-analysis-pedagogical.json`));
assert.ok(plan.authoritative_inputs.includes(`${ROOT}/gap-analysis-technical.json`));
assert.ok(plan.authoritative_inputs.includes(`${ROOT}/readiness-policy.json`));
assert.ok(plan.authoritative_inputs.includes(`${ROOT}/assessment-blueprint.json`));

const totalOutcomes = year1.outcomes.length + year2.outcomes.length + year3.outcomes.length;
assert.equal(totalOutcomes, 63);
assert.deepEqual(plan.current_state.curriculum_v2_outcomes, {
  total: 63,
  year_1: 21,
  year_2: 19,
  year_3: 23,
});
assert.equal(plan.current_state.pedagogical_coverage.covered, pedagogical.summary.covered);
assert.equal(plan.current_state.pedagogical_coverage.partially_covered, pedagogical.summary.partially_covered);
assert.equal(plan.current_state.pedagogical_coverage.missing, pedagogical.summary.missing);
assert.equal(plan.current_state.pedagogical_coverage.weighted_planning_coverage_percent, pedagogical.summary.weighted_coverage_percent);
assert.match(plan.current_state.pedagogical_coverage.note, /not a readiness score/i);

for (const [axis, details] of Object.entries(pedagogical.coverage_by_competence_axis)) {
  assert.equal(plan.current_state.coverage_by_axis_percent[axis], details.weighted_coverage_percent, `Axis coverage mismatch for ${axis}`);
}
for (const [year, details] of Object.entries(pedagogical.coverage_by_year)) {
  assert.equal(plan.current_state.coverage_by_year_percent[year], details.weighted_coverage_percent, `Year coverage mismatch for ${year}`);
}

assert.equal(plan.current_state.live_topic_layer.topics, technical.production_inventory.recovery_topic_content.active_topic_count);
assert.equal(plan.current_state.live_topic_layer.active_phase_mappings, 96);
assert.equal(plan.current_state.live_topic_layer.wave_1_runtime_minutes_per_topic, 48);
assert.match(plan.current_state.live_topic_layer.note, /production mapping state is authoritative/i);

assert.equal(plan.current_state.cumulative_assessment_layer.checkpoint_fragments_live, 0);
assert.equal(plan.current_state.cumulative_assessment_layer.mock_intermediate_fragments_live, 0);
assert.equal(plan.current_state.cumulative_assessment_layer.mock_final_fragments_live, 0);
assert.equal(plan.current_state.runtime_foundation.competence_axes_seeded, 6);
assert.equal(plan.current_state.runtime_foundation.assessment_modes_seeded, 15);
assert.equal(plan.current_state.runtime_foundation.curriculum_outcomes_seeded, 0);
assert.equal(plan.current_state.runtime_foundation.enrollment_outcomes_created, 0);
assert.equal(plan.current_state.runtime_foundation.assessment_fragments_created, 0);
assert.equal(plan.current_state.runtime_foundation.outcome_evidence_created, 0);
assert.equal(plan.current_state.runtime_foundation.status, 'schema_available_but_inert');
assert.equal(readiness.runtime_status, 'contract_only_not_yet_active');
assert.equal(plan.current_state.readiness.v2_runtime_active, false);

const prerequisiteRecommendations = plan.cross_year_prerequisite_alignment.recommendations || [];
assert.equal(prerequisiteRecommendations.length, pedagogical.cross_year_prerequisite_recommendations.length);
const pedagogicalPrereqIds = new Set(pedagogical.cross_year_prerequisite_recommendations.map((item) => item.outcome_id));
for (const item of prerequisiteRecommendations) {
  assert.ok(pedagogicalPrereqIds.has(item.outcome_id), `Unknown prerequisite recommendation ${item.outcome_id}`);
  assert.ok(Array.isArray(item.add) && item.add.length > 0, `${item.outcome_id}: empty prerequisite addition`);
}
assert.match(plan.cross_year_prerequisite_alignment.optionality_guard, /default_core/i);
assert.match(plan.cross_year_prerequisite_alignment.optionality_guard, /default_if_assessed|programme_dependent/i);

const expectedP0Grammar = [
  'be-have-got-there-is-are',
  'past-simple-vs-past-continuous',
  'present-perfect-time-expressions',
  'zero-first-conditionals',
  'second-conditional',
  'relative-clauses',
  'used-to',
  'passive-voice',
];
assert.deepEqual(plan.grammar_content_backlog.P0_must_build, expectedP0Grammar);
const auditGrammarMap = new Map((pedagogical.missing_grammar_topics || []).map((item) => [item.topic_key, item]));
for (const key of expectedP0Grammar) {
  const auditTopic = auditGrammarMap.get(key);
  assert.ok(auditTopic, `P0 grammar topic ${key} missing from pedagogical audit`);
  assert.equal(auditTopic.priority, 'P0');
  assert.equal(auditTopic.build_requirement, 'must_build');
}

const families = plan.missing_content_families || [];
assert.ok(families.length >= 12);
const familyIds = new Set(families.map((family) => family.family_id));
for (const requiredFamily of [
  'cumulative_assessment_fragment_pool',
  'mixed_grammar_year_exit_transfer',
  'translation_it_en_progression',
  'lexical_core_domains_and_chunks',
  'reading_progression_years_1_3',
  'year1_connected_writing_core',
  'school_task_format_fragment_library',
  'listening_progression_years_1_3',
  'functional_interaction_clarification_repair',
]) {
  assert.ok(familyIds.has(requiredFamily), `Definitive gap analysis missing content family ${requiredFamily}`);
}
const listeningFamily = families.find((family) => family.family_id === 'listening_progression_years_1_3');
assert.equal(listeningFamily.global_priority, 'P2');
assert.match(listeningFamily.conditional_escalation, /P0/i);
const functionalFamily = families.find((family) => family.family_id === 'functional_interaction_clarification_repair');
assert.match(functionalFamily.conditional_escalation, /P0/i);

assert.ok((plan.technical_backlog.completed_foundation || []).length >= 5);
const runtimeP0 = plan.technical_backlog.P0_remaining || [];
assert.deepEqual(runtimeP0.map((item) => item.id), [
  'RUNTIME-P0-001',
  'RUNTIME-P0-002',
  'RUNTIME-P0-003',
  'RUNTIME-P0-004',
  'RUNTIME-P0-005',
  'RUNTIME-P0-006',
]);
assert.match(runtimeP0.find((item) => item.id === 'RUNTIME-P0-006')?.title || '', /shadow mode/i);

const batches = plan.implementation_sequence || [];
assert.deepEqual(batches.map((batch) => batch.batch), ['B0','B1','B2','B3','B4','B5','B6','B7','B8','B9']);
assert.equal(batches[0].name, 'Dependency graph + runtime catalogue');
assert.equal(batches[9].name, 'Readiness v2 learner-facing activation');
assert.match(batches[9].exit_condition, /product content gaps as learner failure/i);

assert.ok((plan.readiness_v2_activation_gates || []).length >= 9);
assert.ok(plan.readiness_v2_activation_gates.some((rule) => /63 source-controlled outcomes synchronized/i.test(rule)));
assert.ok(plan.readiness_v2_activation_gates.some((rule) => /Shadow Readiness v2/i.test(rule)));
assert.ok(plan.readiness_v2_activation_gates.some((rule) => /manual responses as pending review rather than zero/i.test(rule)));

assert.ok(plan.first_release_definition.conditional_axes.includes('listening'));
assert.ok(plan.first_release_definition.conditional_axes.includes('functional_communication'));
assert.match(plan.first_release_definition.important_rule, /missing content\/evidence blocks READY/i);

const allDecisionText = (plan.decision_rules || []).join(' ');
assert.match(allDecisionText, /official school recovery programme/i);
assert.match(allDecisionText, /Renderer or database capability is not pedagogical coverage/i);
assert.match(allDecisionText, /Topic completion and topic verification remain supporting evidence/i);
assert.match(allDecisionText, /Do not activate Readiness v2/i);
assert.match(allDecisionText, /Do not create a second exercise engine/i);

assert.ok(blueprint.assessment_fragment_contract);
assert.equal(technical.final_gap_analysis_merge_contract.final_output, `${ROOT}/gap-analysis.json`);

console.log('Definitive Recovery Curriculum v2 gap analysis validation passed.');
