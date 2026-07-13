export const trainerLevels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1'];
export const expressionLevels = ['A2', 'B1', 'B2', 'C1'];

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => String(value).trim())) rows.push(row);
  if (rows.length < 2) throw new Error('Il CSV deve avere una riga di intestazione e almeno una card.');

  const headers = rows[0].map((header) => String(header).replace(/^\uFEFF/, '').trim());
  return rows.slice(1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? '']),
  ));
}

export function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/\r?\n|\s*\|\s*|\s*;\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function firstValue(source, keys, fallback = '') {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

export function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function extractImportedCards(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.cards)) return parsed.cards;
  if (parsed?.card && typeof parsed.card === 'object' && !Array.isArray(parsed.card)) return [parsed.card];
  if (parsed && typeof parsed === 'object') return [parsed];
  throw new Error('Il JSON deve contenere una card, una lista oppure una proprietà cards.');
}

export function findDuplicatePublicIds(cards) {
  const seen = new Set();
  const duplicates = new Set();

  cards.forEach((card) => {
    if (!card.public_id) return;
    if (seen.has(card.public_id)) duplicates.add(card.public_id);
    seen.add(card.public_id);
  });

  return Array.from(duplicates);
}
