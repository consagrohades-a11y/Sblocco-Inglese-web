const TERMINAL_PUNCTUATION = /^[.!?]+$/;

export function splitWordOrderTerminalPunctuation(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(.*\S)([.!?]+)$/);
  if (!match) return { text, punctuation: '' };
  return { text: match[1].trimEnd(), punctuation: match[2] };
}

export function wordOrderTerminalPunctuation(content = {}) {
  const explicit = String(content.terminal_punctuation || '').trim();
  if (TERMINAL_PUNCTUATION.test(explicit)) return explicit;
  const correctOrder = Array.isArray(content.correct_order) ? content.correct_order : [];
  return splitWordOrderTerminalPunctuation(correctOrder.at(-1)).punctuation;
}

export function wordOrderDisplayToken(value, punctuation = '') {
  const token = String(value || '');
  if (!punctuation || !token.endsWith(punctuation)) return token;
  return token.slice(0, -punctuation.length);
}

export function wordOrderEditorValue(content = {}) {
  const punctuation = wordOrderTerminalPunctuation(content);
  const correctOrder = Array.isArray(content.correct_order) ? content.correct_order : [];
  return {
    punctuation,
    tokens: correctOrder.map((token, index) => (
      index === correctOrder.length - 1 ? wordOrderDisplayToken(token, punctuation) : String(token || '')
    )),
  };
}

export function normalizeWordOrderAuthoringContent(content = {}) {
  const punctuation = wordOrderTerminalPunctuation(content);
  const correctOrder = Array.isArray(content.correct_order) ? content.correct_order : [];
  const tokens = Array.isArray(content.tokens) ? content.tokens : [];
  return {
    ...content,
    terminal_punctuation: punctuation || null,
    correct_order: correctOrder.map((token, index) => (
      index === correctOrder.length - 1 ? wordOrderDisplayToken(token, punctuation) : token
    )),
    tokens: tokens.map((token) => {
      if (typeof token === 'string') return wordOrderDisplayToken(token, punctuation);
      return { ...token, text: wordOrderDisplayToken(token?.text, punctuation) };
    }),
  };
}
