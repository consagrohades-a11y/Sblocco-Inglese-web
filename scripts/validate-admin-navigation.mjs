import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function assertContains(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message);
}

function assertNotContains(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message);
}

const shell = read('src/components/AdminShell.jsx');
const dashboard = read('src/pages/AdminDashboard.jsx');
const app = read('src/App.jsx');

for (const activeRoute of [
  '/admin/notifications',
  '/admin/learners',
  '/admin/groups',
  '/admin/assignments',
  '/admin/content/exercises/studio',
  '/admin/content/exercises/library',
  '/admin/content/exercises/results',
  '/admin/analytics',
]) {
  assertContains(shell, activeRoute, `Admin navigation is missing active route: ${activeRoute}`);
}

for (const retiredLabel of [
  'Word Trainer',
  'Espressioni business',
  'Espressioni hospitality',
  'Banca domande',
  'Importa diagnostica',
  'Ripasso SRS',
  'Pratica mirata',
  'Tema e account',
]) {
  assertNotContains(shell, retiredLabel, `Retired admin navigation returned: ${retiredLabel}`);
}

for (const retiredDashboardItem of [
  'Lead e cohort',
  'Travel Trainer',
  "status: 'Parziale'",
  "to: '/admin/content'",
  "to: '/admin/settings'",
]) {
  assertNotContains(dashboard, retiredDashboardItem, `Retired dashboard item returned: ${retiredDashboardItem}`);
}

assertContains(app, '<Route path="settings" element={<Navigate to="/account/settings" replace />} />', 'Admin settings placeholder must redirect to real account settings.');
assertContains(app, '<Route path="content" element={<Navigate to="/admin/content/exercises/library" replace />} />', 'Legacy admin content overview must redirect to Learning Studio library.');
assertContains(app, '<Route path="assignments" element={<AdminAssignments />} />', 'Assignments must route directly to the real page.');
assertNotContains(app, 'AdminSectionOverview', 'AdminSectionOverview placeholder must stay retired.');
assertNotContains(app, 'AdminContentOverview', 'AdminContentOverview legacy hub must stay retired.');

console.log('Admin navigation validation passed.');
