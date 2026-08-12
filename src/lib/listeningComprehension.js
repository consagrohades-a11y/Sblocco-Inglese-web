export const LISTENING_COMPREHENSION_TEMPLATE_KEY = 'listening_comprehension';
export const LISTENING_COMPREHENSION_TEMPLATE_ID = 'listening-comprehension-v1';
export const LISTENING_COMPREHENSION_TEMPLATE_VERSION = 1;

const BRIDGE_FLAG = '__listening_comprehension_bridge';
const BRIDGE_PASSAGE = '__LISTENING_AUDIO_SOURCE__';
const TRANSCRIPT_VISIBILITY = ['after_submit', 'always', 'never'];

const clone = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' ? value.trim() : '';

const COMMON_PEDAGOGICAL_RULES = [
  'Write natural spoken English that learners could genuinely hear in the target situation; do not write textbook prose and simply label it listening.',
  'Match speech rate, lexical load, sentence complexity and task demands to the requested CEFR level.',
  'Give the learner a concrete listening purpose before playback.',
  'Questions must test meaning, gist, selected details, pragmatic intent or reasonable inference rather than isolated word spotting alone.',
  'For Italian learners, include realistic connected speech and common reductions only when level-appropriate; accent difficulty must not become the only challenge.',
  'If the audio is a dialogue, speakers must respond naturally and keep roles, register and context internally consistent.',
  'At A0-A2 prefer short audio, clear contexts and a progression from gist to selected details; at B1+ allow natural redundancy, reformulation and limited inference.',
  'Avoid repetitive, mechanical or exam-book phrasing unless the requested material is explicitly exam preparation.',
];

const METADATA_RULES = [
  'client_key must be stable, descriptive, unique within the returned JSON and use lowercase snake_case.',
  'level must reflect both the audio difficulty and the cognitive demand of the questions.',
  'topic and subtopic should be concise machine-friendly identifiers, preferably lowercase snake_case.',
  'primary_skill must remain listening.',
  'learning_objective must describe what the learner should understand from spoken English, not merely name a grammar point.',
];

const DIAGNOSTIC_RULES = [
  'Do not invent diagnostic codes unless the user supplies approved codes or they are already present in the downloaded template.',
  'If no registered listening diagnostic code is known, use diagnostics.tested_codes = [] and diagnostics.fallback_error_code = null.',
  'Attach error codes only when a wrong option maps unambiguously to one known listening misconception.',
];

const GRADING_RULES = [
  'Keep grading.mode = per_item because listening comprehension is automatically graded item by item.',
  'For multiple_choice and true_false, exactly one option must be correct.',
  'For multiple_select, at least one option must be correct and the selection criterion must be explicit.',
  'For short_answer, keep expected answers short enough for reliable automatic grading and include all clearly valid accepted_answers.',
];

const VALIDATION_CHECKLIST = [
  'The JSON parses and preserves schema_version, entity_type, _template and question.type.',
  'question.type is listening_comprehension and primary_skill is listening.',
  'content.audio has a stable HTTPS url, a storage_path, or both.',
  'content.audio.transcript_visibility is after_submit, always or never.',
  'Every comprehension item is answerable from the actual audio content.',
  'Choice-item correctness flags are internally valid and short answers list valid accepted_answers.',
  'No correct answer is exposed in learner-facing prompt or instructions.',
  'The audio difficulty, task demand and CEFR label are coherent with each other.',
];

export const listeningComprehensionAuthoringGuide = {
  template_id: LISTENING_COMPREHENSION_TEMPLATE_ID,
  template_key: LISTENING_COMPREHENSION_TEMPLATE_KEY,
  template_version: LISTENING_COMPREHENSION_TEMPLATE_VERSION,
  entity_type: 'question',
  question_type: LISTENING_COMPREHENSION_TEMPLATE_KEY,
  purpose: 'Generate an import-ready listening comprehension question for Sblocco Inglese using one audio source and one or more comprehension items.',
  workflow: [
    'Read this entire _template object before generating the question.',
    'Use the requested CEFR level and lesson brief to design the listening situation before writing questions.',
    'Keep the same top-level JSON structure and preserve every invariant field.',
    'Return one complete import-ready JSON object after checking audio, item answers and metadata against the validation checklist.',
  ],
  generation_contract: {
    output: 'valid_json_only',
    markdown_fences: false,
    comments: false,
    preserve_top_level_metadata: true,
    do_not_rename_keys: true,
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
  common_pedagogical_rules: COMMON_PEDAGOGICAL_RULES,
  metadata_rules: METADATA_RULES,
  diagnostics_rules: DIAGNOSTIC_RULES,
  grading_rules: GRADING_RULES,
  validation_checklist: VALIDATION_CHECKLIST,
  entity_contract: {
    purpose: 'Generate one native listening comprehension question that can be imported and published without conversion to another question type.',
    rules: [
      'Return exactly one top-level question object under question.',
      'Keep question.type unchanged as listening_comprehension.',
      'Keep the audio source and all comprehension items inside question.content.',
      'Do not add unrelated exercises, teaching blocks or answer keys outside the supported question structure.',
    ],
  },
  question_contract: {
    purpose: 'Assess understanding of one spoken source through automatically graded comprehension items.',
    required_content: ['audio', 'items'],
    rules: [
      'Provide one playable audio source and at least one comprehension item.',
      'Use the same item structures as reading comprehension: multiple_choice, multiple_select, true_false or short_answer.',
      'Order questions pedagogically: gist before detail/inference when both are present.',
      'Make distractors plausible from what the learner hears, not obviously unrelated.',
      'Do not turn the task into grammar manipulation unless the lesson brief explicitly asks for form-focused listening.',
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
  invalid_patterns: [
    'A transcript with no audio source.',
    'A temporary or expiring audio URL embedded in the template.',
    'Questions whose answers depend on information that is not actually said or reasonably inferred.',
    'Five near-identical detail questions about isolated vocabulary.',
    'An A1 audio written like a formal C1 article and merely read aloud.',
    'Correct answers exposed in prompt, instructions, or transcript configured as always when that makes the task trivial.',
    'A listening activity whose primary_skill is changed to reading, grammar or speaking.',
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
