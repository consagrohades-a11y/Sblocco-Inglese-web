function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stripBom(value) {
  return String(value || '').replace(/^\uFEFF/, '');
}

function unwrapSingleFence(value) {
  const match = value.match(/^```(?:json|javascript|js)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : null;
}

function findBalancedObject(value) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === '}') {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return {
          jsonText: value.slice(start, index + 1),
          before: value.slice(0, start).trim(),
          after: value.slice(index + 1).trim(),
        };
      }
    }
  }

  return null;
}

function parseStrict(value) {
  try {
    return { parsed: JSON.parse(value), error: null };
  } catch (error) {
    return { parsed: null, error };
  }
}

export function parseExerciseAuthoringInput(input) {
  if (isObject(input)) {
    return {
      parsed: input,
      normalizedText: JSON.stringify(input, null, 2),
      adjustments: [],
      error: null,
    };
  }

  const original = stripBom(input).trim();
  if (!original) {
    return {
      parsed: null,
      normalizedText: '',
      adjustments: [],
      error: new Error('Il contenuto è vuoto.'),
    };
  }

  const direct = parseStrict(original);
  if (direct.parsed) {
    return {
      parsed: direct.parsed,
      normalizedText: JSON.stringify(direct.parsed, null, 2),
      adjustments: [],
      error: null,
    };
  }

  const fenced = unwrapSingleFence(original);
  if (fenced) {
    const result = parseStrict(fenced);
    if (result.parsed) {
      return {
        parsed: result.parsed,
        normalizedText: JSON.stringify(result.parsed, null, 2),
        adjustments: ['Rimosso automaticamente il blocco Markdown ```json … ``` aggiunto dall’AI.'],
        error: null,
      };
    }
  }

  const balanced = findBalancedObject(original);
  if (balanced && (balanced.before || balanced.after)) {
    const result = parseStrict(balanced.jsonText);
    if (result.parsed) {
      return {
        parsed: result.parsed,
        normalizedText: JSON.stringify(result.parsed, null, 2),
        adjustments: ['Rimosso automaticamente il testo dell’AI prima o dopo l’oggetto JSON.'],
        error: null,
      };
    }
  }

  return {
    parsed: null,
    normalizedText: original,
    adjustments: [],
    error: direct.error || new Error('JSON non valido.'),
  };
}
