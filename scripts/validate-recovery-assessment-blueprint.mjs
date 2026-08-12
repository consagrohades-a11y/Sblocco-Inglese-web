import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = 'content/recovery/curriculum-v2';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const blueprint = readJson(`${ROOT}/assessment-blueprint.json`);
const meta = readJson(`${ROOT}/curriculum-meta.json`);
const axes = readJson(`${ROOT}/competence-axes.json`).axes || [];
const modes = readJson(`${ROOT}/assessment-modes.json`).modes || [];
const planner = readFileSync('src/lib/recoveryPlanEngine.js', 'utf8');

const axisKeys = new Set(axes.map((axis) => axis.key));
const modeKeys = new Set(modes.map((mode) => mode.key));

assert.equal(blueprint.schema_version, 1);
assert.equal(blueprint.curriculum_id, meta.curriculum_id);
assert.equal(blueprint.status, 'draft');
assert.ok(Array.isArray(blueprint.principles) && blueprint.principles.length >= 6);
assert.ok(blueprint.principles.some((rule) => /official school recovery programme/i.test(rule)));
assert.ok(blueprint.principles.some((rule) => /overall mark/i.test(rule) && /blocking weakness/i.test(rule)));

const sources = blueprint.evidence_sources || [];
const sourceKeys = sources.map((source) => source.key);
assert.deepEqual(sourceKeys, ['topic_verify', 'checkpoint', 'mock_intermediate', 'mock_final']);
sources.forEach((source) => {
  assert.ok(source.label_it && source.role);
  assert.ok(Array.isArray(source.evidence_level) && source.evidence_level.length > 0);
  assert.equal(typeof source.can_satisfy_year_exit_alone, 'boolean');
  assert.equal(source.can_satisfy_year_exit_alone, false, `${source.key} must not declare readiness alone`);
  assert.ok(source.feedback_policy && source.retry_policy && source.reuse_policy);
});

const scope = blueprint.programme_scope_policy || {};
assert.match(scope.source_of_truth || '', /official school recovery programme/i);
assert.match(scope.optional_axis_rule || '', /listening/i);
assert.match(scope.optional_axis_rule || '', /functional_communication/i);

const axisRules = blueprint.axis_coverage_rules || {};
for (const key of ['checkpoint', 'mock_intermediate', 'mock_final']) {
  const rule = axisRules[key];
  assert.ok(rule, `Missing axis coverage rules for ${key}`);
  assert.ok(Number.isInteger(rule.minimum_distinct_primary_axes_when_available));
  assert.ok(rule.minimum_distinct_primary_axes_when_available >= 2);
  assert.ok(rule.grammar_time_share_ceiling_when_multiple_axes_active > 0);
  assert.ok(rule.grammar_time_share_ceiling_when_multiple_axes_active < 1);
  assert.match(rule.exceptions || '', /official|programme|school/i);
}
assert.ok(axisRules.mock_final.grammar_time_share_ceiling_when_multiple_axes_active <= axisRules.mock_intermediate.grammar_time_share_ceiling_when_multiple_axes_active);
assert.ok(axisRules.mock_intermediate.grammar_time_share_ceiling_when_multiple_axes_active <= axisRules.checkpoint.grammar_time_share_ceiling_when_multiple_axes_active);

const sessions = blueprint.session_blueprints || {};
assert.deepEqual(sessions.checkpoint.time_budget_minutes, { complete: 28, intensive: 24, sos: 20 });
assert.deepEqual(sessions.mock_intermediate.time_budget_minutes, { complete: 50, intensive: 45, sos: null });
assert.deepEqual(sessions.mock_final.time_budget_minutes, { complete: 55, intensive: 55, sos: 40 });
assert.equal(sessions.checkpoint.session_type, 'checkpoint');
assert.equal(sessions.mock_intermediate.session_type, 'mock_intermediate');
assert.equal(sessions.mock_final.session_type, 'mock_final');

