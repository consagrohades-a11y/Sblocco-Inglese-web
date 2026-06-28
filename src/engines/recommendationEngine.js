import { recommendationRegistry as defaultRegistry } from '../content/registries/recommendationRegistry.js';

const severityRank = { low: 1, medium: 2, high: 3 };

const fallbackRecommendation = (evidence = {}) => ({
  tag: evidence?.tag || 'unmapped-patterns',
  dimension: evidence?.dimension || 'diagnostic',
  severity: evidence?.severity || 'low',
  evidenceCount: evidence?.evidenceCount || 0,
  isFallback: true,
  title: 'Altri segnali da osservare',
  reason: 'Alcuni segnali diagnostici non hanno ancora una raccomandazione specifica. Usa il feedback dell’esercizio per correggere le frasi sbagliate, poi riprova solo quel blocco prima di passare oltre.',
  actions: [],
});

export function getRecommendationsForEvidence(evidence, recommendationRegistry = defaultRegistry) {
  const mapping = recommendationRegistry?.[evidence?.tag];
  if (!mapping) return fallbackRecommendation(evidence);

  return {
    tag: evidence.tag,
    dimension: evidence.dimension || null,
    severity: evidence.severity || 'low',
    evidenceCount: evidence.evidenceCount || 0,
    isFallback: false,
    ...mapping,
    actions: Array.isArray(mapping.actions) ? mapping.actions : [],
  };
}

export function buildRecommendations(diagnosticProfile, recommendationRegistry = defaultRegistry) {
  const evidence = Array.isArray(diagnosticProfile)
    ? diagnosticProfile
    : diagnosticProfile?.evidence || [];
  const seen = new Set();
  const recommendations = [];
  const unmappedEvidence = [];

  evidence.forEach((entry) => {
    const key = `${entry.dimension}:${entry.tag}`;
    if (seen.has(key)) return;
    seen.add(key);

    const mapping = recommendationRegistry?.[entry?.tag];
    if (mapping) {
      recommendations.push(getRecommendationsForEvidence(entry, recommendationRegistry));
    } else {
      unmappedEvidence.push(entry);
    }
  });

  if (unmappedEvidence.length) {
    const aggregate = unmappedEvidence.reduce((current, entry) => {
      const currentSeverity = severityRank[current.severity] || 0;
      const entrySeverity = severityRank[entry.severity] || 0;

      return {
        tag: 'unmapped-patterns',
        dimension: 'diagnostic',
        severity: entrySeverity > currentSeverity ? entry.severity : current.severity,
        evidenceCount: current.evidenceCount + (entry.evidenceCount || 0),
      };
    }, { severity: 'low', evidenceCount: 0 });

    recommendations.push(fallbackRecommendation(aggregate));
  }

  return recommendations;
}
