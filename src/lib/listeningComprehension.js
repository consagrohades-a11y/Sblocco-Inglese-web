export const LISTENING_COMPREHENSION_TEMPLATE_KEY = 'listening_comprehension';
export const LISTENING_COMPREHENSION_TEMPLATE_ID = 'listening-comprehension-v1';
export const LISTENING_COMPREHENSION_TEMPLATE_VERSION = 1;

const BRIDGE_FLAG = '__listening_comprehension_bridge';
const BRIDGE_PASSAGE = '__LISTENING_AUDIO_SOURCE__';
const TRANSCRIPT_VISIBILITY = ['after_submit', 'always', 'never'];

const clone = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' ? value.trim() : '';

export const listeningComprehensionAuthoringGuide = {
  template_id: LISTENING_COMPREHENSION_TEMPLATE_ID,
  template_key: LISTENING_COMPREHENSION_TEMPLATE_KEY,
  template_version: LISTENING_COMPREHENSION_TEMPLATE_VERSION,
  purpose: 'Generate an import-ready listening comprehension question for Sblocco Inglese using one audio source and one or more comprehension items.',
  workflow: [
    'Read this entire _template object before generating the question.',
    'Keep the same top-level JSON structure and preserve every invariant field.',
    'Replace the example lesson content with the requested listening lesson.',
    'Return one complete JSON object. The Exercise Builder accepts plain JSON and common AI code-fence wrappers, but valid JSON remains the canonical output.',
  ],
  generation_contract: {
    invariant_fields: [
      'schema_version',
      'entity_type',
      '_template',
      'question.type',
    ],
    editable_fields: [
      'question.client_key',
      'question.title',
      'question.prompt',
      'question.instructions',
      'question.instruction_language',
      'question.level',
      'question.topic',
      'question.subtopic',
      'question.learning_objective',
      'question.difficulty',
      'question.content',
      'question.grading',
      'question.feedback',
      'question.diagnostics',
      'question.tags',
      'question.foundation_links',
    ],
  },
  audio_contract: {
    required: ['url or storage_path'],
    fields: {
      url: 'Direct HTTPS audio URL. Use this for a hosted ElevenLabs export or another stable hosted file.',
      storage_bucket: 'Optional Supabase Storage bucket when the audio is stored privately.',
      storage_path: 'Optional Supabase Storage path. When present, the learner renderer creates a signed URL.',
      title: 'Short learner-facing audio label.',
      duration_seconds: 'Optional positive duration estimate.',
      transcript: 'Optional transcript. Do not place answers or teacher notes in it.',
      transcript_visibility: 'after_submit, always, or never. Default: after_submit.',
      max_plays: 'Optional positive integer. Omit/null for unlimited playback.',
    },
    rules: [
      'Provide one stable audio source: url, storage_path, or both as a fallback pair.',
      'Do not use expiring temporary URLs in authored JSON.',
      'For ElevenLabs, export/store the generated audio first and reference the stable hosted file here.',
      'Keep transcript wording faithful to the audio. Do not simplify the transcript after generating the recording.',
      'Use after_submit when the transcript would make comprehension questions trivial before submission.',
      'Use max_plays only when replay limitation has a pedagogical purpose. Unlimited replay is appropriate for most learning activities.',
    ],
  },
  item_contract: {
    supported_types: ['multiple_choice', 'multiple_select', 'true_false', 'short_answer'],
    rules: [
      'Every item must be answerable from the audio without outside knowledge.',
      'Use a mix of gist, detail and pragmatic/inference questions only when appropriate to the CEFR level.',
      'Do not make every item test one isolated word; listening comprehension should test meaning.',
      'For multiple_choice and true_false, provide exactly one correct option.',
      'For multiple_select, provide at least one correct option and make the selection criterion explicit.',
      'For short_answer, keep the expected answer short enough for reliable automatic grading and list all clearly valid accepted_answers.',
      'Distractors must be plausible from the audio context rather than obviously absurd.',
    ],
  },
  pedagogical_rules: [
    'Match speech rate, lexical load, sentence complexity and task demands to the requested CEFR level.',
    'Use natural spoken English: contractions, discourse markers and realistic turn-taking are preferable to textbook prose read aloud.',
    'Give the learner a concrete listening purpose before playback.',
    'At A0-A2, prefer short audio, clear contexts and a progression from gist to selected details.',
    'At B1+, include natural redundancy, reformulation and limited inference where useful.',
    'If the audio is a dialogue, speakers must respond naturally to one another and have internally consistent roles.',
    'Avoid turning listening into a disguised grammar worksheet. Grammar can be present, but meaning and comprehension remain primary.',
    'For Italian learners, include realistic connected speech and common everyday reductions when level-appropriate, without making accent difficulty the only challenge.',
  ],
  invalid_patterns: [
    'A transcript with no audio source.',
    'A temporary or expiring audio URL embedded in the template.',
    'Questions whose answers depend on information that is not actually said or reasonably inferred.',
    'Five near-identical detail questions about isolated vocabulary.',
    'An A1 audio written like a formal C1 article and merely read aloud.',
    'Correct answers exposed in prompt, instructions, transcript shown before submission, or option wording.',
  ],
};

