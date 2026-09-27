function clean(value) {
  return String(value || '').trim();
}

function splitTokens(value) {
  return clean(value)
    .split(/\s*(?:·|•|,|;|\n)\s*/)
    .map(clean)
    .filter(Boolean);
}

export function parseBadGood(text) {
  const match = clean(text).match(/^\s*BAD\s*:\s*([\s\S]*?)\s*GOOD\s*:\s*([\s\S]+)$/i);
  return match ? { bad: clean(match[1]), good: clean(match[2]) } : null;
}

export function parseForbidden(text) {
  const source = clean(text);
  let match = source.match(/^([\s\S]*?)\s*(?:\||\n)\s*FORBIDDEN\s*:\s*([\s\S]+)$/i);
  if (match) return { prompt: clean(match[1]), words: splitTokens(match[2]) };

  match = source.match(/^Explain\s*:\s*([\s\S]*?)\.\s*You cannot say\s*:\s*([\s\S]+?)\.?$/i);
  if (match) return { prompt: clean(match[1]), words: splitTokens(match[2]) };

  match = source.match(/^([\s\S]*?)\s*\|\s*forbidden\s*:\s*([\s\S]+)$/i);
  if (match) return { prompt: clean(match[1]), words: splitTokens(match[2]) };

  return null;
}

export function parseRequiredChunks(text) {
  const match = clean(text).match(/^TOPIC\s*:\s*([\s\S]*?)\n+CHUNKS\s*:\s*([\s\S]+)$/i);
  if (!match) return null;
  return { topic: clean(match[1]), chunks: splitTokens(match[2]) };
}

export function parseLabelledChoices(text) {
  const lines = clean(text).split(/\n+/).map(clean).filter(Boolean);
  const choices = [];
  const intro = [];
  for (const line of lines) {
    const match = line.match(/^([A-F])\)\s*(.+)$/i);
    if (match) choices.push({ key: match[1].toUpperCase(), text: clean(match[2]) });
    else if (!choices.length) intro.push(line);
    else intro.push(line);
  }
  return choices.length >= 2 ? { intro: intro.join(' '), choices } : null;
}

export function parseDialogue(text) {
  const lines = clean(text).split(/\n+/).map(clean).filter(Boolean);
  const turns = [];
  const remainder = [];
  for (const line of lines) {
    const match = line.match(/^([A-Z][A-Za-z0-9 _-]{0,18})\s*:\s*(.+)$/);
    if (match) turns.push({ speaker: clean(match[1]), text: clean(match[2]) });
    else remainder.push(line);
  }
  return turns.length >= 2 ? { turns, remainder } : null;
}

export function parseFirstFollowup(text) {
  const source = clean(text);
  const match = source.match(/^FIRST\s*:\s*([\s\S]*?)\n+FOLLOW-UP\s*:\s*([\s\S]+)$/i);
  return match ? { first: clean(match[1]), followup: clean(match[2]) } : null;
}

export function parseAnswerFirst(text) {
  const match = clean(text).match(/^ANSWER\s*:\s*([\s\S]+)$/i);
  return match ? { answer: clean(match[1]) } : null;
}

export function parsePhraseAuction(text) {
  const lines = clean(text).split(/\n+/).map(clean).filter(Boolean);
  const situationLine = lines.find((line) => /^SITUATION\s*:/i.test(line));
  const budgetLine = lines.find((line) => /^BUDGET\s*:/i.test(line));
  const phrases = lines
    .filter((line) => /^[•*-]\s*/.test(line))
    .map((line) => line.replace(/^[•*-]\s*/, '').trim())
    .filter(Boolean);
  if (!situationLine || phrases.length < 3) return null;
  return {
    situation: situationLine.replace(/^SITUATION\s*:\s*/i, '').trim(),
    budget: budgetLine ? budgetLine.replace(/^BUDGET\s*:\s*/i, '').trim() : '',
    phrases,
  };
}

export function parseTradeoff(text) {
  const source = clean(text);
  const match = source.match(/^Choose\s+(\d+)\s+(?:for|in|when)\s+([^:]+):\s*([\s\S]+)$/i);
  if (!match) return null;
  const options = splitTokens(match[3]);
  return options.length >= 3
    ? { count: Number(match[1]), context: clean(match[2]), options }
    : null;
}

export function parseDifference(text) {
  const source = clean(text);
  let match = source.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (match) return { left: clean(match[1]), right: clean(match[2]) };
  match = source.match(/difference between\s+(.+?)\s+and\s+(.+?)(?:\?|\.|$)/i);
  return match ? { left: clean(match[1]), right: clean(match[2]) } : null;
}

export function parseQuotedPrompt(text) {
  const lines = clean(text).split(/\n+/).map(clean).filter(Boolean);
  if (lines.length < 2) return null;
  const first = lines[0];
  if (!/^["“].+["”]$/.test(first)) return null;
  return { quote: first.replace(/^["“]|["”]$/g, ''), question: lines.slice(1).join(' ') };
}

export function parseDotOptions(text) {
  const source = clean(text);
  const pieces = source.split(/\s*·\s*/).map(clean).filter(Boolean);
  return pieces.length >= 3 ? pieces : null;
}

export function adaptLegacySpeakingItem(item, config = {}) {
  const text = clean(item?.text);
  const family = config.family || 'situation_response';
  const variant = config.variant || 'prompt';

  return {
    text,
    family,
    variant,
    badGood: parseBadGood(text),
    forbidden: parseForbidden(text),
    requiredChunks: parseRequiredChunks(text),
    labelledChoices: parseLabelledChoices(text),
    dialogue: parseDialogue(text),
    firstFollowup: parseFirstFollowup(text),
    answerFirst: parseAnswerFirst(text),
    phraseAuction: parsePhraseAuction(text),
    tradeoff: parseTradeoff(text),
    difference: parseDifference(text),
    quotedPrompt: parseQuotedPrompt(text),
    dotOptions: parseDotOptions(text),
  };
}
