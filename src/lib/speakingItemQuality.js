const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','because','been','but','by','can','could','did','do','does','for','from',
  'had','has','have','he','her','his','how','i','if','in','is','it','its','me','my','of','on','or','our','she',
  'should','so','that','the','their','them','there','they','this','to','too','us','was','we','were','what',
  'when','where','which','who','why','will','with','would','you','your'
]);

function normaliseText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordSet(value) {
  return new Set(
    normaliseText(value)
      .split(' ')
      .filter((token) => token.length > 2 && !STOPWORDS.has(token)),
  );
}

function bigramSet(value) {
  const compact = normaliseText(value).replace(/\s+/g, ' ');
  const grams = new Set();
  if (compact.length < 2) return grams;
  for (let index = 0; index < compact.length - 1; index += 1) {
    grams.add(compact.slice(index, index + 2));
  }
  return grams;
}

function overlapScore(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((value) => {
    if (right.has(value)) intersection += 1;
  });
  return intersection / (left.size + right.size - intersection);
}

function diceScore(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((value) => {
    if (right.has(value)) intersection += 1;
  });
  return (2 * intersection) / (left.size + right.size);
}

function arrayOverlap(left, right) {
  const rightSet = new Set((right || []).map((value) => String(value).toLowerCase()));
  return (left || []).some((value) => rightSet.has(String(value).toLowerCase()));
}

function cleanArray(value) {
  return Array.from(new Set((Array.isArray(value) ? value : [])
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean)));
}

export function normaliseSpeakingItemForQuality(item, activity = {}) {
  const source = typeof item === 'string' ? { text: item } : (item || {});
  return {
    text: String(source.text || '').trim(),
    context_tags: cleanArray(source.context_tags?.length ? source.context_tags : activity.tags),
    language_targets: cleanArray(source.language_targets?.length ? source.language_targets : activity.goals),
    levels: cleanArray(source.levels?.length ? source.levels : activity.levels).map((level) => level.toUpperCase()),
    difficulty: Number(source.difficulty || 0) || null,
  };
}

function compareItems(candidate, existing) {
  const candidateText = normaliseText(candidate.text);
  const existingText = normaliseText(existing.text);
  if (!candidateText || !existingText) return null;

  const tokenSimilarity = overlapScore(wordSet(candidate.text), wordSet(existing.text));
  const surfaceSimilarity = diceScore(bigramSet(candidate.text), bigramSet(existing.text));
  const sameContext = arrayOverlap(candidate.context_tags, existing.context_tags);
  const sameTarget = arrayOverlap(candidate.language_targets, existing.language_targets);

  if (candidateText === existingText) {
    return { severity: 'block', reason: 'exact', tokenSimilarity: 1, surfaceSimilarity: 1 };
  }

  if (surfaceSimilarity >= 0.92 || tokenSimilarity >= 0.84) {
    return { severity: 'block', reason: 'near_text', tokenSimilarity, surfaceSimilarity };
  }

  if (sameContext && sameTarget && (surfaceSimilarity >= 0.74 || tokenSimilarity >= 0.58)) {
    return { severity: 'block', reason: 'same_context_same_target', tokenSimilarity, surfaceSimilarity };
  }

  if (sameContext && sameTarget && (surfaceSimilarity >= 0.56 || tokenSimilarity >= 0.36)) {
    return { severity: 'warn', reason: 'contextual_similarity', tokenSimilarity, surfaceSimilarity };
  }

  if (sameContext && (surfaceSimilarity >= 0.72 || tokenSimilarity >= 0.52)) {
    return { severity: 'warn', reason: 'same_context_similar_prompt', tokenSimilarity, surfaceSimilarity };
  }

  // Repeated vocabulary alone is intentionally not a duplicate signal.
  // The same word/chunk can be pedagogically useful in a different scenario
  // or for a different communicative function.
  return null;
}

function flattenCatalog(activities, excludeActivityId) {
  return (activities || []).flatMap((activity) => {
    if (excludeActivityId && activity.id === excludeActivityId) return [];
    return (Array.isArray(activity.prompts) ? activity.prompts : []).map((item, index) => ({
      ...normaliseSpeakingItemForQuality(item, activity),
      activityId: activity.id,
      activityTitle: activity.title,
      itemIndex: index,
    }));
  });
}

export function analyseSpeakingItemSet(items, catalogActivities = [], { excludeActivityId = null } = {}) {
  const candidates = (items || []).map((item, index) => ({
    ...normaliseSpeakingItemForQuality(item),
    candidateIndex: index,
  }));
  const catalog = flattenCatalog(catalogActivities, excludeActivityId);
  const blocking = [];
  const warnings = [];

  candidates.forEach((candidate) => {
    catalog.forEach((existing) => {
      const match = compareItems(candidate, existing);
      if (!match) return;
      const detail = { ...match, candidate, existing };
      if (match.severity === 'block') blocking.push(detail);
      else warnings.push(detail);
    });
  });

  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
      const match = compareItems(candidates[leftIndex], candidates[rightIndex]);
      if (!match) continue;
      const detail = {
        ...match,
        candidate: candidates[rightIndex],
        existing: {
          ...candidates[leftIndex],
          activityTitle: 'Questa attività',
          itemIndex: leftIndex,
        },
      };
      if (match.severity === 'block') blocking.push(detail);
      else warnings.push(detail);
    }
  }

  const uniqueKey = (match) => [
    match.severity,
    match.reason,
    match.candidate.candidateIndex,
    match.existing.activityId || 'draft',
    match.existing.itemIndex,
  ].join(':');

  const dedupe = (matches) => Array.from(new Map(matches.map((match) => [uniqueKey(match), match])).values())
    .sort((a, b) => Math.max(b.surfaceSimilarity, b.tokenSimilarity) - Math.max(a.surfaceSimilarity, a.tokenSimilarity));

  return {
    blocking: dedupe(blocking),
    warnings: dedupe(warnings),
  };
}

export function duplicateReasonLabel(reason) {
  return {
    exact: 'testo identico',
    near_text: 'formulazione quasi identica',
    same_context_same_target: 'stesso contesto + stesso obiettivo linguistico',
    contextual_similarity: 'molto simile nello stesso contesto e obiettivo',
    same_context_similar_prompt: 'prompt molto simile nello stesso contesto',
  }[reason] || 'possibile duplicato';
}
