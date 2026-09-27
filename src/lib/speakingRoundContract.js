export const SPEAKING_ROUND_CONTRACT_VERSION = 1;

export const SPEAKING_ROUND_FORMATS = Object.freeze([
  { id: 'number_mission', label: 'Number Mission' },
  { id: 'picture_detective', label: 'Picture Detective' },
  { id: 'explain_without_saying', label: 'Explain Without Saying' },
  { id: 'conversation_detective', label: 'Conversation Detective' },
  { id: 'make_the_choice', label: 'Make the Choice' },
]);

const FORMAT_IDS = new Set(SPEAKING_ROUND_FORMATS.map((item) => item.id));
const text = (value) => typeof value === 'string' ? value.trim() : '';
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const list = (value) => Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
const uniqueList = (value) => [...new Set(list(value))];

function issue(code, message, field, severity = 'error') {
  return { code, message, field, severity };
}

function key(value, fallback) {
  return text(value)
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || fallback;
}

function scaffold(format) {
  if (format === 'number_mission') {
    return {
      material: {
        facts: [
          { label: 'People', value: '', display: '', kind: 'quantity' },
          { label: 'Time', value: '', display: '', kind: 'time' },
          { label: 'Day', value: '', display: '', kind: 'weekday' },
        ],
      },
      teacher: { private_cue: '', final_confirmation: '' },
    };
  }
  if (format === 'picture_detective') {
    return {
      material: {
        show_labels: false,
        options: Array.from({ length: 4 }, (_, index) => ({
          key: String.fromCharCode(65 + index),
          label: '',
          image_url: '',
          image_alt: '',
        })),
      },
      teacher: { secret_option_key: '' },
    };
  }
  if (format === 'explain_without_saying') {
    return {
      material: { target: '', forbidden_words: ['', '', ''] },
      teacher: { model_response: '' },
    };
  }
  if (format === 'conversation_detective') {
    return {
      material: {
        turns: [
          { speaker: 'Alex', text: '' },
          { speaker: 'Sam', text: '' },
          { speaker: 'Alex', text: '' },
        ],
        question: '',
        follow_up: '',
      },
      teacher: { hidden_clue: '', interpretation: '' },
    };
  }
  return {
    material: {
      situation: '',
      task: '',
      options: [
        { key: 'option_a', title: '', details: [{ label: 'Price', value: '' }, { label: 'Advantage', value: '' }, { label: 'Trade-off', value: '' }] },
        { key: 'option_b', title: '', details: [{ label: 'Price', value: '' }, { label: 'Advantage', value: '' }, { label: 'Trade-off', value: '' }] },
      ],
    },
    teacher: { complication: '', role_note: '' },
  };
}

export function createDefaultSpeakingRound(format = 'number_mission') {
  const safeFormat = FORMAT_IDS.has(format) ? format : 'number_mission';
  const specific = scaffold(safeFormat);
  return {
    format: safeFormat,
    title: '',
    instructions: '',
    situation: '',
    outcome: '',
    primary_skill: 'speaking',
    learning_objective: 'Use English to complete a clear communicative task with another person.',
    support: [],
    challenge: { text: '', reveal: 'teacher-controlled' },
    role_swap: { enabled: true, instruction: '' },
    roles: [
      { key: 'learner', name: 'Learner', goal: '', private_cue: '' },
      { key: 'teacher', name: 'Teacher', goal: '', private_cue: '' },
    ],
    teacher_note: '',
    ...specific,
  };
}

function normalizeFacts(value) {
  return (Array.isArray(value) ? value : []).map((fact, index) => ({
    label: text(fact?.label),
    value: typeof fact?.value === 'number' ? fact.value : text(fact?.value),
    display: text(fact?.display),
    kind: ['quantity', 'time', 'weekday', 'date', 'price', 'code', 'other'].includes(fact?.kind) ? fact.kind : 'other',
    key: key(fact?.key || fact?.label, 'fact_' + (index + 1)),
  }));
}

function normalizePictureOptions(value) {
  return (Array.isArray(value) ? value : []).map((option, index) => ({
    key: text(option?.key) || String.fromCharCode(65 + index),
    label: text(option?.label),
    image_url: text(option?.image_url),
    image_alt: text(option?.image_alt),
  }));
}

function normalizeTurns(value) {
  return (Array.isArray(value) ? value : []).map((turn) => ({
    speaker: text(turn?.speaker),
    text: text(turn?.text),
  }));
}

