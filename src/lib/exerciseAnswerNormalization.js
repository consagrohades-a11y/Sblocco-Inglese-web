export function normalizeExerciseAnswerForSave(answer, question) {
  if (question?.type !== 'word_order' || !Array.isArray(answer)) return answer;
  return answer.map((token) => typeof token === 'string' ? token : token?.text).filter(Boolean);
}
