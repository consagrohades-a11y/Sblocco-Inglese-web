import { EXERCISE_BUILDER_LEVELS } from './exerciseBuilderSchemaV2.js';

export const STUDIO_BLOCK_REGISTRY_VERSION = 1;

const text = (value) => typeof value === 'string' ? value.trim() : '';
const list = (value) => Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const slug = (value, fallback = 'item') => text(value)
  .toLocaleLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 64) || fallback;

function optionList(value) {
  const source = Array.isArray(value) ? value : [];
  const usedKeys = new Set();
  return source.map((item, index) => {
    const fallbackKey = 'option_' + (index + 1);
    const requestedKey = typeof item === 'string' ? '' : text(item?.key);
    let key = requestedKey || fallbackKey;
    if (usedKeys.has(key)) key = fallbackKey;
    while (usedKeys.has(key)) key += '_';
    usedKeys.add(key);

    if (typeof item === 'string') return { key, text: item.trim(), is_correct: false };
    return {
      key,
      text: text(item?.text),
      is_correct: Boolean(item?.is_correct),
      feedback: text(item?.feedback) || null,
    };
  }).filter((item) => item.text);
}

function normalizeRubric(value) {
  const source = Array.isArray(value) && value.length ? value : [
    { key: 'task', label: 'Consegna', max_points: 4 },
    { key: 'accuracy', label: 'Accuratezza', max_points: 3 },
    { key: 'range', label: 'Lessico e registro', max_points: 3 },
  ];
  return source.map((item, index) => ({
    key: text(item?.key) || 'criterion_' + (index + 1),
    label: text(item?.label) || 'Criterio ' + (index + 1),
    description: text(item?.description) || null,
    max_points: Number(item?.max_points) > 0 ? Number(item.max_points) : 1,
  }));
}

function commonQuestion(block, context, overrides = {}) {
  const meta = context.document;
  const primarySkill = text(block.primary_skill) || text(overrides.primary_skill) || 'grammar';
  return {
    client_key: context.clientKey,
    type: overrides.type,
    title: text(block.title) || overrides.title || context.definition.label,
    prompt: text(block.prompt) || overrides.prompt || text(block.title) || context.definition.label,
    instructions: text(block.instructions) || overrides.instructions || '',
    instruction_language: text(block.instruction_language) || meta.settings.instruction_language || 'it',
    level: EXERCISE_BUILDER_LEVELS.includes(block.level) ? block.level : meta.level,
    topic: text(block.topic) || meta.topic || 'general_english',
    subtopic: text(block.subtopic) || meta.subtopic || null,
    primary_skill: primarySkill,
    learning_objective: text(block.learning_objective) || overrides.learning_objective || 'Practise the target language accurately in context.',
    difficulty: text(block.difficulty) || 'standard',
    content: overrides.content || {},
    grading: overrides.grading || { mode: 'automatic', weight: 1, nearly_correct_multiplier: 0.5 },
    feedback: {
      explanation: text(block.feedback?.explanation || block.explanation) || null,
    },
    diagnostics: {
      tested_codes: list(block.diagnostics?.tested_codes),
      fallback_error_code: text(block.diagnostics?.fallback_error_code) || null,
    },
    tags: [...new Set([...meta.tags, ...list(block.tags), primarySkill])],
    foundation_links: [],
  };
}

function theoryQuestion(block, context, presentation, content = {}) {
  return commonQuestion(block, context, {
    type: 'content_block',
    primary_skill: text(block.primary_skill) || 'reading',
    learning_objective: text(block.learning_objective) || 'Understand the teaching point before practice.',
    prompt: text(block.title) || context.definition.label,
    content: {
      presentation,
      heading: text(block.title) || null,
      body: text(block.body),
      ...content,
    },
    grading: { mode: 'automatic', weight: 0, nearly_correct_multiplier: 0.5 },
  });
}

function issue(code, message, field, severity = 'error') {
  return { code, message, field, severity };
}

function requiredText(block, field, label) {
  return text(block[field]) ? [] : [issue('required', label + ' is required.', field)];
}

