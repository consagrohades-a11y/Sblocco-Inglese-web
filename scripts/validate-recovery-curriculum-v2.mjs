import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'content/recovery/curriculum-v2';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assertUnique(values, label) {
  const seen = new Set();
  values.forEach((value) => {
    assert.ok(!seen.has(value), `${label} must be unique: ${value}`);
    seen.add(value);
  });
}

const meta = readJson(`${ROOT}/curriculum-meta.json`);
const axesFile = readJson(`${ROOT}/competence-axes.json`);
const modesFile = readJson(`${ROOT}/assessment-modes.json`);
const outcomeSchema = readJson(`${ROOT}/outcome-schema.json`);
const legacy = readJson('content/recovery/curriculum-years-1-3.json');

assert.equal(meta.schema_version, 2);
assert.equal(meta.curriculum_id, 'recovery-years-1-3-v2');
assert.equal(meta.school_programme_is_authoritative, true);
assert.equal(meta.year_profiles_are_defaults_not_hard_limits, true);
assert.equal(meta.model.assessment_modes_are_separate_from_competence_axes, true);
assert.equal(meta.model.evidence_is_required_for_mastery, true);
assert.equal(meta.model.readiness_is_not_a_simple_topic_average, true);
assert.deepEqual(meta.authority_order, [
  'student_official_school_recovery_programme',
  'year_profile_default',
  'cefr_difficulty_control',
]);

const axes = axesFile.axes || [];
const axisKeys = axes.map((axis) => axis.key);
const axisCodes = axes.map((axis) => axis.code);
assert.deepEqual(axisKeys, [
  'grammar_sentence_control',
  'lexical_competence',
  'reading',
  'writing',
  'listening',
  'functional_communication',
]);
assertUnique(axisKeys, 'Competence axis key');
assertUnique(axisCodes, 'Competence axis code');
axes.forEach((axis) => {
  assert.ok(axis.label_it, `${axis.key} requires label_it`);
  assert.ok(axis.purpose, `${axis.key} requires purpose`);
  assert.ok(Array.isArray(axis.includes) && axis.includes.length > 0, `${axis.key} requires includes`);
  assert.ok(Array.isArray(axis.typical_evidence) && axis.typical_evidence.length > 0, `${axis.key} requires typical_evidence`);
  assert.equal(typeof axis.blocking_eligible, 'boolean', `${axis.key} requires blocking_eligible boolean`);
});

const modes = modesFile.modes || [];
const modeKeys = modes.map((mode) => mode.key);
assertUnique(modeKeys, 'Assessment mode key');
assert.ok(modeKeys.includes('translation_it_en'));
assert.ok(modeKeys.includes('mixed_grammar'));
assert.ok(modeKeys.includes('reading_comprehension'));
assert.ok(modeKeys.includes('independent_writing'));
assert.ok(modeKeys.includes('listening_comprehension'));
assert.ok(modeKeys.includes('recovery_mock'));
assert.ok(!axisKeys.includes('translation_it_en'), 'Translation must remain an assessment mode, not a competence axis.');
assert.ok(!axisKeys.includes('cumulative_school_test'), 'Mixed school assessment must remain an assessment mode, not a competence axis.');

const performanceLevels = new Set(outcomeSchema.allowed_performance_levels || []);
assert.deepEqual([...performanceLevels], ['knowledge', 'controlled_performance', 'transfer']);
const programmeRequirements = new Set(outcomeSchema.programme_requirement_values || []);
const cefrTargets = new Set(outcomeSchema.allowed_cefr_targets || []);
const statuses = new Set(outcomeSchema.allowed_statuses || []);
const requiredFields = outcomeSchema.required_fields || [];
assert.ok(requiredFields.includes('observable_outcome_it'));
assert.ok(requiredFields.includes('evidence_requirements'));
assert.ok(requiredFields.includes('blocking_candidate'));
assert.ok(!requiredFields.includes('mastery_threshold'), 'Numeric readiness thresholds do not belong in outcome files.');

