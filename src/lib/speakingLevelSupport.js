export const SPEAKING_LEVEL_ORDER = Object.freeze(['A0','A1','A1+','A2','B1','B1+','B2','C1','C2']);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function rank(level) {
  return SPEAKING_LEVEL_ORDER.indexOf(level);
}

export function speakingLevelDistance(itemLevels, targetLevel) {
  if (!targetLevel || targetLevel === 'all' || targetLevel === 'Mixed') return 0;
  const targetRank = rank(targetLevel);
  if (targetRank < 0) return Number.POSITIVE_INFINITY;
  const valid = asArray(itemLevels)
    .map(rank)
    .filter((value) => value >= 0);
  if (!valid.length) return Number.POSITIVE_INFINITY;
  return Math.min(...valid.map((value) => Math.abs(value - targetRank)));
}

export function selectSpeakingItemsForLevels(items, selectedLevels = [], fallbackLevels = []) {
  const candidates = asArray(items);
  const requested = asArray(selectedLevels).filter((level) => SPEAKING_LEVEL_ORDER.includes(level));
  if (!requested.length) return candidates.map((item) => ({ ...item, levelFallback: false, levelDistance: 0 }));

  const normalized = candidates.map((item) => {
    const levels = asArray(item?.levels).length ? asArray(item.levels) : asArray(fallbackLevels);
    const exact = levels.some((level) => requested.includes(level));
    const distance = exact
      ? 0
      : Math.min(...requested.map((level) => speakingLevelDistance(levels, level)));
    return { ...item, levels, levelFallback: !exact, levelDistance: distance };
  });

  const exact = normalized.filter((item) => !item.levelFallback);
  if (exact.length) return exact;

  const finite = normalized.filter((item) => Number.isFinite(item.levelDistance));
  if (!finite.length) return normalized;

  const bestDistance = Math.min(...finite.map((item) => item.levelDistance));
  return finite.filter((item) => item.levelDistance === bestDistance);
}
