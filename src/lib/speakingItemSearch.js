const array = (value) => Array.isArray(value) ? value : [];

export function findMatchingSpeakingItems(activity, { query = '', level = 'all' } = {}) {
  const needle = String(query).trim().toLowerCase();
  const activityText = [activity?.title, activity?.summary, activity?.instructions,
    ...array(activity?.goals), ...array(activity?.tags)]
    .some((value) => String(value || '').toLowerCase().includes(needle));

  return array(activity?.prompts).flatMap((raw, sourceIndex) => {
    const item = typeof raw === 'string' ? { text: raw } : (raw || {});
    const levels = array(item.levels).length ? item.levels : array(activity?.levels);
    if (level !== 'all' && !levels.includes(level)) return [];
    const itemText = [item.text, item.student_support, item.challenge,
      ...array(item.context_tags), ...array(item.language_targets)];
    if (needle && !activityText && !itemText.some((value) => String(value || '').toLowerCase().includes(needle))) return [];
    return [{ sourceIndex, item }];
  });
}
