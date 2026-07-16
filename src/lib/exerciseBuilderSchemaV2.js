export const EXERCISE_BUILDER_SCHEMA_VERSION = 2;
export const EXERCISE_BUILDER_SUPPORTED_SCHEMA_VERSIONS = [1, 2];

export const EXERCISE_BUILDER_LEVELS = ['A0', 'A1', 'A1+', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2', 'Mixed'];
export const EXERCISE_BUILDER_QUESTION_TYPES = [
  'multiple_choice',
  'multiple_select',
  'gap_fill',
  'select_gap',
  'translation',
  'error_correction',
  'word_order',
  'content_block',
  'dialogue_choice',
  'written_response',
  'dialogue_roleplay',
  'audio_response',
  'reading_comprehension',
];
export const EXERCISE_BUILDER_SKILLS = [
  'grammar',
  'vocabulary',
  'reading',
  'writing',
  'functional_language',
  'spelling',
  'word_order',
  'speaking',
  'listening',
  'interaction',
];

const TOP_LEVEL_TYPES = ['question', 'question_pool', 'exercise', 'bundle'];
const FEEDBACK_TIMINGS = ['section_end', 'exercise_end', 'hidden'];
const DISPLAY_MODES = ['one_at_a_time', 'all_questions'];
const SELECTION_MODES = ['fixed', 'pool', 'mixed'];
const SELECTION_STRATEGIES = ['random', 'avoid_recent', 'unseen_first', 'balanced'];
const READING_ITEM_TYPES = ['multiple_choice', 'multiple_select', 'true_false', 'short_answer'];
const MANUAL_TYPES = new Set(['written_response', 'dialogue_roleplay', 'audio_response']);
const TECHNICAL_ID_KEYS = new Set([
  'id', 'public_id', 'public_number', 'question_id', 'pool_id', 'exercise_id',
  'version_id', 'created_by', 'approved_by',
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function positiveNumber(value, fallback = 1) {
  const parsed = number(value, fallback);
  return parsed > 0 ? parsed : fallback;
}

function integer(value, fallback = null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function pathMessage(path, message) {
  return path ? `${path}: ${message}` : message;
}

function stripTechnicalIds(value) {
  if (Array.isArray(value)) return value.map(stripTechnicalIds);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !TECHNICAL_ID_KEYS.has(key))
      .map(([key, child]) => [key, stripTechnicalIds(child)]),
  );
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(text).filter(Boolean))];
}

function validateLevel(value, errors, path) {
  if (!EXERCISE_BUILDER_LEVELS.includes(value)) {
    errors.push(pathMessage(path, `livello non valido. Usa ${EXERCISE_BUILDER_LEVELS.join(', ')}.`));
  }
}

function normalizeOption(option, index) {
  if (typeof option === 'string') return { key: `option_${index + 1}`, text: option.trim(), is_correct: false };
  return {
    key: text(option?.key) || `option_${index + 1}`,
    text: text(option?.text),
    is_correct: Boolean(option?.is_correct),
    error_code: text(option?.error_code) || null,
  };
}

function normalizeRubric(value, errors, path) {
  const source = Array.isArray(value) ? value : [];
  const rubric = source.map((criterion, index) => {
    const key = text(criterion?.key) || `criterion_${index + 1}`;
    const label = text(criterion?.label);
    const maxPoints = positiveNumber(criterion?.max_points, 1);
    if (!label) errors.push(pathMessage(`${path}[${index}]`, 'label obbligatoria.'));
    return {
      key,
      label,
      description: text(criterion?.description) || null,
      max_points: maxPoints,
    };
  });
  if (!rubric.length) errors.push(pathMessage(path, 'serve almeno un criterio di valutazione.'));
  return rubric;
}

function normalizeReadingItem(rawItem, index, errors, path) {
  const type = text(rawItem?.type) || 'short_answer';
  const key = text(rawItem?.key) || `item_${index + 1}`;
  const prompt = text(rawItem?.prompt);
  const points = positiveNumber(rawItem?.points, 1);
  if (!READING_ITEM_TYPES.includes(type)) errors.push(pathMessage(path, `type non valido. Usa ${READING_ITEM_TYPES.join(', ')}.`));
  if (!prompt) errors.push(pathMessage(path, 'prompt obbligatorio.'));

  if (type === 'multiple_choice' || type === 'multiple_select' || type === 'true_false') {
    const fallbackOptions = type === 'true_false'
      ? [{ key: 'true', text: 'Vero', is_correct: false }, { key: 'false', text: 'Falso', is_correct: false }]
      : [];
    const options = (Array.isArray(rawItem?.options) ? rawItem.options : fallbackOptions)
      .map(normalizeOption)
      .filter((option) => option.text);
    const correctCount = options.filter((option) => option.is_correct).length;
    if (options.length < 2) errors.push(pathMessage(path, 'servono almeno due opzioni.'));
    if (type !== 'multiple_select' && correctCount !== 1) errors.push(pathMessage(path, 'serve esattamente una risposta corretta.'));
    if (type === 'multiple_select' && correctCount < 1) errors.push(pathMessage(path, 'serve almeno una risposta corretta.'));
    return { key, type, prompt, points, options };
  }

  const acceptedAnswers = stringArray(rawItem?.accepted_answers || rawItem?.answers);
  if (!acceptedAnswers.length) errors.push(pathMessage(path, 'accepted_answers obbligatorio.'));
  return { key, type, prompt, points, accepted_answers: acceptedAnswers };
}

