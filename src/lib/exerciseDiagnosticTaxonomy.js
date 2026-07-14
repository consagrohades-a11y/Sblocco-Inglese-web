const SKILLS = new Set(['grammar', 'vocabulary', 'reading', 'writing', 'functional_language', 'spelling', 'word_order']);
const CATEGORIES = new Set(['learning', 'precision']);
const SEVERITIES = new Set(['minor', 'major', 'precision']);
const STATUSES = new Set(['active', 'archived']);
const MESSAGE_LEVELS = ['reminder', 'weakness', 'subtopic_review', 'topic_review'];

function cleanCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeMessages(messages) {
  const source = messages && typeof messages === 'object' && !Array.isArray(messages) ? messages : {};
  const normalized = { it: {}, en: {} };

  ['it', 'en'].forEach((language) => {
    const nested = source[language];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      MESSAGE_LEVELS.forEach((level) => {
        const text = cleanText(nested[level]);
        if (text) normalized[language][level] = text;
      });
    }
    MESSAGE_LEVELS.forEach((level) => {
      const text = cleanText(source[`${language}:${level}`]);
      if (text) normalized[language][level] = text;
    });
  });

  return normalized;
}

function hasItalianMessage(messages) {
  return MESSAGE_LEVELS.some((level) => cleanText(messages?.it?.[level]));
}

function normalizeCode(item) {
  const category = CATEGORIES.has(item?.category) ? item.category : 'learning';
  const severity = SEVERITIES.has(item?.severity)
    ? item.severity
    : category === 'precision' ? 'precision' : 'minor';
  return {
    code: cleanCode(item?.code),
    label: cleanText(item?.label),
    primary_skill: cleanText(item?.primary_skill),
    topic: cleanText(item?.topic),
    subtopic: cleanText(item?.subtopic) || null,
    group_key: cleanText(item?.group_key) || null,
    severity,
    category,
    recommended_resources: Array.isArray(item?.recommended_resources) ? item.recommended_resources : [],
    status: STATUSES.has(item?.status) ? item.status : 'active',
    messages: normalizeMessages(item?.messages),
  };
}

function normalizeRule(item) {
  const trigger = item?.trigger_config || item?.trigger || {};
  const output = item?.output_config || item?.output || {};
  return {
    rule_key: cleanCode(item?.rule_key),
    topic: cleanText(item?.topic),
    priority: Number.isFinite(Number(item?.priority)) ? Number(item.priority) : 0,
    trigger: {
      minimum_distinct_error_codes: Math.max(1, Number(trigger?.minimum_distinct_error_codes) || 1),
      minimum_distinct_groups: Math.max(1, Number(trigger?.minimum_distinct_groups) || 1),
      minimum_error_rate: Math.max(0, Math.min(1, Number(trigger?.minimum_error_rate) || 0)),
      required_groups: Array.isArray(trigger?.required_groups) ? trigger.required_groups.map(cleanText).filter(Boolean) : [],
    },
    output: {
      diagnostic_code: cleanCode(output?.diagnostic_code) || null,
      message_level: MESSAGE_LEVELS.includes(output?.message_level) ? output.message_level : 'topic_review',
      messages: {
        it: cleanText(output?.messages?.it),
        en: cleanText(output?.messages?.en),
      },
    },
    suppress_specific_messages: item?.suppress_specific_messages !== false,
    status: STATUSES.has(item?.status) ? item.status : 'active',
  };
}

export function validateDiagnosticTaxonomy(input, { existingCodes = [], existingRules = [] } = {}) {
  const rootErrors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Il file deve contenere un oggetto JSON.'], items: [], payload: null };
  }
  if (Number(input.schema_version) !== 1) rootErrors.push('schema_version deve essere 1.');
  if (input.entity_type !== 'diagnostic_taxonomy') rootErrors.push('entity_type deve essere diagnostic_taxonomy.');
  if (!Array.isArray(input.codes)) rootErrors.push('codes deve essere un array.');
  if (!Array.isArray(input.rules)) rootErrors.push('rules deve essere un array.');

  const codes = Array.isArray(input.codes) ? input.codes.map(normalizeCode) : [];
  const rules = Array.isArray(input.rules) ? input.rules.map(normalizeRule) : [];
  if (!codes.length && !rules.length) rootErrors.push('La tassonomia deve contenere almeno un codice o una regola.');

  const duplicateCodes = new Set();
  const seenCodes = new Set();
  codes.forEach((item) => {
    if (seenCodes.has(item.code)) duplicateCodes.add(item.code);
    seenCodes.add(item.code);
  });
  const duplicateRules = new Set();
  const seenRules = new Set();
  rules.forEach((item) => {
    if (seenRules.has(item.rule_key)) duplicateRules.add(item.rule_key);
    seenRules.add(item.rule_key);
  });

  const availableCodes = new Set([...existingCodes.map(cleanCode), ...codes.map((item) => item.code)]);
  const existingCodeSet = new Set(existingCodes.map(cleanCode));
  const existingRuleSet = new Set(existingRules.map(cleanCode));

  const codeItems = codes.map((payload, index) => {
    const errors = [];
    const warnings = [];
    if (!payload.code) errors.push('Codice mancante.');
    if (!payload.label) errors.push('Etichetta mancante.');
    if (!SKILLS.has(payload.primary_skill)) errors.push('Competenza non valida.');
    if (!payload.topic) errors.push('Topic mancante.');
    if (!CATEGORIES.has(payload.category)) errors.push('Categoria non valida.');
    if (!SEVERITIES.has(payload.severity)) errors.push('Gravità non valida.');
    if (payload.status === 'active' && !hasItalianMessage(payload.messages)) errors.push('Un codice attivo richiede almeno un messaggio italiano.');
    if (duplicateCodes.has(payload.code)) errors.push('Codice duplicato nello stesso file.');
    if (existingCodeSet.has(payload.code)) warnings.push('Il codice esiste già nel registro.');
    return { id: `code:${index}:${payload.code}`, kind: 'code', key: payload.code, payload, errors, warnings, existing: existingCodeSet.has(payload.code) };
  });

  const ruleItems = rules.map((payload, index) => {
    const errors = [];
    const warnings = [];
    if (!payload.rule_key) errors.push('Chiave regola mancante.');
    if (!payload.topic) errors.push('Topic mancante.');
    if (payload.trigger.minimum_error_rate < 0 || payload.trigger.minimum_error_rate > 1) errors.push('Il tasso minimo deve essere tra 0 e 1.');
    if (!payload.output.messages.it && !payload.output.diagnostic_code) errors.push('La regola richiede un messaggio italiano o un diagnostic_code di output.');
    if (payload.output.diagnostic_code && !availableCodes.has(payload.output.diagnostic_code)) errors.push(`Codice di output sconosciuto: ${payload.output.diagnostic_code}.`);
    if (duplicateRules.has(payload.rule_key)) errors.push('Regola duplicata nello stesso file.');
    if (existingRuleSet.has(payload.rule_key)) warnings.push('La regola esiste già nel registro.');
    return { id: `rule:${index}:${payload.rule_key}`, kind: 'rule', key: payload.rule_key, payload, errors, warnings, existing: existingRuleSet.has(payload.rule_key) };
  });

  const items = [...codeItems, ...ruleItems];
  return {
    valid: rootErrors.length === 0 && items.every((item) => item.errors.length === 0),
    errors: rootErrors,
    items,
    payload: {
      schema_version: 1,
      entity_type: 'diagnostic_taxonomy',
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
      codes,
      rules,
    },
  };
}

