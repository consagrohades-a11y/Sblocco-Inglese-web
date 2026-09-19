function hashSeed(value) {
  let hash = 2166136261;
  const input = String(value || 'preview');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sameOrder(a, b) {
  return a.length === b.length && a.every((item, index) => item?.instanceKey === b[index]?.instanceKey);
}

export function stableShuffleWordOrderTokenInstances(items, strategy, seed) {
  const source = Array.isArray(items) ? [...items] : [];
  if (strategy !== 'stable_attempt' || source.length < 2) return source;

  const random = seededRandom(hashSeed(seed));
  const shuffled = [...source];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  // A shuffled exercise should not occasionally reveal the authored correct order.
  if (sameOrder(source, shuffled)) {
    return [...shuffled.slice(1), shuffled[0]];
  }

  return shuffled;
}
