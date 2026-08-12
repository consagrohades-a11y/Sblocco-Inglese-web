import fs from 'node:fs';

const files = {
  2: 'content/recovery/curriculum-v2/years/year-2.json',
  3: 'content/recovery/curriculum-v2/years/year-3.json',
};

const additions = {
  'RY2-GRAM-001': ['RY1-GRAM-002', 'RY1-GRAM-003', 'RY1-GRAM-004'],
  'RY2-GRAM-002': ['RY1-GRAM-001'],
  'RY2-GRAM-003': ['RY1-GRAM-007', 'RY1-GRAM-004'],
  'RY2-GRAM-004': ['RY1-GRAM-005', 'RY1-GRAM-006'],
  'RY2-GRAM-005': ['RY1-GRAM-005', 'RY1-GRAM-006'],
  'RY2-LEX-001': ['RY1-LEX-001', 'RY1-LEX-002', 'RY1-LEX-003'],
  'RY2-READ-001': ['RY1-READ-002'],
  'RY2-READ-002': ['RY1-READ-003'],
  'RY2-WRITE-001': ['RY1-WRITE-002'],
  'RY2-WRITE-002': ['RY1-WRITE-003'],
  'RY2-WRITE-003': ['RY1-WRITE-001'],
  'RY2-LISTEN-001': ['RY1-LISTEN-002'],
  'RY2-COMM-001': ['RY1-COMM-002'],
  'RY2-COMM-002': ['RY1-COMM-003'],
  'RY3-GRAM-006': ['RY2-GRAM-001', 'RY2-GRAM-004'],
  'RY3-GRAM-007': ['RY2-GRAM-002'],
  'RY3-LEX-001': ['RY2-LEX-002'],
  'RY3-WRITE-003': ['RY2-WRITE-003'],
  'RY3-WRITE-004': ['RY3-WRITE-003'],
  'RY3-LISTEN-001': ['RY2-LISTEN-002'],
};

const yearOf = (id) => Number(id.match(/^RY([1-3])-/)?.[1] || 0);
const all = new Map();
for (const path of Object.values(files)) {
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const outcome of json.outcomes) all.set(outcome.id, outcome);
}
const year1 = JSON.parse(fs.readFileSync('content/recovery/curriculum-v2/years/year-1.json', 'utf8'));
for (const outcome of year1.outcomes) all.set(outcome.id, outcome);

for (const [targetId, prereqs] of Object.entries(additions)) {
  const target = all.get(targetId);
  if (!target) throw new Error(`Missing target outcome ${targetId}`);
  for (const prerequisiteId of prereqs) {
    const prerequisite = all.get(prerequisiteId);
    if (!prerequisite) throw new Error(`${targetId}: missing prerequisite ${prerequisiteId}`);
    if (yearOf(prerequisiteId) > yearOf(targetId)) throw new Error(`${targetId}: future-year prerequisite ${prerequisiteId}`);
    if (
      target.programme_requirement === 'default_core'
      && ['default_if_assessed', 'programme_dependent'].includes(prerequisite.programme_requirement)
    ) {
      throw new Error(`${targetId}: default_core cannot depend on optional ${prerequisiteId}`);
    }
  }
  target.prerequisite_outcome_ids = [...new Set([...(target.prerequisite_outcome_ids || []), ...prereqs])];
}

for (const [year, path] of Object.entries(files)) {
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  json.outcomes = json.outcomes.map((outcome) => all.get(outcome.id));
  fs.writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`Aligned Year ${year}: ${path}`);
}

const planPath = 'content/recovery/curriculum-v2/gap-analysis.json';
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (!plan.cross_year_prerequisite_alignment) throw new Error('Definitive gap analysis has no cross-year prerequisite block.');
plan.cross_year_prerequisite_alignment.status = 'applied';
fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);

if (Object.keys(additions).length !== 20) throw new Error('Expected exactly 20 prerequisite recommendations.');
console.log('Applied exactly 20 Curriculum v2 prerequisite recommendations and marked B0 alignment applied.');
