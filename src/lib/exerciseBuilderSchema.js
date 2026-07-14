export const EXERCISE_BUILDER_SCHEMA_VERSION = 1;

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
];
export const EXERCISE_BUILDER_SKILLS = [
  'grammar',
  'vocabulary',
  'reading',
  'writing',
  'functional_language',
  'spelling',
  'word_order',
];

const TOP_LEVEL_TYPES = ['question', 'question_pool', 'exercise', 'bundle'];
const FEEDBACK_TIMINGS = ['section_end', 'exercise_end', 'hidden'];
const DISPLAY_MODES = ['one_at_a_time', 'all_questions'];
const SELECTION_MODES = ['fixed', 'pool', 'mixed'];
const SELECTION_STRATEGIES = ['random', 'avoid_recent', 'unseen_first', 'balanced'];
const TECHNICAL_ID_KEYS = new Set([
  'id',
  'public_id',
  'public_number',
  'question_id',
  'pool_id',
  'exercise_id',
  'version_id',
  'created_by',
  'approved_by',
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter(Boolean);
}

function normalizeAcceptedAnswers(value) {
  const answers = normalizeStringArray(value);
  return Array.from(new Set(answers));
}

function validateLevel(value, errors, path) {
  if (!EXERCISE_BUILDER_LEVELS.includes(value)) {
    errors.push(pathMessage(path, `livello non valido. Usa ${EXERCISE_BUILDER_LEVELS.join(', ')}.`));
  }
}

function validateInstructionLanguage(value, errors, path) {
  if (!['it', 'en'].includes(value)) {
    errors.push(pathMessage(path, 'instruction_language deve essere "it" oppure "en".'));
  }
}

function normalizeOption(option, index) {
  if (typeof option === 'string') {
    return { key: `option_${index + 1}`, text: option.trim(), is_correct: false };
  }

  return {
    key: text(option?.key) || `option_${index + 1}`,
    text: text(option?.text),
    is_correct: Boolean(option?.is_correct),
    error_code: text(option?.error_code) || null,
  };
}

function validateQuestion(rawQuestion, path = 'question') {
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
  const tags = normalizeStringArray(source.tags);
  const content = isObject(source.content) ? { ...source.content } : {};
  const grading = isObject(source.grading) ? { ...source.grading } : {};
  const feedback = isObject(source.feedback) ? { ...source.feedback } : {};
  const diagnostics = isObject(source.diagnostics) ? { ...source.diagnostics } : {};

  if (!EXERCISE_BUILDER_QUESTION_TYPES.includes(questionType)) {
    errors.push(pathMessage(path, `type non valido. Usa ${EXERCISE_BUILDER_QUESTION_TYPES.join(', ')}.`));
  }
  if (!prompt) errors.push(pathMessage(path, 'prompt obbligatorio.'));
  if (!level) errors.push(pathMessage(path, 'level obbligatorio.'));
  else validateLevel(level, errors, `${path}.level`);
  validateInstructionLanguage(instructionLanguage, errors, `${path}.instruction_language`);

  const isEvaluated = questionType && questionType !== 'content_block';
  if (isEvaluated) {
    if (!primarySkill) errors.push(pathMessage(path, 'primary_skill obbligatorio per le domande valutabili.'));
    else if (!EXERCISE_BUILDER_SKILLS.includes(primarySkill)) {
      errors.push(pathMessage(path, `primary_skill non valido. Usa ${EXERCISE_BUILDER_SKILLS.join(', ')}.`));
    }
    if (!topic) errors.push(pathMessage(path, 'topic obbligatorio per l’analisi diagnostica.'));
    if (!learningObjective) errors.push(pathMessage(path, 'learning_objective obbligatorio per l’analisi diagnostica.'));

    const testedCodes = normalizeStringArray(diagnostics.tested_codes);
    if (testedCodes.length === 0) {
      warnings.push(pathMessage(path, 'nessun diagnostics.tested_codes. La bozza potrà essere salvata, ma non pubblicata finché manca un obiettivo diagnostico valido.'));
    }
  }

  if (questionType === 'multiple_choice' || questionType === 'multiple_select') {
    const rawOptions = Array.isArray(source.options) ? source.options : Array.isArray(content.options) ? content.options : [];
    const options = rawOptions.map(normalizeOption).filter((option) => option.text);
    const explicitCorrect = source.correct_answer ?? content.correct_answer;

    if (explicitCorrect !== undefined && explicitCorrect !== null) {
      const accepted = Array.isArray(explicitCorrect) ? explicitCorrect.map(String) : [String(explicitCorrect)];
      options.forEach((option) => {
        option.is_correct = accepted.includes(option.key) || accepted.includes(option.text);
      });
    }

    const correctCount = options.filter((option) => option.is_correct).length;
    if (options.length < 2) errors.push(pathMessage(path, 'servono almeno due opzioni.'));
    if (questionType === 'multiple_choice' && correctCount !== 1) {
      errors.push(pathMessage(path, 'multiple_choice richiede esattamente una risposta corretta.'));
    }
    if (questionType === 'multiple_select' && correctCount < 1) {
      errors.push(pathMessage(path, 'multiple_select richiede almeno una risposta corretta.'));
    }
    content.options = options;
  }

  if (questionType === 'gap_fill' || questionType === 'select_gap') {
    const rawBlanks = Array.isArray(source.blanks) ? source.blanks : Array.isArray(content.blanks) ? content.blanks : [];
    const blanks = rawBlanks.map((blank, index) => {
      const acceptedAnswers = normalizeAcceptedAnswers(blank?.accepted_answers || blank?.answers);
      const options = normalizeStringArray(blank?.options);
      if (acceptedAnswers.length === 0) {
        errors.push(pathMessage(`${path}.blanks[${index}]`, 'accepted_answers obbligatorio.'));
      }
      if (questionType === 'select_gap' && options.length < 2) {
        errors.push(pathMessage(`${path}.blanks[${index}]`, 'select_gap richiede almeno due options.'));
      }
      return {
        key: text(blank?.key) || `blank_${index + 1}`,
        accepted_answers: acceptedAnswers,
        options,
        points: Number.isFinite(Number(blank?.points)) && Number(blank.points) > 0 ? Number(blank.points) : 1,
        feedback: isObject(blank?.feedback) ? blank.feedback : {},
        answer_error_mappings: Array.isArray(blank?.answer_error_mappings) ? blank.answer_error_mappings : [],
      };
    });
    if (blanks.length === 0) errors.push(pathMessage(path, 'serve almeno uno spazio in blanks.'));
    content.blanks = blanks;
    grading.mode = grading.mode || 'per_blank';
  }

  if (questionType === 'translation' || questionType === 'error_correction') {
    const acceptedAnswers = normalizeAcceptedAnswers(source.accepted_answers || content.accepted_answers);
    if (acceptedAnswers.length === 0) errors.push(pathMessage(path, 'accepted_answers obbligatorio.'));
    content.accepted_answers = acceptedAnswers;

    if (questionType === 'error_correction') {
      const instructions = text(source.instructions).toLowerCase();
      if (!instructions.includes('frase') && !instructions.includes('sentence')) {
        warnings.push(pathMessage(path, 'la consegna dovrebbe specificare che lo studente deve riscrivere tutta la frase.'));
      }
    }
  }

  if (questionType === 'word_order') {
    const tokens = normalizeStringArray(source.tokens || content.tokens);
    const correctOrder = normalizeStringArray(source.correct_order || content.correct_order);
    if (tokens.length < 2) errors.push(pathMessage(path, 'word_order richiede almeno due tokens.'));
    if (correctOrder.length !== tokens.length) {
      errors.push(pathMessage(path, 'correct_order deve contenere lo stesso numero di elementi di tokens.'));
    }
    content.tokens = tokens.map((token, index) => ({ key: `token_${index + 1}`, text: token }));
    content.correct_order = correctOrder;
  }

  if (questionType === 'content_block') {
    const body = text(source.body || content.body || source.prompt);
    if (!body) errors.push(pathMessage(path, 'content_block richiede body o prompt.'));
    content.body = body;
  }

  const weight = Number(grading.weight ?? 1);
  grading.weight = Number.isFinite(weight) && weight > 0 ? weight : 1;
  grading.nearly_correct_multiplier = Number.isFinite(Number(grading.nearly_correct_multiplier))
    ? Math.max(0, Math.min(1, Number(grading.nearly_correct_multiplier)))
    : 0.5;

  const payload = {
    client_key: text(source.client_key) || null,
    type: questionType,
    title: text(source.title) || null,
    prompt,
    instructions: text(source.instructions) || null,
    instruction_language: instructionLanguage,
    level,
    topic,
    subtopic: text(source.subtopic) || null,
    primary_skill: primarySkill || (questionType === 'content_block' ? 'reading' : ''),
    learning_objective: learningObjective || (questionType === 'content_block' ? 'Read the information provided.' : ''),
    difficulty: ['support', 'standard', 'challenge'].includes(source.difficulty) ? source.difficulty : 'standard',
    content,
    grading,
    feedback,
    diagnostics: {
      tested_codes: normalizeStringArray(diagnostics.tested_codes),
      fallback_error_code: text(diagnostics.fallback_error_code) || null,
      answer_error_mappings: Array.isArray(diagnostics.answer_error_mappings) ? diagnostics.answer_error_mappings : [],
    },
    tags,
    foundation_links: Array.isArray(source.foundation_links) ? source.foundation_links : [],
  };

  return { payload, errors, warnings };
}

function validatePool(rawPool, path = 'pool') {
  const errors = [];
  const warnings = [];
  const source = stripTechnicalIds(isObject(rawPool) ? rawPool : {});
  const name = text(source.name || source.title);
  const level = text(source.level);
  const topic = text(source.topic);
  const questions = Array.isArray(source.questions) ? source.questions : [];
  const questionRefs = normalizeStringArray(source.question_refs);

  if (!name) errors.push(pathMessage(path, 'name obbligatorio.'));
  if (!level) errors.push(pathMessage(path, 'level obbligatorio.'));
  else validateLevel(level, errors, `${path}.level`);
  if (!topic) errors.push(pathMessage(path, 'topic obbligatorio.'));
  if (questions.length === 0 && questionRefs.length === 0) {
    warnings.push(pathMessage(path, 'la pool non contiene ancora domande. Può essere importata come bozza e riempita in seguito.'));
  }

  const normalizedQuestions = questions.map((question, index) => {
    const result = validateQuestion(question, `${path}.questions[${index}]`);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    return result.payload;
  });

  return {
    payload: {
      client_key: text(source.client_key) || null,
      name,
      description: text(source.description) || null,
      level,
      topic,
      subtopic: text(source.subtopic) || null,
      primary_skill: text(source.primary_skill) || null,
      tags: normalizeStringArray(source.tags),
      foundation_links: Array.isArray(source.foundation_links) ? source.foundation_links : [],
      questions: normalizedQuestions,
      question_refs: questionRefs,
    },
    errors,
    warnings,
  };
}

function validateSection(rawSection, index, path) {
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

  const normalizedQuestions = fixedQuestions.map((question, questionIndex) => {
    const result = validateQuestion(question, `${path}.questions[${questionIndex}]`);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    return result.payload;
  });

  const normalizedPoolRules = poolRules.map((rule, ruleIndex) => {
    const questionCount = Number(rule?.question_count);
    const strategy = text(rule?.selection_strategy) || 'balanced';
    if (!text(rule?.pool_ref) && !isObject(rule?.pool)) {
      errors.push(pathMessage(`${path}.pool_rules[${ruleIndex}]`, 'pool_ref oppure pool obbligatorio.'));
    }
    if (!Number.isInteger(questionCount) || questionCount <= 0) {
      errors.push(pathMessage(`${path}.pool_rules[${ruleIndex}]`, 'question_count deve essere un intero maggiore di zero.'));
    }
    if (!SELECTION_STRATEGIES.includes(strategy)) {
      errors.push(pathMessage(`${path}.pool_rules[${ruleIndex}]`, `selection_strategy non valida. Usa ${SELECTION_STRATEGIES.join(', ')}.`));
    }

    let inlinePool = null;
    if (isObject(rule?.pool)) {
      const poolResult = validatePool(rule.pool, `${path}.pool_rules[${ruleIndex}].pool`);
      errors.push(...poolResult.errors);
      warnings.push(...poolResult.warnings);
      inlinePool = poolResult.payload;
      if (Number.isInteger(questionCount) && questionCount > inlinePool.questions.length && inlinePool.question_refs.length === 0) {
        errors.push(pathMessage(`${path}.pool_rules[${ruleIndex}]`, `richieste ${questionCount} domande ma la pool inline ne contiene ${inlinePool.questions.length}.`));
      }
    }

    return {
      pool_ref: text(rule?.pool_ref) || null,
      pool: inlinePool,
      question_count: Number.isInteger(questionCount) && questionCount > 0 ? questionCount : 1,
      selection_strategy: strategy,
      filters: isObject(rule?.filters) ? rule.filters : {},
      distribution_rules: isObject(rule?.distribution_rules) ? rule.distribution_rules : {},
      prevent_duplicate_questions: rule?.prevent_duplicate_questions !== false,
    };
  });

  if (selectionMode === 'fixed' && normalizedQuestions.length === 0) {
    errors.push(pathMessage(path, 'una sezione fixed richiede almeno una domanda.'));
  }
  if (selectionMode === 'pool' && normalizedPoolRules.length === 0) {
    errors.push(pathMessage(path, 'una sezione pool richiede almeno una pool rule.'));
  }
  if (selectionMode === 'mixed' && normalizedQuestions.length === 0 && normalizedPoolRules.length === 0) {
    errors.push(pathMessage(path, 'una sezione mixed richiede domande fisse o pool rules.'));
  }

  return {
    payload: {
      client_key: text(source.client_key) || `section_${index + 1}`,
      title: text(source.title),
      instructions: text(source.instructions) || null,
      selection_mode: selectionMode,
      feedback_timing: feedbackTiming,
      settings: isObject(source.settings) ? source.settings : {},
      questions: normalizedQuestions,
      question_refs: normalizeStringArray(source.question_refs),
      pool_rules: normalizedPoolRules,
    },
    errors,
    warnings,
  };
}

function validateExercise(rawExercise, path = 'exercise') {
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
  if (!level) errors.push(pathMessage(path, 'level obbligatorio.'));
  else validateLevel(level, errors, `${path}.level`);
  if (!topic) errors.push(pathMessage(path, 'topic obbligatorio.'));
  validateInstructionLanguage(instructionLanguage, errors, `${path}.instruction_language`);
  if (sections.length === 0) errors.push(pathMessage(path, 'serve almeno una sezione.'));

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
    const result = validateSection(section, index, `${path}.sections[${index}]`);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    return result.payload;
  });

  return {
    payload: {
      client_key: text(source.client_key) || null,
      title,
      description: text(source.description) || null,
      instructions,
      instruction_language: instructionLanguage,
      level,
      topic,
      estimated_minutes: Number.isInteger(Number(source.estimated_minutes)) && Number(source.estimated_minutes) > 0
        ? Number(source.estimated_minutes)
        : null,
      settings,
      tags: normalizeStringArray(source.tags),
      foundation_links: Array.isArray(source.foundation_links) ? source.foundation_links : [],
      sections: normalizedSections,
    },
    errors,
    warnings,
  };
}