for (const [key, session] of Object.entries(sessions)) {
  assert.ok(Number.isInteger(session.minimum_fragment_count) && session.minimum_fragment_count >= 3, `${key} minimum_fragment_count`);
  assert.ok(Array.isArray(session.required_properties) && session.required_properties.length >= 5, `${key} required_properties`);
  assert.ok(Array.isArray(session.preferred_assessment_modes) && session.preferred_assessment_modes.length >= 4, `${key} preferred_assessment_modes`);
  for (const mode of session.preferred_assessment_modes) {
    assert.ok(modeKeys.has(mode), `${key} references unknown assessment mode ${mode}`);
  }
}

// The v2 blueprint currently mirrors the Recovery planner's declared cumulative session families.
for (const sessionType of ['checkpoint', 'mock_intermediate', 'mock_final']) {
  assert.ok(planner.includes(`'${sessionType}'`), `Recovery planner no longer contains ${sessionType}; update blueprint and planner together`);
}
assert.ok(planner.includes('28'), 'Recovery planner no longer exposes the complete checkpoint 28-minute budget.');
assert.ok(planner.includes('50'), 'Recovery planner no longer exposes the complete intermediate mock 50-minute budget.');
assert.ok(planner.includes("mode === RECOVERY_MODE.SOS ? 40 : 55"), 'Recovery planner final mock budget drifted from the Curriculum v2 blueprint.');

const fragment = blueprint.assessment_fragment_contract || {};
const fragmentFields = new Set(fragment.required_fields || []);
for (const field of [
  'fragment_id', 'status', 'year_profiles', 'primary_axis', 'secondary_axes', 'outcome_ids',
  'assessment_modes', 'estimated_minutes', 'difficulty_band', 'school_task_family',
  'transfer_level', 'content_source_policy',
]) {
  assert.ok(fragmentFields.has(field), `Assessment fragment contract missing ${field}`);
}
assert.ok(Array.isArray(fragment.selection_rules) && fragment.selection_rules.length >= 4);

const schoolTaskFamilies = new Set(blueprint.school_task_families || []);
for (const requiredFamily of ['mixed_grammar', 'translation_it_en', 'reading_text', 'independent_writing', 'listening_dialogue']) {
  assert.ok(schoolTaskFamilies.has(requiredFamily), `Missing school task family ${requiredFamily}`);
}

const antiFalseReadiness = blueprint.anti_false_readiness_rules || [];
assert.ok(antiFalseReadiness.length >= 5);
assert.ok(antiFalseReadiness.some((rule) => /topic_verify/i.test(rule) && /not yet demonstrated/i.test(rule)));
assert.ok(antiFalseReadiness.some((rule) => /global mock/i.test(rule) && /blocking/i.test(rule)));
assert.ok(antiFalseReadiness.some((rule) => /not part of the student's programme/i.test(rule)));

const readinessInterface = blueprint.future_readiness_interface || {};
assert.ok(Array.isArray(readinessInterface.blueprint_outputs) && readinessInterface.blueprint_outputs.includes('outcome_id'));
assert.ok(readinessInterface.blueprint_outputs.includes('primary_axis'));
assert.ok(readinessInterface.blueprint_outputs.includes('unseen_or_mixed_context_flag'));
assert.ok(Array.isArray(readinessInterface.not_defined_here));
for (const deferred of ['numeric mastery thresholds', 'axis weights', 'overall readiness formula', 'blocking cutoff values']) {
  assert.ok(readinessInterface.not_defined_here.includes(deferred), `Blueprint must defer ${deferred} to readiness policy`);
}

// Ensure the fragment contract only points at the six canonical competence axes once instantiated.
assert.deepEqual([...axisKeys], [
  'grammar_sentence_control',
  'lexical_competence',
  'reading',
  'writing',
  'listening',
  'functional_communication',
]);

console.log('Recovery Curriculum v2 assessment blueprint validation passed.');
