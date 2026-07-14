import fs from 'node:fs';

function replaceOnce(source, needle, replacement, label) {
  if (!source.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
  if (source.includes(replacement)) return source;
  return source.replace(needle, replacement);
}

const appPath = 'src/App.jsx';
let app = fs.readFileSync(appPath, 'utf8');
app = replaceOnce(
  app,
  "const AdminExerciseDiagnostics = lazy(() => import('./pages/AdminExerciseDiagnostics'));",
  "const AdminExerciseDiagnostics = lazy(() => import('./pages/AdminExerciseDiagnostics'));\nconst AdminExerciseQuestionBank = lazy(() => import('./pages/AdminExerciseQuestionBank'));\nconst AdminExercisePools = lazy(() => import('./pages/AdminExercisePools'));",
  'Exercise Builder lazy imports',
);
app = replaceOnce(
  app,
  '              <Route path="content/exercises/diagnostics" element={<AdminExerciseDiagnostics />} />',
  '              <Route path="content/exercises/diagnostics" element={<AdminExerciseDiagnostics />} />\n              <Route path="content/exercises/questions" element={<AdminExerciseQuestionBank />} />\n              <Route path="content/exercises/pools" element={<AdminExercisePools />} />',
  'Exercise Builder routes',
);
fs.writeFileSync(appPath, app);

const shellPath = 'src/components/AdminShell.jsx';
let shell = fs.readFileSync(shellPath, 'utf8');
shell = replaceOnce(
  shell,
  "      { label: 'Diagnostica esercizi', to: '/admin/content/exercises/diagnostics', icon: BarChart3 },",
  "      { label: 'Diagnostica esercizi', to: '/admin/content/exercises/diagnostics', icon: BarChart3 },\n      { label: 'Question Bank', to: '/admin/content/exercises/questions', icon: BookOpen },\n      { label: 'Pool Builder', to: '/admin/content/exercises/pools', icon: Blocks },",
  'Exercise Builder navigation',
);
fs.writeFileSync(shellPath, shell);

fs.rmSync('scripts/wire-exercise-bank-ui.mjs');
fs.rmSync('.github/workflows/wire-exercise-bank-ui.yml');
