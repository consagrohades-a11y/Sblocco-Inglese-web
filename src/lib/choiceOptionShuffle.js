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

function identityOf(item, index) {
  return item?.key || item?.id || item?.text || String(index);
}

function sameOrder(source, shuffled) {
  return source.length === shuffled.length
    && source.every((item, index) => identityOf(item, index) === identityOf(shuffled[index], index));
}

export function stableShuffleChoiceOptions(options, strategy = 'stable_attempt', seed = 'preview') {
  const source = Array.isArray(options) ? [...options] : [];
  if (strategy !== 'stable_attempt' || source.length < 2) return source;

  const random = seededRandom(hashSeed(seed));
  const shuffled = [...source];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  if (sameOrder(source, shuffled)) {
    return [...shuffled.slice(1), shuffled[0]];
  }

  return shuffled;
}
