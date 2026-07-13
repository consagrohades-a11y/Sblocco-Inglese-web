import React from 'react';
import CardImportWorkspace from '../components/admin/CardImportWorkspace';
import {
  enumValue,
  expressionLevels,
  firstValue,
  normalizeList,
} from '../lib/cardImport.js';

const requiredFields = [
  ['public_id', 'ID pubblico'],
  ['canonical_text', 'Espressione inglese'],
  ['italian_meaning', 'Significato italiano'],
  ['english_explanation', "Spiegazione d'uso"],
  ['communicative_function', 'Funzione comunicativa'],
  ['primary_context', 'Contesto principale'],
];

const importDomains = {
  general: {
    navType: 'expression',
    label: 'General Expressions',
    idPrefix: 'general',
    editorPath: '/admin/content/expressions',
    archivePath: '/admin/content/expressions/archive',
    exampleContext: 'Everyday conversation',
    exampleTopic: 'Everyday Conversation',
  },
  business: {
    navType: 'business',
    label: 'Business Expressions',
    idPrefix: 'business',
    editorPath: '/admin/content/business-expressions',
    archivePath: '/admin/content/business-expressions/archive',
    exampleContext: 'Professional communication',
    exampleTopic: 'Meetings',
  },
  hospitality: {
    navType: 'hospitality',
    label: 'Hospitality Expressions',
    idPrefix: 'hospitality',
    editorPath: '/admin/content/hospitality-expressions',
    archivePath: '/admin/content/hospitality-expressions/archive',
    exampleContext: 'Guest service',
    exampleTopic: 'Welcoming guests',
  },
};

function normalizeExpressionCard(source, domain) {
  return {
    id: null,
    public_id: String(firstValue(source, ['public_id', 'external_key', 'id_pubblico'])).trim(),
    canonical_text: String(firstValue(source, ['canonical_text', 'english_target', 'expression'])).trim(),
    italian_meaning: String(firstValue(source, ['italian_meaning', 'italian_prompt', 'italian'])).trim(),
    english_explanation: String(firstValue(source, ['english_explanation', 'explanation', 'usage_explanation'])).trim(),
    communicative_function: String(firstValue(source, ['communicative_function', 'function'])).trim(),
    primary_context: String(firstValue(source, ['primary_context', 'context'])).trim(),
    level: String(firstValue(source, ['level'], 'A2')).trim().toUpperCase(),
    primary_domain: domain,
    topic: String(firstValue(source, ['topic', 'category'])).trim(),
    priority: enumValue(String(firstValue(source, ['priority'], 'useful')).trim(), ['essential', 'high_frequency', 'useful', 'specialised', 'advanced_low_frequency'], 'useful'),
    register: enumValue(String(firstValue(source, ['register'], 'neutral')).trim(), ['informal', 'neutral', 'professional', 'formal'], 'neutral'),
    usage_channel: enumValue(String(firstValue(source, ['usage_channel'], 'both')).trim(), ['spoken', 'written', 'both'], 'both'),
    tone: String(firstValue(source, ['tone'])).trim(),
    accepted_answers: normalizeList(firstValue(source, ['accepted_answers', 'accepted_alternatives'], [])),
    pronunciation_ipa_us: String(firstValue(source, ['pronunciation_ipa_us', 'american_ipa'])).trim(),
    pronunciation_learner_us: String(firstValue(source, ['pronunciation_learner_us', 'learner_pronunciation'])).trim(),
    example_1: String(firstValue(source, ['example_1', 'example1'])).trim(),
    example_2: String(firstValue(source, ['example_2', 'example2'])).trim(),
    usage_note: String(firstValue(source, ['usage_note', 'note'])).trim(),
    collocations: normalizeList(firstValue(source, ['collocations'], [])),
    tags: normalizeList(firstValue(source, ['tags'], [])),
    status: 'draft',
    review_status: 'pending',
    review_decision: '',
    review_notes: String(firstValue(source, ['reviewer_notes', 'review_notes'])).trim(),
  };
}

function validateExpressionCard(card, index, idPrefix) {
  const issues = requiredFields
    .filter(([key]) => !String(card[key] || '').trim())
    .map(([, label]) => `${label} mancante`);

  if (!expressionLevels.includes(card.level)) issues.push(`Livello non valido: ${card.level || '-'}`);
  const idPattern = new RegExp(`^${idPrefix}-\\d{4}$`);
  if (!idPattern.test(card.public_id)) issues.push(`ID non conforme, usa ${idPrefix}-0001`);
  return { row: index + 2, publicId: card.public_id || '-', issues };
}

function createTemplate(domain, config) {
  return {
    cards: [{
      public_id: `${config.idPrefix}-0001`,
      canonical_text: "I'm on my way.",
      italian_meaning: 'Sto arrivando. / Sono per strada.',
      english_explanation: 'Used to communicate clearly and naturally in the selected context.',
      communicative_function: 'Giving an update',
      primary_context: config.exampleContext,
      level: 'A2',
      primary_domain: domain,
      topic: config.exampleTopic,
      priority: 'high_frequency',
      register: domain === 'general' ? 'neutral' : 'professional',
      usage_channel: 'spoken',
      tone: 'helpful',
      accepted_answers: ["I'm on my way."],
      pronunciation_ipa_us: '/aɪm ɑn maɪ weɪ/',
      pronunciation_learner_us: 'aim ahn mai way',
      example_1: "I'm on my way now. I should be there in ten minutes.",
      example_2: "Sorry I'm late, but I'm on my way.",
      usage_note: 'Add a specific usage note for this expression and context.',
      collocations: ['on my way now', 'already on my way'],
      tags: [domain, 'spoken'],
    }],
  };
}

const columns = [
  { key: 'public_id', label: 'ID' },
  { key: 'level', label: 'Livello' },
  { key: 'topic', label: 'Categoria' },
  { key: 'canonical_text', label: 'Expression' },
  { key: 'italian_meaning', label: 'Italiano' },
];

export default function AdminTrainerCardImport({ domain = 'general' }) {
  const config = importDomains[domain] || importDomains.general;

  return (
    <CardImportWorkspace
      type={config.navType}
      title={`Importa ${config.label}`}
      description={`Carica una singola card o un batch CSV o JSON per ${config.label}. Tutte le card vengono validate e salvate come bozze da revisionare.`}
      itemLabel="expression card"
      itemPlural="expression card"
      editorPath={config.editorPath}
      archivePath={config.archivePath}
      rpcName="admin_import_expression_cards"
      normalizeCard={(source) => normalizeExpressionCard(source, domain)}
      validateCard={(card, index) => validateExpressionCard(card, index, config.idPrefix)}
      columns={columns}
      template={createTemplate(domain, config)}
      templateFileName={`${config.idPrefix}-expression-import-template.json`}
    />
  );
}