function validateQuestion(rawQuestion, path = 'question', schemaVersion = 2) {
  const errors = [];
  const warnings = [];
  const source = stripTechnicalIds(isObject(rawQuestion) ? rawQuestion : {});
  const questionType = text(source.type || source.question_type);
  const instructionLanguage = text(source.instruction_language) || 'it';
  const level = text(source.level);
  const prompt = text(source.prompt || source.body);
  const primarySkill = text(source.primary_skill);
  const topic = text(source.topic);
  const learningObjective = text(source.learning_objective);
  const tags = stringArray(source.tags);
  const content = isObject(source.content) ? { ...source.content } : {};
  const grading = isObject(source.grading) ? { ...source.grading } : {};
  const feedback = isObject(source.feedback) ? { ...source.feedback } : {};
  const diagnostics = isObject(source.diagnostics) ? { ...source.diagnostics } : {};

  if (!EXERCISE_BUILDER_QUESTION_TYPES.includes(questionType)) {
    errors.push(pathMessage(path, `type non valido. Usa ${EXERCISE_BUILDER_QUESTION_TYPES.join(', ')}.`));
  }
  if (schemaVersion === 1 && ['dialogue_choice', 'written_response', 'dialogue_roleplay', 'audio_response', 'reading_comprehension'].includes(questionType)) {
    errors.push(pathMessage(path, 'i nuovi tipi di produzione e comprensione richiedono schema_version 2.'));
  }
  if (!prompt) errors.push(pathMessage(path, 'prompt obbligatorio.'));
  if (!level) errors.push(pathMessage(path, 'level obbligatorio.'));
  else validateLevel(level, errors, `${path}.level`);
  if (!['it', 'en'].includes(instructionLanguage)) errors.push(pathMessage(path, 'instruction_language deve essere "it" oppure "en".'));

  const isEvaluated = questionType && questionType !== 'content_block';
  if (isEvaluated) {
    if (!primarySkill) errors.push(pathMessage(path, 'primary_skill obbligatorio.'));
    else if (!EXERCISE_BUILDER_SKILLS.includes(primarySkill)) errors.push(pathMessage(path, `primary_skill non valido. Usa ${EXERCISE_BUILDER_SKILLS.join(', ')}.`));
    if (!topic) errors.push(pathMessage(path, 'topic obbligatorio per la diagnostica.'));
    if (!learningObjective) errors.push(pathMessage(path, 'learning_objective obbligatorio.'));
    if (!stringArray(diagnostics.tested_codes).length) warnings.push(pathMessage(path, 'aggiungi almeno un diagnostics.tested_codes prima della pubblicazione.'));
  }

  if (questionType === 'multiple_choice' || questionType === 'multiple_select' || questionType === 'dialogue_choice') {
    const rawOptions = Array.isArray(source.options) ? source.options : Array.isArray(content.options) ? content.options : [];
    const options = rawOptions.map(normalizeOption).filter((option) => option.text);
    const explicitCorrect = source.correct_answer ?? content.correct_answer;
    if (explicitCorrect !== undefined && explicitCorrect !== null) {
      const accepted = Array.isArray(explicitCorrect) ? explicitCorrect.map(String) : [String(explicitCorrect)];
      options.forEach((option) => { option.is_correct = accepted.includes(option.key) || accepted.includes(option.text); });
    }
    const correctCount = options.filter((option) => option.is_correct).length;
    if (options.length < 2) errors.push(pathMessage(path, 'servono almeno due opzioni.'));
    if (['multiple_choice', 'dialogue_choice'].includes(questionType) && correctCount !== 1) errors.push(pathMessage(path, `${questionType} richiede esattamente una risposta corretta.`));
    if (questionType === 'multiple_select' && correctCount < 1) errors.push(pathMessage(path, 'multiple_select richiede almeno una risposta corretta.'));
    content.options = options;
  }

  if (questionType === 'dialogue_choice') {
    const rawTurns = Array.isArray(source.turns) ? source.turns : Array.isArray(content.turns) ? content.turns : [];
    content.scenario = text(source.scenario || content.scenario) || null;
    content.response_prompt = text(source.response_prompt || content.response_prompt) || prompt;
    content.turns = rawTurns.map((turn, index) => ({
      key: text(turn?.key) || `turn_${index + 1}`,
      speaker: text(turn?.speaker),
      text: text(turn?.text),
    }));
    if (content.turns.length < 2) errors.push(pathMessage(path, 'dialogue_choice richiede almeno due turni.'));
    content.turns.forEach((turn, index) => {
      if (!turn.speaker || !turn.text) errors.push(pathMessage(`${path}.turns[${index}]`, 'speaker e text sono obbligatori.'));
    });
    grading.mode = 'automatic';
  }

  if (questionType === 'gap_fill' || questionType === 'select_gap') {
    const rawBlanks = Array.isArray(source.blanks) ? source.blanks : Array.isArray(content.blanks) ? content.blanks : [];
    content.blanks = rawBlanks.map((blank, index) => {
      const acceptedAnswers = stringArray(blank?.accepted_answers || blank?.answers);
      const options = stringArray(blank?.options);
      if (!acceptedAnswers.length) errors.push(pathMessage(`${path}.blanks[${index}]`, 'accepted_answers obbligatorio.'));
      if (questionType === 'select_gap' && options.length < 2) errors.push(pathMessage(`${path}.blanks[${index}]`, 'select_gap richiede almeno due options.'));
      return {
        key: text(blank?.key) || `blank_${index + 1}`,
        accepted_answers: acceptedAnswers,
        options,
        points: positiveNumber(blank?.points, 1),
        feedback: isObject(blank?.feedback) ? blank.feedback : {},
        answer_error_mappings: Array.isArray(blank?.answer_error_mappings) ? blank.answer_error_mappings : [],
      };
    });
    if (!content.blanks.length) errors.push(pathMessage(path, 'serve almeno uno spazio in blanks.'));
    grading.mode = grading.mode || 'per_blank';
  }

  if (questionType === 'translation' || questionType === 'error_correction') {
    content.accepted_answers = stringArray(source.accepted_answers || content.accepted_answers);
    if (!content.accepted_answers.length) errors.push(pathMessage(path, 'accepted_answers obbligatorio.'));
  }

  if (questionType === 'word_order') {
    const tokens = stringArray(source.tokens || content.tokens?.map?.((item) => item?.text || item));
    const correctOrder = stringArray(source.correct_order || content.correct_order);
    if (tokens.length < 2) errors.push(pathMessage(path, 'word_order richiede almeno due tokens.'));
    if (correctOrder.length !== tokens.length) errors.push(pathMessage(path, 'correct_order deve contenere lo stesso numero di tokens.'));
    content.tokens = tokens.map((token, index) => ({ key: `token_${index + 1}`, text: token }));
    content.correct_order = correctOrder;
  }

  if (questionType === 'content_block') {
    content.body = text(source.body || content.body || source.prompt);
    if (!content.body) errors.push(pathMessage(path, 'content_block richiede body o prompt.'));
  }

  if (questionType === 'written_response') {
    const minWords = integer(source.min_words ?? content.min_words, 40);
    const maxWords = integer(source.max_words ?? content.max_words, Math.max(80, minWords || 40));
    if (!minWords || minWords < 1) errors.push(pathMessage(path, 'min_words deve essere maggiore di zero.'));
    if (!maxWords || maxWords < minWords) errors.push(pathMessage(path, 'max_words deve essere almeno min_words.'));
    content.context = text(source.context || content.context) || null;
    content.min_words = minWords;
    content.max_words = maxWords;
    content.required_points = stringArray(source.required_points || content.required_points);
    content.rubric = normalizeRubric(source.rubric || content.rubric, errors, `${path}.rubric`);
    content.model_answer = text(source.model_answer || content.model_answer) || null;
    grading.mode = 'manual_review';
  }

  if (questionType === 'dialogue_roleplay') {
    const rawCharacters = Array.isArray(source.characters) ? source.characters : Array.isArray(content.characters) ? content.characters : [];
    const characters = rawCharacters.map((character, index) => ({
      key: text(character?.key) || `character_${index + 1}`,
      name: text(character?.name) || `Personaggio ${index + 1}`,
      description: text(character?.description) || null,
      selectable: character?.selectable !== false,
    }));
    const characterKeys = new Set(characters.map((character) => character.key));
    const responseMode = text(source.response_mode || content.response_mode) || 'written';
    if (!['written', 'audio', 'audio_per_turn'].includes(responseMode)) {
      errors.push(pathMessage(path, 'response_mode deve essere "written", "audio" oppure "audio_per_turn".'));
    }
    const rawTurns = Array.isArray(source.turns) ? source.turns : Array.isArray(content.turns) ? content.turns : [];
    const turns = rawTurns.map((turn, index) => {
      const speaker = text(turn?.speaker);
      if (!speaker || !characterKeys.has(speaker)) errors.push(pathMessage(`${path}.turns[${index}]`, 'speaker deve corrispondere a un personaggio.'));
      const key = text(turn?.key) || `turn_${index + 1}`;
      const learnerResponse = Boolean(turn?.learner_response);
      const constraints = isObject(turn?.constraints) ? turn.constraints : {};
      const minSeconds = integer(constraints.min_seconds, 0);
      const maxSeconds = integer(constraints.max_seconds, 35);
      if (responseMode === 'audio_per_turn' && !text(turn?.key)) {
        errors.push(pathMessage(`${path}.turns[${index}]`, 'key è obbligatorio per ogni turno audio.'));
      }
      if (responseMode === 'audio_per_turn' && learnerResponse && maxSeconds < 5) {
        errors.push(pathMessage(`${path}.turns[${index}]`, 'constraints.max_seconds deve essere almeno 5.'));
      }
      if (responseMode === 'audio_per_turn' && learnerResponse && (minSeconds < 0 || minSeconds > maxSeconds)) {
        errors.push(pathMessage(`${path}.turns[${index}]`, 'constraints.min_seconds deve essere compreso tra 0 e max_seconds.'));
      }
      return {
        key,
        speaker,
        text: text(turn?.text) || null,
        prompt: text(turn?.prompt) || null,
        learner_response: learnerResponse,
        required: learnerResponse ? turn?.required !== false : false,
        direction: text(turn?.direction) || null,
        context: text(turn?.context) || null,
        objective: text(turn?.objective) || null,
        hint: text(turn?.hint) || null,
        retry_hint: text(turn?.retry_hint) || null,
        constraints: learnerResponse ? {
          min_seconds: minSeconds,
          max_seconds: maxSeconds,
          required_points: stringArray(constraints.required_points),
          recommended_language: stringArray(constraints.recommended_language),
          required_language: stringArray(constraints.required_language),
          avoid_language: stringArray(constraints.avoid_language),
        } : {},
      };
    });
    if (characters.length < 2) errors.push(pathMessage(path, 'servono almeno due personaggi.'));
    if (!characters.some((character) => character.selectable)) errors.push(pathMessage(path, 'almeno un personaggio deve essere selezionabile.'));
    if (turns.length < 2) errors.push(pathMessage(path, 'servono almeno due turni.'));
    if (!turns.some((turn) => turn.learner_response)) warnings.push(pathMessage(path, 'nessun turno è marcato learner_response. Verranno usati i turni del personaggio scelto.'));
    if (new Set(turns.map((turn) => turn.key)).size !== turns.length) errors.push(pathMessage(path, 'le chiavi dei turni devono essere univoche.'));
    if (responseMode === 'audio_per_turn' && !turns.some((turn) => turn.learner_response)) {
      errors.push(pathMessage(path, 'audio_per_turn richiede almeno un turno learner_response.'));
    }
    content.scenario = text(source.scenario || content.scenario) || prompt;
    content.characters = characters;
    content.turns = turns;
    content.response_mode = ['written', 'audio', 'audio_per_turn'].includes(responseMode) ? responseMode : 'written';
    content.rubric = normalizeRubric(source.rubric || content.rubric, errors, `${path}.rubric`);
    content.model_responses = isObject(source.model_responses || content.model_responses) ? (source.model_responses || content.model_responses) : {};
    grading.mode = 'manual_review';
  }

  if (questionType === 'audio_response') {
    const minSeconds = integer(source.min_seconds ?? content.min_seconds, 5);
    const maxSeconds = integer(source.max_seconds ?? content.max_seconds, 90);
    if (!maxSeconds || maxSeconds < 5) errors.push(pathMessage(path, 'max_seconds deve essere almeno 5.'));
    if (minSeconds < 0 || minSeconds > maxSeconds) errors.push(pathMessage(path, 'min_seconds deve essere compreso tra 0 e max_seconds.'));
    content.context = text(source.context || content.context) || null;
    content.min_seconds = minSeconds;
    content.max_seconds = maxSeconds;
    content.allow_rerecord = (source.allow_rerecord ?? content.allow_rerecord) !== false;
    content.rubric = normalizeRubric(source.rubric || content.rubric, errors, `${path}.rubric`);
    content.model_transcript = text(source.model_transcript || content.model_transcript) || null;
    grading.mode = 'manual_review';
  }

  if (questionType === 'reading_comprehension') {
    content.title = text(source.passage_title || content.title) || null;
    content.passage = text(source.passage || content.passage);
    content.source_note = text(source.source_note || content.source_note) || null;
    if (!content.passage) errors.push(pathMessage(path, 'passage obbligatorio.'));
    const rawItems = Array.isArray(source.items) ? source.items : Array.isArray(content.items) ? content.items : [];
    content.items = rawItems.map((item, index) => normalizeReadingItem(item, index, errors, `${path}.items[${index}]`));
    if (!content.items.length) errors.push(pathMessage(path, 'serve almeno una domanda di comprensione.'));
    grading.mode = grading.mode || 'per_item';
  }

  grading.weight = positiveNumber(grading.weight, 1);
  grading.nearly_correct_multiplier = Math.max(0, Math.min(1, number(grading.nearly_correct_multiplier, 0.5)));
  if (MANUAL_TYPES.has(questionType)) grading.mode = 'manual_review';

  return {
    payload: {
      schema_version: schemaVersion,
      client_key: text(source.client_key) || null,
      type: questionType,
      title: text(source.title) || null,
      prompt,
      instructions: text(source.instructions) || null,
      instruction_language: instructionLanguage,
      level,
      topic,
      subtopic: text(source.subtopic) || null,
      primary_skill: primarySkill || (questionType === 'content_block' || questionType === 'reading_comprehension' ? 'reading' : ''),
      learning_objective: learningObjective || (questionType === 'content_block' ? 'Read the information provided.' : ''),
      difficulty: ['support', 'standard', 'challenge'].includes(source.difficulty) ? source.difficulty : 'standard',
      content,
      grading,
      feedback,
      diagnostics: {
        tested_codes: stringArray(diagnostics.tested_codes),
        fallback_error_code: text(diagnostics.fallback_error_code) || null,
        answer_error_mappings: Array.isArray(diagnostics.answer_error_mappings) ? diagnostics.answer_error_mappings : [],
      },
      tags,
      foundation_links: Array.isArray(source.foundation_links) ? source.foundation_links : [],
    },
    errors,
    warnings,
  };
}

