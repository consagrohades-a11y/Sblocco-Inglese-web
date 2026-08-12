import { readFile } from 'node:fs/promises';
import { EXERCISE_BUILDER_QUESTION_TYPES } from '../src/lib/exerciseBuilderSchemaV2.js';

const runtimeFiles = [
  'src/components/exercises/ExerciseExperience.jsx',
  'src/components/exercises/ExerciseQuestionRenderer.jsx',
  'src/components/exercises/ExerciseQuestionRendererV2.jsx',
  'src/components/exercises/EducationalContentBlock.jsx',
  'src/components/exercises/ExerciseRenderer.jsx',
  'src/components/exercises/ExerciseDiagnosticSummary.jsx',
  'src/components/learning/EditorialLearning.jsx',
  'src/pages/ExercisePlayerV2.jsx',
  'src/pages/GrammarA1Test.jsx',
  'src/pages/LearnerAssignments.jsx',
  'src/styles/exerciseExperience.css',
  'src/styles/editorialLearning.css',
  'src/styles/learnerEditorial.css',
];

const sourceEntries = await Promise.all(runtimeFiles.map(async (file) => [file, await readFile(file, 'utf8')]));
const sources = Object.fromEntries(sourceEntries);
const combined = sourceEntries.map(([, source]) => source).join('\n');

const failures = [];
const requireText = (source, text, label) => {
  if (!source.includes(text)) failures.push(`${label}: missing ${text}`);
};

for (const type of EXERCISE_BUILDER_QUESTION_TYPES) {
  requireText(sources['src/components/exercises/ExerciseExperience.jsx'], `${type}:`, `type metadata for ${type}`);
  requireText(sources['src/components/exercises/ExerciseQuestionRendererV2.jsx'], `'${type}'`, `renderer coverage for ${type}`);
}

for (const type of ['multiple-choice', 'gap-fill', 'dialogue-gap-fill']) {
  requireText(sources['src/components/exercises/ExerciseExperience.jsx'], `'${type}'`, `legacy metadata for ${type}`);
  requireText(sources['src/components/exercises/ExerciseRenderer.jsx'], `'${type}'`, `legacy renderer for ${type}`);
}

for (const blockType of [
  'explanation', 'rule', 'examples', 'contrast', 'common_error', 'recap', 'note',
  'pattern', 'language_bank', 'vocabulary', 'useful_phrases', 'pronunciation',
  'teacher_tip', 'warning', 'culture', 'scenario', 'reading', 'dialogue',
  'checklist', 'reflection', 'instructions', 'summary', 'section_intro', 'section_outro',
]) {
  requireText(sources['src/components/learning/EditorialLearning.jsx'], `'${blockType}'`, `semantic block ${blockType}`);
}

for (const selector of [
  '.exercise-activity', '.exercise-choice', '.exercise-reading', '.exercise-dialogue',
  '.exercise-speaking', '.exercise-feedback', '.exercise-progress-header', '.exercise-milestone',
]) {
  requireText(sources['src/styles/exerciseExperience.css'], selector, `shared style ${selector}`);
}

requireText(
  sources['src/components/exercises/ExerciseQuestionRenderer.jsx'],
  'isStructuredEducationalContent(question.content)',
  'compatibility renderer structured-content routing',
);
requireText(
  sources['src/components/exercises/ExerciseQuestionRenderer.jsx'],
  '<ExerciseQuestionRendererV2 {...props} />',
  'compatibility renderer v2 delegation',
);
requireText(
  sources['src/components/exercises/ExerciseQuestionRendererV2.jsx'],
  '<EducationalContentBlock content={question.content} fallback={question.prompt} />',
  'v2 structured educational renderer',
);
requireText(
  sources['src/components/exercises/EducationalContentBlock.jsx'],
  'normalizeEducationalContentBlock',
  'educational content normalization',
);

if (/violet|purple|#7c3aed|#8b5cf6|#a855f7/i.test(combined)) {
  failures.push('Learner exercise runtime contains a banned purple token.');
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${EXERCISE_BUILDER_QUESTION_TYPES.length} Builder types, 3 legacy types, semantic blocks, shared surfaces, structured-content routing, and the no-purple rule.`);
