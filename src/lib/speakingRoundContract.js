export const SPEAKING_ROUND_CONTRACT_VERSION = 1;

export const SPEAKING_ROUND_FORMATS = Object.freeze([
  'number_mission',
  'picture_detective',
  'explain_without_saying',
  'conversation_detective',
  'make_choice',
]);

const text = (value) => typeof value === 'string' ? value.trim() : '';
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const list = (value) => Array.isArray(value) ? value : [];
const strings = (value) => list(value).map(text).filter(Boolean);

const issue = (code, message, field, severity = 'error') => ({ code, message, field, severity });

function normalizeFacts(value) {
  return list(value).map((fact, index) => ({
    label: text(fact?.label) || `Fact ${index + 1}`,
    value: fact?.value ?? '',
    display: text(fact?.display),
    kind: text(fact?.kind) || 'text',
  })).filter((fact) => fact.label && String(fact.value ?? '').trim());
}

function normalizeChoices(value) {
  return list(value).map((choice, index) => ({
    key: text(choice?.key) || String.fromCharCode(65 + index),
    label: text(choice?.label) || text(choice?.title),
    description: text(choice?.description),
    image_src: text(choice?.image_src || choice?.image),
    alt: text(choice?.alt),
  })).filter((choice) => choice.label || choice.image_src);
}

function normalizeTurns(value) {
  return list(value).map((turn) => ({
    speaker: text(turn?.speaker),
    text: text(turn?.text),
  })).filter((turn) => turn.speaker || turn.text);
}

function normalizeComparisonOptions(value) {
  return list(value).map((option, index) => ({
    key: text(option?.key) || `option_${index + 1}`,
    title: text(option?.title || option?.label),
    subtitle: text(option?.subtitle),
    facts: normalizeFacts(option?.facts),
    description: text(option?.description),
  })).filter((option) => option.title || option.description || option.facts.length);
}

function normalizeRoles(value) {
  return list(value).map((role) => ({
    name: text(role?.name),
    goal: text(role?.goal),
    support: strings(role?.support),
    private_cue: text(role?.private_cue),
  })).filter((role) => role.name || role.goal || role.private_cue);
}

export function createDefaultSpeakingRound(format = 'number_mission') {
  const safeFormat = SPEAKING_ROUND_FORMATS.includes(format) ? format : 'number_mission';
  const common = {
    format: safeFormat,
    title: '',
    instruction: '',
    situation: '',
    outcome: '',
    primary_capacity: '',
    language_targets: [],
    support: [],
    roles: [],
    challenge: { text: '', reveal: 'teacher-controlled' },
    teacher_note: '',
    material: {},
    private: {},
  };

  if (safeFormat === 'number_mission') {
    common.material = { facts: [
      { label: 'People', value: '', display: '', kind: 'quantity' },
      { label: 'Time', value: '', display: '', kind: 'time' },
      { label: 'Day', value: '', display: '', kind: 'weekday' },
    ] };
    common.roles = [
      { name: 'Customer', goal: '', support: [], private_cue: '' },
      { name: 'Staff', goal: '', support: [], private_cue: '' },
    ];
  } else if (safeFormat === 'picture_detective') {
    common.material = { choices: [
      { key: 'A', label: '', description: '', image_src: '', alt: '' },
      { key: 'B', label: '', description: '', image_src: '', alt: '' },
      { key: 'C', label: '', description: '', image_src: '', alt: '' },
      { key: 'D', label: '', description: '', image_src: '', alt: '' },
    ] };
    common.private = { teacher_secret_key: '' };
  } else if (safeFormat === 'explain_without_saying') {
    common.material = { target: '', forbidden_words: [] };
    common.private = { teacher_model: '' };
  } else if (safeFormat === 'conversation_detective') {
    common.material = { turns: [], question: '', vocabulary: [] };
    common.private = { hidden_clue: '', teacher_interpretation: '' };
  } else if (safeFormat === 'make_choice') {
    common.material = { options: [], criteria: [], constraints: [] };
  }

  return common;
}

