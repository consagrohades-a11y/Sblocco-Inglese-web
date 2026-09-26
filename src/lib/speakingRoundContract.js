const text = (value) => String(value ?? '').trim();
const list = (value) => Array.isArray(value)
  ? value.map((item) => text(item)).filter(Boolean)
  : [];

export const SPEAKING_ROUND_CONTRACT_VERSION = 1;

export const SPEAKING_ROUND_FORMATS = Object.freeze([
  { value: 'number_mission', label: 'Number Mission' },
  { value: 'picture_detective', label: 'Picture Detective' },
  { value: 'explain_without_saying', label: 'Explain Without Saying' },
  { value: 'conversation_detective', label: 'Conversation Detective' },
  { value: 'make_the_choice', label: 'Make the Choice' },
]);

const FORMAT_SET = new Set(SPEAKING_ROUND_FORMATS.map((item) => item.value));

export function isStructuredSpeakingFormat(value) {
  return FORMAT_SET.has(text(value));
}

export function createSpeakingMaterial(format) {
  switch (format) {
    case 'number_mission':
      return { format, mission: '', facts: [{ label: '', value: '' }] };
    case 'picture_detective':
      return { format, image_src: '', image_alt: '', question: '', clues: [] };
    case 'explain_without_saying':
      return { format, target: '', forbidden_words: ['', ''] };
    case 'conversation_detective':
      return { format, turns: [{ speaker: 'A', line: '' }, { speaker: 'B', line: '' }], question: '' };
    case 'make_the_choice':
      return { format, question: '', options: [{ title: '', detail: '' }, { title: '', detail: '' }], criteria: [] };
    default:
      return null;
  }
}

export function normalizeSpeakingMaterial(value) {
  const material = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (!material || !isStructuredSpeakingFormat(material.format)) return null;

  switch (material.format) {
    case 'number_mission':
      return {
        format: material.format,
        mission: text(material.mission),
        facts: (Array.isArray(material.facts) ? material.facts : [])
          .map((fact) => ({ label: text(fact?.label), value: text(fact?.value) }))
          .filter((fact) => fact.label || fact.value),
      };
    case 'picture_detective':
      return {
        format: material.format,
        image_src: text(material.image_src),
        image_alt: text(material.image_alt),
        question: text(material.question),
        clues: list(material.clues),
      };
    case 'explain_without_saying':
      return {
        format: material.format,
        target: text(material.target),
        forbidden_words: list(material.forbidden_words),
      };
    case 'conversation_detective':
      return {
        format: material.format,
        turns: (Array.isArray(material.turns) ? material.turns : [])
          .map((turn) => ({ speaker: text(turn?.speaker), line: text(turn?.line) }))
          .filter((turn) => turn.speaker || turn.line),
        question: text(material.question),
      };
    case 'make_the_choice':
      return {
        format: material.format,
        question: text(material.question),
        options: (Array.isArray(material.options) ? material.options : [])
          .map((option) => ({ title: text(option?.title), detail: text(option?.detail) }))
          .filter((option) => option.title || option.detail),
        criteria: list(material.criteria),
      };
    default:
      return null;
  }
}

export function validateSpeakingMaterial(value) {
  const material = normalizeSpeakingMaterial(value);
  if (!material) return [];

  const issues = [];
  const add = (field, message) => issues.push({ field, message });

  if (material.format === 'number_mission') {
    if (!material.mission) add('material.mission', 'Aggiungi la missione numerica.');
    if (!material.facts.length) add('material.facts', 'Aggiungi almeno un dato numerico visibile.');
    material.facts.forEach((fact, index) => {
      if (!fact.label || !fact.value) add('material.facts.' + index, 'Ogni dato deve avere etichetta e valore.');
    });
  }

  if (material.format === 'picture_detective') {
    if (!material.image_src) add('material.image_src', 'Aggiungi un’immagine reale prima di usare questo item.');
    if (!material.image_alt) add('material.image_alt', 'Aggiungi un testo alternativo descrittivo.');
    if (!material.question) add('material.question', 'Aggiungi la domanda investigativa.');
  }

  if (material.format === 'explain_without_saying') {
    if (!material.target) add('material.target', 'Aggiungi la parola o il concetto target.');
    if (material.forbidden_words.length < 2) add('material.forbidden_words', 'Aggiungi almeno due parole vietate.');
  }

  if (material.format === 'conversation_detective') {
    if (material.turns.length < 2) add('material.turns', 'Aggiungi almeno due battute.');
    material.turns.forEach((turn, index) => {
      if (!turn.speaker || !turn.line) add('material.turns.' + index, 'Ogni battuta deve avere speaker e testo.');
    });
    if (!material.question) add('material.question', 'Aggiungi la domanda detective.');
  }

  if (material.format === 'make_the_choice') {
    if (!material.question) add('material.question', 'Aggiungi la decisione da prendere.');
    if (material.options.length < 2) add('material.options', 'Aggiungi almeno due opzioni.');
    material.options.forEach((option, index) => {
      if (!option.title || !option.detail) add('material.options.' + index, 'Ogni opzione deve avere titolo e dettaglio.');
    });
  }

  return issues;
}

export function normalizeSpeakingItem(item, fallbackLevels = []) {
  if (typeof item === 'string') {
    return {
      text: item.trim(),
      levels: fallbackLevels,
      student_support: '',
      challenge: '',
      teacher_note: '',
      material: null,
    };
  }

  const source = item && typeof item === 'object' ? item : {};
  return {
    ...source,
    text: text(source.text),
    levels: Array.isArray(source.levels) && source.levels.length ? source.levels : fallbackLevels,
    student_support: text(source.student_support || source.support),
    challenge: text(source.challenge),
    teacher_note: text(source.teacher_note),
    material: normalizeSpeakingMaterial(source.material),
  };
}