function validatePool(rawPool, path = 'pool', schemaVersion = 2) {
  const errors = [];
  const warnings = [];
  const source = stripTechnicalIds(isObject(rawPool) ? rawPool : {});
  const name = text(source.name || source.title);
  const level = text(source.level);
  const topic = text(source.topic);
  const questions = Array.isArray(source.questions) ? source.questions : [];
  const questionRefs = stringArray(source.question_refs);
  if (!name) errors.push(pathMessage(path, 'name obbligatorio.'));
  if (!level) errors.push(pathMessage(path, 'level obbligatorio.')); else validateLevel(level, errors, `${path}.level`);
  if (!topic) errors.push(pathMessage(path, 'topic obbligatorio.'));
  if (!questions.length && !questionRefs.length) warnings.push(pathMessage(path, 'pool vuota: potrà essere riempita nell’editor.'));
  const normalizedQuestions = questions.map((question, index) => {
    const result = validateQuestion(question, `${path}.questions[${index}]`, schemaVersion);
    errors.push(...result.errors); warnings.push(...result.warnings); return result.payload;
  });
  return {
    payload: {
      schema_version: schemaVersion,
      client_key: text(source.client_key) || null,
      name,
      description: text(source.description) || null,
      level,
      topic,
      subtopic: text(source.subtopic) || null,
      primary_skill: text(source.primary_skill) || null,
      tags: stringArray(source.tags),
      foundation_links: Array.isArray(source.foundation_links) ? source.foundation_links : [],
      questions: normalizedQuestions,
      question_refs: questionRefs,
    },
    errors,
    warnings,
  };
}

