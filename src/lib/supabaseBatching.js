const DEFAULT_IN_FILTER_CHUNK_SIZE = 75;

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function describeSupabaseError(error, context = 'Richiesta Supabase') {
  if (!error) return context;

  const details = [
    error.message,
    error.details,
    error.hint,
    error.code ? `codice ${error.code}` : null,
  ]
    .filter(Boolean)
    .filter((value, index, items) => items.indexOf(value) === index);

  return `${context}: ${details.join(' · ') || 'errore sconosciuto'}`;
}

export function throwSupabaseError(error, context) {
  if (!error) return;

  const enhanced = new Error(describeSupabaseError(error, context));
  enhanced.name = 'SupabaseRequestError';
  enhanced.code = error.code;
  enhanced.details = error.details;
  enhanced.hint = error.hint;
  enhanced.cause = error;
  throw enhanced;
}

export async function fetchRowsInChunks(
  values,
  fetchChunk,
  {
    chunkSize = DEFAULT_IN_FILTER_CHUNK_SIZE,
    context = 'Caricamento dati',
  } = {},
) {
  const unique = uniqueValues(values);
  if (!unique.length) return [];

  const rows = [];
  for (let start = 0; start < unique.length; start += chunkSize) {
    const chunk = unique.slice(start, start + chunkSize);
    const { data, error } = await fetchChunk(chunk);
    throwSupabaseError(
      error,
      `${context} (blocco ${Math.floor(start / chunkSize) + 1})`,
    );
    rows.push(...(data || []));
  }

  return rows;
}
