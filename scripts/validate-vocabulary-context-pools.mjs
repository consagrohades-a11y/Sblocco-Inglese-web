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
const authoringKit = read('public/templates/sblocco-learning-studio/universal-ai-authoring-kit-v1.md');
const migration = read('supabase/migrations/20260922133000_vocabulary_context_pools.sql');

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

console.log('Vocabulary-only Studio and reusable context-pool checks passed.');
