import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = 'content/recovery/curriculum-v2';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const policy = readJson(`${ROOT}/readiness-policy.json`);
const meta = readJson(`${ROOT}/curriculum-meta.json`);
const blueprint = readJson(`${ROOT}/assessment-blueprint.json`);
const axes = readJson(`${ROOT}/competence-axes.json`).axes || [];
const planner = readFileSync('src/lib/recoveryPlanEngine.js', 'utf8');

const axisKeys = axes.map((axis) => axis.key);
const evidenceSourceKeys = (blueprint.evidence_sources || []).map((source) => source.key);

assert.equal(policy.schema_version, 1);
assert.equal(policy.curriculum_id, meta.curriculum_id);
assert.equal(policy.policy_id, 'recovery-readiness-v2');
assert.equal(policy.status, 'draft');
assert.equal(policy.runtime_status, 'contract_only_not_yet_active');
assert.ok(Array.isArray(policy.principles) && policy.principles.length >= 8);
assert.ok(policy.principles.some((rule) => /official school recovery programme/i.test(rule)));
assert.ok(policy.principles.some((rule) => /Topic verification is supporting evidence/i.test(rule)));
assert.ok(policy.principles.some((rule) => /cannot fully compensate/i.test(rule)));
assert.ok(policy.principles.some((rule) => /SOS mode/i.test(rule) && /does not lower READY thresholds/i.test(rule)));

const activation = policy.programme_activation || {};
assert.match(activation.source_of_truth || '', /official school recovery programme/i);
assert.ok(activation.programme_requirement_rules?.default_core);
assert.ok(activation.programme_requirement_rules?.default_if_assessed);
assert.ok(activation.programme_requirement_rules?.programme_dependent);
assert.match(activation.inactive_axis_rule || '', /excluded/i);

const evidence = policy.evidence_eligibility || {};
assert.deepEqual(evidence.eligible_sources, evidenceSourceKeys, 'Readiness evidence sources must match assessment blueprint sources exactly.');
const sourceWeights = evidence.source_weights || {};
assert.deepEqual(Object.keys(sourceWeights), evidenceSourceKeys);
for (const key of evidenceSourceKeys) {
  assert.ok(sourceWeights[key] > 0 && sourceWeights[key] <= 1, `Invalid source weight for ${key}`);
}
assert.ok(sourceWeights.topic_verify < sourceWeights.checkpoint);
assert.ok(sourceWeights.checkpoint <= sourceWeights.mock_intermediate);
assert.ok(sourceWeights.mock_intermediate <= sourceWeights.mock_final);
assert.equal(evidence.minimum_evidence_per_required_blocking_outcome?.independent_observations, 2);
assert.equal(evidence.minimum_evidence_per_required_blocking_outcome?.minimum_cumulative_transfer_observations, 1);
assert.equal(evidence.minimum_evidence_per_other_required_outcome?.minimum_cumulative_transfer_observations, 1);
assert.match(evidence.retry_rule || '', /latest valid attempt/i);
assert.match(evidence.independent_evidence_definition || '', /distinct assessment form|substantially transformed/i);

const outcome = policy.outcome_scoring || {};
assert.deepEqual(outcome.score_scale, { minimum: 0, maximum: 100 });
assert.equal(outcome.blocking_outcome_weight_in_axis, 2);
assert.equal(outcome.other_required_outcome_weight_in_axis, 1);
assert.ok(outcome.maximum_evidence_observations_used >= 2);
for (const cap of Object.values(outcome.evidence_integrity_caps || {})) {
  assert.ok(cap < 70, 'Evidence-integrity cap must stay below the acceptable/READY evidence band.');
}
assert.equal(outcome.bands.secure.minimum, 80);
assert.equal(outcome.bands.acceptable.minimum, 70);
assert.equal(outcome.bands.fragile.minimum, 60);
assert.equal(outcome.bands.critical.maximum, 59);

const axis = policy.axis_scoring || {};
assert.ok(axis.ready_minimum >= 70);
assert.ok(axis.strong_minimum > axis.ready_minimum);
assert.ok(axis.blocking_outcome_floor >= 65);
assert.ok(axis.maximum_share_of_blocking_outcomes_below_acceptable >= 0);
assert.ok(axis.maximum_share_of_blocking_outcomes_below_acceptable <= 0.2);
assert.match(axis.critical_rule || '', /fails its READY gate/i);

