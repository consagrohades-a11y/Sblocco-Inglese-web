import assert from 'node:assert/strict';
import { canKeepAuthenticatedView } from '../src/auth/authSessionContinuity.js';

const profileOwner = 'teacher-1';
for (const event of ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED']) {
  assert.equal(canKeepAuthenticatedView(event, profileOwner, profileOwner), true);
}
for (const [event, userId, ownerId] of [
  ['SIGNED_OUT', null, profileOwner],
  ['SIGNED_IN', 'teacher-2', profileOwner],
  ['TOKEN_REFRESHED', profileOwner, null],
  ['USER_UPDATED', profileOwner, profileOwner],
]) {
  assert.equal(canKeepAuthenticatedView(event, userId, ownerId), false);
}

console.log('A verified user keeps the mounted lesson on refresh; sign-out, identity changes and profile updates still recheck access.');
