import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = 'content/recovery/curriculum-v2';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const plan = readJson(`${ROOT}/gap-analysis.json`);
const years = [1, 2, 3].map((year) => readJson(`${ROOT}/years/year-${year}.json`));
const outcomes = years.flatMap((year) => year.outcomes || []);
const byId = new Map(outcomes.map((outcome) => [outcome.id, outcome]));

assert.equal(outcomes.length, 63, 'Expected 63 Curriculum v2 outcomes.');
assert.equal(plan.cross_year_prerequisite_alignment?.status, 'applied');
const recommendations = plan.cross_year_prerequisite_alignment?.recommendations || [];
assert.equal(recommendations.length, 20, 'Expected exactly 20 approved prerequisite recommendations.');

const yearOf = (id) => Number(id.match(/^RY([1-3])-/)?.[1] || 0);

for (const recommendation of recommendations) {
  const target = byId.get(recommendation.outcome_id);
  assert.ok(target, `Missing prerequisite target ${recommendation.outcome_id}`);
  for (const prerequisiteId of recommendation.add || []) {
    assert.ok(byId.has(prerequisiteId), `${recommendation.outcome_id}: unknown prerequisite ${prerequisiteId}`);
    assert.ok(
      (target.prerequisite_outcome_ids || []).includes(prerequisiteId),
      `${recommendation.outcome_id}: approved prerequisite ${prerequisiteId} not applied`,
    );
  }
}

for (const outcome of outcomes) {
  const targetYear = yearOf(outcome.id);
  for (const prerequisiteId of outcome.prerequisite_outcome_ids || []) {
    const prerequisite = byId.get(prerequisiteId);
    assert.ok(prerequisite, `${outcome.id}: unresolved prerequisite ${prerequisiteId}`);
    assert.ok(yearOf(prerequisiteId) <= targetYear, `${outcome.id}: future-year prerequisite ${prerequisiteId}`);
    if (outcome.programme_requirement === 'default_core') {
      assert.ok(
        !['default_if_assessed', 'programme_dependent'].includes(prerequisite.programme_requirement),
        `${outcome.id}: default_core outcome cannot depend on optional ${prerequisiteId}`,
      );
    }
  }
}

// Detect cycles across the full three-year prerequisite graph.
const visiting = new Set();
const visited = new Set();
function visit(id, path = []) {
  if (visited.has(id)) return;
  assert.ok(!visiting.has(id), `Curriculum v2 prerequisite cycle: ${[...path, id].join(' -> ')}`);
  visiting.add(id);
  const outcome = byId.get(id);
  for (const prerequisiteId of outcome?.prerequisite_outcome_ids || []) visit(prerequisiteId, [...path, id]);
  visiting.delete(id);
  visited.add(id);
}
for (const outcome of outcomes) visit(outcome.id);

console.log('Recovery Curriculum v2 prerequisite graph validation passed.');