const idRegex = new RegExp(outcomeSchema.id_pattern);
const axisByKey = new Map(axes.map((axis) => [axis.key, axis]));
const axisByCode = new Map(axes.map((axis) => [axis.code, axis]));
const modeSet = new Set(modeKeys);
const legacyTopicSet = new Set((legacy.topics || []).map((topic) => topic.key));

function validateOutcome(outcome, fileYear, source) {
  requiredFields.forEach((field) => {
    assert.ok(Object.hasOwn(outcome, field), `${source}: ${outcome.id || '<missing id>'} missing ${field}`);
  });
  assert.match(outcome.id, idRegex, `${source}: invalid outcome id ${outcome.id}`);
  assert.equal(outcome.school_year_profile, fileYear, `${source}: ${outcome.id} year must match file year`);
  assert.ok(statuses.has(outcome.status), `${source}: ${outcome.id} invalid status`);
  assert.ok(axisByKey.has(outcome.competence_axis), `${source}: ${outcome.id} invalid competence_axis`);
  assert.ok(cefrTargets.has(outcome.cefr_target), `${source}: ${outcome.id} invalid CEFR target`);
  assert.ok(outcome.label_it && outcome.observable_outcome_it, `${source}: ${outcome.id} requires Italian label and observable outcome`);
  assert.ok(Array.isArray(outcome.performance_levels_required) && outcome.performance_levels_required.length > 0, `${source}: ${outcome.id} requires performance levels`);
  outcome.performance_levels_required.forEach((level) => assert.ok(performanceLevels.has(level), `${source}: ${outcome.id} invalid performance level ${level}`));
  assertUnique(outcome.performance_levels_required, `${source}: ${outcome.id} performance level`);
  assert.ok(Array.isArray(outcome.prerequisite_outcome_ids), `${source}: ${outcome.id} prerequisite_outcome_ids must be an array`);
  assert.ok(Array.isArray(outcome.required_topic_keys), `${source}: ${outcome.id} required_topic_keys must be an array`);
  assert.ok(Array.isArray(outcome.recommended_topic_keys), `${source}: ${outcome.id} recommended_topic_keys must be an array`);
  [...outcome.required_topic_keys, ...outcome.recommended_topic_keys].forEach((topicKey) => {
    assert.ok(legacyTopicSet.has(topicKey), `${source}: ${outcome.id} references unknown Recovery topic ${topicKey}; record new needs in gap analysis instead`);
  });
  assert.ok(Array.isArray(outcome.vocabulary_domains), `${source}: ${outcome.id} vocabulary_domains must be an array`);
  assert.ok(Array.isArray(outcome.assessment_modes) && outcome.assessment_modes.length > 0, `${source}: ${outcome.id} requires assessment modes`);
  outcome.assessment_modes.forEach((mode) => assert.ok(modeSet.has(mode), `${source}: ${outcome.id} invalid assessment mode ${mode}`));
  assertUnique(outcome.assessment_modes, `${source}: ${outcome.id} assessment mode`);
  assert.ok(programmeRequirements.has(outcome.programme_requirement), `${source}: ${outcome.id} invalid programme_requirement`);
  assert.equal(typeof outcome.blocking_candidate, 'boolean', `${source}: ${outcome.id} blocking_candidate must be boolean`);

  const evidence = outcome.evidence_requirements;
  assert.ok(evidence && typeof evidence === 'object' && !Array.isArray(evidence), `${source}: ${outcome.id} requires evidence_requirements object`);
  (outcomeSchema.evidence_requirements_contract.required_fields || []).forEach((field) => {
    assert.ok(Object.hasOwn(evidence, field), `${source}: ${outcome.id} evidence_requirements missing ${field}`);
  });
  assert.ok(Number.isInteger(evidence.minimum_distinct_assessment_modes) && evidence.minimum_distinct_assessment_modes >= 1, `${source}: ${outcome.id} minimum_distinct_assessment_modes must be >= 1`);
  assert.ok(evidence.minimum_distinct_assessment_modes <= outcome.assessment_modes.length, `${source}: ${outcome.id} requires more distinct modes than it declares`);
  ['requires_controlled_production', 'requires_transfer_evidence', 'requires_unseen_or_mixed_context'].forEach((field) => {
    assert.equal(typeof evidence[field], 'boolean', `${source}: ${outcome.id} ${field} must be boolean`);
  });

  const expectedAxisCode = outcome.id.split('-')[1];
  const axis = axisByCode.get(expectedAxisCode);
  assert.ok(axis, `${source}: ${outcome.id} contains unknown axis code`);
  assert.equal(axis.key, outcome.competence_axis, `${source}: ${outcome.id} axis code does not match competence_axis`);

  const transferNotApplicable = outcome.transfer_not_applicable === true;
  if (!transferNotApplicable && outcome.programme_requirement === 'default_core') {
    assert.ok(outcome.performance_levels_required.includes('transfer'), `${source}: ${outcome.id} default_core outcomes normally require transfer`);
    assert.equal(evidence.requires_transfer_evidence, true, `${source}: ${outcome.id} default_core outcome must require transfer evidence`);
  }
  if (transferNotApplicable) {
    assert.ok(typeof outcome.notes === 'string' && outcome.notes.trim().length > 0, `${source}: ${outcome.id} transfer_not_applicable requires notes`);
  }
}

