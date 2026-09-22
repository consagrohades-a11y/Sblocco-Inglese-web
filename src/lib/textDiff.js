function tokenize(value) {
  return String(value ?? '').match(/\s+|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu) || [];
}

function comparable(token) {
  return /^\s+$/.test(token) ? ' ' : token;
}

function mergeSegments(segments) {
  return segments.reduce((result, segment) => {
    const previous = result[result.length - 1];
    if (previous?.type === segment.type) {
      previous.text += segment.text;
    } else {
      result.push({ ...segment });
    }
    return result;
  }, []);
}

export function diffText(originalValue, correctedValue) {
  const original = tokenize(originalValue);
  const corrected = tokenize(correctedValue);

  if (!original.length && !corrected.length) return [];
  if (!original.length) return [{ type: 'add', text: corrected.join('') }];
  if (!corrected.length) return [{ type: 'remove', text: original.join('') }];

  if (original.length * corrected.length > 350000) {
    return mergeSegments([
      { type: 'remove', text: original.join('') },
      { type: 'add', text: corrected.join('') },
    ]);
  }

  const table = Array.from(
    { length: original.length + 1 },
    () => new Uint16Array(corrected.length + 1),
  );

  for (let i = 1; i <= original.length; i += 1) {
    for (let j = 1; j <= corrected.length; j += 1) {
      if (comparable(original[i - 1]) === comparable(corrected[j - 1])) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  const segments = [];
  let i = original.length;
  let j = corrected.length;

  while (i > 0 || j > 0) {
    if (
      i > 0
      && j > 0
      && comparable(original[i - 1]) === comparable(corrected[j - 1])
    ) {
      segments.push({ type: 'equal', text: corrected[j - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] > table[i - 1][j])) {
      segments.push({ type: 'add', text: corrected[j - 1] });
      j -= 1;
    } else {
      segments.push({ type: 'remove', text: original[i - 1] });
      i -= 1;
    }
  }

  return mergeSegments(segments.reverse());
}
