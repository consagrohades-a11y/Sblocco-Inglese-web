// Shared teacher/learner labels and contract for manually reviewed speaking exercises.
// Do not infer speaking performance from transcription text alone.
export const SPEAKING_CATEGORIES = [
  ['grammar', 'Grammatica'],
  ['structure', 'Struttura'],
  ['vocabulary', 'Lessico e collocazioni'],
  ['naturalness', 'Naturalezza'],
  ['clarity', 'Chiarezza e coerenza'],
  ['register', 'Registro'],
  ['other', 'Altro'],
];

export const SPEAKING_PERFORMANCE_FIELDS = [
  { key: 'pronunciation', label: 'Pronuncia', hint: 'Suoni, accento delle parole e intelligibilità. Verifica ascoltando l’audio.' },
  { key: 'fluency', label: 'Fluenza', hint: 'Esitazioni, ritmo, ripartenze e capacità di continuare il discorso.' },
  { key: 'task_fulfilment', label: 'Svolgimento del compito', hint: 'Pertinenza, sviluppo delle idee, esempi e risposta alla consegna.' },
];

export const SPEAKING_NEXT_STEP_FIELDS = [
  { key: 'strengths', label: 'Cosa funziona bene', hint: 'Un punto di forza concreto.' },
  { key: 'priority', label: 'Priorità', hint: 'Il problema più importante da affrontare.' },
  { key: 'next_step', label: 'Prossimo obiettivo', hint: 'Una piccola azione da mettere in pratica nel prossimo speaking.' },
];

export const SPEAKING_FEEDBACK_KEYS = [
  ...SPEAKING_PERFORMANCE_FIELDS,
  ...SPEAKING_NEXT_STEP_FIELDS,
].map((field) => field.key);

export function normalizeSpeakingFeedback(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    SPEAKING_FEEDBACK_KEYS.map((key) => [key, typeof source[key] === 'string' ? source[key] : '']),
  );
}

export function hasSpeakingFeedback(value) {
  return Object.values(normalizeSpeakingFeedback(value)).some((entry) => entry.trim().length > 0);
}