function itemFromResult(entityType, payload, result, index) {
  const status = result.errors.length > 0 ? 'invalid' : result.warnings.length > 0 ? 'warning' : 'valid';
  return {
    index,
    clientKey: payload?.client_key || null,
    entityType,
    payload,
    errors: result.errors,
    warnings: result.warnings,
    status,
    selected: status !== 'invalid',
  };
}

function validateTopLevelObject(parsed) {
  const errors = [];
  if (!isObject(parsed)) return ['Il JSON principale deve essere un oggetto.'];
  if (parsed.schema_version !== EXERCISE_BUILDER_SCHEMA_VERSION) {
    errors.push(`schema_version deve essere ${EXERCISE_BUILDER_SCHEMA_VERSION}.`);
  }
  if (!TOP_LEVEL_TYPES.includes(parsed.entity_type)) {
    errors.push(`entity_type non valido. Usa ${TOP_LEVEL_TYPES.join(', ')}.`);
  }
  return errors;
}

export function validateExerciseBuilderJson(input) {
  let parsed;
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (error) {
    return {
      parsed: null,
      entityType: null,
      schemaVersion: null,
      items: [],
      errors: [`JSON non valido: ${error.message}`],
      warnings: [],
    };
  }

  const topErrors = validateTopLevelObject(parsed);
  if (topErrors.length > 0) {
    return {
      parsed,
      entityType: parsed?.entity_type || null,
      schemaVersion: parsed?.schema_version || null,
      items: [],
      errors: topErrors,
      warnings: [],
    };
  }

  const items = [];
  const addQuestion = (question, path) => {
    const result = validateQuestion(question, path);
    items.push(itemFromResult('question', result.payload, result, items.length));
  };
  const addPool = (pool, path) => {
    const result = validatePool(pool, path);
    items.push(itemFromResult('question_pool', result.payload, result, items.length));
  };
  const addExercise = (exercise, path) => {
    const result = validateExercise(exercise, path);
    items.push(itemFromResult('exercise', result.payload, result, items.length));
  };

  if (parsed.entity_type === 'question') addQuestion(parsed.question, 'question');
  if (parsed.entity_type === 'question_pool') addPool(parsed.pool, 'pool');
  if (parsed.entity_type === 'exercise') addExercise(parsed.exercise, 'exercise');
  if (parsed.entity_type === 'bundle') {
    (Array.isArray(parsed.questions) ? parsed.questions : []).forEach((question, index) => addQuestion(question, `questions[${index}]`));
    (Array.isArray(parsed.pools) ? parsed.pools : []).forEach((pool, index) => addPool(pool, `pools[${index}]`));
    (Array.isArray(parsed.exercises) ? parsed.exercises : []).forEach((exercise, index) => addExercise(exercise, `exercises[${index}]`));
    if (items.length === 0) topErrors.push('Il bundle non contiene questions, pools o exercises.');
  }

  return {
    parsed: stripTechnicalIds(parsed),
    entityType: parsed.entity_type,
    schemaVersion: parsed.schema_version,
    items,
    errors: topErrors,
    warnings: [],
  };
}

