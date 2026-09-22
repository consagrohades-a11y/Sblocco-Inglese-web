import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

const facts = read('src/components/admin/LearnerQuickFacts.jsx');
const detail = read('src/pages/AdminLearnerDetail.jsx');
const editor = read('src/components/admin/LearnerContextNoteEditor.jsx');
const learners = read('src/pages/AdminLearners.jsx');
const notifications = read('src/pages/AdminNotifications.jsx');
const speaking = read('src/pages/AdminSpeakingActivities.jsx');
const quickAssign = read('src/components/admin/exercise-studio/StudioQuickAssignPanel.jsx');

assert.ok(facts.includes('parts.push(profession)'), 'Quick facts must include profession.');
assert.ok(facts.includes('anni'), 'Quick facts must include age.');
assert.ok(facts.includes('>·</span>'), 'Quick facts must render middle-dot separators.');
assert.ok(facts.includes('learner.admin_context_note'), 'Quick facts must retain the custom admin note.');

assert.ok(detail.includes('description={learner ? <LearnerQuickFacts'), 'Learner detail header must show structured quick facts.');
assert.ok(detail.includes('learner={learner}'), 'Context-note editor must receive structured learner fields.');
assert.ok(editor.includes('learnerContextSeed(learner)'), 'Empty quick memo must prefill from structured learner facts.');
assert.ok(editor.includes('Professione ed età vengono mostrate automaticamente.'), 'Editor copy must explain automatic structured facts.');

for (const [name, source] of [['learner directory', learners], ['notifications', notifications], ['speaking launcher', speaking], ['quick assign', quickAssign]]) {
  assert.ok(source.includes('LearnerQuickFacts'), name + ' must use the same structured quick-facts renderer.');
}

assert.ok(learners.includes('learner.profession, learner.age'), 'Learner search must include profession and age.');
assert.ok(quickAssign.includes('learner.profession, learner.age'), 'Quick-assign search must include profession and age.');

console.log('Learner structured quick facts and memo prefill validation passed.');