function validateSection(rawSection, index, path, schemaVersion) {
  const errors = [];
  const warnings = [];
  const source = stripTechnicalIds(isObject(rawSection) ? rawSection : {});
  const selectionMode = text(source.selection_mode || source.selection?.mode) || 'fixed';
  const feedbackTiming = text(source.feedback_timing) || 'section_end';
  const fixedQuestions = Array.isArray(source.questions) ? source.questions : Array.isArray(source.fixed_questions) ? source.fixed_questions : [];
  const poolRules = Array.isArray(source.pool_rules) ? source.pool_rules : source.pool ? [source.pool] : [];
  if (!text(source.title)) errors.push(pathMessage(path, 'title obbligatorio.'));
  if (!SELECTION_MODES.includes(selectionMode)) errors.push(pathMessage(path, `selection_mode non valido. Usa ${SELECTION_MODES.join(', ')}.`));
  if (!FEEDBACK_TIMINGS.includes(feedbackTiming)) errors.push(pathMessage(path, `feedback_timing non valido. Usa ${FEEDBACK_TIMINGS.join(', ')}.`));

  const questions = fixedQuestions.map((question, questionIndex) => {
    const result = validateQuestion(question, `${path}.questions[${questionIndex}]`, schemaVersion);
    errors.push(...result.errors); warnings.push(...result.warnings); return result.payload;
  });
  const rules = poolRules.map((rule, ruleIndex) => {
    const questionCount = integer(rule?.question_count, null);
    const strategy = text(rule?.selection_strategy) || 'balanced';
    if (!text(rule?.pool_ref) && !isObject(rule?.pool)) errors.push(pathMessage(`${path}.pool_rules[${ruleIndex}]`, 'pool_ref oppure pool obbligatorio.'));
    if (!questionCount || questionCount <= 0) errors.push(pathMessage(`${path}.pool_rules[${ruleIndex}]`, 'question_count deve essere maggiore di zero.'));
    if (!SELECTION_STRATEGIES.includes(strategy)) errors.push(pathMessage(`${path}.pool_rules[${ruleIndex}]`, `selection_strategy non valida. Usa ${SELECTION_STRATEGIES.join(', ')}.`));
    let inlinePool = null;
    if (isObject(rule?.pool)) {
      const result = validatePool(rule.pool, `${path}.pool_rules[${ruleIndex}].pool`, schemaVersion);
      errors.push(...result.errors); warnings.push(...result.warnings); inlinePool = result.payload;
    }
    return {
      pool_ref: text(rule?.pool_ref) || null,
      pool: inlinePool,
      question_count: questionCount && questionCount > 0 ? questionCount : 1,
      selection_strategy: strategy,
      filters: isObject(rule?.filters) ? rule.filters : {},
      distribution_rules: isObject(rule?.distribution_rules) ? rule.distribution_rules : {},
      prevent_duplicate_questions: rule?.prevent_duplicate_questions !== false,
    };
  });
  if (selectionMode === 'fixed' && !questions.length && !stringArray(source.question_refs).length) errors.push(pathMessage(path, 'una sezione fixed richiede domande o question_refs.'));
  if (selectionMode === 'pool' && !rules.length) errors.push(pathMessage(path, 'una sezione pool richiede almeno una pool rule.'));
  if (selectionMode === 'mixed' && !questions.length && !stringArray(source.question_refs).length && !rules.length) errors.push(pathMessage(path, 'una sezione mixed richiede domande, question_refs o pool rules.'));
  return {
    payload: {
      client_key: text(source.client_key) || `section_${index + 1}`,
      title: text(source.title),
      instructions: text(source.instructions) || null,
      selection_mode: selectionMode,
      feedback_timing: feedbackTiming,
      settings: isObject(source.settings) ? source.settings : {},
      questions,
      question_refs: stringArray(source.question_refs),
      pool_rules: rules,
    },
    errors,
    warnings,
  };
}

