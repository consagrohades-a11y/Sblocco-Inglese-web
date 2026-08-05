function scalarText(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';

  for (const key of ['text', 'label', 'option_text', 'answer_text']) {
    const candidate = scalarText(value[key]);
    if (candidate) return candidate;
  }

  return '';
}

function joinValues(values, separator = ' · ') {
  return values.map((value) => scalarText(value)).filter(Boolean).join(separator);
}

function resolveOption(value, options = []) {
  const embeddedText = scalarText(value);
  const candidate = value && typeof value === 'object' && !Array.isArray(value)
    ? scalarText(value.key ?? value.value ?? value.id)
    : scalarText(value);
  const match = options.find((option) => {
    const optionKey = scalarText(option?.key);
    const optionText = scalarText(option?.text);
    return candidate && (candidate === optionKey || candidate === optionText);
  });

  return scalarText(match?.text) || embeddedText || candidate;
}

function formatOptionAnswers(answer, options, separator = ' · ') {
  const values = Array.isArray(answer) ? answer : [answer];
  return values.map((value) => resolveOption(value, options)).filter(Boolean).join(separator);
}

function formatNestedAnswer(answer, separator = ' · ') {
  if (Array.isArray(answer)) {
    return answer.map((value) => formatNestedAnswer(value, separator)).filter(Boolean).join(separator);
  }
  if (!answer || typeof answer !== 'object') return scalarText(answer);

  for (const key of ['correct_answer', 'answer', 'value']) {
    const candidate = formatNestedAnswer(answer[key], separator);
    if (candidate) return candidate;
  }

  return scalarText(answer);
}

function formatReadingAnswers(question, answer) {
  const items = question?.content?.items || [];
  const results = Array.isArray(answer) ? answer : [];

  return items.map((item, index) => {
    const result = results.find((candidate) => candidate?.key === item.key) ?? results[index];
    const correctAnswer = result && typeof result === 'object' && !Array.isArray(result)
      ? result.correct_answer
      : result;

    if (['multiple_choice', 'multiple_select', 'true_false'].includes(item.type)) {
      return formatOptionAnswers(correctAnswer, item.options || []);
    }
    return formatNestedAnswer(correctAnswer, ' / ');
  }).filter(Boolean).join(' · ');
}

/**
 * Converts the grader's stable answer keys and structured results into text that
 * can be shown to learners and teachers without changing the stored grading data.
 */
export function formatExerciseCorrectAnswer(question, answer) {
  if (answer === null || answer === undefined || answer === '') return '';

  const content = question?.content || {};
  const type = question?.type;

  if (['multiple_choice', 'multiple_select', 'dialogue_choice'].includes(type)) {
    return formatOptionAnswers(answer, content.options || []);
  }

  if (['gap_fill', 'select_gap'].includes(type)) {
    const answers = (content.blanks || [])
      .map((blank) => scalarText(blank?.accepted_answers?.[0]))
      .filter(Boolean);
    return answers.length ? answers.join(' · ') : formatNestedAnswer(answer);
  }

  if (['translation', 'error_correction'].includes(type)) {
    const answers = (content.accepted_answers || []).map((value) => scalarText(value)).filter(Boolean);
    return answers.length ? answers.join(' / ') : formatNestedAnswer(answer, ' / ');
  }

  if (type === 'word_order') {
    const values = content.correct_order?.length ? content.correct_order : Array.isArray(answer) ? answer : [answer];
    const sentence = joinValues(values, ' ');
    const punctuation = scalarText(content.terminal_punctuation);
    return punctuation && sentence && !sentence.endsWith(punctuation) ? `${sentence}${punctuation}` : sentence;
  }

  if (type === 'reading_comprehension') {
    return formatReadingAnswers(question, answer) || formatNestedAnswer(answer);
  }

  return formatNestedAnswer(answer);
}
