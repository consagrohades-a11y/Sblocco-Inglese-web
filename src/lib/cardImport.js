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

function comparisonValue(value) {
  return String(value || '')
    .toLocaleLowerCase('en')
    .normalize('NFKC')
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function contentKey(card, fields) {
  const values = fields.map((field) => comparisonValue(card[field]));
  return values.every(Boolean) ? values.join('\u241f') : '';
}

export function prepareImportCards(cards, existingCards, { idPrefix, duplicateFields }) {
  const idPattern = new RegExp(`^${idPrefix}-(\\d{4})$`);
  const occupiedIds = new Set(existingCards.map((card) => String(card.public_id || '').toLowerCase()).filter(Boolean));
  const explicitIds = cards.map((card) => String(card.public_id || '').toLowerCase()).filter(Boolean);
  explicitIds.forEach((id) => occupiedIds.add(id));

  let nextNumber = [...occupiedIds].reduce((highest, id) => {
    const match = id.match(idPattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;

  const preparedCards = cards.map((card) => {
    if (String(card.public_id || '').trim()) return card;
    while (occupiedIds.has(`${idPrefix}-${String(nextNumber).padStart(4, '0')}`)) nextNumber += 1;
    if (nextNumber > 9999) throw new Error(`Non ci sono più ID disponibili per ${idPrefix}.`);
    const publicId = `${idPrefix}-${String(nextNumber).padStart(4, '0')}`;
    occupiedIds.add(publicId);
    nextNumber += 1;
    return { ...card, public_id: publicId, _generated_public_id: true };
  });

  const existingById = new Map(existingCards.map((card) => [String(card.public_id || '').toLowerCase(), card]));
  const contentOwners = new Map();
  existingCards.forEach((card) => {
    const key = contentKey(card, duplicateFields);
    if (key && !contentOwners.has(key)) contentOwners.set(key, card);
  });

  const issues = preparedCards.map(() => []);
  const notes = preparedCards.map((card) => card._generated_public_id ? ['ID generato automaticamente'] : []);
  let idConflicts = 0;
  let existingDuplicates = 0;
  let contentDuplicates = 0;

  preparedCards.forEach((card, index) => {
    const publicId = String(card.public_id || '').toLowerCase();
    const existingWithId = existingById.get(publicId);
    const key = contentKey(card, duplicateFields);

    if (existingWithId) {
      const sameContent = key && key === contentKey(existingWithId, duplicateFields);
      issues[index].push(sameContent
        ? `ID già presente con gli stessi contenuti: ${publicId}`
        : `ID già presente con contenuti diversi: ${publicId}`);
      if (sameContent) existingDuplicates += 1;
      else idConflicts += 1;
    }

    const owner = key ? contentOwners.get(key) : null;
    if (owner && String(owner.public_id || '').toLowerCase() !== publicId) {
      issues[index].push(`Possibile duplicato della card ${owner.public_id}`);
      contentDuplicates += 1;
    }
    if (key && !contentOwners.has(key)) contentOwners.set(key, card);
  });

  return {
    cards: preparedCards,
    issues,
    notes,
    summary: {
      generatedIds: preparedCards.filter((card) => card._generated_public_id).length,
      idConflicts,
      existingDuplicates,
      contentDuplicates,
    },
  };
}