const overall = policy.overall_scoring || {};
const defaultWeights = overall.default_axis_weights || {};
assert.deepEqual(Object.keys(defaultWeights), axisKeys, 'Default readiness weights must cover exactly the canonical competence axes.');
const totalWeight = Object.values(defaultWeights).reduce((sum, value) => sum + Number(value), 0);
assert.ok(Math.abs(totalWeight - 1) < 1e-9, `Default axis weights must sum to 1, got ${totalWeight}`);
assert.ok(defaultWeights.grammar_sentence_control <= overall.default_grammar_weight_ceiling);
assert.ok(overall.default_grammar_weight_ceiling <= 0.35);
assert.equal(overall.bands.ready.minimum, 75);
assert.equal(overall.bands.strong_ready.minimum, 85);
assert.equal(overall.bands.near_ready.minimum, 65);
assert.equal(overall.bands.not_ready.maximum, 64);

const completeness = policy.evidence_completeness_gates || {};
assert.equal(completeness.required_blocking_outcomes_with_valid_evidence_ratio, 1);
assert.ok(completeness.all_required_outcomes_with_valid_evidence_ratio >= 0.85);
assert.equal(completeness.every_active_blocking_axis_requires_cumulative_transfer_evidence, true);
assert.equal(completeness.every_active_blocking_axis_must_be_sampled_in_final_mock, true);
assert.equal(completeness.missing_evidence_status, 'insufficient_evidence');

const finalMock = policy.final_mock_gate || {};
assert.equal(finalMock.required_for_ready, true);
assert.ok(finalMock.minimum_normalized_score >= 70);
assert.ok(finalMock.strong_ready_minimum_normalized_score >= 80);
assert.equal(finalMock.must_use_fresh_form, true);
assert.match(finalMock.global_score_role || '', /never overrides/i);

const decision = policy.ready_decision || {};
assert.ok(Array.isArray(decision.ready_requires_all) && decision.ready_requires_all.length >= 8);
assert.ok(decision.ready_requires_all.some((rule) => /overall readiness score >= 75/i.test(rule)));
assert.ok(decision.ready_requires_all.some((rule) => /no required blocking outcome score < 65/i.test(rule)));
assert.ok(decision.ready_requires_all.some((rule) => /final mock completed/i.test(rule) && />= 70/i.test(rule)));
assert.ok(Array.isArray(decision.strong_ready_requires_all) && decision.strong_ready_requires_all.length >= 4);

const compensation = policy.compensation_rules || {};
assert.ok(Array.isArray(compensation.allowed) && compensation.allowed.length >= 2);
assert.ok(Array.isArray(compensation.prohibited) && compensation.prohibited.length >= 4);
assert.ok(compensation.prohibited.some((rule) => /grammar score/i.test(rule) && /writing|reading|listening|functional/i.test(rule)));
assert.ok(compensation.prohibited.some((rule) => /global mock score/i.test(rule) && /below 65/i.test(rule)));
assert.ok(compensation.prohibited.some((rule) => /Topic completion|topic-verify/i.test(rule)));

const statuses = policy.status_model || [];
assert.deepEqual(statuses.map((entry) => entry.key), [
  'insufficient_evidence',
  'not_ready',
  'near_ready',
  'ready',
  'strong_ready',
]);
statuses.forEach((entry) => {
  assert.ok(entry.label_it && entry.meaning);
});

const reporting = policy.reporting_contract || {};
for (const field of [
  'status',
  'overall_readiness_score',
  'active_axes',
  'axis_scores',
  'required_outcome_scores',
  'evidence_completeness',
  'blocking_outcomes',
  'blocking_axes',
  'final_mock_score',
  'missing_evidence',
  'next_priority_outcomes',
]) {
  assert.ok(reporting.required_outputs?.includes(field), `Readiness reporting contract missing ${field}`);
}
assert.match(reporting.learner_facing_rule || '', /Never present a single percentage/i);

const migration = policy.runtime_migration || {};
assert.match(migration.legacy_runtime || '', /simple average/i);
assert.ok(Array.isArray(migration.activation_preconditions) && migration.activation_preconditions.length >= 6);
assert.ok(migration.activation_preconditions.some((item) => /gap analysis completed/i.test(item)));
assert.ok(migration.activation_preconditions.some((item) => /P0 evidence content/i.test(item)));
assert.ok(migration.activation_preconditions.some((item) => /shadow comparison/i.test(item)));
assert.match(migration.cutover_rule || '', /Do not replace the legacy learner-facing readiness calculation/i);

// Guard the current runtime from an accidental silent v2 cutover while the policy is contract-only.
assert.match(planner, /calculateRecoveryReadiness\(topicStates = \[\]\)/);
assert.match(planner, /masteryScore \?\? topic\.diagnosticScore/);

console.log('Recovery Curriculum v2 readiness policy validation passed.');
