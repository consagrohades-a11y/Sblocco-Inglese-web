export const RECOVERY_PATHWAY = 'recupero-debito';
export const RECOVERY_OFFER_ID = 'recupero-debito';
export const RECOVERY_ACCESS_TARGET = 'recupero-debito';
export const RECOVERY_DIAGNOSTIC_STORAGE_KEY = 'sblocco_recovery_diagnostic_token_v1';

export const RECOVERY_MODE = Object.freeze({
  COMPLETE: 'complete',
  INTENSIVE: 'intensive',
  SOS: 'sos',
});

export const RECOVERY_MODE_THRESHOLDS = Object.freeze({
  completeMinDays: 14,
  intensiveMinDays: 7,
  minimumSupportedDays: 1,
});

export const RECOVERY_MODE_LABELS = Object.freeze({
  [RECOVERY_MODE.COMPLETE]: 'Percorso completo',
  [RECOVERY_MODE.INTENSIVE]: 'Intensivo',
  [RECOVERY_MODE.SOS]: 'SOS prova',
});

export const RECOVERY_TOPICS = Object.freeze([
  { key: 'present-simple', label: 'Present Simple', diagnosticKey: 'present-simple' },
  { key: 'present-continuous', label: 'Present Continuous', diagnosticKey: 'present-continuous' },
  { key: 'present-simple-vs-present-continuous', label: 'Present Simple vs Present Continuous', diagnosticKey: 'present-tenses' },
  { key: 'past-simple', label: 'Past Simple', diagnosticKey: 'past-simple' },
  { key: 'past-continuous', label: 'Past Continuous', diagnosticKey: 'past-tenses' },
  { key: 'present-perfect', label: 'Present Perfect', diagnosticKey: 'present-perfect' },
  { key: 'past-simple-vs-present-perfect', label: 'Past Simple vs Present Perfect', diagnosticKey: 'past-present-perfect' },
  { key: 'future-forms', label: 'Future forms', diagnosticKey: 'future-forms' },
  { key: 'will', label: 'Will', diagnosticKey: 'future-forms' },
  { key: 'going-to', label: 'Be going to', diagnosticKey: 'future-forms' },
  { key: 'present-continuous-future', label: 'Present Continuous for future', diagnosticKey: 'future-forms' },
  { key: 'comparatives', label: 'Comparatives', diagnosticKey: 'comparatives-superlatives' },
  { key: 'superlatives', label: 'Superlatives', diagnosticKey: 'comparatives-superlatives' },
  { key: 'modal-verbs', label: 'Modal verbs', diagnosticKey: 'modal-verbs' },
  { key: 'countable-uncountable', label: 'Countable and uncountable nouns', diagnosticKey: 'quantifiers' },
  { key: 'some-any', label: 'Some / any', diagnosticKey: 'quantifiers' },
  { key: 'much-many-a-lot-of', label: 'Much / many / a lot of', diagnosticKey: 'quantifiers' },
  { key: 'articles', label: 'Articles', diagnosticKey: 'articles-pronouns' },
  { key: 'pronouns', label: 'Pronouns', diagnosticKey: 'articles-pronouns' },
  { key: 'possessives', label: 'Possessives', diagnosticKey: 'articles-pronouns' },
  { key: 'prepositions', label: 'Prepositions', diagnosticKey: 'prepositions' },
  { key: 'question-formation', label: 'Question formation', diagnosticKey: 'questions-negatives' },
  { key: 'negatives', label: 'Negatives', diagnosticKey: 'questions-negatives' },
  { key: 'irregular-verbs', label: 'Irregular verbs', diagnosticKey: 'irregular-verbs' },
]);

export const RECOVERY_TOPIC_INDEX = new Map(RECOVERY_TOPICS.map((topic) => [topic.key, topic]));

export function recoveryTopicLabel(topicKey) {
  return RECOVERY_TOPIC_INDEX.get(topicKey)?.label || topicKey;
}