export const exerciseBuilderTemplates = {
  question: {
    schema_version: 1,
    entity_type: 'question',
    question: {
      type: 'multiple_choice',
      prompt: 'There is not _____ milk in the fridge.',
      instructions: 'Scegli la risposta corretta.',
      instruction_language: 'it',
      level: 'A1',
      topic: 'quantifiers',
      subtopic: 'much_many',
      primary_skill: 'grammar',
      learning_objective: 'Choose much or many according to countability.',
      difficulty: 'standard',
      options: [
        { key: 'many', text: 'many', is_correct: false, error_code: 'QUANTIFIER_MUCH_MANY' },
        { key: 'much', text: 'much', is_correct: true },
        { key: 'few', text: 'a few', is_correct: false, error_code: 'COUNTABILITY' },
      ],
      grading: { weight: 1, nearly_correct_multiplier: 0.5 },
      feedback: {
        explanation_it: 'Milk è un sostantivo non numerabile, quindi usiamo much.',
      },
      diagnostics: {
        tested_codes: ['QUANTIFIER_MUCH_MANY', 'COUNTABILITY'],
        fallback_error_code: 'QUANTIFIER_GENERAL',
      },
      tags: ['negative', 'uncountable'],
      foundation_links: [],
    },
  },
  question_pool: {
    schema_version: 1,
    entity_type: 'question_pool',
    pool: {
      client_key: 'pool_quantifiers_a1',
      name: 'A1 Quantifiers',
      description: 'Reusable question pool for some, any, much and many.',
      level: 'A1',
      topic: 'quantifiers',
      primary_skill: 'grammar',
      tags: ['some', 'any', 'much', 'many'],
      questions: [],
      question_refs: [],
    },
  },
  exercise: {
    schema_version: 1,
    entity_type: 'exercise',
    exercise: {
      title: 'Quantifiers review',
      description: 'Mixed review with changing questions on every attempt.',
      instructions: 'Completa tutte le sezioni.',
      instruction_language: 'it',
      level: 'A1',
      topic: 'quantifiers',
      estimated_minutes: 12,
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
          title: 'Some and any',
          instructions: 'Complete the questions in this section.',
          selection_mode: 'pool',
          feedback_timing: 'section_end',
          pool_rules: [
            {
              pool_ref: 'pool_quantifiers_a1',
              question_count: 5,
              selection_strategy: 'balanced',
              prevent_duplicate_questions: true,
              filters: { question_types: ['multiple_choice', 'gap_fill'] },
              distribution_rules: {},
            },
          ],
        },
      ],
      tags: ['review'],
      foundation_links: [],
    },
  },
  bundle: {
    schema_version: 1,
    entity_type: 'bundle',
    questions: [],
    pools: [],
    exercises: [],
  },
};

export function stringifyExerciseBuilderTemplate(type) {
  return JSON.stringify(exerciseBuilderTemplates[type] || exerciseBuilderTemplates.bundle, null, 2);
}