function validateExercise(rawExercise, path = 'exercise', schemaVersion = 2) {
  const errors = [];
  const warnings = [];
  const source = stripTechnicalIds(isObject(rawExercise) ? rawExercise : {});
  const title = text(source.title);
  const instructions = text(source.instructions);
  const level = text(source.level);
  const topic = text(source.topic);
  const instructionLanguage = text(source.instruction_language) || 'it';
  const sections = Array.isArray(source.sections) ? source.sections : [];
  const settings = isObject(source.settings) ? { ...source.settings } : {};
  if (!title) errors.push(pathMessage(path, 'title obbligatorio.'));
  if (!instructions) errors.push(pathMessage(path, 'instructions obbligatorie.'));
  if (!level) errors.push(pathMessage(path, 'level obbligatorio.')); else validateLevel(level, errors, `${path}.level`);
  if (!topic) errors.push(pathMessage(path, 'topic obbligatorio.'));
  if (!['it', 'en'].includes(instructionLanguage)) errors.push(pathMessage(path, 'instruction_language deve essere it oppure en.'));
  if (!sections.length) errors.push(pathMessage(path, 'serve almeno una sezione.'));
  settings.display_mode = settings.display_mode || 'one_at_a_time';
  settings.feedback_timing = settings.feedback_timing || 'section_end';
  if (!DISPLAY_MODES.includes(settings.display_mode)) errors.push(pathMessage(path, `settings.display_mode non valido. Usa ${DISPLAY_MODES.join(', ')}.`));
  if (!FEEDBACK_TIMINGS.includes(settings.feedback_timing)) errors.push(pathMessage(path, `settings.feedback_timing non valido. Usa ${FEEDBACK_TIMINGS.join(', ')}.`));
  settings.show_score = settings.show_score !== false;
  settings.show_correct_answers = settings.show_correct_answers !== false;
  settings.show_explanations = settings.show_explanations !== false;
  settings.show_diagnostic_summary = settings.show_diagnostic_summary !== false;
  settings.allow_retry = settings.allow_retry !== false;
  const normalizedSections = sections.map((section, index) => {
    const result = validateSection(section, index, `${path}.sections[${index}]`, schemaVersion);
    errors.push(...result.errors); warnings.push(...result.warnings); return result.payload;
  });
  return {
    payload: {
      schema_version: schemaVersion,
      client_key: text(source.client_key) || null,
      title,
      description: text(source.description) || null,
      instructions,
      instruction_language: instructionLanguage,
      level,
      topic,
      estimated_minutes: integer(source.estimated_minutes, null) > 0 ? integer(source.estimated_minutes, null) : null,
      settings,
      tags: stringArray(source.tags),
      foundation_links: Array.isArray(source.foundation_links) ? source.foundation_links : [],
      sections: normalizedSections,
    },
    errors,
    warnings,
  };
}