export const listeningComprehensionTemplate = {
  schema_version: 2,
  entity_type: 'question',
  _template: listeningComprehensionAuthoringGuide,
  question: {
    client_key: 'question_listening_comprehension',
    type: LISTENING_COMPREHENSION_TEMPLATE_KEY,
    title: 'Arranging a meeting time',
    prompt: 'Ascolta e capisci cosa decidono.',
    instructions: 'Ascolta il dialogo. Prima cerca di capire la situazione generale, poi rispondi alle domande.',
    instruction_language: 'it',
    level: 'A2',
    topic: 'making_arrangements',
    subtopic: 'meeting_time',
    primary_skill: 'listening',
    learning_objective: 'Understand the main decision and selected details in a short natural conversation about arranging a meeting.',
    difficulty: 'standard',
    content: {
      title: 'When can we meet?',
      audio: {
        url: 'https://example.com/replace-with-stable-audio.mp3',
        storage_bucket: null,
        storage_path: null,
        title: 'Short conversation · two colleagues',
        duration_seconds: 38,
        transcript: 'Maya: Are you free tomorrow morning? Donovan: I have a client call until eleven. Could we meet after lunch instead? Maya: Sure. How about half past two? Donovan: That works for me. Let’s meet in the small meeting room.',
        transcript_visibility: 'after_submit',
        max_plays: null,
      },
      items: [
        {
          key: 'item_1',
          type: 'multiple_choice',
          prompt: 'What are Maya and Donovan trying to arrange?',
          points: 1,
          options: [
            { key: 'a', text: 'A meeting.', is_correct: true },
            { key: 'b', text: 'A holiday.', is_correct: false },
            { key: 'c', text: 'A client call.', is_correct: false },
          ],
        },
        {
          key: 'item_2',
          type: 'multiple_choice',
          prompt: 'Why can’t Donovan meet in the morning?',
          points: 1,
          options: [
            { key: 'a', text: 'He has a client call.', is_correct: true },
            { key: 'b', text: 'He is travelling.', is_correct: false },
            { key: 'c', text: 'He has lunch with Maya.', is_correct: false },
          ],
        },
        {
          key: 'item_3',
          type: 'short_answer',
          prompt: 'What time do they decide to meet?',
          points: 1,
          accepted_answers: ['2:30', '2.30', 'half past two', 'two thirty'],
        },
      ],
    },
    grading: { mode: 'per_item', weight: 1, nearly_correct_multiplier: 0.5 },
    feedback: { explanation: 'Riascolta il punto in cui concordano orario e luogo se un dettaglio non era chiaro.' },
    diagnostics: { tested_codes: [], fallback_error_code: null },
    tags: ['listening', 'arrangements', 'a2'],
    foundation_links: [],
  },
};

function visitQuestions(value, transform) {
  if (Array.isArray(value)) return value.map((item) => visitQuestions(item, transform));
  if (!isObject(value)) return value;
  const next = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visitQuestions(child, transform)]));
  return next.type === LISTENING_COMPREHENSION_TEMPLATE_KEY ? transform(next) : next;
}

