import { RECOVERY_TOPICS } from '../config/recovery.js';
import { daysUntilRecoveryExam } from './recoveryPlanEngine.js';

export const RECOVERY_ONBOARDING_DRAFT_KEY = 'sblocco_recovery_onboarding_draft_v2';

export const SUPPORTED_RECOVERY_CLASS_YEARS = Object.freeze([1, 2, 3]);

export const RECOVERY_PROGRAMME_CONFIDENCE = Object.freeze({
  FOLLOWING: 'following',
  PARTIAL: 'partial',
  MISSING: 'missing',
});

export const RECOVERY_PROGRAMME_CATEGORIES = Object.freeze([
  {
    key: 'verb-tenses',
    label: 'Tempi verbali',
    description: 'Presente, passato, perfect e forme future.',
    topicKeys: [
      'present-simple',
      'present-continuous',
      'present-simple-vs-present-continuous',
      'past-simple',
      'past-continuous',
      'present-perfect',
      'past-simple-vs-present-perfect',
      'irregular-verbs',
    ],
  },
  {
    key: 'questions-negatives',
    label: 'Domande e frasi negative',
    description: 'Ordine delle parole, ausiliari e forme negative.',
    topicKeys: ['question-formation', 'negatives'],
  },
  {
    key: 'articles-quantities',
    label: 'Articoli, quantità e nomi',
    description: 'Articoli, nomi numerabili e parole di quantità.',
    topicKeys: ['articles', 'countable-uncountable', 'some-any', 'much-many-a-lot-of'],
  },
  {
    key: 'pronouns-possessives',
    label: 'Pronomi e possessivi',
    description: 'Soggetti, complementi e forme possessive.',
    topicKeys: ['pronouns', 'possessives'],
  },
  {
    key: 'comparisons',
    label: 'Confronti',
    description: 'Comparativi e superlativi.',
    topicKeys: ['comparatives', 'superlatives'],
  },
  {
    key: 'prepositions',
    label: 'Preposizioni',
    description: 'Tempo, luogo e combinazioni frequenti.',
    topicKeys: ['prepositions'],
  },
  {
    key: 'modals',
    label: 'Modali',
    description: 'Possibilità, obbligo, consiglio e capacità.',
    topicKeys: ['modal-verbs'],
  },
  {
    key: 'future',
    label: 'Strutture future',
    description: 'Will, going to e Present Continuous per il futuro.',
    topicKeys: ['future-forms', 'will', 'going-to', 'present-continuous-future'],
  },
]);

export const TYPICAL_RECOVERY_TOPICS_BY_YEAR = Object.freeze({
  1: Object.freeze([
    'present-simple',
    'present-continuous',
    'question-formation',
    'negatives',
    'articles',
    'countable-uncountable',
    'some-any',
    'pronouns',
    'possessives',
    'prepositions',
  ]),
  2: Object.freeze([
    'present-simple-vs-present-continuous',
    'past-simple',
    'past-continuous',
    'irregular-verbs',
    'future-forms',
    'will',
    'going-to',
    'comparatives',
    'superlatives',
    'modal-verbs',
  ]),
  3: Object.freeze([
    'past-simple-vs-present-perfect',
    'present-perfect',
    'future-forms',
    'present-continuous-future',
    'comparatives',
    'superlatives',
    'modal-verbs',
    'prepositions',
    'question-formation',
  ]),
});

const KNOWN_TOPIC_KEYS = new Set(RECOVERY_TOPICS.map((topic) => topic.key));

export function sanitizeRecoveryOnboardingDraft(value) {
  if (!value || typeof value !== 'object') return null;
  const classYear = SUPPORTED_RECOVERY_CLASS_YEARS.includes(Number(value.classYear))
    ? String(value.classYear)
    : '';
  const topicKeys = Array.isArray(value.topicKeys)
    ? [...new Set(value.topicKeys.filter((topicKey) => KNOWN_TOPIC_KEYS.has(topicKey)))]
    : [];
  const confidenceValues = Object.values(RECOVERY_PROGRAMME_CONFIDENCE);
  return {
    step: Math.max(0, Math.min(7, Number(value.step) || 0)),
    classYear,
    examDate: /^\d{4}-\d{2}-\d{2}$/.test(String(value.examDate || '')) ? value.examDate : '',
    topicKeys,
    programmeConfidence: confidenceValues.includes(value.programmeConfidence)
      ? value.programmeConfidence
      : '',
  };
}

export function readRecoveryOnboardingDraft(storage) {
  if (!storage) return null;
  try {
    return sanitizeRecoveryOnboardingDraft(JSON.parse(storage.getItem(RECOVERY_ONBOARDING_DRAFT_KEY)));
  } catch {
    return null;
  }
}

export function writeRecoveryOnboardingDraft(storage, draft) {
  if (!storage) return;
  storage.setItem(RECOVERY_ONBOARDING_DRAFT_KEY, JSON.stringify(sanitizeRecoveryOnboardingDraft(draft)));
}

export function clearRecoveryOnboardingDraft(storage) {
  storage?.removeItem(RECOVERY_ONBOARDING_DRAFT_KEY);
}

export function recoveryExamWindowFeedback(examDate, now = new Date()) {
  const days = daysUntilRecoveryExam(examDate, now);
  if (!Number.isFinite(days)) return null;
  const countCopy = days === 0 ? 'La prova è oggi.' : days === 1 ? 'Manca 1 giorno.' : `Mancano ${days} giorni.`;
  if (days >= 14) {
    return { days, countCopy, supportCopy: 'C’è tempo per distribuire il lavoro con calma.' };
  }
  if (days >= 7) {
    return { days, countCopy, supportCopy: 'Possiamo concentrarci sulle priorità senza fare tutto insieme.' };
  }
  return { days, countCopy, supportCopy: 'Ti preparo un piano più concentrato sulle parti più importanti.' };
}

export function summarizeRecoveryDiagnostic(topicScores = {}) {
  const scores = Object.values(topicScores)
    .map(Number)
    .filter(Number.isFinite);
  return {
    priorities: scores.filter((score) => score < 50).length,
    consolidating: scores.filter((score) => score >= 50 && score < 85).length,
    solid: scores.filter((score) => score >= 85).length,
  };
}

export function buildRecoveryPlanReveal({ plan, state }) {
  const sessions = state?.sessions?.length ? state.sessions : (plan?.sessions || []);
  const totalMinutes = Number(plan?.workload?.totalMinutes)
    || sessions.reduce((sum, session) => sum + Number(session.estimated_minutes || session.estimatedMinutes || 0), 0);
  const priorities = (plan?.topics || []).filter((topic) => topic.priorityBand === 'high').length;
  const assessments = sessions.filter((session) => (
    ['checkpoint', 'mock_intermediate', 'mock_final'].includes(session.session_type || session.sessionType)
  )).length;
  const today = sessions.find((session) => ['available', 'in_progress'].includes(session.status)) || sessions[0] || null;
  return {
    days: Number(plan?.workload?.availableStudyDays) || Number(plan?.daysRemaining) || 0,
    sessionCount: sessions.length,
    totalMinutes,
    priorities,
    assessments,
    today,
  };
}

export function formatRecoveryDuration(totalMinutes) {
  const minutes = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min circa`;
  if (!remainder) return `${hours} h circa`;
  return `${hours} h ${remainder} min circa`;
}
