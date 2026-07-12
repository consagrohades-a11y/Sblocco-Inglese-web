import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260713090000_auth_profile_bootstrap.sql', 'utf8');
const authContext = readFileSync('src/auth/AuthContext.jsx', 'utf8');
const app = readFileSync('src/App.jsx', 'utf8');
const updatePasswordPage = readFileSync('src/pages/UpdatePassword.jsx', 'utf8');

assert.match(migration, /create or replace function public\.handle_new_auth_user\(\)/);
assert.match(migration, /security definer/i);
assert.match(migration, /set search_path = ''/i);
assert.match(migration, /insert into public\.profiles/i);
assert.match(migration, /after insert on auth\.users/i);
assert.match(migration, /on conflict \(id\) do nothing/i);
assert.match(migration, /'learner'/);
assert.match(migration, /'active'/);
assert.doesNotMatch(migration, /service[_-]?role/i);
assert.doesNotMatch(migration, /secret/i);

assert.match(authContext, /supabase\.auth\.signUp/);
assert.match(authContext, /display_name: displayName\.trim\(\)/);
assert.match(authContext, /resetPasswordForEmail\(email,\s*\{\s*redirectTo: `\$\{window\.location\.origin\}\/update-password`/s);
assert.match(authContext, /supabase\.auth\.updateUser\(\{\s*password\s*\}\)/);
assert.doesNotMatch(authContext, /role:/);
assert.doesNotMatch(authContext, /status:/);
assert.doesNotMatch(authContext, /service[_-]?role/i);

assert.match(app, /path="\/login"/);
assert.match(app, /path="\/register"/);
assert.match(app, /path="\/forgot-password"/);
assert.match(app, /path="\/update-password"/);
assert.match(app, /path="\/account"/);
assert.match(app, /<ProtectedRoute>/);

assert.match(updatePasswordPage, /updatePassword\(\{\s*password\s*\}\)/);
assert.match(updatePasswordPage, /navigate\('\/login'/);

console.log('Auth foundation validation passed.');
