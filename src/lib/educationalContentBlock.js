export const EDUCATIONAL_CONTENT_SCHEMA_VERSION = 1;

export const EDUCATIONAL_CONTENT_VARIANTS = [
  'general',
  'grammar',
  'vocabulary',
  'functional_language',
  'dialogue',
  'pronunciation',
  'strategy',
  'recap',
  'instructions',
];

export const EDUCATIONAL_SECTION_TYPES = [
  'rule',
  'example',
  'mistake',
  'comparison',
  'tip',
  'pattern',
  'dialogue',
  'vocabulary',
  'recap',
];

const SECTION_TYPE_SET = new Set(EDUCATIONAL_SECTION_TYPES);
const VARIANT_SET = new Set(EDUCATIONAL_CONTENT_VARIANTS);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter(Boolean);
}

function normalizeExample(value) {
  if (typeof value === 'string') {
    return { text: value.trim(), label: '', translation: '', highlight: [] };
  }
  if (!isObject(value)) return null;
  const exampleText = text(value.text || value.example);
  if (!exampleText) return null;
  return {
    text: exampleText,
    label: text(value.label),
    translation: text(value.translation),
    highlight: stringArray(value.highlight),
  };
}

function normalizeTurn(value) {
  if (!isObject(value)) return null;
  const speaker = text(value.speaker);
  const turnText = text(value.text);
  if (!speaker || !turnText) return null;
  return { speaker, text: turnText, highlight: stringArray(value.highlight) };
}

function normalizeVocabularyItem(value) {
  if (!isObject(value)) return null;
  const term = text(value.term || value.word || value.expression);
  if (!term) return null;
  return {
    term,
    meaning: text(value.meaning || value.definition),
    example: text(value.example),
    translation: text(value.translation),
    highlight: stringArray(value.highlight),
  };
}

export function normalizeEducationalSection(value, index = 0) {
  if (!isObject(value)) return null;
  const type = text(value.type);
  if (!SECTION_TYPE_SET.has(type)) return null;

  const examples = (Array.isArray(value.examples) ? value.examples : value.example ? [value.example] : [])
    .map(normalizeExample)
    .filter(Boolean);
  const turns = (Array.isArray(value.turns) ? value.turns : [])
    .map(normalizeTurn)
    .filter(Boolean);
  const items = (Array.isArray(value.items) ? value.items : [])
    .map(normalizeVocabularyItem)
    .filter(Boolean);

  return {
    key: text(value.key) || `${type}_${index + 1}`,
    type,
    title: text(value.title || value.label),
    body: text(value.body || value.explanation),
    pattern: text(value.pattern),
    examples,
    correct: normalizeExample(value.correct),
    incorrect: normalizeExample(value.incorrect),
    points: stringArray(value.points),
    turns,
    items,
  };
}

export function normalizeEducationalContentBlock(content, fallbackBody = '') {
  const source = isObject(content) ? content : {};
  const rawSections = Array.isArray(source.sections) ? source.sections : [];
  const sections = rawSections.map(normalizeEducationalSection).filter(Boolean);
  const structured = rawSections.length > 0;
  const variant = VARIANT_SET.has(text(source.variant)) ? text(source.variant) : 'general';

  return {
    structured,
    educational_schema_version: Number(source.educational_schema_version) || EDUCATIONAL_CONTENT_SCHEMA_VERSION,
    template_id: text(source.template_id),
    variant,
    intro: text(source.intro),
    body: text(source.body || fallbackBody),
    sections,
  };
}

export function isStructuredEducationalContent(content) {
  return Boolean(isObject(content) && Array.isArray(content.sections) && content.sections.length);
}

export function validateEducationalContentBlock(content, path = 'content') {
  const errors = [];
  const warnings = [];
  if (!isObject(content)) {
    return { errors: [`${path}: deve essere un oggetto.`], warnings };
  }

  const version = Number(content.educational_schema_version || EDUCATIONAL_CONTENT_SCHEMA_VERSION);
  if (version !== EDUCATIONAL_CONTENT_SCHEMA_VERSION) {
    errors.push(`${path}.educational_schema_version: usa ${EDUCATIONAL_CONTENT_SCHEMA_VERSION}.`);
  }

  const variant = text(content.variant) || 'general';
  if (!VARIANT_SET.has(variant)) {
    errors.push(`${path}.variant: usa ${EDUCATIONAL_CONTENT_VARIANTS.join(', ')}.`);
  }

  const sections = Array.isArray(content.sections) ? content.sections : [];
  if (!sections.length) {
    if (!text(content.body)) errors.push(`${path}: serve body oppure almeno una section.`);
    return { errors, warnings };
  }

  sections.forEach((section, index) => {
    const sectionPath = `${path}.sections[${index}]`;
    if (!isObject(section)) {
      errors.push(`${sectionPath}: deve essere un oggetto.`);
      return;
    }
    const type = text(section.type);
    if (!SECTION_TYPE_SET.has(type)) {
      errors.push(`${sectionPath}.type: usa ${EDUCATIONAL_SECTION_TYPES.join(', ')}.`);
      return;
    }

    const sectionBody = text(section.body || section.explanation);
    const examples = Array.isArray(section.examples) ? section.examples.map(normalizeExample).filter(Boolean) : [];
    if (['rule', 'tip', 'pattern'].includes(type) && !sectionBody && !text(section.pattern)) {
      errors.push(`${sectionPath}: ${type} richiede body/explanation oppure pattern.`);
    }
    if (type === 'rule' && !examples.length) {
      warnings.push(`${sectionPath}: una rule dovrebbe normalmente includere almeno un example.`);
    }
    if (type === 'example' && !examples.length) {
      errors.push(`${sectionPath}: example richiede examples.`);
    }
    if (['mistake', 'comparison'].includes(type) && !normalizeExample(section.correct) && !normalizeExample(section.incorrect)) {
      errors.push(`${sectionPath}: ${type} richiede correct e/o incorrect.`);
    }
    if (type === 'dialogue') {
      const turns = Array.isArray(section.turns) ? section.turns.map(normalizeTurn).filter(Boolean) : [];
      if (turns.length < 2) errors.push(`${sectionPath}: dialogue richiede almeno due turns validi.`);
    }
    if (type === 'vocabulary') {
      const items = Array.isArray(section.items) ? section.items.map(normalizeVocabularyItem).filter(Boolean) : [];
      if (!items.length) errors.push(`${sectionPath}: vocabulary richiede almeno un item valido.`);
    }
    if (type === 'recap' && !sectionBody && !stringArray(section.points).length) {
      errors.push(`${sectionPath}: recap richiede body oppure points.`);
    }
  });

  if (!text(content.body)) {
    warnings.push(`${path}.body: consigliato come fallback per client legacy finché la migrazione non è completa.`);
  }

  return { errors, warnings };
}
