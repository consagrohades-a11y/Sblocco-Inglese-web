import fs from 'node:fs';
import assert from 'node:assert/strict';

function read(path) {
  return fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

const documentModel = read('src/lib/exerciseStudioDocument.js');
const studioEditor = read('src/components/admin/exercise-studio/StudioBlockEditor.jsx');
const registry = read('src/lib/exerciseStudioBlockRegistry.js');
const replay = read('src/components/vocabulary/VocabularyReplay.jsx');
const vocabApi = read('src/lib/learnerVocabularyBankApi.js');
const authoringKit = read('public/templates/sblocco-learning-studio/universal-ai-authoring-kit-v1.json');
const migration = read('supabase/migrations/20260922133000_vocabulary_context_pools.sql');
const memoryMigration = read('supabase/migrations/20260924080846_learner_memory_engine_and_learning_pulse.sql');
const learnerHome = read('src/pages/LearnerHome.jsx');
const exercisePlayer = read('src/pages/ExercisePlayerV2.jsx');
const teacherPulse = read('src/components/admin/LearnerLearningPulse.jsx');

assert.ok(documentModel.includes("'vocabulary_exercise'"), 'Studio must expose vocabulary_exercise as a first-class activity type.');
assert.ok(studioEditor.includes('Context pool'), 'Vocabulary editor must expose a reusable context pool.');
assert.ok(studioEditor.includes('Example shown in this exercise'), 'Vocabulary editor must choose the one context shown in the original exercise.');
assert.ok(registry.includes('display_example_index'), 'Compiled vocabulary entries must retain the visible-example index.');
assert.ok(registry.includes('examples,'), 'Compiled vocabulary entries must retain the full context pool.');
assert.ok(vocabApi.includes('example, examples, level'), 'Learner vocabulary API must load context pools.');
assert.ok(replay.includes('_replay_example'), 'Replay must choose from the stored context pool.');
assert.ok(replay.includes('_replay_mode'), 'Replay must rotate recall cue types.');
assert.ok(authoringKit.includes('3–5 natural, genuinely different context sentences'), 'AI authoring contract must require context pools.');
assert.ok(authoringKit.includes('Media, listening and transcripts are not required.'), 'Vocabulary-only authoring must explicitly remain media-optional.');
assert.ok(migration.includes("add column if not exists examples jsonb"), 'Migration must persist context pools.');
assert.ok(migration.includes("entry->'examples'"), 'Vocabulary collection must carry context pools into the learner bank.');
assert.ok(vocabApi.includes('learner_rate_vocab_recall'), 'Replay ratings must persist through the protected recall RPC.');
assert.ok(vocabApi.includes('next_review_at'), 'Vocabulary API must load memory scheduling state.');
assert.ok(replay.includes('next_review_at'), 'Replay must prioritize due vocabulary.');
assert.ok(replay.includes('autoStart'), 'Dashboard must be able to launch straight into a Replay.');
assert.ok(memoryMigration.includes('learner_get_learning_pulse'), 'Memory migration must expose the learner-safe pulse RPC.');
assert.ok(memoryMigration.includes('revoke all on function public.learner_rate_vocab_recall'), 'Recall RPC must revoke default PUBLIC execution.');
assert.ok(memoryMigration.includes('revoke all on function public.learner_get_learning_pulse'), 'Pulse RPC must revoke default PUBLIC execution.');
assert.ok(learnerHome.includes('Sistema gli ultimi inciampi'), 'Learner home must surface the mistake-repair loop.');
assert.ok(learnerHome.includes('/vocab-bank?replay=1'), 'Learner home must deep-link directly into due vocabulary Replay.');
assert.ok(exercisePlayer.includes('Fix My Mistakes'), 'Exercise results must expose mistake focus.');
assert.ok(exercisePlayer.includes('exerciseResultNeedsReview'), 'Mistake focus must derive from actual grading results.');
assert.ok(teacherPulse.includes('Learning Pulse'), 'Teacher profile must synthesize the same learner signals.');
assert.ok(teacherPulse.includes('loadAdminLearnerAnalytics'), 'Teacher pulse must reuse canonical analytics.');

console.log('Vocabulary memory, mistake repair, and teacher pulse checks passed.');