export function prepareListeningComprehensionForV2(input) {
  const source = clone(input);
  return visitQuestions(source, (question) => {
    const content = isObject(question.content) ? { ...question.content } : {};
    const audio = isObject(content.audio) ? { ...content.audio } : {};
    return {
      ...question,
      type: 'reading_comprehension',
      primary_skill: 'listening',
      content: {
        ...content,
        audio,
        passage: text(content.passage) || text(audio.transcript) || BRIDGE_PASSAGE,
        [BRIDGE_FLAG]: true,
      },
    };
  });
}

function restoreNode(value) {
  if (Array.isArray(value)) return value.map(restoreNode);
  if (!isObject(value)) return value;
  const next = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, restoreNode(child)]));
  if (next.type === 'reading_comprehension' && next.content?.[BRIDGE_FLAG]) {
    const content = { ...next.content };
    delete content[BRIDGE_FLAG];
    if (content.passage === BRIDGE_PASSAGE || content.passage === content.audio?.transcript) delete content.passage;
    return { ...next, type: LISTENING_COMPREHENSION_TEMPLATE_KEY, primary_skill: 'listening', content };
  }
  return next;
}

export function restoreListeningComprehensionValidationResult(result) {
  if (!result) return result;
  result.parsed = restoreNode(result.parsed);
  (result.items || []).forEach((item) => { item.payload = restoreNode(item.payload); });
  return result;
}

function collectListeningQuestions(value, path = 'payload', output = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectListeningQuestions(item, `${path}[${index}]`, output));
    return output;
  }
  if (!isObject(value)) return output;
  if (value.type === LISTENING_COMPREHENSION_TEMPLATE_KEY) output.push({ question: value, path });
  Object.entries(value).forEach(([key, child]) => collectListeningQuestions(child, `${path}.${key}`, output));
  return output;
}

export function validateListeningComprehensionPayload(question, path = 'question') {
  const errors = [];
  const warnings = [];
  const content = isObject(question?.content) ? question.content : {};
  const audio = isObject(content.audio) ? content.audio : {};
  const url = text(audio.url);
  const storagePath = text(audio.storage_path);
  const visibility = text(audio.transcript_visibility) || 'after_submit';
  const duration = Number(audio.duration_seconds || 0);
  const maxPlays = audio.max_plays == null || audio.max_plays === '' ? null : Number(audio.max_plays);

  if (!url && !storagePath) errors.push(`${path}.content.audio: url oppure storage_path è obbligatorio.`);
  if (url && !/^https:\/\//i.test(url)) errors.push(`${path}.content.audio.url: usa un URL HTTPS stabile.`);
  if (!TRANSCRIPT_VISIBILITY.includes(visibility)) errors.push(`${path}.content.audio.transcript_visibility: usa ${TRANSCRIPT_VISIBILITY.join(', ')}.`);
  if (audio.duration_seconds != null && (!Number.isFinite(duration) || duration <= 0)) errors.push(`${path}.content.audio.duration_seconds deve essere maggiore di zero.`);
  if (maxPlays != null && (!Number.isInteger(maxPlays) || maxPlays < 1)) errors.push(`${path}.content.audio.max_plays deve essere un intero positivo oppure null.`);
  if (!text(audio.transcript)) warnings.push(`${path}.content.audio.transcript assente: consentito, ma non potrai mostrare una trascrizione di supporto dopo il tentativo.`);
  if (!Array.isArray(content.items) || !content.items.length) errors.push(`${path}.content.items: serve almeno una domanda di comprensione.`);
  if (question?.primary_skill !== 'listening') warnings.push(`${path}.primary_skill dovrebbe essere listening.`);

  return { errors, warnings };
}

export function applyListeningComprehensionValidation(result) {
  if (!result || !Array.isArray(result.items)) return result;
  result.items.forEach((item) => {
    const matches = collectListeningQuestions(item.payload, item.entityType || 'item');
    matches.forEach(({ question, path }) => {
      const semantic = validateListeningComprehensionPayload(question, path);
      item.errors = [...(item.errors || []), ...semantic.errors];
      item.warnings = [...(item.warnings || []), ...semantic.warnings];
    });
    item.status = item.errors?.length ? 'invalid' : item.warnings?.length ? 'warning' : 'valid';
    item.selected = item.status !== 'invalid';
  });
  return result;
}
