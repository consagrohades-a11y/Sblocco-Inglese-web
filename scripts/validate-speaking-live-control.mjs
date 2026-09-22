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
assert.ok(presenter.includes("useState(false)"), 'Student support must be hidden by default.');
assert.ok(!presenter.includes('setSupportVisible(true)'), 'Changing game items must never auto-open student support.');
assert.ok(presenter.includes('lg:h-[100dvh]'), 'Desktop presenter must fit the viewport height.');
assert.ok(presenter.includes('lg:overflow-hidden'), 'Desktop presenter must prevent page-level scrolling.');
assert.ok(presenter.includes("window.addEventListener('message'"), 'Presenter must accept direct window messages while unfocused.');
assert.ok(presenter.includes('window.opener.postMessage'), 'Presenter must send state directly back to the teacher window.');
assert.ok(controller.includes('studentWindow.postMessage'), 'Teacher controller must send commands directly to the student window.');
const commandBlock = controller.slice(controller.indexOf('function command(type)'), controller.indexOf('function focusStudentWindow'));
assert.ok(commandBlock.includes('return;'), 'Direct live commands must return after postMessage so toggle commands are not dispatched twice.');
assert.ok(commandBlock.indexOf('return;') < commandBlock.lastIndexOf('channelRef.current?.send(payload)'), 'Broadcast fallback must run only after direct postMessage does not return.');
assert.ok(controller.includes("window.addEventListener('message'"), 'Teacher controller must accept direct presenter state messages.');
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
