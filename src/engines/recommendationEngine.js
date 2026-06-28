import { recommendationRegistry as defaultRegistry } from '../content/registries/recommendationRegistry.js';

const fallbackRecommendation = (evidence) => ({
  tag: evidence?.tag || 'unknown',
  dimension: evidence?.dimension || null,
  severity: evidence?.severity || 'low',
  evidenceCount: evidence?.evidenceCount || 0,
  title: 'Practice this area again',
  reason: 'Questo pattern è comparso nelle tue risposte, ma non ha ancora una raccomandazione specifica. Ripeti l’esercizio e controlla la struttura prima di rispondere.',
  actions: [
    {
      label: 'Ripeti l’esercizio con attenzione',
      path: null,
    },
  ],
});

export function getRecommendationsForEvidence(evidence, recommendationRegistry = defaultRegistry) {
  const mapping = recommendationRegistry?.[evidence?.tag];
  if (!mapping) return fallbackRecommendation(evidence);

  return {
    tag: evidence.tag,
    dimension: evidence.dimension || null,
    severity: evidence.severity || 'low',
    evidenceCount: evidence.evidenceCount || 0,
    ...mapping,
    actions: Array.isArray(mapping.actions) ? mapping.actions : [],
  };
}

export function buildRecommendations(diagnosticProfile, recommendationRegistry = defaultRegistry) {
  const evidence = Array.isArray(diagnosticProfile)
    ? diagnosticProfile
    : diagnosticProfile?.evidence || [];
  const seen = new Set();

  return evidence.reduce((recommendations, entry) => {
    const key = `${entry.dimension}:${entry.tag}`;
    if (seen.has(key)) return recommendations;
    seen.add(key);
    recommendations.push(getRecommendationsForEvidence(entry, recommendationRegistry));
    return recommendations;
  }, []);
}
