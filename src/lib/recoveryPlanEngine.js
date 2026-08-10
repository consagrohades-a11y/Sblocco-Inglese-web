import {
  RECOVERY_MODE,
  RECOVERY_MODE_THRESHOLDS,
  RECOVERY_TOPIC_INDEX,
  recoveryTopicLabel,
} from '../config/recovery.js';

const PRIORITY_BANDS = Object.freeze({
  high: 70,
  medium: 45,
});

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value)));
}

function scoreOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clamp(parsed) : null;
}

export function daysUntilRecoveryExam(examDate, now = new Date()) {
  if (!examDate) return null;
  const target = new Date(`${String(examDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function recoveryModeForDays(daysRemaining) {
  if (!Number.isFinite(daysRemaining)) return RECOVERY_MODE.COMPLETE;
  if (daysRemaining >= RECOVERY_MODE_THRESHOLDS.completeMinDays) return RECOVERY_MODE.COMPLETE;
  if (daysRemaining >= RECOVERY_MODE_THRESHOLDS.intensiveMinDays) return RECOVERY_MODE.INTENSIVE;
  return RECOVERY_MODE.SOS;
}

export function recoveryModeForExamDate(examDate, now = new Date()) {
  return recoveryModeForDays(daysUntilRecoveryExam(examDate, now));
}

function weightedEvidence(values) {
  const available = values.filter((item) => item.value !== null);
  if (!available.length) return null;
  const weight = available.reduce((sum, item) => sum + item.weight, 0);
  return available.reduce((sum, item) => sum + (item.value * item.weight), 0) / weight;
}

function diagnosticForTopic(topicKey, diagnosticScores = {}) {
  const topic = RECOVERY_TOPIC_INDEX.get(topicKey);
  if (!topic) return scoreOrNull(diagnosticScores[topicKey]);
  const direct = scoreOrNull(diagnosticScores[topicKey]);
  if (direct !== null) return direct;

  const grouped = scoreOrNull(diagnosticScores[topic.diagnosticKey]);
  if (grouped !== null) return grouped;

  if (topicKey === 'present-simple-vs-present-continuous') {
    return weightedEvidence([
      { value: scoreOrNull(diagnosticScores['present-simple']), weight: 1 },
      { value: scoreOrNull(diagnosticScores['present-continuous']), weight: 1 },
    ]);
  }
  if (topicKey === 'past-simple-vs-present-perfect') {
    return weightedEvidence([
      { value: scoreOrNull(diagnosticScores['past-simple']), weight: 1 },
      { value: scoreOrNull(diagnosticScores['present-perfect']), weight: 1 },
    ]);
  }
  if (topicKey === 'past-continuous') return scoreOrNull(diagnosticScores['past-simple']);
  return null;
}

export function calculateRecoveryTopicPriority({
  topicKey,
  diagnosticScores = {},
  checkpointScore = null,
  mockScore = null,
  previousMastery = null,
  repeatedErrors = 0,
  mode = RECOVERY_MODE.COMPLETE,
}) {
  const diagnosticScore = diagnosticForTopic(topicKey, diagnosticScores);
  const checkpoint = scoreOrNull(checkpointScore);
  const mock = scoreOrNull(mockScore);
  const mastery = scoreOrNull(previousMastery);
  const evidenceScore = weightedEvidence([
    { value: diagnosticScore, weight: 0.45 },
    { value: checkpoint, weight: 0.30 },
    { value: mock, weight: 0.25 },
  ]);
  const effectiveScore = evidenceScore ?? mastery;
  const weakness = effectiveScore === null ? 50 : 100 - effectiveScore;
  const errorPressure = Math.min(18, Math.max(0, Number(repeatedErrors) || 0) * 3);
  const urgency = mode === RECOVERY_MODE.SOS
    ? (weakness >= 20 ? 12 : 4)
    : mode === RECOVERY_MODE.INTENSIVE
      ? (weakness >= 30 ? 7 : 2)
      : 0;
  const masteryAdjustment = mastery === null ? 0 : ((100 - mastery) * 0.08);
  const priorityScore = clamp(28 + (weakness * 0.52) + errorPressure + urgency + masteryAdjustment);
  const priorityBand = priorityScore >= PRIORITY_BANDS.high
    ? 'high'
    : priorityScore >= PRIORITY_BANDS.medium
      ? 'medium'
      : 'low';
  const strongestVerificationEvidence = mock ?? checkpoint ?? diagnosticScore ?? mastery;
  const verificationOnly = strongestVerificationEvidence !== null
    && strongestVerificationEvidence >= 85
    && Number(repeatedErrors || 0) <= 1;

  return {
    topicKey,
    diagnosticScore,
    checkpointScore: checkpoint,
    mockScore: mock,
    masteryScore: effectiveScore,
    priorityScore: Math.round(priorityScore),
    priorityBand,
    repeatedErrors: Math.max(0, Number(repeatedErrors) || 0),
    verificationOnly,
  };
}

export function buildRecoveryTopicStates({
  requiredTopicKeys,
  diagnosticScores = {},
  checkpointScores = {},
  mockScores = {},
  masteryScores = {},
  repeatedErrors = {},
  mode = RECOVERY_MODE.COMPLETE,
}) {
  return [...new Set(requiredTopicKeys || [])]
    .filter((topicKey) => RECOVERY_TOPIC_INDEX.has(topicKey))
    .map((topicKey) => calculateRecoveryTopicPriority({
      topicKey,
      diagnosticScores,
      checkpointScore: checkpointScores[topicKey],
      mockScore: mockScores[topicKey],
      previousMastery: masteryScores[topicKey],
      repeatedErrors: repeatedErrors[topicKey],
      mode,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || recoveryTopicLabel(a.topicKey).localeCompare(recoveryTopicLabel(b.topicKey), 'it'));
}

function topicSession(topic, sequence, mode) {
  const label = recoveryTopicLabel(topic.topicKey);
  const quick = topic.verificationOnly || topic.priorityBand === 'low';
  const estimatedMinutes = quick
    ? (mode === RECOVERY_MODE.SOS ? 12 : 18)
    : mode === RECOVERY_MODE.SOS
      ? 30
      : mode === RECOVERY_MODE.INTENSIVE
        ? 34
        : 42;
  const stages = quick
    ? ['ripasso_rapido', 'modalita_scuola', 'mini_verifica']
    : mode === RECOVERY_MODE.SOS
      ? ['recupera_essenziale', 'allenati', 'modalita_scuola', 'mini_verifica']
      : ['recupera', 'allenati', 'modalita_scuola', 'mini_verifica'];

  return {
    sequenceIndex: sequence,
    sessionType: quick ? 'quick_review' : 'topic',
    topicKey: topic.topicKey,
    title: quick ? `${label} — ripasso e verifica` : `${label} — sessione guidata`,
    rationale: quick
      ? 'Questo argomento è richiesto dalla scuola ma risulta già abbastanza solido. Lo verifichiamo senza dedicargli una lezione completa.'
      : topic.repeatedErrors > 1
        ? `Questo argomento è prioritario anche perché alcuni errori si stanno ripetendo.`
        : 'È tra gli argomenti del programma che conviene consolidare prima di passare oltre.',
    estimatedMinutes,
    priorityScore: topic.priorityScore,
    stages,
    metadata: { priorityBand: topic.priorityBand, verificationOnly: quick },
  };
}

function fixedSession(sequenceIndex, sessionType, title, estimatedMinutes, rationale, stages = []) {
  return {
    sequenceIndex,
    sessionType,
    topicKey: null,
    title,
    rationale,
    estimatedMinutes,
    priorityScore: null,
    stages,
    metadata: {},
  };
}

export function buildRecoveryPlan({
  requiredTopicKeys,
  examDate,
  now = new Date(),
  diagnosticScores = {},
  checkpointScores = {},
  mockScores = {},
  masteryScores = {},
  repeatedErrors = {},
  startSequence = 1,
}) {
  const daysRemaining = daysUntilRecoveryExam(examDate, now);
  const mode = recoveryModeForDays(daysRemaining);
  const topics = buildRecoveryTopicStates({
    requiredTopicKeys,
    diagnosticScores,
    checkpointScores,
    mockScores,
    masteryScores,
    repeatedErrors,
    mode,
  });
  const sessions = [];
  let sequence = Math.max(1, Number(startSequence) || 1);
  let topicsSinceReview = 0;

  const pushFixed = (type, title, minutes, rationale, stages) => {
    sessions.push(fixedSession(sequence, type, title, minutes, rationale, stages));
    sequence += 1;
  };

  topics.forEach((topic, index) => {
    sessions.push(topicSession(topic, sequence, mode));
    sequence += 1;
    topicsSinceReview += 1;

    const shouldReview = mode === RECOVERY_MODE.COMPLETE
      ? topicsSinceReview >= 3 && index < topics.length - 1
      : mode === RECOVERY_MODE.INTENSIVE
        ? topicsSinceReview >= 4 && index < topics.length - 1
        : false;
    if (shouldReview) {
      pushFixed(
        'error_review',
        'Ripassa gli errori',
        15,
        'Riprendiamo gli errori ricorrenti prima di aggiungere altro carico.',
        ['errori_ricorrenti', 'richiamo_attivo'],
      );
      topicsSinceReview = 0;
    }
  });

  if (mode === RECOVERY_MODE.COMPLETE) {
    const insertAt = Math.max(1, Math.min(sessions.length, Math.ceil(sessions.length * 0.55)));
    sessions.splice(insertAt, 0, fixedSession(
      0,
      'checkpoint',
      'Verifica di percorso',
      28,
      'Una verifica mista serve a capire quali priorità devono cambiare.',
      ['verifica_mista'],
    ));
    sessions.splice(Math.min(sessions.length, insertAt + 2), 0, fixedSession(
      0,
      'mock_intermediate',
      'Simulazione prova di recupero #1',
      50,
      'Prima simulazione completa: niente suggerimenti durante la prova, risultati solo dopo la consegna.',
      ['simulazione'],
    ));
  } else if (mode === RECOVERY_MODE.INTENSIVE) {
    const insertAt = Math.max(1, Math.ceil(sessions.length * 0.6));
    sessions.splice(insertAt, 0, fixedSession(
      0,
      'checkpoint',
      'Verifica di percorso',
      24,
      'Controlliamo le strutture insieme, senza anticipare quale regola serve in ogni domanda.',
      ['verifica_mista'],
    ));
    sessions.splice(Math.min(sessions.length, insertAt + 1), 0, fixedSession(
      0,
      'mock_intermediate',
      'Simulazione prova di recupero #1',
      45,
      'La simulazione ci serve per decidere cosa mantenere nel piano finale.',
      ['simulazione'],
    ));
  } else {
    pushFixed(
      'error_review',
      'Ripasso errori ad alta priorità',
      15,
      'Con poco tempo rimasto riprendiamo solo gli errori che incidono di più sul programma della scuola.',
      ['errori_ricorrenti', 'pratica_mista'],
    );
    pushFixed(
      'checkpoint',
      'Verifica mista rapida',
      20,
      'Una verifica breve ci aiuta a evitare di spendere tempo su parti già solide.',
      ['verifica_mista'],
    );
  }

  pushFixed(
    'mock_final',
    'Simulazione finale',
    mode === RECOVERY_MODE.SOS ? 40 : 55,
    'Ultima simulazione sul programma selezionato. Il risultato aggiorna la preparazione attuale, non predice il voto della scuola.',
    ['simulazione'],
  );

  const normalizedSessions = sessions.map((session, index) => ({
    ...session,
    sequenceIndex: Math.max(1, Number(startSequence) || 1) + index,
  }));

  return {
    mode,
    daysRemaining,
    topics,
    sessions: normalizedSessions,
  };
}

export function calculateRecoveryReadiness(topicStates = []) {
  if (!topicStates.length) return 0;
  const values = topicStates.map((topic) => topic.masteryScore ?? topic.diagnosticScore ?? 0);
  return Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length);
}