function definition(config) {
  return Object.freeze({
    ...config,
    capabilities: {
      automaticGrading: false,
      manualReview: false,
      media: false,
      learnerRenderer: 'exercise_question',
      ...config.capabilities,
    },
  });
}

export const STUDIO_BLOCK_REGISTRY = Object.freeze({
  explanation: definition({
    type: 'explanation', label: 'Explanation', category: 'theory',
    createDefault: () => ({ title: '', body: '' }),
    normalize: (block) => ({ ...block, title: text(block.title), body: text(block.body) }),
    validate: (block) => requiredText(block, 'body', 'Explanation text'),
    compile: (block, context) => theoryQuestion(block, context, 'explanation'),
  }),
  rule: definition({
    type: 'rule', label: 'Rule / Pattern', category: 'theory',
    createDefault: () => ({ title: '', body: '', examples: [] }),
    normalize: (block) => ({ ...block, title: text(block.title), body: text(block.body), examples: list(block.examples) }),
    validate: (block) => requiredText(block, 'body', 'Rule'),
    compile: (block, context) => theoryQuestion(block, context, 'rule', { examples: list(block.examples) }),
  }),
  examples: definition({
    type: 'examples', label: 'Examples', category: 'theory',
    createDefault: () => ({ title: '', examples: [] }),
    normalize: (block) => ({ ...block, title: text(block.title), examples: list(block.examples) }),
    validate: (block) => list(block.examples).length ? [] : [issue('required', 'Add at least one example.', 'examples')],
    compile: (block, context) => theoryQuestion(block, context, 'examples', { examples: list(block.examples) }),
  }),
  do_dont: definition({
    type: 'do_dont', label: "Do / Don't", category: 'theory',
    createDefault: () => ({ title: '', wrong: '', correct: '', why: '' }),
    normalize: (block) => ({ ...block, title: text(block.title), wrong: text(block.wrong), correct: text(block.correct), why: text(block.why) }),
    validate: (block) => [
      ...requiredText(block, 'wrong', "DON'T example"),
      ...requiredText(block, 'correct', 'DO example'),
      ...requiredText(block, 'why', 'Explanation'),
    ],
    compile: (block, context) => theoryQuestion({ ...block, body: block.why }, context, 'common_error', {
      wrong: text(block.wrong),
      correct: text(block.correct),
    }),
  }),
  contrast: definition({
    type: 'contrast', label: 'Contrast', category: 'theory',
    createDefault: () => ({ title: '', left_label: '', left_body: '', right_label: '', right_body: '', body: '' }),
    normalize: (block) => ({
      ...block,
      title: text(block.title), body: text(block.body),
      left_label: text(block.left_label), left_body: text(block.left_body),
      right_label: text(block.right_label), right_body: text(block.right_body),
    }),
    validate: (block) => [
      ...requiredText(block, 'left_body', 'First contrast'),
      ...requiredText(block, 'right_body', 'Second contrast'),
    ],
    compile: (block, context) => theoryQuestion(block, context, 'contrast', {
      left_label: text(block.left_label) || 'A',
      left_body: text(block.left_body),
      right_label: text(block.right_label) || 'B',
      right_body: text(block.right_body),
    }),
  }),
  vocabulary: definition({
    type: 'vocabulary', label: 'Vocabulary', category: 'theory',
    createDefault: () => ({ title: '', body: '', items: [] }),
    normalize: (block) => ({
      ...block,
      title: text(block.title), body: text(block.body),
      items: (Array.isArray(block.items) ? block.items : []).map((item) => ({
        term: text(item?.term),
        meaning: text(item?.meaning),
        translation: text(item?.translation),
        example: text(item?.example),
      })).filter((item) => item.term),
    }),
    validate: (block) => Array.isArray(block.items) && block.items.some((item) => text(item?.term))
      ? [] : [issue('required', 'Add at least one vocabulary item.', 'items')],
    compile: (block, context) => theoryQuestion(block, context, 'vocabulary', {
      items: (block.items || []).map((item) => {
        const parts = [item.term, item.meaning || item.translation, item.example].filter(Boolean);
        return parts.join(' — ');
      }),
      entries: block.items || [],
    }),
  }),
  language_bank: definition({
    type: 'language_bank', label: 'Language Bank', category: 'theory',
    createDefault: () => ({ title: '', body: '', items: [] }),
    normalize: (block) => ({ ...block, title: text(block.title), body: text(block.body), items: list(block.items) }),
    validate: (block) => list(block.items).length ? [] : [issue('required', 'Add at least one useful expression.', 'items')],
    compile: (block, context) => theoryQuestion(block, context, 'language_bank', { items: list(block.items) }),
  }),
  dialogue: definition({
    type: 'dialogue', label: 'Dialogue / Context', category: 'theory',
    createDefault: () => ({ title: '', body: '', turns: [] }),
    normalize: (block) => ({
      ...block,
      title: text(block.title), body: text(block.body),
      turns: (Array.isArray(block.turns) ? block.turns : []).map((turn) => ({
        speaker: text(turn?.speaker),
        text: text(turn?.text),
      })).filter((turn) => turn.speaker && turn.text),
    }),
    validate: (block) => (block.turns || []).length >= 2 ? [] : [issue('required', 'Dialogue needs at least two turns.', 'turns')],
    compile: (block, context) => theoryQuestion({
      ...block,
      body: text(block.body),
    }, context, 'dialogue', { turns: block.turns || [] }),
  }),
  tip: definition({
    type: 'tip', label: 'Tip / Strategy', category: 'theory',
    createDefault: () => ({ title: '', body: '' }),
    normalize: (block) => ({ ...block, title: text(block.title), body: text(block.body) }),
    validate: (block) => requiredText(block, 'body', 'Tip'),
    compile: (block, context) => theoryQuestion(block, context, 'teacher_tip'),
  }),
  pronunciation: definition({
    type: 'pronunciation', label: 'Pronunciation', category: 'theory',
    createDefault: () => ({ title: '', body: '', items: [] }),
    normalize: (block) => ({ ...block, title: text(block.title), body: text(block.body), items: list(block.items) }),
    validate: (block) => text(block.body) || list(block.items).length ? [] : [issue('required', 'Add pronunciation guidance.', 'body')],
    compile: (block, context) => theoryQuestion(block, context, 'pronunciation', { items: list(block.items) }),
  }),
  recap: definition({
    type: 'recap', label: 'Recap / Checklist', category: 'theory',
    createDefault: () => ({ title: '', body: '', items: [] }),
    normalize: (block) => ({ ...block, title: text(block.title), body: text(block.body), items: list(block.items) }),
    validate: (block) => text(block.body) || list(block.items).length ? [] : [issue('required', 'Add at least one recap point.', 'items')],
    compile: (block, context) => theoryQuestion(block, context, 'recap', { items: list(block.items) }),
  }),
  media: definition({
    type: 'media', label: 'Listening / Video', category: 'media',
    capabilities: { media: true, learnerRenderer: 'exercise_media' },
    createDefault: () => ({
      title: '', instructions: '', source_type: 'audio', url: '', storage_bucket: '', storage_path: '',
      transcript: '', transcript_visibility: 'after_submit', start_seconds: 0, end_seconds: null,
    }),
    normalize: (block) => ({
      ...block,
      title: text(block.title),
      instructions: text(block.instructions),
      source_type: ['audio', 'video', 'youtube'].includes(block.source_type) ? block.source_type : 'audio',
      url: text(block.url),
      storage_bucket: text(block.storage_bucket),
      storage_path: text(block.storage_path),
      transcript: text(block.transcript),
      transcript_visibility: ['after_submit', 'always', 'never'].includes(block.transcript_visibility) ? block.transcript_visibility : 'after_submit',
      start_seconds: Math.max(0, Number(block.start_seconds) || 0),
      end_seconds: Number(block.end_seconds) > 0 ? Number(block.end_seconds) : null,
    }),
    validate: (block) => {
      const issues = [];
      if (!text(block.url) && !text(block.storage_path)) issues.push(issue('required', 'Add a media URL or uploaded Storage path.', 'url'));
      if (text(block.storage_path) && !text(block.storage_bucket)) issues.push(issue('required', 'Storage bucket is required for an uploaded media file.', 'storage_bucket'));
      if (text(block.url) && !/^https:\/\//i.test(text(block.url))) issues.push(issue('invalid_url', 'Media URL must use HTTPS.', 'url'));
      if (block.end_seconds != null && Number(block.end_seconds) <= Number(block.start_seconds || 0)) {
        issues.push(issue('invalid_range', 'Clip end must come after clip start.', 'end_seconds'));
      }
      return issues;
    },
    compile: (block, context) => theoryQuestion({ ...block, body: '' }, context, 'media', {
      media: {
        source_type: block.source_type,
        url: block.url || null,
        storage_bucket: block.storage_bucket || null,
        storage_path: block.storage_path || null,
        transcript: block.transcript || null,
        transcript_visibility: block.transcript_visibility,
        start_seconds: block.start_seconds || 0,
        end_seconds: block.end_seconds,
      },
    }),
  }),
  practice_selection: definition({
    type: 'practice_selection', label: 'Selection · no correct answer', category: 'practice',
    capabilities: { automaticGrading: false },
    createDefault: () => ({
      title: '',
      prompt: '',
      instructions: 'Seleziona ciò che ti rappresenta.',
      primary_skill: 'vocabulary',
      learning_objective: 'Notice and select useful language without right-or-wrong grading.',
      selection_mode: 'multiple',
      options: [],
    }),
    normalize: (block) => ({
      ...block,
      title: text(block.title),
      prompt: text(block.prompt),
      instructions: text(block.instructions),
      selection_mode: ['single', 'multiple'].includes(block.selection_mode) ? block.selection_mode : 'multiple',
      options: list(block.options),
    }),
    validate: (block) => {
      const issues = [];
      if (!text(block.prompt)) issues.push(issue('required', 'Selection prompt is required.', 'prompt'));
      if (list(block.options).length < 2) issues.push(issue('minimum', 'Add at least two selectable options.', 'options'));
      return issues;
    },
    compile: (block, context) => commonQuestion(block, context, {
      type: 'practice_selection',
      primary_skill: text(block.primary_skill) || 'vocabulary',
      content: {
        selection_mode: block.selection_mode,
        options: list(block.options).map((option, index) => ({
          key: 'option_' + (index + 1),
          text: option,
        })),
      },
      grading: { mode: 'ungraded', weight: 0, nearly_correct_multiplier: 0 },
    }),
  }),
  translation: definition({
    type: 'translation', label: 'Open Answer / Translation', category: 'practice',
    capabilities: { automaticGrading: true },
    createDefault: () => ({
      title: '',
      prompt: '',
      instructions: 'Traduci o rispondi con una frase naturale.',
      primary_skill: 'grammar',
      learning_objective: '',
      accepted_answers: [],
      feedback: { explanation: '' },
    }),
    normalize: (block) => ({
      ...block,
      title: text(block.title),
      prompt: text(block.prompt),
      instructions: text(block.instructions),
      accepted_answers: list(block.accepted_answers),
      feedback: { explanation: text(block.feedback?.explanation) },
    }),
    validate: (block) => {
      const issues = [];
      if (!text(block.prompt)) issues.push(issue('required', 'Open-answer prompt is required.', 'prompt'));
      if (!list(block.accepted_answers).length) issues.push(issue('accepted_answer', 'Add at least one accepted answer.', 'accepted_answers'));
      return issues;
    },
    compile: (block, context) => commonQuestion(block, context, {
      type: 'translation',
      content: { accepted_answers: list(block.accepted_answers) },
      grading: { mode: 'automatic', weight: 1, nearly_correct_multiplier: 0.5 },
    }),
  }),
  multiple_choice: definition({
    type: 'multiple_choice', label: 'Multiple Choice', category: 'practice',
    capabilities: { automaticGrading: true },
    createDefault: () => ({ title: '', prompt: '', instructions: 'Scegli una risposta.', primary_skill: 'grammar', learning_objective: '', options: [
      { key: 'option_1', text: '', is_correct: true },
      { key: 'option_2', text: '', is_correct: false },
      { key: 'option_3', text: '', is_correct: false },
    ] }),
    normalize: (block) => ({ ...block, title: text(block.title), prompt: text(block.prompt), instructions: text(block.instructions), options: optionList(block.options) }),
    validate: (block) => {
      const options = optionList(block.options);
      const issues = [];
      if (!text(block.prompt)) issues.push(issue('required', 'Question prompt is required.', 'prompt'));
      if (options.length < 2) issues.push(issue('minimum', 'Add at least two answer options.', 'options'));
      if (options.filter((item) => item.is_correct).length !== 1) issues.push(issue('correct_answer', 'Choose exactly one correct answer.', 'options'));
      return issues;
    },
    compile: (block, context) => commonQuestion(block, context, {
      type: 'multiple_choice',
      title: 'Multiple choice',
      content: { options: optionList(block.options) },
    }),
  }),
  gap_fill: definition({
    type: 'gap_fill', label: 'Fill the Gap', category: 'practice',
    capabilities: { automaticGrading: true },
    createDefault: () => ({ title: '', prompt: 'Complete the sentence.', instructions: 'Scrivi la risposta mancante.', primary_skill: 'grammar', learning_objective: '', text_template: '', blanks: [
      { key: 'blank_1', accepted_answers: [] },
    ] }),
    normalize: (block) => ({
      ...block,
      title: text(block.title), prompt: text(block.prompt), instructions: text(block.instructions),
      text_template: text(block.text_template),
      blanks: (Array.isArray(block.blanks) ? block.blanks : []).map((blank, index) => ({
        key: 'blank_' + (index + 1),
        accepted_answers: list(blank?.accepted_answers),
        points: Number(blank?.points) > 0 ? Number(blank.points) : 1,
      })),
    }),
    validate: (block) => {
      const issues = [];
      if (!text(block.text_template)) issues.push(issue('required', 'Gap text is required.', 'text_template'));
      if (!Array.isArray(block.blanks) || !block.blanks.length) issues.push(issue('required', 'Add at least one gap.', 'blanks'));
      (block.blanks || []).forEach((blank, index) => {
        if (!list(blank.accepted_answers).length) issues.push(issue('accepted_answer', 'Gap ' + (index + 1) + ' needs at least one accepted answer.', 'blanks.' + index));
      });
      return issues;
    },
    compile: (block, context) => commonQuestion(block, context, {
      type: 'gap_fill',
      content: {
        text_template: block.text_template,
        blanks: (block.blanks || []).map((blank) => ({
          key: blank.key,
          accepted_answers: blank.accepted_answers,
          points: blank.points || 1,
          feedback: {},
          answer_error_mappings: [],
        })),
      },
      grading: { mode: 'per_blank', weight: 1, nearly_correct_multiplier: 0.5 },
    }),
  }),
  word_order: definition({
    type: 'word_order', label: 'Word Order', category: 'practice',
    capabilities: { automaticGrading: true },
    createDefault: () => ({ title: '', prompt: 'Put the chunks in order.', instructions: 'Riordina tutti gli elementi.', primary_skill: 'word_order', learning_objective: '', chunks: [], terminal_punctuation: '' }),
    normalize: (block) => ({
      ...block,
      title: text(block.title), prompt: text(block.prompt), instructions: text(block.instructions),
      chunks: list(block.chunks || block.correct_order),
      terminal_punctuation: text(block.terminal_punctuation),
    }),
    validate: (block) => {
      const chunks = list(block.chunks);
      const issues = [];
      if (chunks.length < 2) issues.push(issue('minimum', 'Word order needs at least two movable chunks.', 'chunks'));
      if (block.terminal_punctuation && !/^[.!?]+$/.test(block.terminal_punctuation)) {
        issues.push(issue('punctuation', 'Terminal punctuation can only be ., ! or ?.', 'terminal_punctuation'));
      }
      return issues;
    },
    compile: (block, context) => commonQuestion(block, context, {
      type: 'word_order',
      primary_skill: 'word_order',
      content: {
        tokens: block.chunks,
        correct_order: block.chunks,
        terminal_punctuation: block.terminal_punctuation || null,
        shuffle_strategy: 'stable_attempt',
      },
    }),
  }),
  written_response: definition({
    type: 'written_response', label: 'Written Response', category: 'production',
    capabilities: { manualReview: true },
    createDefault: () => ({
      title: '', prompt: '', instructions: 'Scrivi la tua risposta.', primary_skill: 'writing', learning_objective: '',
      context: '', context_situation: '', context_role: '', context_audience: '', context_goal: '',
      min_words: 40, max_words: 120, required_points: [], rubric: normalizeRubric([]),
    }),
    normalize: (block) => {
      const minWords = positiveInteger(block.min_words, 40);
      const contextSituation = text(block.context_situation || block.context);
      return {
        ...block,
        title: text(block.title), prompt: text(block.prompt), instructions: text(block.instructions),
        context: contextSituation,
        context_situation: contextSituation,
        context_role: text(block.context_role),
        context_audience: text(block.context_audience),
        context_goal: text(block.context_goal),
        min_words: minWords,
        max_words: Math.max(minWords, positiveInteger(block.max_words, Math.max(80, minWords))),
        required_points: list(block.required_points),
        rubric: normalizeRubric(block.rubric),
      };
    },
    validate: (block) => {
      const issues = [];
      if (!text(block.prompt)) issues.push(issue('required', 'Writing prompt is required.', 'prompt'));
      if (Number(block.max_words) < Number(block.min_words)) issues.push(issue('word_limit', 'Maximum words must be at least minimum words.', 'max_words'));
      return issues;
    },
    compile: (block, context) => commonQuestion(block, context, {
      type: 'written_response',
      primary_skill: 'writing',
      content: {
        context: block.context_situation || block.context || null,
        context_sections: {
          situation: block.context_situation || block.context || null,
          role: block.context_role || null,
          audience: block.context_audience || null,
          goal: block.context_goal || null,
        },
        min_words: block.min_words,
        max_words: block.max_words,
        required_points: block.required_points,
        rubric: block.rubric,
        model_answer: null,
      },
      grading: { mode: 'manual_review', weight: block.rubric.reduce((sum, item) => sum + Number(item.max_points || 0), 0) || 10 },
    }),
  }),
});

export const STUDIO_BLOCK_TYPES = Object.freeze(Object.keys(STUDIO_BLOCK_REGISTRY));

export function getStudioBlockDefinition(type) {
  return STUDIO_BLOCK_REGISTRY[type] || null;
}

export function createDefaultStudioBlock(type) {
  const block = getStudioBlockDefinition(type);
  if (!block) throw new Error('Unsupported Studio block type: ' + type);
  return { type, ...block.createDefault() };
}

export function normalizeStudioBlock(block) {
  const source = object(block);
  const definition = getStudioBlockDefinition(source.type);
  return definition ? definition.normalize({ ...source, type: source.type }) : { ...source };
}

export function validateStudioBlock(block) {
  const definition = getStudioBlockDefinition(block?.type);
  if (!definition) return [issue('unsupported_block', 'Unsupported Studio block type: ' + (block?.type || 'missing'), 'type')];
  return definition.validate(block);
}

export function compileStudioBlock(block, context) {
  const definition = getStudioBlockDefinition(block?.type);
  if (!definition) throw new Error('Unsupported Studio block type: ' + (block?.type || 'missing'));
  return definition.compile(block, { ...context, definition });
}

export function listStudioBlocksByCategory() {
  return STUDIO_BLOCK_TYPES.reduce((groups, type) => {
    const definition = STUDIO_BLOCK_REGISTRY[type];
    groups[definition.category] ||= [];
    groups[definition.category].push(definition);
    return groups;
  }, {});
}

export function studioSlug(value, fallback) {
  return slug(value, fallback);
}
