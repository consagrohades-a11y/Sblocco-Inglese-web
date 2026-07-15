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
    const publicId = String(card.public_id || '').toLowerCase().trim();
    if (!publicId) return;
    if (seen.has(publicId)) duplicates.add(publicId);
    seen.add(publicId);
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

function duplicateLabel(card) {
  return card.lemma || card.canonical_text || card.display_target || card.public_id || 'card esistente';
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
  const existingByContent = new Map();
  existingCards.forEach((card) => {
    const key = contentKey(card, duplicateFields);
    if (key && !existingByContent.has(key)) existingByContent.set(key, card);
  });

  const incomingContentOwners = new Map();
  const issues = preparedCards.map(() => []);
  const notes = preparedCards.map((card) => card._generated_public_id ? ['ID generato automaticamente'] : []);
  const duplicates = preparedCards.map(() => null);
  let idConflicts = 0;
  let existingDuplicates = 0;
  let contentDuplicates = 0;
  let batchDuplicates = 0;

  preparedCards.forEach((card, index) => {
    const publicId = String(card.public_id || '').toLowerCase();
    const existingWithId = existingById.get(publicId) || null;
    const key = contentKey(card, duplicateFields);
    const existingWithContent = key ? existingByContent.get(key) || null : null;
    const incomingOwnerIndex = key ? incomingContentOwners.get(key) : undefined;

    if (incomingOwnerIndex !== undefined) {
      issues[index].push(`Contenuto duplicato nello stesso file, già presente alla riga ${incomingOwnerIndex + 2}`);
      batchDuplicates += 1;
    } else if (key) {
      incomingContentOwners.set(key, index);
    }

    if (existingWithId && existingWithContent && existingWithId.id !== existingWithContent.id) {
      issues[index].push(`Conflitto ambiguo: l’ID corrisponde a ${existingWithId.public_id}, ma il contenuto corrisponde a ${existingWithContent.public_id}`);
      idConflicts += 1;
      return;
    }

    const target = existingWithId || existingWithContent;
    if (!target) return;

    const sameId = Boolean(existingWithId);
    const sameContent = Boolean(existingWithContent && existingWithContent.id === target.id);
    const kind = sameId && sameContent
      ? 'same_id_same_content'
      : sameId
        ? 'public_id_conflict'
        : 'content_duplicate';

    duplicates[index] = {
      kind,
      existingId: target.id,
      existingPublicId: target.public_id,
      existingLabel: duplicateLabel(target),
      sameId,
      sameContent,
    };

    if (kind === 'same_id_same_content') existingDuplicates += 1;
    else if (kind === 'public_id_conflict') idConflicts += 1;
    else contentDuplicates += 1;

    notes[index].push(`Duplicato di ${target.public_id}: scegli Sostituisci o Salta`);
  });

  return {
    cards: preparedCards,
    issues,
    notes,
    duplicates,
    summary: {
      generatedIds: preparedCards.filter((card) => card._generated_public_id).length,
      idConflicts,
      existingDuplicates,
      contentDuplicates,
      batchDuplicates,
    },
  };
}
