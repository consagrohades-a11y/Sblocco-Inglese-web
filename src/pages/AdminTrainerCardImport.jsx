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

function normalizeExpressionCard(source) {
  return {
    id: null,
    public_id: String(firstValue(source, ['public_id', 'external_key', 'id_pubblico'])).trim(),
    canonical_text: String(firstValue(source, ['canonical_text', 'english_target', 'expression'])).trim(),
    italian_meaning: String(firstValue(source, ['italian_meaning', 'italian_prompt', 'italian'])).trim(),
    english_explanation: String(firstValue(source, ['english_explanation', 'explanation', 'usage_explanation'])).trim(),
    communicative_function: String(firstValue(source, ['communicative_function', 'function'])).trim(),
    primary_context: String(firstValue(source, ['primary_context', 'context'])).trim(),
    level: String(firstValue(source, ['level'], 'A2')).trim().toUpperCase(),
    primary_domain: String(firstValue(source, ['primary_domain', 'domain'], 'general')).trim() || 'general',
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

function validateExpressionCard(card, index) {
  const issues = requiredFields
    .filter(([key]) => !String(card[key] || '').trim())
    .map(([, label]) => `${label} mancante`);

  if (!expressionLevels.includes(card.level)) issues.push(`Livello non valido: ${card.level || '-'}`);
  if (!/^general-\d{4}$/.test(card.public_id)) issues.push('ID non conforme, usa general-0001');
  return { row: index + 2, publicId: card.public_id || '-', issues };
}

const template = {
  cards: [{
    public_id: 'general-0001',
    canonical_text: "I'm on my way.",
    italian_meaning: 'Sto arrivando. / Sono per strada.',
    english_explanation: 'Used when you have already left and are travelling toward the destination.',
    communicative_function: 'Giving an arrival update',
    primary_context: 'Everyday conversation',
    level: 'A2',
    primary_domain: 'general',
    topic: 'Everyday Conversation',
    priority: 'high_frequency',
    register: 'neutral',
    usage_channel: 'spoken',
    tone: 'reassuring',
    accepted_answers: ["I'm on my way."],
    pronunciation_ipa_us: '/aɪm ɑn maɪ weɪ/',
    pronunciation_learner_us: 'aim ahn mai way',
    example_1: "I'm on my way now. I should be there in ten minutes.",
    example_2: "Sorry I'm late, but I'm on my way.",
    usage_note: 'Use this after you have left, not while you are still preparing to go.',
    collocations: ['on my way now', 'already on my way'],
    tags: ['arrival', 'movement', 'spoken'],
  }],
};

const columns = [
  { key: 'public_id', label: 'ID' },
  { key: 'level', label: 'Livello' },
  { key: 'topic', label: 'Categoria' },
  { key: 'canonical_text', label: 'Expression' },
  { key: 'italian_meaning', label: 'Italiano' },
];

export default function AdminTrainerCardImport() {
  return (
    <CardImportWorkspace
      title="Importa General Expressions"
      description="Carica una singola expression card o un batch CSV o JSON. Tutte le card vengono validate e salvate come bozze da revisionare."
      itemLabel="expression card"
      itemPlural="expression card"
      editorPath="/admin/content/expressions"
      archivePath="/admin/content/expressions/archive"
      rpcName="admin_import_expression_cards"
      normalizeCard={normalizeExpressionCard}
      validateCard={validateExpressionCard}
      columns={columns}
      template={template}
      templateFileName="general-expression-import-template.json"
    />
  );
}
