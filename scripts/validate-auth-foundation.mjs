import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260713090000_auth_profile_bootstrap.sql', 'utf8');
const authContext = readFileSync('src/auth/AuthContext.jsx', 'utf8');
const app = readFileSync('src/App.jsx', 'utf8');

assert.match(migration, /create or replace function public\.handle_new_auth_user\(\)/);
assert.match(migration, /security definer/i);
assert.match(migration, /set search_path = public/i);
assert.match(migration, /after insert on auth\.users/i);
assert.match(migration, /on conflict \(id\) do nothing/i);
assert.match(migration, /'learner'/);
assert.match(migration, /'active'/);
assert.doesNotMatch(migration, /service[_-]?role/i);
assert.doesNotMatch(migration, /secret/i);

assert.match(authContext, /supabase\.auth\.signUp/);
assert.match(authContext, /display_name: displayName\.trim\(\)/);
assert.doesNotMatch(authContext, /role:/);
assert.doesNotMatch(authContext, /status:/);
assert.doesNotMatch(authContext, /service[_-]?role/i);

assert.match(app, /path="\/login"/);
assert.match(app, /path="\/register"/);
assert.match(app, /path="\/forgot-password"/);
assert.match(app, /path="\/account"/);
assert.match(app, /<ProtectedRoute>/);

console.log('Auth foundation validation passed.');
