import { addStudioBlock, normalizeStudioDocument } from './exerciseStudioDocument.js';
import { getStudioBlockDefinition } from './exerciseStudioBlockRegistry.js';

export const STUDIO_RECIPES = Object.freeze([
  {
    id: 'quick_lesson',
    eyebrow: 'Fast lesson',
    label: 'Quick teaching arc',
    description: 'A compact lesson that moves from context to useful language, a quick check and learner output.',
    sequence: 'Context → Language → Check → Use → Recap',
    activity_type: 'lesson',
    blocks: [
      { type: 'dialogue', initial: { title: '1 · Set the scene', body: '' } },
      { type: 'language_bank', initial: { title: '2 · Give useful language', body: '', items: [] } },
      { type: 'multiple_choice_set', initial: { title: '3 · Quick check', prompt: 'Choose the best answer in each example.', instructions: 'Complete every item before checking feedback.' } },
      { type: 'written_response', initial: { title: '4 · Make it yours', prompt: 'Respond to a realistic situation using the language from this lesson.', min_words: 35, max_words: 90, required_points: ['Use at least one useful expression from the lesson'] } },
      { type: 'recap', initial: { title: '5 · Takeaway', body: '' } },
    ],
  },
  {
    id: 'grammar_arc',
    eyebrow: 'Grammar',
    label: 'Teach → practise → use',
    description: 'A complete grammar mini-lesson without making you manually assemble the learning sequence.',
    sequence: 'Explain → Examples → Check → Rebuild → Produce',
    activity_type: 'mini_course',
    blocks: [
      { type: 'explanation', initial: { title: '1 · Make the idea clear', body: '' } },
      { type: 'examples', initial: { title: '2 · Notice it in context', examples: [] } },
      { type: 'multiple_choice_set', initial: { title: '3 · Check the distinction', prompt: 'Choose the best answer in each example.', instructions: 'Complete every item before checking feedback.' } },
      { type: 'word_order', initial: { title: '4 · Build it', prompt: 'Put the chunks in the correct order.', chunks: [] } },
      { type: 'written_response', initial: { title: '5 · Use it for real', prompt: 'Use the target language in a short realistic response.', min_words: 40, max_words: 100, required_points: ['Use the target structure accurately', 'Make the answer meaningful rather than mechanical'] } },
    ],
  },
  {
    id: 'listening_arc',
    eyebrow: 'Listening',
    label: 'Listen → notice → respond',
    description: 'A listening lesson with media, useful language, comprehension and a final response already sequenced.',
    sequence: 'Context → Media → Notice → Check → Respond',
    activity_type: 'listening_lesson',
    blocks: [
      { type: 'dialogue', initial: { title: '1 · Before you listen', body: '' } },
      { type: 'media', initial: { title: '2 · Listen / watch', transcript_visibility: 'after_submit' } },
      { type: 'vocabulary', initial: { title: '3 · Notice useful language', body: '', items: [] } },
      { type: 'multiple_choice_set', initial: { title: '4 · Check understanding', prompt: 'Answer the questions about what you heard.', instructions: 'Complete every item before checking feedback.' } },
      { type: 'written_response', initial: { title: '5 · Respond', prompt: 'React to the listening in your own words.', min_words: 40, max_words: 100, required_points: ['Refer to at least one idea from the listening'] } },
    ],
  },
  {
    id: 'vocabulary_to_use',
    eyebrow: 'Vocabulary',
    label: 'Vocabulary that becomes usable',
    description: 'Moves new words and chunks from noticing into selection, recall and personal production.',
    sequence: 'Teach → Bank → Choose → Recall → Use',
    activity_type: 'vocabulary_exercise',
    blocks: [
      { type: 'vocabulary', initial: { title: '1 · Meet the language', body: '', items: [] } },
      { type: 'language_bank', initial: { title: '2 · See the language together', body: '', items: [] } },
      { type: 'practice_selection', initial: { title: '3 · What is useful to you?', prompt: 'Select the words or chunks you want to remember.', selection_mode: 'multiple', options: [] } },
      { type: 'translation', initial: { title: '4 · Retrieve it', prompt: 'Translate the idea using the target language.', accepted_answers: [] } },
      { type: 'written_response', initial: { title: '5 · Put it to work', prompt: 'Write a short real-life response using the new vocabulary.', min_words: 35, max_words: 90, required_points: ['Use at least two target words or chunks naturally'] } },
    ],
  },
]);

export function getStudioRecipe(recipeId) {
  return STUDIO_RECIPES.find((recipe) => recipe.id === recipeId) || null;
}

export function applyStudioRecipe(rawDocument, recipeId) {
  const recipe = getStudioRecipe(recipeId);
  if (!recipe) throw new Error('Unknown Studio recipe: ' + recipeId);

  let next = {
    ...rawDocument,
    activity_type: recipe.activity_type,
    status: rawDocument?.status === 'published' ? 'draft' : (rawDocument?.status || 'draft'),
  };

  for (const spec of recipe.blocks) {
    next = addStudioBlock(next, spec.type, spec.initial || {}, spec.presetId || null);
  }

  return normalizeStudioDocument(next).document;
}

export function buildStudioActivityPulse(rawDocument) {
  const document = normalizeStudioDocument(rawDocument).document;
  const counts = { teach: 0, practice: 0, produce: 0, media: 0, total: document.blocks.length };

  for (const block of document.blocks) {
    const category = getStudioBlockDefinition(block.type)?.category;
    if (category === 'theory') counts.teach += 1;
    if (category === 'practice') counts.practice += 1;
    if (category === 'production') counts.produce += 1;
    if (category === 'media') counts.media += 1;
  }

  let suggestion = null;
  if (!counts.total) {
    suggestion = { type: null, label: 'Choose a recipe or add your first block.', action: null };
  } else if (counts.media > 0 && counts.practice === 0) {
    suggestion = { type: 'multiple_choice_set', label: 'The media is ready. Add a comprehension check next.', action: 'Add comprehension' };
  } else if (counts.teach > 0 && counts.practice === 0) {
    suggestion = { type: 'multiple_choice_set', label: 'You have taught it. Give the learner a chance to practise it.', action: 'Add practice' };
  } else if (counts.practice > 0 && counts.teach === 0 && counts.media === 0) {
    suggestion = { type: 'explanation', label: 'The learner is practising without a teaching anchor. Add a short explanation or language bank.', action: 'Add teaching' };
  } else if (counts.practice > 0 && counts.produce === 0) {
    suggestion = { type: 'written_response', label: 'Practice is covered. Add one moment where the learner has to produce language.', action: 'Add production' };
  }

  const complete = counts.practice > 0 && counts.produce > 0 && (counts.teach > 0 || counts.media > 0);
  if (complete) {
    suggestion = { type: null, label: 'Strong learning arc: the learner meets language, practises it and has to use it.', action: null };
  }

  return {
    counts,
    complete,
    suggestion,
    stages: [
      { key: 'teach', label: 'Teach', count: counts.teach },
      { key: 'practice', label: 'Practice', count: counts.practice },
      { key: 'produce', label: 'Produce', count: counts.produce },
    ],
  };
}
