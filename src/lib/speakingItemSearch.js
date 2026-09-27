const array = (value) => Array.isArray(value) ? value : [];

export function normaliseSpeakingHistoryText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function itemSearchValues(item) {
  if (typeof item === 'string') return [item];
  const source = item && typeof item === 'object' ? item : {};
  const challenge = typeof source.challenge === 'string' ? source.challenge : source.challenge?.text;
  return [
    source.text,
    source.title,
    source.instructions,
    source.situation,
    source.outcome,
    source.student_support,
    challenge,
    ...array(source.context_tags),
    ...array(source.language_targets),
    ...array(source.support).flatMap((entry) => typeof entry === 'string' ? [entry] : [entry?.label, entry?.text]),
    ...array(source.roles).flatMap((role) => [role?.name, role?.goal]),
    source.material ? JSON.stringify(source.material) : '',
  ];
}

export function findMatchingSpeakingItems(activity, {
  query = '',
  level = 'all',
  practisedTexts = null,
  unpractisedOnly = false,
} = {}) {
  const needle = String(query).trim().toLowerCase();
  const activityText = [
    activity?.title,
    activity?.summary,
    activity?.instructions,
    ...array(activity?.goals),
    ...array(activity?.tags),
  ].some((value) => String(value || '').toLowerCase().includes(needle));

  return array(activity?.prompts).flatMap((raw, sourceIndex) => {
    const item = typeof raw === 'string' ? { text: raw } : (raw || {});
    const levels = array(item.levels).length ? item.levels : array(activity?.levels);
    if (level !== 'all' && !levels.includes(level)) return [];

    const visibleText = item.text || item.title || item.instructions || '';
    const historyText = normaliseSpeakingHistoryText(visibleText);
    if (unpractisedOnly && historyText && practisedTexts?.has(historyText)) return [];

    if (needle && !activityText && !itemSearchValues(item)
      .some((value) => String(value || '').toLowerCase().includes(needle))) return [];

    return [{ sourceIndex, item, historyText }];
  });
}