export const DIAGNOSTIC_TAXONOMY_TEMPLATE = {
  schema_version: 1,
  entity_type: 'diagnostic_taxonomy',
  metadata: {
    name: 'Present Simple diagnostic taxonomy',
    description: 'Error codes, learner messages, recommendations, and aggregation rules.',
  },
  codes: [
    {
      code: 'PRESENT_SIMPLE_THIRD_PERSON_S',
      label: 'Third-person singular -s',
      primary_skill: 'grammar',
      topic: 'present_simple',
      subtopic: 'affirmative',
      group_key: 'third_person',
      severity: 'minor',
      category: 'learning',
      status: 'active',
      recommended_resources: [
        { resource_type: 'foundation_unit', resource_key: 'a1-present-simple-normal-verbs', relationship: 'review' },
      ],
      messages: {
        it: {
          reminder: 'Ricorda di aggiungere -s o -es con he, she e it.',
          weakness: 'La terza persona singolare è ancora una difficoltà ricorrente.',
          subtopic_review: 'Rivedi la forma affermativa del Present Simple alla terza persona.',
        },
        en: {
          reminder: 'Remember to add -s or -es with he, she, and it.',
        },
      },
    },
    {
      code: 'PRESENT_SIMPLE_NEGATIVE_AUXILIARY',
      label: "Don't and doesn't",
      primary_skill: 'grammar',
      topic: 'present_simple',
      subtopic: 'negative',
      group_key: 'negative',
      severity: 'major',
      category: 'learning',
      status: 'active',
      recommended_resources: [],
      messages: {
        it: {
          reminder: "Controlla la scelta tra don't e doesn't.",
          weakness: 'La forma negativa del Present Simple non è ancora stabile.',
        },
        en: {},
      },
    },
  ],
  rules: [
    {
      rule_key: 'PRESENT_SIMPLE_FULL_REVIEW',
      topic: 'present_simple',
      priority: 200,
      trigger: {
        minimum_distinct_error_codes: 3,
        minimum_distinct_groups: 3,
        minimum_error_rate: 0.45,
        required_groups: [],
      },
      output: {
        diagnostic_code: null,
        message_level: 'topic_review',
        messages: {
          it: 'Il Present Simple non è ancora stabile. Rivedi affermative, negative e domande.',
          en: 'The Present Simple is not stable yet. Review affirmative, negative, and question forms.',
        },
      },
      suppress_specific_messages: true,
      status: 'active',
    },
  ],
};

export function buildDiagnosticTaxonomyExport(registry, metadata = {}) {
  return {
    schema_version: 1,
    entity_type: 'diagnostic_taxonomy',
    metadata: {
      name: 'Sblocco Inglese diagnostic taxonomy',
      exported_at: new Date().toISOString(),
      ...metadata,
    },
    codes: (registry?.codes || []).map((code) => {
      const messages = { it: {}, en: {} };
      Object.entries(code.messages || {}).forEach(([key, value]) => {
        const [language, level] = key.split(':');
        if (messages[language] && MESSAGE_LEVELS.includes(level) && cleanText(value)) messages[language][level] = value;
      });
      return {
        code: code.code,
        label: code.label,
        primary_skill: code.primary_skill,
        topic: code.topic,
        subtopic: code.subtopic,
        group_key: code.group_key,
        severity: code.severity,
        category: code.category,
        status: code.status,
        recommended_resources: code.recommended_resources || [],
        messages,
      };
    }),
    rules: (registry?.rules || []).map((rule) => ({
      rule_key: rule.rule_key,
      topic: rule.topic,
      priority: rule.priority,
      trigger: rule.trigger_config || {},
      output: rule.output_config || {},
      suppress_specific_messages: rule.suppress_specific_messages !== false,
      status: rule.status,
    })),
  };
}

export function downloadDiagnosticTaxonomy(payload, filename) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