export function normalizeSpeakingRound(raw) {
  const source = object(raw);
  const format = SPEAKING_ROUND_FORMATS.includes(source.format) ? source.format : 'number_mission';
  const base = createDefaultSpeakingRound(format);
  const material = object(source.material);
  const privateData = object(source.private);
  const challenge = object(source.challenge);

  const normalized = {
    ...base,
    ...source,
    format,
    title: text(source.title),
    instruction: text(source.instruction || source.instructions),
    situation: text(source.situation),
    outcome: text(source.outcome),
    primary_capacity: text(source.primary_capacity),
    language_targets: strings(source.language_targets),
    support: strings(source.support),
    roles: normalizeRoles(source.roles),
    challenge: {
      text: text(challenge.text),
      reveal: ['teacher-controlled', 'immediate', 'after-attempt'].includes(challenge.reveal)
        ? challenge.reveal
        : 'teacher-controlled',
    },
    teacher_note: text(source.teacher_note),
  };

  if (format === 'number_mission') {
    normalized.material = { facts: normalizeFacts(material.facts) };
    normalized.private = {
      teacher_script: text(privateData.teacher_script || source.teacher_script),
    };
  } else if (format === 'picture_detective') {
    normalized.material = { choices: normalizeChoices(material.choices) };
    normalized.private = {
      teacher_secret_key: text(privateData.teacher_secret_key || source.teacher_secret_key),
    };
  } else if (format === 'explain_without_saying') {
    normalized.material = {
      target: text(material.target || source.target),
      forbidden_words: strings(material.forbidden_words || source.forbidden_words),
    };
    normalized.private = {
      teacher_model: text(privateData.teacher_model || source.teacher_model),
    };
  } else if (format === 'conversation_detective') {
    normalized.material = {
      turns: normalizeTurns(material.turns || source.turns),
      question: text(material.question || source.question),
      vocabulary: strings(material.vocabulary || source.vocabulary),
    };
    normalized.private = {
      hidden_clue: text(privateData.hidden_clue || source.hidden_clue),
      teacher_interpretation: text(privateData.teacher_interpretation || source.teacher_interpretation),
    };
  } else if (format === 'make_choice') {
    normalized.material = {
      options: normalizeComparisonOptions(material.options || source.options),
      criteria: strings(material.criteria || source.criteria),
      constraints: strings(material.constraints || source.constraints),
    };
    normalized.private = {};
  }

  return normalized;
}

function validateCommon(round) {
  const issues = [];
  if (!text(round.title)) issues.push(issue('required', 'Add a learner-facing title.', 'title'));
  if (!text(round.instruction)) issues.push(issue('required', 'Add the learner instruction.', 'instruction'));
  if (!text(round.outcome)) issues.push(issue('required', 'Describe the intended speaking outcome.', 'outcome'));
  if (!text(round.primary_capacity)) issues.push(issue('required', 'Choose the primary speaking capacity.', 'primary_capacity'));
  return issues;
}

function validateNumberMission(round) {
  const issues = [];
  const facts = list(round.material?.facts);
  if (facts.length < 2) issues.push(issue('required', 'Add at least two separate facts to communicate.', 'material.facts'));
  facts.forEach((fact, index) => {
    if (!text(fact?.label)) issues.push(issue('required', 'Give this fact a label.', `material.facts.${index}.label`));
    if (!String(fact?.value ?? '').trim()) issues.push(issue('required', 'Give this fact a value.', `material.facts.${index}.value`));
    if (fact?.kind === 'quantity' && Number(fact.value) <= 0) {
      issues.push(issue('invalid_quantity', 'Participant quantities must be positive.', `material.facts.${index}.value`));
    }
  });
  if (!text(round.private?.teacher_script)) {
    issues.push(issue('required', 'Add the teacher-only read-back or mismatch script.', 'private.teacher_script'));
  }
  return issues;
}

function validatePictureDetective(round) {
  const issues = [];
  const choices = list(round.material?.choices);
  if (choices.length < 3) issues.push(issue('required', 'Add at least three distinct visual choices.', 'material.choices'));
  const keys = new Set();
  choices.forEach((choice, index) => {
    if (!text(choice?.key)) issues.push(issue('required', 'Give each choice a short key.', `material.choices.${index}.key`));
    if (keys.has(choice?.key)) issues.push(issue('duplicate_choice', 'Choice keys must be unique.', `material.choices.${index}.key`));
    keys.add(choice?.key);
    if (!text(choice?.label)) issues.push(issue('required', 'Name the pictured choice.', `material.choices.${index}.label`));
    if (!text(choice?.image_src)) issues.push(issue('missing_asset', 'Add the final image asset before publishing.', `material.choices.${index}.image_src`));
    if (!text(choice?.alt)) issues.push(issue('required', 'Add an accessible description that does not reveal the secret.', `material.choices.${index}.alt`));
  });
  if (!text(round.private?.teacher_secret_key)) {
    issues.push(issue('required', 'Choose the teacher secret.', 'private.teacher_secret_key'));
  } else if (!keys.has(round.private.teacher_secret_key)) {
    issues.push(issue('invalid_secret', 'The teacher secret must match one of the visible choices.', 'private.teacher_secret_key'));
  }
  return issues;
}