function normalizeChoiceOptions(value) {
  return (Array.isArray(value) ? value : []).map((option, index) => ({
    key: key(option?.key || option?.title, 'option_' + (index + 1)),
    title: text(option?.title),
    details: (Array.isArray(option?.details) ? option.details : []).map((detail) => ({
      label: text(detail?.label),
      value: text(detail?.value),
    })),
  }));
}

export function normalizeSpeakingRoundBlock(block) {
  const source = object(block);
  const format = FORMAT_IDS.has(source.format) ? source.format : 'number_mission';
  const defaults = createDefaultSpeakingRound(format);
  const material = object(source.material);
  const teacher = object(source.teacher);

  const normalized = {
    ...source,
    format,
    title: text(source.title),
    instructions: text(source.instructions),
    situation: text(source.situation),
    outcome: text(source.outcome),
    primary_skill: 'speaking',
    learning_objective: text(source.learning_objective) || defaults.learning_objective,
    support: uniqueList(source.support),
    challenge: {
      text: text(source.challenge?.text),
      reveal: 'teacher-controlled',
    },
    role_swap: {
      enabled: source.role_swap?.enabled !== false,
      instruction: text(source.role_swap?.instruction),
    },
    roles: (Array.isArray(source.roles) ? source.roles : defaults.roles).map((role, index) => ({
      key: key(role?.key || role?.name, index === 0 ? 'learner' : 'teacher'),
      name: text(role?.name) || (index === 0 ? 'Learner' : 'Teacher'),
      goal: text(role?.goal),
      private_cue: text(role?.private_cue),
    })).slice(0, 4),
    teacher_note: text(source.teacher_note),
  };

  if (format === 'number_mission') {
    normalized.material = { facts: normalizeFacts(material.facts) };
    normalized.teacher = {
      private_cue: text(teacher.private_cue),
      final_confirmation: text(teacher.final_confirmation),
    };
  } else if (format === 'picture_detective') {
    normalized.material = {
      show_labels: material.show_labels === true,
      options: normalizePictureOptions(material.options),
    };
    normalized.teacher = { secret_option_key: text(teacher.secret_option_key) };
  } else if (format === 'explain_without_saying') {
    normalized.material = {
      target: text(material.target),
      forbidden_words: uniqueList(material.forbidden_words),
    };
    normalized.teacher = { model_response: text(teacher.model_response) };
  } else if (format === 'conversation_detective') {
    normalized.material = {
      turns: normalizeTurns(material.turns),
      question: text(material.question),
      follow_up: text(material.follow_up),
    };
    normalized.teacher = {
      hidden_clue: text(teacher.hidden_clue),
      interpretation: text(teacher.interpretation),
    };
  } else {
    normalized.material = {
      situation: text(material.situation || source.situation),
      task: text(material.task),
      options: normalizeChoiceOptions(material.options),
    };
    normalized.teacher = {
      complication: text(teacher.complication),
      role_note: text(teacher.role_note),
    };
  }

  return normalized;
}

function required(value, field, label, issues) {
  if (!text(value)) issues.push(issue('required', label + ' is required.', field));
}

