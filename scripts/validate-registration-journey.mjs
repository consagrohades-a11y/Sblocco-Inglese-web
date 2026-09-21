import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function assertContains(source, fragment, message) {
  if (!source.includes(fragment)) {
    throw new Error(message);
  }
}

function assertNotContains(source, fragment, message) {
  if (source.includes(fragment)) {
    throw new Error(message);
  }
}

const register = read('src/pages/Register.jsx');
const auth = read('src/auth/AuthContext.jsx');
const app = read('src/App.jsx');
const css = read('src/styles/registerJourney.css');
const migration = read('supabase/migrations/20260921173500_registration_profile_metadata.sql');

for (const label of ['Il tuo nome', 'Un po’ di te', 'Il tuo avatar', 'Il tuo accesso']) {
  assertContains(register, label, `Registration journey is missing step: ${label}`);
}

for (const field of ['displayName', 'profession', 'age', 'avatarKey', 'avatarBackgroundKey']) {
  assertContains(register, field, `Registration journey is missing profile field: ${field}`);
}

assertContains(register, "REGISTRATION_DRAFT_KEY", 'Registration journey must preserve non-sensitive progress.');
assertContains(register, 'window.sessionStorage.setItem', 'Registration journey draft persistence is missing.');
assertContains(register, 'clearRegistrationDraft();', 'Registration journey draft must clear after successful signup.');
assertNotContains(
  register.slice(
    register.indexOf("window.sessionStorage.setItem"),
    register.indexOf("window.sessionStorage.setItem") + 500,
  ),
  'password',
  'Registration draft must never persist passwords.',
);
assertNotContains(register, "Lingua dell'interfaccia", 'Do not expose interface language until localization is implemented.');

for (const metadataField of ['profession:', 'age:', 'avatar_key:', 'avatar_background_key:', 'timezone:']) {
  assertContains(auth, metadataField, `Auth signup metadata is missing: ${metadataField}`);
}

assertContains(app, "location.pathname === '/register'", 'Registration must remain a standalone experience.');
assertContains(app, '!isStandaloneExperience ? <Navbar /> : null', 'Standalone registration must not render the marketing navbar.');
assertContains(app, '!isStandaloneExperience ? <Footer /> : null', 'Standalone registration must not render the marketing footer.');

assertContains(css, '.register-journey__stage {', 'Registration journey stage styles are missing.');
assertContains(css, 'background: transparent;', 'Registration journey should not reintroduce a white stage card.');
assertContains(css, 'box-shadow: none;', 'Registration journey should remain flat and editorial.');

for (const databaseField of ['profession', 'age', 'avatar_key', 'avatar_background_key']) {
  assertContains(migration, databaseField, `Registration profile trigger is missing: ${databaseField}`);
}
assertContains(migration, 'create or replace function public.handle_new_auth_user()', 'Registration profile trigger migration is missing.');

console.log('Registration journey validation passed.');