function validateExplainWithoutSaying(round) {
  const issues = [];
  if (!text(round.material?.target)) issues.push(issue('required', 'Add the target expression.', 'material.target'));
  const forbidden = strings(round.material?.forbidden_words);
  if (!forbidden.length) issues.push(issue('required', 'Add at least one forbidden word.', 'material.forbidden_words'));
  if (new Set(forbidden.map((item) => item.toLowerCase())).size !== forbidden.length) {
    issues.push(issue('duplicate_forbidden', 'Forbidden words must be distinct.', 'material.forbidden_words'));
  }
  return issues;
}

function validateConversationDetective(round) {
  const issues = [];
  const turns = list(round.material?.turns);
  if (turns.length < 2) issues.push(issue('required', 'Add at least two speaker-labelled turns.', 'material.turns'));
  turns.forEach((turn, index) => {
    if (!text(turn?.speaker) || !text(turn?.text)) {
      issues.push(issue('required', 'Every dialogue turn needs a speaker and a line.', `material.turns.${index}`));
    }
  });
  if (!text(round.material?.question)) issues.push(issue('required', 'Add the inference question.', 'material.question'));
  if (!text(round.private?.teacher_interpretation)) {
    issues.push(issue('required', 'Add a teacher interpretation or acceptable direction.', 'private.teacher_interpretation'));
  }
  return issues;
}

function validateMakeChoice(round) {
  const issues = [];
  const options = list(round.material?.options);
  if (options.length < 2) issues.push(issue('required', 'Add at least two genuinely comparable options.', 'material.options'));
  options.forEach((option, index) => {
    if (!text(option?.title)) issues.push(issue('required', 'Name this option.', `material.options.${index}.title`));
    if (!text(option?.description) && !list(option?.facts).length) {
      issues.push(issue('required', 'Add comparable facts or a short description.', `material.options.${index}`));
    }
  });
  if (!strings(round.material?.constraints).length && !strings(round.material?.criteria).length) {
    issues.push(issue('required', 'Add at least one decision criterion or constraint.', 'material.constraints'));
  }
  return issues;
}

export function validateSpeakingRound(raw) {
  const round = normalizeSpeakingRound(raw);
  const issues = validateCommon(round);
  if (round.format === 'number_mission') issues.push(...validateNumberMission(round));
  if (round.format === 'picture_detective') issues.push(...validatePictureDetective(round));
  if (round.format === 'explain_without_saying') issues.push(...validateExplainWithoutSaying(round));
  if (round.format === 'conversation_detective') issues.push(...validateConversationDetective(round));
  if (round.format === 'make_choice') issues.push(...validateMakeChoice(round));
  return issues;
}

export function projectSpeakingRoundForLearner(raw) {
  const round = normalizeSpeakingRound(raw);
  return {
    contract_version: SPEAKING_ROUND_CONTRACT_VERSION,
    format: round.format,
    title: round.title,
    instruction: round.instruction,
    situation: round.situation,
    outcome: round.outcome,
    primary_capacity: round.primary_capacity,
    language_targets: round.language_targets,
    support: round.support,
    roles: round.roles.map((role) => ({
      name: role.name,
      goal: role.goal,
      support: role.support,
    })),
    challenge: round.challenge,
    material: round.material,
  };
}

export function containsSpeakingPrivateMaterial(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const serialized = JSON.stringify(payload);
  return /teacher_note|teacher_script|teacher_secret_key|teacher_model|teacher_interpretation|hidden_clue|private_cue/i.test(serialized);
}

export const SPEAKING_ROUND_FORMAT_LABELS = Object.freeze({
  number_mission: 'Number Mission',
  picture_detective: 'Picture Detective',
  explain_without_saying: 'Explain Without Saying',
  conversation_detective: 'Conversation Detective',
  make_choice: 'Make the Choice',
});