function itemFromResult(entityType, payload, result, index) {
  const status = result.errors.length ? 'invalid' : result.warnings.length ? 'warning' : 'valid';
  return { index, clientKey: payload?.client_key || null, entityType, payload, errors: result.errors, warnings: result.warnings, status, selected: status !== 'invalid' };
}

export function validateExerciseBuilderJson(input) {
  let parsed;
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (error) {
    return { parsed: null, entityType: null, schemaVersion: null, items: [], errors: [`JSON non valido: ${error.message}`], warnings: [] };
  }
  const errors = [];
  if (!isObject(parsed)) errors.push('Il JSON principale deve essere un oggetto.');
  const schemaVersion = integer(parsed?.schema_version, null);
  if (!EXERCISE_BUILDER_SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) errors.push(`schema_version deve essere ${EXERCISE_BUILDER_SUPPORTED_SCHEMA_VERSIONS.join(' oppure ')}.`);
  if (!TOP_LEVEL_TYPES.includes(parsed?.entity_type)) errors.push(`entity_type non valido. Usa ${TOP_LEVEL_TYPES.join(', ')}.`);
  if (errors.length) return { parsed, entityType: parsed?.entity_type || null, schemaVersion, items: [], errors, warnings: [] };

  const items = [];
  const addQuestion = (question, path) => { const result = validateQuestion(question, path, schemaVersion); items.push(itemFromResult('question', result.payload, result, items.length)); };
  const addPool = (pool, path) => { const result = validatePool(pool, path, schemaVersion); items.push(itemFromResult('question_pool', result.payload, result, items.length)); };
  const addExercise = (exercise, path) => { const result = validateExercise(exercise, path, schemaVersion); items.push(itemFromResult('exercise', result.payload, result, items.length)); };
  if (parsed.entity_type === 'question') addQuestion(parsed.question, 'question');
  if (parsed.entity_type === 'question_pool') addPool(parsed.pool, 'pool');
  if (parsed.entity_type === 'exercise') addExercise(parsed.exercise, 'exercise');
  if (parsed.entity_type === 'bundle') {
    (Array.isArray(parsed.questions) ? parsed.questions : []).forEach((question, index) => addQuestion(question, `questions[${index}]`));
    (Array.isArray(parsed.pools) ? parsed.pools : []).forEach((pool, index) => addPool(pool, `pools[${index}]`));
    (Array.isArray(parsed.exercises) ? parsed.exercises : []).forEach((exercise, index) => addExercise(exercise, `exercises[${index}]`));
    if (!items.length) errors.push('Il bundle non contiene questions, pools o exercises.');
  }
  return { parsed: stripTechnicalIds(parsed), entityType: parsed.entity_type, schemaVersion, items, errors, warnings: [] };
}