export function validateSpeakingRoundBlock(rawBlock) {
  const block = normalizeSpeakingRoundBlock(rawBlock);
  const issues = [];

  required(block.title, 'title', 'Speaking round title', issues);
  required(block.instructions, 'instructions', 'Learner instruction', issues);

  if (block.roles.length < 2) {
    issues.push(issue('roles', 'Add a usable learner role and teacher role.', 'roles'));
  }

  if (block.format === 'number_mission') {
    const facts = block.material.facts.filter((fact) => fact.label || fact.value !== '');
    if (facts.length < 2) issues.push(issue('minimum', 'Number Mission needs at least two labelled facts.', 'material.facts'));
    facts.forEach((fact, index) => {
      required(fact.label, 'material.facts.' + index + '.label', 'Fact label', issues);
      if (fact.value === '' || fact.value == null) issues.push(issue('required', 'Fact value is required.', 'material.facts.' + index + '.value'));
      if (fact.kind === 'quantity' && Number(fact.value) <= 0) issues.push(issue('invalid_quantity', 'Quantities must be greater than zero.', 'material.facts.' + index + '.value'));
    });
    required(block.teacher.private_cue, 'teacher.private_cue', 'Private teacher read-back / mismatch cue', issues);
  }

  if (block.format === 'picture_detective') {
    const options = block.material.options.filter((option) => option.label || option.image_url || option.image_alt);
    if (options.length < 3) issues.push(issue('minimum', 'Picture Detective needs at least three distinct image options.', 'material.options'));
    const keys = new Set();
    options.forEach((option, index) => {
      required(option.label, 'material.options.' + index + '.label', 'Image option label', issues);
      required(option.image_url, 'material.options.' + index + '.image_url', 'Image asset', issues);
      required(option.image_alt, 'material.options.' + index + '.image_alt', 'Accessible image description', issues);
      if (keys.has(option.key)) issues.push(issue('duplicate_key', 'Each image option needs a distinct key.', 'material.options.' + index + '.key'));
      keys.add(option.key);
    });
    required(block.teacher.secret_option_key, 'teacher.secret_option_key', 'Teacher secret option', issues);
    if (block.teacher.secret_option_key && !keys.has(block.teacher.secret_option_key)) {
      issues.push(issue('invalid_secret', 'Teacher secret must point to one of the authored image options.', 'teacher.secret_option_key'));
    }
  }

  if (block.format === 'explain_without_saying') {
    required(block.material.target, 'material.target', 'Target expression', issues);
    if (block.material.forbidden_words.length < 2) {
      issues.push(issue('minimum', 'Add at least two distinct forbidden words.', 'material.forbidden_words'));
    }
    const target = block.material.target.toLocaleLowerCase();
    if (block.material.forbidden_words.some((word) => word.toLocaleLowerCase() === target)) {
      issues.push(issue('unworkable_ban', 'The target itself should not also be listed as a forbidden word.', 'material.forbidden_words'));
    }
  }

  if (block.format === 'conversation_detective') {
    const turns = block.material.turns.filter((turn) => turn.speaker || turn.text);
    if (turns.length < 2) issues.push(issue('minimum', 'Conversation Detective needs at least two dialogue turns.', 'material.turns'));
    turns.forEach((turn, index) => {
      required(turn.speaker, 'material.turns.' + index + '.speaker', 'Speaker name', issues);
      required(turn.text, 'material.turns.' + index + '.text', 'Dialogue line', issues);
    });
    required(block.material.question, 'material.question', 'Inference question', issues);
    required(block.teacher.interpretation, 'teacher.interpretation', 'Teacher interpretation / accepted reading', issues);
  }

  if (block.format === 'make_the_choice') {
    required(block.material.situation, 'material.situation', 'Choice situation', issues);
    required(block.material.task, 'material.task', 'Choice task', issues);
    if (block.material.options.length < 2) issues.push(issue('minimum', 'Make the Choice needs at least two comparable options.', 'material.options'));
    block.material.options.forEach((option, index) => {
      required(option.title, 'material.options.' + index + '.title', 'Option title', issues);
      if (option.details.filter((detail) => detail.label && detail.value).length < 2) {
        issues.push(issue('minimum', 'Each choice needs at least two labelled details so the trade-off is visible.', 'material.options.' + index + '.details'));
      }
    });
  }

  return issues;
}

export function projectSpeakingRoundForLearner(rawBlock) {
  const block = normalizeSpeakingRoundBlock(rawBlock);
  return {
    contract_version: SPEAKING_ROUND_CONTRACT_VERSION,
    format: block.format,
    title: block.title,
    instructions: block.instructions,
    situation: block.situation,
    outcome: block.outcome,
    support: block.support,
    role_swap: {
      enabled: block.role_swap.enabled,
      instruction: block.role_swap.instruction,
    },
    roles: block.roles.map((role) => ({
      key: role.key,
      name: role.name,
      goal: role.goal,
    })),
    material: block.material,
    has_challenge: Boolean(block.challenge.text),
  };
}

export const SPEAKING_ROUND_PRESETS = Object.freeze(SPEAKING_ROUND_FORMATS.map((format) => ({
  id: format.id,
  label: format.label,
  description: ({
    number_mission: 'Numbers, checking and conversational repair.',
    picture_detective: 'Questions and visual identification.',
    explain_without_saying: 'Paraphrase under lexical constraints.',
    conversation_detective: 'Inference from a short dialogue.',
    make_the_choice: 'Compare options and negotiate a choice.',
  })[format.id],
  initial: createDefaultSpeakingRound(format.id),
})));
