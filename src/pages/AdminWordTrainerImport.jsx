import React from 'react';
import CardImportWorkspace from '../components/admin/CardImportWorkspace';
import {
  enumValue,
  firstValue,
  normalizeList,
  trainerLevels,
} from '../lib/cardImport.js';

const requiredFields = [
  ['public_id', 'ID pubblico'],
  ['level', 'Livello'],
  ['topic', 'Categoria'],
  ['lemma', 'Parola inglese'],
  ['part_of_speech', 'Parte del discorso'],
  ['italian_meaning', 'Significato italiano'],
  ['english_definition', 'Definizione inglese'],
];

function normalizeWordCard(source) {
  return {
    id: null,
    public_id: String(firstValue(source, ['public_id', 'external_key', 'id'])).trim(),
    level: String(firstValue(source, ['level'], 'A0')).trim().toUpperCase(),
    topic: String(firstValue(source, ['topic', 'category'])).trim(),
    lemma: String(firstValue(source, ['lemma', 'word', 'english_target'])).trim(),
    sense_label: String(firstValue(source, ['sense_label'])).trim(),
    part_of_speech: String(firstValue(source, ['part_of_speech', 'partOfSpeech'])).trim(),
    italian_meaning: String(firstValue(source, ['italian_meaning', 'italian', 'italian_prompt'])).trim(),
    english_definition: String(firstValue(source, ['english_definition', 'definition'])).trim(),
    pronunciation_ipa_us: String(firstValue(source, ['pronunciation_ipa_us', 'american_ipa'])).trim(),
    pronunciation_learner_us: String(firstValue(source, ['pronunciation_learner_us', 'learner_pronunciation'])).trim(),
    countability: enumValue(String(firstValue(source, ['countability'])).trim(), ['countable', 'uncountable', 'both'], ''),
    plural_form: String(firstValue(source, ['plural_form'])).trim(),
    base_form: String(firstValue(source, ['base_form'])).trim(),
    past_form: String(firstValue(source, ['past_form'])).trim(),
    past_participle: String(firstValue(source, ['past_participle'])).trim(),
    third_person_form: String(firstValue(source, ['third_person_form'])).trim(),
    ing_form: String(firstValue(source, ['ing_form'])).trim(),
    accepted_answers: normalizeList(firstValue(source, ['accepted_answers'], [])),
    example_1: String(firstValue(source, ['example_1', 'example1'])).trim(),
    example_2: String(firstValue(source, ['example_2', 'example2'])).trim(),
    common_collocations: normalizeList(firstValue(source, ['common_collocations', 'collocations'], [])),
    usage_note: String(firstValue(source, ['usage_note', 'note'])).trim(),
    common_mistakes: String(firstValue(source, ['common_mistakes'])).trim(),
    priority: enumValue(String(firstValue(source, ['priority'], 'essential')).trim(), ['essential', 'high_frequency', 'useful', 'specialised', 'advanced_low_frequency'], 'essential'),
    primary_domain: String(firstValue(source, ['primary_domain', 'domain'], 'general')).trim() || 'general',
    register: enumValue(String(firstValue(source, ['register'], 'neutral')).trim(), ['informal', 'neutral', 'professional', 'formal'], 'neutral'),
    usage_channel: enumValue(String(firstValue(source, ['usage_channel'], 'both')).trim(), ['spoken', 'written', 'both'], 'both'),
    tags: normalizeList(firstValue(source, ['tags'], [])),
    status: 'draft',
    review_status: 'pending',
    review_decision: '',
    review_notes: String(firstValue(source, ['reviewer_notes', 'review_notes'])).trim(),
  };
}

function validateWordCard(card, index) {
  const issues = requiredFields
    .filter(([key]) => !String(card[key] || '').trim())
    .map(([, label]) => `${label} mancante`);

  if (!trainerLevels.includes(card.level)) issues.push(`Livello non valido: ${card.level || '-'}`);
  if (!/^word-\d{4}$/.test(card.public_id)) issues.push('ID non conforme, usa word-0001');
  return { row: index + 2, publicId: card.public_id || '-', issues };
}

const template = {
  cards: [{
    public_id: 'word-0001',
    level: 'A0',
    topic: 'People & identity',
    lemma: 'person',
    part_of_speech: 'noun',
    italian_meaning: 'persona',
    english_definition: 'A human being.',
    accepted_answers: ['person'],
    pronunciation_ipa_us: '/ˈpɝːsən/',
    pronunciation_learner_us: 'PER-suhn',
    example_1: 'She is a kind person.',
    example_2: 'Only one person can enter.',
    usage_note: 'The plural is people in most contexts.',
    common_collocations: ['young person', 'kind person'],
    tags: ['people', 'identity'],
  }],
};

const columns = [
  { key: 'public_id', label: 'ID' },
  { key: 'level', label: 'Livello' },
  { key: 'topic', label: 'Categoria' },
  { key: 'lemma', label: 'Word' },
  { key: 'italian_meaning', label: 'Italiano' },
];

export default function AdminWordTrainerImport() {
  return (
    <CardImportWorkspace
      type="word"
      title="Importa Word Trainer"
      description="Carica una singola word card o un batch CSV o JSON. Tutte le card vengono validate e salvate come bozze da revisionare."
      itemLabel="word card"
      itemPlural="word card"
      editorPath="/admin/content/words"
      archivePath="/admin/content/words/archive"
      rpcName="admin_import_word_cards"
      normalizeCard={normalizeWordCard}
      validateCard={validateWordCard}
      columns={columns}
      template={template}
      templateFileName="word-card-import-template.json"
    />
  );
}