const basicQuestion = {
  type: 'multiple_choice',
  prompt: 'There is not _____ milk in the fridge.',
  instructions: 'Scegli la risposta corretta.',
  instruction_language: 'it',
  level: 'A1',
  topic: 'quantifiers',
  subtopic: 'some_any',
  primary_skill: 'grammar',
  learning_objective: 'Use the correct quantifier according to sentence polarity and countability.',
  difficulty: 'standard',
  content: {
    options: [
      { key: 'many', text: 'many', is_correct: false, error_code: 'QUANTIFIER_MUCH_MANY' },
      { key: 'much', text: 'much', is_correct: true },
      { key: 'few', text: 'a few', is_correct: false, error_code: 'COUNTABILITY' },
    ],
  },
  grading: { mode: 'automatic', weight: 1, nearly_correct_multiplier: 0.5 },
  feedback: { explanation: 'Milk è un sostantivo non numerabile, quindi usiamo much.' },
  diagnostics: { tested_codes: ['QUANTIFIER_MUCH_MANY', 'COUNTABILITY'], fallback_error_code: 'QUANTIFIER_GENERAL' },
  tags: ['negative', 'uncountable'],
  foundation_links: [],
};

export const exerciseBuilderTemplates = {
  question: { schema_version: 2, entity_type: 'question', question: basicQuestion },
  dialogue_choice: {
    schema_version: 2,
    entity_type: 'question',
    question: {
      type: 'dialogue_choice',
      title: 'Choosing the best reply',
      prompt: 'Choose the most natural reply to complete the dialogue.',
      instructions: 'Leggi il dialogo e scegli la risposta più adatta.',
      instruction_language: 'it',
      level: 'A2',
      topic: 'everyday_conversation',
      primary_skill: 'functional_language',
      learning_objective: 'Choose an appropriate response in a short everyday exchange.',
      difficulty: 'standard',
      content: {
        scenario: 'Two colleagues are arranging a lunch break.',
        response_prompt: 'What should Alex say next?',
        turns: [
          { key: 'turn_1', speaker: 'Sam', text: 'Are you free for lunch at one?' },
          { key: 'turn_2', speaker: 'Alex', text: 'I have a meeting until half past one.' },
        ],
        options: [
          { key: 'option_1', text: 'Could we meet at two instead?', is_correct: true, error_code: null },
          { key: 'option_2', text: 'I ate lunch yesterday.', is_correct: false, error_code: 'FUNCTIONAL_LANGUAGE_CONTEXT' },
        ],
      },
      grading: { mode: 'automatic', weight: 1, nearly_correct_multiplier: 0.5 },
      feedback: { explanation: 'The first reply acknowledges the timing problem and suggests an alternative.' },
      diagnostics: { tested_codes: ['FUNCTIONAL_LANGUAGE_RESPONSE'], fallback_error_code: 'FUNCTIONAL_LANGUAGE_CONTEXT' },
      tags: ['dialogue', 'functional-language'],
      foundation_links: [],
    },
  },
  written_response: {
    schema_version: 2,
    entity_type: 'question',
    question: {
      type: 'written_response',
      title: 'Email after a missed meeting',
      prompt: 'Write an email to a colleague explaining why you missed the meeting and proposing a new time.',
      instructions: 'Scrivi un testo completo rispettando tutti i punti richiesti.',
      instruction_language: 'it',
      level: 'B1',
      topic: 'professional_communication',
      subtopic: 'email_writing',
      primary_skill: 'writing',
      learning_objective: 'Write a clear professional email with an explanation and a proposed solution.',
      difficulty: 'standard',
      content: {
        context: 'You missed a scheduled project meeting.',
        min_words: 80,
        max_words: 140,
        required_points: ['Apologise', 'Explain briefly', 'Propose a new time'],
        rubric: [
          { key: 'task', label: 'Consegna', description: 'Include all required points.', max_points: 4 },
          { key: 'accuracy', label: 'Accuratezza', description: 'Use grammar and spelling clearly.', max_points: 3 },
          { key: 'range', label: 'Lessico e registro', description: 'Use suitable professional language.', max_points: 3 },
        ],
        model_answer: '',
      },
      grading: { mode: 'manual_review', weight: 10 },
      feedback: {},
      diagnostics: { tested_codes: ['WRITING_TASK_ACHIEVEMENT'], fallback_error_code: 'WRITING_GENERAL' },
      tags: ['writing', 'email', 'manual-review'],
      foundation_links: [],
    },
  },
  dialogue_roleplay: {
    schema_version: 2,
    entity_type: 'question',
    question: {
      type: 'dialogue_roleplay',
      title: 'Hotel complaint roleplay',
      prompt: 'Complete the conversation from the perspective of the character you choose.',
      instructions: 'Scegli il personaggio e scrivi le sue battute.',
      instruction_language: 'it',
      level: 'B1',
      topic: 'hospitality_complaints',
      primary_skill: 'interaction',
      learning_objective: 'Respond to a complaint and negotiate a practical solution.',
      difficulty: 'standard',
      content: {
        scenario: 'A guest reports that the room is too noisy.',
        response_mode: 'written',
        characters: [
          { key: 'guest', name: 'Guest', description: 'Explain the problem and request a solution.', selectable: true },
          { key: 'receptionist', name: 'Receptionist', description: 'Acknowledge the issue and offer solutions.', selectable: true },
        ],
        turns: [
          { key: 'turn_1', speaker: 'guest', prompt: 'Open the conversation and explain the problem.', learner_response: true },
          { key: 'turn_2', speaker: 'receptionist', prompt: 'Acknowledge the complaint and ask one question.', learner_response: true },
          { key: 'turn_3', speaker: 'guest', prompt: 'Clarify what you need.', learner_response: true },
          { key: 'turn_4', speaker: 'receptionist', prompt: 'Offer a solution and confirm the next step.', learner_response: true },
        ],
        rubric: [
          { key: 'interaction', label: 'Gestione del dialogo', max_points: 4 },
          { key: 'functional_language', label: 'Funzioni comunicative', max_points: 3 },
          { key: 'accuracy', label: 'Accuratezza', max_points: 3 },
        ],
        model_responses: {},
      },
      grading: { mode: 'manual_review', weight: 10 },
      feedback: {},
      diagnostics: { tested_codes: ['INTERACTION_RESPONSE'], fallback_error_code: 'INTERACTION_GENERAL' },
      tags: ['dialogue', 'roleplay', 'manual-review'],
      foundation_links: [],
    },
  },
  audio_response: {
    schema_version: 2,
    entity_type: 'question',
    question: {
      type: 'audio_response',
      title: 'Describe a past experience',
      prompt: 'Record a short answer about a memorable travel experience.',
      instructions: 'Parla in modo naturale. Puoi riascoltare e registrare di nuovo prima di consegnare.',
      instruction_language: 'it',
      level: 'B1',
      topic: 'past_experiences',
      primary_skill: 'speaking',
      learning_objective: 'Use the present perfect and past simple to describe a past experience.',
      difficulty: 'standard',
      content: {
        context: 'Mention where you went, what happened and why it was memorable.',
        min_seconds: 30,
        max_seconds: 90,
        allow_rerecord: true,
        rubric: [
          { key: 'task', label: 'Contenuto', max_points: 3 },
          { key: 'fluency', label: 'Fluidità', max_points: 3 },
          { key: 'accuracy', label: 'Accuratezza', max_points: 2 },
          { key: 'pronunciation', label: 'Pronuncia', max_points: 2 },
        ],
        model_transcript: '',
      },
      grading: { mode: 'manual_review', weight: 10 },
      feedback: {},
      diagnostics: { tested_codes: ['SPEAKING_PAST_EXPERIENCE'], fallback_error_code: 'SPEAKING_GENERAL' },
      tags: ['speaking', 'recording', 'manual-review'],
      foundation_links: [],
    },
  },
  reading_comprehension: {
    schema_version: 2,
    entity_type: 'question',
    question: {
      type: 'reading_comprehension',
      title: 'Remote work policy',
      prompt: 'Read the text and answer all the questions.',
      instructions: 'Leggi il testo una volta per il senso generale e poi rispondi.',
      instruction_language: 'it',
      level: 'B1',
      topic: 'workplace_reading',
      primary_skill: 'reading',
      learning_objective: 'Identify main ideas, details and implied meaning in a workplace text.',
      difficulty: 'standard',
      content: {
        title: 'A new hybrid work policy',
        passage: 'Insert the complete reading passage here.',
        source_note: '',
        items: [
          {
            key: 'item_1',
            type: 'multiple_choice',
            prompt: 'What is the main purpose of the policy?',
            points: 1,
            options: [
              { key: 'a', text: 'Option A', is_correct: true },
              { key: 'b', text: 'Option B', is_correct: false },
              { key: 'c', text: 'Option C', is_correct: false },
            ],
          },
          {
            key: 'item_2',
            type: 'short_answer',
            prompt: 'How many days may employees work remotely?',
            points: 1,
            accepted_answers: ['two days', '2 days'],
          },
        ],
      },
      grading: { mode: 'per_item', weight: 1, nearly_correct_multiplier: 0.5 },
      feedback: { explanation: 'Rileggi le parti del testo collegate alle domande sbagliate.' },
      diagnostics: { tested_codes: ['READING_DETAIL'], fallback_error_code: 'READING_GENERAL' },
      tags: ['reading', 'comprehension'],
      foundation_links: [],
    },
  },
  question_pool: {
    schema_version: 2,
    entity_type: 'question_pool',
    pool: {
      client_key: 'pool_a1_review',
      name: 'A1 Review Pool',
      description: 'Reusable pool for automatic and manual questions.',
      level: 'A1',
      topic: 'review',
      primary_skill: 'grammar',
      tags: ['review'],
      questions: [],
      question_refs: [],
    },
  },
  exercise: {
    schema_version: 2,
    entity_type: 'exercise',
    exercise: {
      title: 'Integrated skills practice',
      description: 'Automatic questions, reading and teacher-reviewed production in one exercise.',
      instructions: 'Completa tutte le sezioni. Le produzioni verranno valutate dall’insegnante.',
      instruction_language: 'it',
      level: 'B1',
      topic: 'integrated_skills',
      estimated_minutes: 25,
      settings: {
        display_mode: 'one_at_a_time',
        feedback_timing: 'section_end',
        show_score: true,
        show_correct_answers: true,
        show_explanations: true,
        show_diagnostic_summary: true,
        allow_retry: true,
      },
      sections: [
        {
          title: 'Automatic review',
          instructions: 'Complete the questions.',
          selection_mode: 'fixed',
          feedback_timing: 'section_end',
          questions: [basicQuestion],
        },
      ],
      tags: ['integrated'],
      foundation_links: [],
    },
  },
  bundle: { schema_version: 2, entity_type: 'bundle', questions: [], pools: [], exercises: [] },
};

export function stringifyExerciseBuilderTemplate(type) {
  return JSON.stringify(exerciseBuilderTemplates[type] || exerciseBuilderTemplates.bundle, null, 2);
}
