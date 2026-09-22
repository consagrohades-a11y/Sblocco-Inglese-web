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
const navbar = read('src/components/Navbar.jsx');
const footer = read('src/components/Footer.jsx');
const learnerHome = read('src/pages/LearnerHome.jsx');
const learnerAssignments = read('src/pages/LearnerAssignments.jsx');
const learnerAssignmentDetail = read('src/pages/LearnerAssignmentDetail.jsx');
const learnerProgress = read('src/pages/LearnerProgress.jsx');
const recoveryGuide = read('src/pages/RecoveryGuide.jsx');
const learnerAnalytics = read('src/pages/AdminLearnerAnalytics.jsx');
const marketingContent = read('src/data/content.js');
const contactQuestionForm = read('src/components/ContactQuestionForm.jsx');
const sitemap = read('public/sitemap.xml');
const platform = read('src/pages/Platform.jsx');

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

for (const [source, name] of [
  [navbar, 'Navbar'],
  [footer, 'Footer'],
  [learnerHome, 'LearnerHome'],
  [learnerAssignments, 'LearnerAssignments'],
  [learnerAssignmentDetail, 'LearnerAssignmentDetail'],
  [learnerProgress, 'LearnerProgress'],
  [recoveryGuide, 'RecoveryGuide'],
  [learnerAnalytics, 'AdminLearnerAnalytics'],
  [marketingContent, 'MarketingContent'],
  [contactQuestionForm, 'ContactQuestionForm'],
  [sitemap, 'Sitemap'],
  [platform, 'Platform'],
]) {
  for (const legacyCopy of ['Word Trainer', 'Expression Trainer', 'Trainer Suite', 'Ripasso SRS', 'Pratica mirata']) {
    assertNotContains(source, legacyCopy, `${name} still exposes retired learner copy: ${legacyCopy}`);
  }
}

for (const retiredImport of [
  'TrainersLanding',
  'WordTrainer',
  'GeneralExpressionTrainer',
  'HospitalityExpressionTrainer',
  'TravelExpressionTrainer',
  'PracticeHub',
  'AdminTrainerContent',
  'AdminWordTrainerContent',
  'AdminTravelTrainer',
]) {
  assertNotContains(app, retiredImport, `App still imports retired runtime: ${retiredImport}`);
}

assertContains(app, '<Route path="/trainers" element={<Navigate to="/piattaforma" replace />} />', 'Legacy /trainers URL must redirect safely.');
assertContains(app, '<Route path="/practice" element={<ProtectedRoute><Navigate to="/assignments" replace /></ProtectedRoute>} />', 'Legacy /practice URL must redirect safely.');
assertContains(app, '<Route path="/attivita/srs" element={<ProtectedRoute><Navigate to="/attivita/esercizi" replace /></ProtectedRoute>} />', 'Legacy SRS learner URL must redirect safely.');
assertContains(app, '<Route path="/attivita/pratica-mirata" element={<ProtectedRoute><Navigate to="/attivita/esercizi" replace /></ProtectedRoute>} />', 'Legacy practice learner URL must redirect safely.');

for (const retiredPublicUrl of [
  '/trainers/word-trainer',
  '/trainers/business-expression',
  '/trainers/general-expression',
  '/trainers/hospitality-expression',
  '/trainers/travel-expression',
]) {
  assertNotContains(sitemap, retiredPublicUrl, `Retired public URL is still indexed: ${retiredPublicUrl}`);
}

assertNotContains(marketingContent, "to: '/trainers'", 'Marketing navigation must not point to the retired Trainer hub.');
assertContains(marketingContent, "label: 'Piattaforma', to: '/piattaforma'", 'Marketing navigation must expose the current platform destination.');

console.log('Admin and legacy-surface navigation validation passed.');
