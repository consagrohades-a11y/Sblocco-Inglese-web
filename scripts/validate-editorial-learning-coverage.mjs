import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const boundaryPath = 'src/components/learning/LearnerExperienceBoundary.jsx';
const cssPath = 'src/styles/learnerExperience.css';
const mainPath = 'src/main.js';
const trainerLayoutPath = 'src/components/TrainerLayout.jsx';
const theoryRendererPath = 'src/components/exercises/ExerciseQuestionRenderer.jsx';

const boundary = read(boundaryPath);
const css = read(cssPath);
const main = read(mainPath);
const trainerLayout = read(trainerLayoutPath);
const theoryRenderer = read(theoryRendererPath);

const requiredSurfaces = [
  'dashboard',
  'recovery',
  'assignment-detail',
  'assignments',
  'exercise',
  'practice',
  'collection',
  'progress',
  'trainer',
  'grammar',
  'account',
];

for (const surface of requiredSurfaces) {
  expect(boundary.includes(`key: '${surface}'`), `LearnerExperienceBoundary is missing the ${surface} route surface.`);
  expect(css.includes(`data-learning-surface=\"${surface}\"`) || ['dashboard', 'recovery'].includes(surface), `learnerExperience.css has no explicit ${surface} coverage.`);
}

expect(boundary.includes("path === '/exercises'"), 'Exercise Builder learner player is not covered by the editorial boundary.');
expect(boundary.includes("path === '/progressi'"), 'Learner progress is not covered by the editorial boundary.');
expect(boundary.includes("path === '/practice'"), 'Targeted practice is not covered by the editorial boundary.');
expect(boundary.includes("path.startsWith('/trainers/')"), 'Trainer detail routes are not covered by the editorial boundary.');
expect(boundary.includes("path.startsWith('/grammar/')"), 'Grammar lesson routes are not covered by the editorial boundary.');
expect(boundary.includes("path.startsWith('/recupero-debito')"), 'Recupero Debito learner routes are not covered by the editorial boundary.');

expect(main.includes("import LearnerExperienceBoundary"), 'main.js does not mount the editorial learner route boundary.');
expect(main.includes("import './styles/learnerEditorial.css'"), 'main.js does not load the shared learner editorial styles globally.');
expect(main.includes("import './styles/editorialLearning.css'"), 'main.js does not load semantic lesson styles.');
expect(main.includes("import './styles/learnerExperience.css'"), 'main.js does not load the product-wide learner compatibility layer.');

expect(css.includes('html.sblocco-learner-experience {'), 'Light-mode learner tokens are missing.');
expect(css.includes('html.dark.sblocco-learner-experience {'), 'Dark-mode learner tokens are missing.');
expect(css.includes('--lx-paper: #f9f0e8'), 'Editorial warm-paper light token is missing.');
expect(css.includes('--lx-paper: #07263a'), 'Editorial deep-navy dark token is missing.');
expect(css.includes('--lx-orange: #d34c1a'), 'Editorial orange light token is missing.');
expect(css.includes('--lx-orange: #ef5b28'), 'Editorial orange dark token is missing.');
expect(css.includes('data-learning-surface="progress"') && css.includes(':not(.dark)[data-learning-surface="progress"]'), 'Progress does not have an explicit light-mode correction for its legacy dark-first markup.');
expect(css.includes('data-learning-surface="exercise"'), 'Exercise player does not have route-specific editorial treatment.');

expect(trainerLayout.includes('learner-editorial sblocco-trainer-canvas'), 'TrainerLayout is not anchored to the shared learner editorial canvas.');
expect(theoryRenderer.includes('EditorialTeachingBlock'), 'Exercise Builder content_block theory is not using the shared editorial renderer.');

const forbiddenLearnerDark = [
  ['src/styles/learnerExperience.css', /--lx-paper:\s*#000(?:000)?\b/i, 'Learner dark canvas must use deep navy, not black.'],
  ['src/styles/learnerEditorial.css', /--learner-paper:\s*#000(?:000)?\b/i, 'Recovery/dashboard dark canvas must use deep navy, not black.'],
];

for (const [file, pattern, message] of forbiddenLearnerDark) {
  expect(!pattern.test(read(file)), `${message} (${file})`);
}

if (failures.length) {
  console.error('\nEditorial learner coverage validation failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Editorial learner coverage OK: ${requiredSurfaces.length} learner surfaces, light + dark themes, shared theory renderer.`);
