import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STUDIO_BLOCK_REGISTRY,
  normalizeStudioBlock,
  validateStudioBlock,
  compileStudioBlock,
} from '../src/lib/exerciseStudioBlockRegistry.js';
import { createStudioDocument } from '../src/lib/exerciseStudioDocument.js';
import { preflightStudioDocument, compileStudioDocument } from '../src/lib/exerciseStudioCompiler.js';
import { applyStudioRecipe, STUDIO_RECIPES } from '../src/lib/exerciseStudioRecipes.js';
import { GRAMMAR_IN_ACTION_SAMPLES } from '../src/lib/grammarInActionSamples.js';
import { parseStudioImport } from '../src/lib/exerciseStudioImport.js';

assert.equal(GRAMMAR_IN_ACTION_SAMPLES.length, 5, 'A1–C1 examples must all exist.');
assert.ok(STUDIO_BLOCK_REGISTRY.grammar_construction, 'Grammar construction must use the canonical registry.');

for (const sample of GRAMMAR_IN_ACTION_SAMPLES) {
  assert.ok(STUDIO_RECIPES.some((item) => item.id === sample.id), sample.id + ' missing from Studio recipes.');
  const activity = applyStudioRecipe(createStudioDocument(), sample.id);
  assert.equal(activity.level, sample.level, sample.id + ': level should be automatically set.');
  assert.equal(activity.internal_title, sample.internal_title, sample.id + ': title should be automatically set.');
  assert.ok(activity.blocks.length >= 6, sample.id + ': content is too shallow.');
  assert.ok(activity.blocks.some((block) => block.type === 'explanation' || block.type === 'contrast'));
  const constructions = activity.blocks.filter((block) => block.type === 'grammar_construction');
  assert.ok(constructions.length >= 4, sample.id + ': insufficient sentence construction.');
  for (const mode of ['tiles', 'typed', 'oral']) {
    assert.ok(constructions.some((block) => block.mode === mode), sample.id + ': missing ' + mode);
  }
  const preflight = preflightStudioDocument(activity);
  assert.equal(preflight.valid, true, sample.id + ': ' + JSON.stringify(preflight.errors));
  const compiled = compileStudioDocument(activity);
  const questions = compiled.exercise.sections[0].questions;
  assert.equal(questions.length, activity.blocks.length);
  for (const question of questions.filter((q) => q.content?.presentation === 'grammar_construction')) {
    assert.equal(question.content.grammar.mode === 'oral' ? question.type === 'content_block' : ['translation', 'word_order'].includes(question.type), true);
    if (question.content.grammar.mode === 'oral') {
      assert.equal(question.grading.mode, 'ungraded');
      assert.equal(question.grading.weight, 0);
    } else {
      assert.ok(['automatic', 'per_item'].includes(question.grading.mode));
    }
    assert.ok(!('teacher_note' in question.content), sample.id + ': teacher-only information leaked.');
    assert.ok(!JSON.stringify(question).includes('Listen for auxiliary omission'), 'Teacher-only notes leaked.');
  }
}

const badTiles = normalizeStudioBlock({ type: 'grammar_construction', mode: 'tiles', prompt: 'Build a sentence.', chunks: ['alone'] });
assert.ok(validateStudioBlock(badTiles).some((item) => item.field === 'chunks'), 'Must reject incomplete tile construction.');

const badTyping = normalizeStudioBlock({ type: 'grammar_construction', mode: 'typed', prompt: 'Construct.', accepted_answers: [] });
assert.ok(validateStudioBlock(badTyping).some((item) => item.field === 'accepted_answers'), 'Must reject missing accepted answers.');

const oral = normalizeStudioBlock({
  type: 'grammar_construction', mode: 'oral', prompt: 'Tell me about a real decision.',
  teacher_note: 'SECRET-ONLY-FOR-TEACHER',
});
assert.deepEqual(validateStudioBlock(oral), []);
const oralQuestion = compileStudioBlock(oral, { document: createStudioDocument({ level: 'B2' }), clientKey: 'test_oral', blockIndex: 0 });
assert.equal(oralQuestion.type, 'content_block');
assert.equal(oralQuestion.grading.mode, 'ungraded');
assert.ok(!JSON.stringify(oralQuestion).includes('SECRET-ONLY-FOR-TEACHER'), 'Teacher notes must be private.');

const imported = parseStudioImport(JSON.stringify({
  _template: { template_id: 'sblocco-grammar-in-action', template_version: 1, authoring_contract_version: 1 },
  activity: {
    internal_title: 'A1 · Imported grammar',
    level: 'A1', topic: 'present_simple', activity_type: 'exercise',
    blocks: [
      { type: 'sentence_construction', mode: 'tiles', prompt: 'Ask about work.', chunks: ['Does', 'she', 'work', 'here'], terminal_punctuation: '?' },
    ],
  },
}));
assert.equal(imported.document.blocks[0].type, 'grammar_construction');
assert.equal(imported.publishable, true, JSON.stringify(imported.errors));
assert.equal(imported.needs_attention_blocks, 0);

const learner = readFileSync(new URL('../src/components/exercises/ExerciseQuestionRenderer.jsx', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../src/components/admin/exercise-studio/StudioBlockEditor.jsx', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../src/pages/AdminExerciseStudio.jsx', import.meta.url), 'utf8');
assert.ok(learner.includes('GrammarConstructionRenderer'), 'Learner renderer missing.');
assert.ok(editor.includes('StudioGrammarConstructionEditor'), 'Visual authoring editor missing.');
assert.ok(preview.includes('Try as learner'), 'Interactive preview missing.');

console.log('Grammar in Action: registry, five samples, compile, grading, import, privacy and preview passed.');
