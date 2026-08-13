import fs from 'node:fs';
import assert from 'node:assert/strict';

const briefs = JSON.parse(fs.readFileSync('content/recovery/curriculum-v2/planning/b1a-grammar-p0-briefs.json', 'utf8'));
const year1 = JSON.parse(fs.readFileSync('content/recovery/curriculum-v2/years/year-1.json', 'utf8'));
const year2 = JSON.parse(fs.readFileSync('content/recovery/curriculum-v2/years/year-2.json', 'utf8'));

assert.equal(briefs.schema_version, 1);
assert.equal(briefs.status, 'authoring_contract');
assert.equal(briefs.shared_contract.topic_total_minutes, 48);
assert.deepEqual(briefs.shared_contract.phases.map((phase) => [phase.phase, phase.minutes]), [
  ['recover', 12], ['practice', 12], ['school', 10], ['verify', 14],
]);
assert.equal(briefs.shared_contract.verify_requirements.mastery_threshold, 80);
assert.equal(briefs.shared_contract.verify_requirements.strong_threshold, 90);
assert.ok(briefs.shared_contract.verify_requirements.activities_min >= 10);
assert.ok(briefs.shared_contract.verify_requirements.formats_min >= 4);
assert.equal(briefs.shared_contract.verify_requirements.connected_context_required, true);
assert.equal(briefs.shared_contract.verify_requirements.controlled_production_required, true);

const expectedTopics = [
  'be-have-got-there-is-are',
  'past-simple-vs-past-continuous',
  'present-perfect-time-expressions',
  'zero-first-conditionals',
];
assert.deepEqual(briefs.topics.map((topic) => topic.topic_key), expectedTopics);
assert.equal(new Set(briefs.topics.map((topic) => topic.topic_key)).size, 4);

const outcomeMap = new Map([...year1.outcomes, ...year2.outcomes].map((outcome) => [outcome.id, outcome]));
for (const topic of briefs.topics) {
  assert.equal(topic.priority, 'P0', `${topic.topic_key} must remain P0`);
  assert.ok(topic.outcome.length >= 80, `${topic.topic_key} needs an observable meaning-first outcome`);
  assert.ok(topic.must_master.length >= 5, `${topic.topic_key} must define breadth`);
  assert.ok(topic.italian_transfer_risks.length >= 4, `${topic.topic_key} must target Italian transfer risks`);
  assert.ok(topic.exclude_for_now.length >= 3, `${topic.topic_key} must define exclusions`);
  assert.ok(topic.recover_content.length >= 3, `${topic.topic_key} must define teaching content`);
  assert.ok(topic.practice_formats.length >= 4, `${topic.topic_key} practice requires format variety`);
  assert.ok(topic.school_formats.length >= 4, `${topic.topic_key} school mode requires format variety`);
  assert.ok(topic.verify_must_sample.length >= 6, `${topic.topic_key} verify breadth is too narrow`);
  assert.ok(topic.cumulative_ready_metadata.primary_outcomes.length >= 1, `${topic.topic_key} needs a cumulative primary outcome`);
  assert.ok(topic.cumulative_ready_metadata.preferred_modes.length >= 3, `${topic.topic_key} needs cumulative assessment-mode planning`);
  for (const id of topic.supports_outcomes) {
    assert.ok(outcomeMap.has(id), `${topic.topic_key} references unknown outcome ${id}`);
  }
  for (const id of topic.cumulative_ready_metadata.primary_outcomes) {
    assert.ok(outcomeMap.has(id), `${topic.topic_key} references unknown cumulative outcome ${id}`);
    assert.equal(outcomeMap.get(id).competence_axis, 'grammar_sentence_control');
  }
}

const zeroFirst = briefs.topics.find((topic) => topic.topic_key === 'zero-first-conditionals');
assert.ok(zeroFirst.supports_outcomes.includes('RY2-GRAM-003'));
assert.ok(year2.outcomes.find((outcome) => outcome.id === 'RY2-GRAM-003').required_topic_keys.includes('zero-first-conditionals'));

const pastContrast = briefs.topics.find((topic) => topic.topic_key === 'past-simple-vs-past-continuous');
const ppTime = briefs.topics.find((topic) => topic.topic_key === 'present-perfect-time-expressions');
assert.ok(pastContrast.supports_outcomes.includes('RY2-GRAM-001'));
assert.ok(ppTime.supports_outcomes.includes('RY2-GRAM-001'));

const foundation = briefs.topics.find((topic) => topic.topic_key === 'be-have-got-there-is-are');
assert.ok(foundation.supports_outcomes.some((id) => id.startsWith('RY1-')));
assert.ok(foundation.supports_outcomes.includes('RY2-GRAM-002'));

console.log('Recovery Curriculum v2 B1-A grammar contract validation passed: 4 P0 systems, 48-minute topic architecture, exit-outcome links and cumulative-ready metadata are coherent.');
