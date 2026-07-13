export const EXERCISE_MODES = [
  { id: 'italian_to_english', label: 'Italiano → inglese' },
  { id: 'english_to_italian', label: 'Inglese → italiano' },
  { id: 'multiple_choice', label: 'Scelta multipla' },
  { id: 'sentence_completion', label: 'Completa la frase' },
];

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function normaliseAnswer(value) {
  return String(value || '')
    .toLocaleLowerCase('it')
    .normalize('NFKC')
    .replace(/[’‘`´]/g, "'")
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(left, right) {
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

export function evaluateAnswer(response, acceptedAnswers) {
  const submitted = normaliseAnswer(response);
  const accepted = acceptedAnswers.map(normaliseAnswer).filter(Boolean);

  if (!submitted) return { result: 'incorrect', score: 0, label: 'Sbagliato' };
  if (accepted.includes(submitted)) return { result: 'correct', score: 100, label: 'Corretto' };

  const nearest = accepted.reduce((best, answer) => {
    const distance = levenshtein(submitted, answer);
    const ratio = distance / Math.max(submitted.length, answer.length, 1);
    return ratio < best.ratio ? { distance, ratio } : best;
  }, { distance: Infinity, ratio: Infinity });

  if ((submitted.length >= 4 && nearest.distance === 1) || nearest.ratio <= 0.12) {
    return { result: 'nearly_correct', score: 70, label: 'Quasi' };
  }

  return { result: 'incorrect', score: 0, label: 'Sbagliato' };
}

function baseQuestion(item, exerciseType, extra) {
  return {
    id: `${item.id}:${exerciseType}`,
    learningItemId: item.id,
    publicId: item.publicId,
    trainerId: item.trainerId,
    exerciseType,
    explanation: item.explanation,
    level: item.level,
    category: item.category,
    ...extra,
  };
}

function makeItalianToEnglish(item) {
  return baseQuestion(item, 'italian_to_english', {
    direction: 'italian_to_english',
    instruction: 'Scrivi in inglese',
    prompt: item.italian,
    acceptedAnswers: item.acceptedEnglish,
    correctAnswer: item.english,
  });
}

function makeEnglishToItalian(item) {
  return baseQuestion(item, 'english_to_italian', {
    direction: 'english_to_italian',
    instruction: 'Scrivi in italiano',
    prompt: item.english,
    acceptedAnswers: item.acceptedItalian,
    correctAnswer: item.italian,
  });
}

function makeMultipleChoice(item, pool) {
  const distractors = shuffle(pool.filter((candidate) => candidate.id !== item.id))
    .map((candidate) => candidate.italian)
    .filter((value, index, values) => value && value !== item.italian && values.indexOf(value) === index)
    .slice(0, 3);

  if (!distractors.length) return null;
  return baseQuestion(item, 'multiple_choice', {
    direction: 'english_to_italian',
    instruction: 'Scegli il significato corretto',
    prompt: item.english,
    acceptedAnswers: item.acceptedItalian,
    correctAnswer: item.italian,
    options: shuffle([item.italian, ...distractors]),
  });
}

function stripInlineFormatting(value) {
  return String(value || '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[\\*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function gapPrompt(example, target) {
  const plainExample = stripInlineFormatting(example);
  const plainTarget = stripInlineFormatting(target);
  const start = plainExample.toLocaleLowerCase('en').indexOf(plainTarget.toLocaleLowerCase('en'));
  if (start < 0) return null;

  const before = plainExample.slice(0, start).trimEnd();
  const after = plainExample.slice(start + plainTarget.length).trimStart();
  const spaceBefore = before ? ' ' : '';
  const spaceAfter = after && !/^[,.;:!?)]/.test(after) ? ' ' : '';
  return `${before}${spaceBefore}_____${spaceAfter}${after}`.trim();
}

function makeSentenceCompletion(item) {
  const target = stripInlineFormatting(item.english);
  const prompt = item.examples.map((example) => gapPrompt(example, target)).find(Boolean);
  if (!prompt || !target) return null;

  return baseQuestion(item, 'sentence_completion', {
    direction: 'gap_fill',
    instruction: 'Completa la frase in inglese',
    prompt,
    acceptedAnswers: item.acceptedEnglish,
    correctAnswer: item.english,
  });
}

export function createPracticeSession(items, modes, count) {
  const builders = {
    italian_to_english: (item) => makeItalianToEnglish(item),
    english_to_italian: (item) => makeEnglishToItalian(item),
    multiple_choice: (item) => makeMultipleChoice(item, items),
    sentence_completion: (item) => makeSentenceCompletion(item),
  };

  const questions = items.flatMap((item) => modes.map((mode) => builders[mode]?.(item)).filter(Boolean));
  return shuffle(questions).slice(0, Math.max(1, count));
}
