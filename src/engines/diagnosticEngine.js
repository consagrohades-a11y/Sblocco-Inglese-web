const DIMENSIONS = ['skills', 'grammar', 'errorPatterns', 'contexts', 'production'];

export function calculateSeverity(evidenceCount = 0, weightedSeverity = 0) {
  if (evidenceCount >= 3 && weightedSeverity >= 6) return 'high';
  if (evidenceCount >= 2 || weightedSeverity >= 4) return 'medium';
  return 'low';
}

export function aggregateDiagnosticEvidence(attempts = []) {
  const attemptList = Array.isArray(attempts) ? attempts : [attempts];
  const bucket = new Map();

  attemptList.flatMap((attempt) => attempt?.diagnosticEvidence || []).forEach((entry) => {
    if (!entry?.tag || !entry?.dimension) return;

    const key = `${entry.dimension}:${entry.tag}`;
    const current = bucket.get(key) || {
      tag: entry.tag,
      dimension: entry.dimension,
      evidenceCount: 0,
      weightedSeverity: 0,
      contexts: new Set(),
      productionModes: new Set(),
    };

    current.evidenceCount += 1;
    current.weightedSeverity += Number.isFinite(Number(entry.severity)) ? Number(entry.severity) : 1;
    (entry.contexts || []).forEach((context) => current.contexts.add(context));
    (entry.productionModes || []).forEach((mode) => current.productionModes.add(mode));
    bucket.set(key, current);
  });

  return [...bucket.values()]
    .map((entry) => ({
      ...entry,
      contexts: [...entry.contexts],
      productionModes: [...entry.productionModes],
      severity: calculateSeverity(entry.evidenceCount, entry.weightedSeverity),
    }))
    .sort((a, b) => b.weightedSeverity - a.weightedSeverity || b.evidenceCount - a.evidenceCount);
}

export function buildDiagnosticProfile(attempts = []) {
  const attemptList = Array.isArray(attempts) ? attempts : [attempts];
  const evidence = aggregateDiagnosticEvidence(attemptList);
  const dimensions = Object.fromEntries(DIMENSIONS.map((dimension) => [
    dimension,
    evidence.filter((entry) => entry.dimension === dimension),
  ]));

  return {
    attemptCount: attemptList.filter(Boolean).length,
    estimatedLevel: null,
    evidence,
    dimensions,
    blockers: evidence.filter((entry) => entry.dimension === 'errorPatterns' || entry.dimension === 'skills'),
  };
}