// Validate the contract example as executable documentation.
validateOutcome(outcomeSchema.example, 1, 'outcome-schema.json example');

const yearsDir = join(ROOT, 'years');
const yearFiles = existsSync(yearsDir)
  ? readdirSync(yearsDir).filter((name) => /^year-[1-3]\.json$/.test(name)).sort()
  : [];
const authoredYears = new Set(yearFiles.map((name) => Number(name.match(/year-([1-3])\.json/)[1])));
const allOutcomes = [];
yearFiles.forEach((name) => {
  const year = Number(name.match(/year-([1-3])\.json/)[1]);
  const source = join(yearsDir, name);
  const payload = readJson(source);
  assert.equal(payload.schema_version, 1, `${source}: schema_version must be 1`);
  assert.equal(payload.curriculum_id, meta.curriculum_id, `${source}: curriculum_id mismatch`);
  assert.equal(payload.school_year_profile, year, `${source}: school_year_profile mismatch`);
  assert.ok(Array.isArray(payload.outcomes), `${source}: outcomes must be an array`);
  payload.outcomes.forEach((outcome) => {
    validateOutcome(outcome, year, source);
    allOutcomes.push({ ...outcome, source });
  });
});

assertUnique(allOutcomes.map((outcome) => outcome.id), 'Curriculum outcome id');
const outcomeIds = new Set(allOutcomes.map((outcome) => outcome.id));
let deferredPriorYearPrerequisites = 0;
allOutcomes.forEach((outcome) => {
  outcome.prerequisite_outcome_ids.forEach((prerequisiteId) => {
    assert.notEqual(prerequisiteId, outcome.id, `${outcome.source}: ${outcome.id} cannot depend on itself`);
    const match = prerequisiteId.match(/^RY([1-3])-/);
    assert.ok(match, `${outcome.source}: ${outcome.id} has invalid prerequisite outcome id ${prerequisiteId}`);
    const prerequisiteYear = Number(match[1]);
    assert.ok(prerequisiteYear <= outcome.school_year_profile, `${outcome.source}: ${outcome.id} cannot depend on a future-year outcome ${prerequisiteId}`);

    if (outcomeIds.has(prerequisiteId)) return;

    const canDeferForParallelAuthoring = prerequisiteYear < outcome.school_year_profile
      && !authoredYears.has(prerequisiteYear);
    if (canDeferForParallelAuthoring) {
      deferredPriorYearPrerequisites += 1;
      return;
    }

    assert.fail(`${outcome.source}: ${outcome.id} references unknown prerequisite outcome ${prerequisiteId}`);
  });
});

const deferredNote = deferredPriorYearPrerequisites
  ? `; ${deferredPriorYearPrerequisites} prior-year prerequisite reference(s) deferred until the missing earlier-year file is integrated`
  : '';
console.log(`Recovery Curriculum v2 foundation validation passed${yearFiles.length ? ` (${allOutcomes.length} outcomes across ${yearFiles.length} year files${deferredNote})` : ' (year outcomes not authored yet)'}.`);
