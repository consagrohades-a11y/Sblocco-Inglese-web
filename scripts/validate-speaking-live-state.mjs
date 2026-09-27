import assert from 'node:assert/strict';
import {
  clearSpeakingLiveSession,
  loadSpeakingLiveSession,
  loadSpeakingPresenterState,
  saveSpeakingLiveSession,
  saveSpeakingPresenterState,
  speakingLiveSessionDescriptor,
} from '../src/lib/speakingLiveState.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
globalThis.window = { sessionStorage: new MemoryStorage() };

const descriptor = speakingLiveSessionDescriptor({
  activity: { id: 'activity-1' },
  learnerId: 'learner-1',
  levels: ['A0', 'A0', 'A1+'],
  controlId: 'control-1',
  presenterUrl: '/admin/present/speaking/activity-1?control=control-1',
  studentWindow: { shouldNotSerialize: true },
});
assert.deepEqual(descriptor.levels, ['A0', 'A1+']);
assert.equal('studentWindow' in descriptor, false);

saveSpeakingLiveSession({
  activity: { id: 'activity-1' },
  learnerId: 'learner-1',
  levels: ['A0'],
  controlId: 'control-1',
  presenterUrl: '/admin/present/speaking/activity-1?control=control-1',
});
assert.equal(loadSpeakingLiveSession().activityId, 'activity-1');

const savedPresenter = saveSpeakingPresenterState('control-1', 'activity-1', {
  sourceIndex: 7,
  supportVisible: true,
  challengeVisible: false,
});
const restoredPresenter = loadSpeakingPresenterState('control-1', 'activity-1');
assert.equal(restoredPresenter.sourceIndex, 7);
assert.equal(restoredPresenter.supportVisible, true);
assert.equal(restoredPresenter.challengeVisible, false);
assert.equal(restoredPresenter.savedAt, savedPresenter.savedAt);

clearSpeakingLiveSession();
assert.equal(loadSpeakingLiveSession(), null);

console.log('Speaking live state survives deliberate refresh without serializing browser window handles.');
