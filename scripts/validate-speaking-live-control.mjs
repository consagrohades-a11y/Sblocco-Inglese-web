import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function read(path) {
  return fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

execFileSync(process.execPath, ['--check', 'src/lib/speakingLiveControl.js'], { stdio: 'inherit' });

const control = read('src/lib/speakingLiveControl.js');
const controller = read('src/components/admin/SpeakingLiveController.jsx');
const presenter = read('src/pages/SpeakingActivityPresenter.jsx');
const library = read('src/pages/AdminSpeakingActivities.jsx');
const learner = read('src/pages/AdminLearnerDetail.jsx');

assert.ok(control.includes('BroadcastChannel'), 'Live control should prefer BroadcastChannel.');
assert.ok(control.includes('localStorage'), 'Live control should have a same-origin storage-event fallback.');
assert.ok(control.includes('controlId'), 'Live control messages must be scoped to one session.');

for (const command of ['previous', 'next', 'random', 'toggle-support', 'toggle-challenge', 'sync-request', 'close-presenter']) {
  assert.ok(presenter.includes(`payload.type === '${command}'`), `Presenter must support remote command: ${command}`);
}

assert.ok(presenter.includes('presenter-state'), 'Presenter must broadcast state back to the teacher controller.');
assert.ok(presenter.includes('supportVisible'), 'Presenter must support teacher-controlled support reveal.');
assert.ok(controller.includes('Teacher note') || controller.includes('Teacher note'.toLowerCase()), 'Controller must keep teacher notes teacher-side.');
assert.ok(controller.includes('Lesson timer'), 'Controller must include a teacher timer.');
assert.ok(controller.includes('Student screen connected'), 'Controller must expose connection status.');

assert.ok(library.includes('createSpeakingControlId'), 'Speaking launcher must create a unique live-control channel.');
assert.ok(library.includes('SpeakingLiveController'), 'Speaking library must keep the teacher controller open after launch.');
assert.ok(library.includes("searchParams.get('learner')"), 'Speaking library must accept a learner from the profile route.');
assert.ok(library.includes('initialLearnerId={focusedLearnerId}'), 'Profile-selected learner must prefill the presentation launcher.');

assert.ok(learner.includes('/admin/content/speaking-library?learner='), 'Learner profile must launch directly into speaking.');
assert.ok(learner.includes('Start speaking'), 'Learner profile must expose a speaking action.');

console.log('Speaking live control validation passed.');
