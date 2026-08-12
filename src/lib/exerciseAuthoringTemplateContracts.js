export const EXERCISE_AUTHORING_CONTRACT_VERSION = 1;

const clone = (value) => JSON.parse(JSON.stringify(value));

const COMMON_PEDAGOGICAL_RULES = [
  'Write natural, contemporary English that a learner could actually use; do not create awkward sentences only to display a grammar form.',
  'Match vocabulary, sentence length, task complexity and metalanguage to the requested CEFR level.',
  'For Italian learners, prioritise genuinely likely transfer errors when relevant, but do not invent mistakes merely to populate diagnostics.',
  'Use Italian for learner-facing explanations and instructions by default unless the requested material explicitly requires English-only instructions.',
  'Keep target-language examples in English. Add Italian only when it genuinely supports comprehension or the task requires translation.',
  'Avoid repetitive, mechanical or exam-book phrasing unless the user explicitly requests exam-style practice.',
  'Make distractors plausible and pedagogically diagnostic, not silly or obviously wrong.',
  'Keep one clear learning objective per question or tightly coherent exercise section.',
  'Do not encode visual design in content: no HTML, CSS classes, colours, layout instructions or decorative symbols.',
  'Do not expose model answers, correct-answer flags or teacher notes in learner-facing prompt text.',
];

const METADATA_RULES = [
  'client_key must be stable, descriptive, unique within the returned JSON and use lowercase snake_case.',
  'level must reflect the actual linguistic and cognitive demand of the item, not the topic alone.',
  'topic and subtopic should be concise machine-friendly identifiers, preferably lowercase snake_case.',
  'primary_skill must describe the skill actually being tested or taught.',
  'learning_objective must state what the learner should be able to do after the item, not merely name a grammar point.',
  'tags should help later filtering; keep them concise and avoid duplicating every metadata field as a tag.',
  'foundation_links should remain an empty array unless the user supplies valid existing Foundation references.',
];

const DIAGNOSTIC_RULES = [
  'Do not invent diagnostic codes unless the user supplies approved codes or they are already present in the downloaded template.',
  'If you do not know a registered diagnostic code, use diagnostics.tested_codes = [] and diagnostics.fallback_error_code = null.',
  'Attach an option-level or answer-level error_code only when the wrong answer maps unambiguously to one known misconception.',
  'Do not use a diagnostic code as a substitute for learner feedback or explanation.',
];

const GRADING_RULES = [
  'Automatic question types must have an objectively determinable answer in content.',
  'Manual production types must use grading.mode = manual_review and include a usable rubric.',
  'Do not mark more than one option correct in single-answer multiple_choice or dialogue_choice tasks.',
  'For nearly-correct matching, preserve the template multiplier unless the user explicitly requests different scoring behaviour.',
  'Do not add hidden scoring rules outside the supported grading fields shown in the template.',
];

const QUESTION_CONTRACTS = {
  multiple_choice: {
    purpose: 'Test one clearly defined choice with exactly one correct option.',
    required_content: ['options'],
    rules: [
      'Provide at least 2 distinct options; 3-4 is usually preferable.',
      'Exactly one option must have is_correct = true.',
      'Every option needs a stable key and learner-facing text.',
      'Wrong options should represent plausible errors or alternatives at the target level.',
      'Do not reveal the answer in the prompt, option ordering or wording.',
    ],
  },
  multiple_select: {
    purpose: 'Test recognition of two or more correct choices among plausible alternatives.',
    required_content: ['options'],
    rules: [
      'Provide at least 3 distinct options.',
      'Use more than one correct option; otherwise use multiple_choice.',
      'Make the selection criterion explicit in the prompt.',
      'Each option must be independently judgeable as correct or incorrect.',
    ],
  },
  gap_fill: {
    purpose: 'Elicit one or more open-text answers inside a sentence, dialogue or short text.',
    required_content: ['text_template', 'blanks'],
    rules: [
      'Every [[blank_key]] marker in text_template must have one matching blanks entry and every blanks entry must appear in the template.',
      'accepted_answers must include all clearly valid forms that the task intends to accept.',
      'Avoid a gap whose surrounding context allows several unrelated answers unless all intended answers are accepted.',
      'Keep punctuation outside the blank when possible so punctuation differences do not create false errors.',
      'Use answer_error_mappings only for known, unambiguous errors.',
    ],
  },
  select_gap: {
    purpose: 'Elicit one or more answers from a controlled set inside a sentence, dialogue or short text.',
    required_content: ['text_template', 'blanks'],
    rules: [
      'Every [[blank_key]] marker must map one-to-one to a blanks entry.',
      'Every blank needs options and accepted_answers.',
      'Every accepted answer must also be available in options.',
      'Distractor options should target likely confusion and remain grammatically comparable to the answer.',
    ],
  },
  translation: {
    purpose: 'Elicit a natural translation rather than a word-for-word substitution.',
    required_content: ['accepted_answers'],
    rules: [
      'State the source text clearly in the prompt.',
      'Include the main natural target-language variants in accepted_answers.',
      'Do not accept structurally different answers that change the intended meaning, tense, register or pragmatic function.',
      'Prefer a short focused translation if automatic grading is used.',
    ],
  },
  error_correction: {
    purpose: 'Ask the learner to identify and repair a targeted language error.',
    required_content: ['accepted_answers'],
    rules: [
      'The prompt must contain an actually incorrect sentence or passage.',
      'Prefer one primary correction target unless the user explicitly asks for multi-error editing.',
      'accepted_answers must contain the corrected natural form or forms.',
      'Do not introduce a new wording that avoids rather than corrects the target error unless it is intentionally accepted.',
    ],
  },
  word_order: {
    purpose: 'Build a sentence by ordering a fixed multiset of tokens.',
    required_content: ['tokens', 'correct_order'],
    rules: [
      'tokens and correct_order must contain exactly the same token values with the same multiplicities.',
      'Repeated words must be repeated in both arrays; do not deduplicate them.',
      'Put final sentence punctuation in terminal_punctuation instead of attaching it to the last token.',
      'Capitalisation differences should not be used to give away the first token unless pedagogically necessary.',
      'The final correct_order must form a natural sentence.',
    ],
  },
  content_block: {
    purpose: 'Provide a simple non-graded instruction, context or legacy teaching block.',
    required_content: ['body'],
    rules: [
      'Use this simple body form for concise instructions or compatibility content.',
      'For new grammar, vocabulary or functional-language teaching pages with rules/examples, prefer the dedicated educational_content_block template.',
      'Keep body concise and learner-facing; do not place answer keys or teacher notes inside it.',
    ],
  },
  dialogue_choice: {
    purpose: 'Test the most appropriate response inside a realistic exchange.',
    required_content: ['scenario', 'turns', 'response_prompt', 'options'],
    rules: [
      'Make dialogue turns respond naturally to each other and keep speaker roles consistent.',
      'Exactly one option must be the best response in the stated context.',
      'Wrong options should be plausible in form but wrong in meaning, register or conversational fit.',
      'Avoid artificial dialogues that exist only to repeat the target grammar.',
    ],
  },
  reading_comprehension: {
    purpose: 'Assess comprehension of an original teaching text through multiple item types.',
    required_content: ['passage', 'items'],
    rules: [
      'The passage must contain enough evidence to answer every item without outside knowledge.',
      'Use original or clearly licensed teaching text; do not reproduce copyrighted source passages.',
      'Mix main-idea, detail and inference only when appropriate to the requested level.',
      'For choice items, mark the correct option with is_correct; for short_answer, provide accepted_answers.',
      'Do not make distractors contradict basic world knowledge more obviously than they contradict the text.',
    ],
  },
  written_response: {
    purpose: 'Elicit extended written production for teacher review.',
    required_content: ['context', 'min_words', 'max_words', 'required_points', 'rubric'],
    rules: [
      'Give a realistic communicative context, audience and purpose.',
      'required_points must define observable task requirements rather than vague advice.',
      'Set a word range appropriate to CEFR level and task complexity.',
      'Rubric max_points should add up to the intended grading weight.',
      'model_answer may remain empty in an authoring template unless the user explicitly asks for one.',
    ],
  },
  dialogue_roleplay: {
    purpose: 'Elicit learner-generated turns in a realistic interactive scenario for teacher review.',
    required_content: ['scenario', 'response_mode', 'characters', 'turns', 'rubric'],
    rules: [
      'Define at least two characters and make selectable roles explicit.',
      'Each turn needs a stable key and speaker that matches a defined character.',
      'Learner-response turns need a usable prompt or guidance; non-learner turns need natural text.',
      'The interaction should progress: each turn must react to information from previous turns.',
      'Do not require language that makes only one exact sentence possible unless that is the explicit target.',
    ],
  },
  dialogue_roleplay_audio_per_turn: {
    purpose: 'Elicit one recorded response for each learner turn in an interactive roleplay.',
    required_content: ['scenario', 'response_mode', 'characters', 'turns', 'rubric'],
    rules: [
      'response_mode must remain audio_per_turn.',
      'Every learner-response turn must include constraints with max_seconds and should include min_seconds when a minimum response length matters.',
      'Use required_points for communicative content, recommended_language for optional scaffolding, and required_language only when an exact chunk is genuinely required.',
      'Avoid over-constraining learner turns; the learner should still be able to produce an original natural response.',
      'retry_hint should help improve a second attempt without giving a full model answer.',
    ],
  },
  audio_response: {
    purpose: 'Elicit a recorded spoken response for teacher review.',
    required_content: ['context', 'min_seconds', 'max_seconds', 'rubric'],
    rules: [
      'Prompt a specific communicative task rather than simply saying speak about a topic.',
      'Set realistic duration limits for the target CEFR level.',
      'Rubric criteria should assess observable speaking performance such as task achievement, fluency, accuracy, interaction or pronunciation.',
      'model_transcript may remain empty unless the user explicitly requests a model.',
    ],
  },
};

const ENTITY_CONTRACTS = {
  question: {
    purpose: 'Generate one import-ready Exercise Builder question.',
    rules: [
      'Return exactly one top-level question object under question.',
      'Keep question.type unchanged; if a different interaction is required, start from the matching downloaded question template instead.',
      'Preserve the structural fields required by the question-type contract.',
    ],
  },
  question_pool: {
    purpose: 'Generate an import-ready reusable pool of questions.',
    rules: [
      'Keep pool.questions and pool.question_refs valid arrays.',
      'Use embedded questions when the pool should be self-contained; use question_refs only for known client_keys supplied in the same workflow.',
      'Every embedded question client_key must be unique within the pool.',
      'Keep all questions pedagogically coherent with the pool level, topic and purpose even if they use different interaction types.',
    ],
  },
  exercise: {
    purpose: 'Generate an import-ready multi-section exercise.',
    rules: [
      'Every section needs a unique client_key, title, selection_mode and feedback_timing.',
      'Use embedded questions for a self-contained exercise; use question_refs only when valid existing client_keys are known.',
      'Keep question_refs and embedded questions mutually coherent with the section selection_mode.',
      'Order sections pedagogically: context/teaching before controlled practice, controlled practice before freer production when those stages are present.',
      'estimated_minutes should reflect actual learner workload, not an arbitrary default.',
    ],
  },
  guided_exercise: {
    purpose: 'Generate an explanation-first exercise that moves from teaching input into scaffolded practice.',
    rules: [
      'Keep the first activity non-graded teaching or context before graded practice.',
      'For new substantial teaching content, use the structured educational content_block contract rather than one long legacy body.',
      'Move from comprehension/recognition toward controlled production; add freer production only when appropriate to the requested level and lesson goal.',
      'Immediate question_end feedback is appropriate for scaffolded practice unless the user requests another feedback rhythm.',
    ],
  },
  bundle: {
    purpose: 'Generate a self-contained import bundle with reusable questions, pools and exercises.',
    rules: [
      'All client_keys must be unique within their entity scope.',
      'Every question_ref must point to a question client_key defined in the same bundle unless the user explicitly supplies an existing external reference.',
      'Every pool or exercise reference must remain valid after editing or renaming client_keys.',
      'Do not duplicate the same full question both as an embedded copy and a reference unless the duplication is intentional.',
      'Keep the bundle internally coherent enough to import without access to another chat or hidden instructions.',
    ],
  },
};

const INVALID_PATTERNS = [
  'Markdown fences around the JSON output.',
  'Comments inside JSON.',
  'Renaming schema keys or inventing unsupported structural fields.',
  'HTML, CSS, visual layout instructions or colour names embedded in pedagogical content.',
  'Invented diagnostic codes when the registered code list is unknown.',
  'Correct answers exposed directly in learner instructions.',
  'Duplicate client_key values inside one returned template.',
  'Exercises or pools with references to client_keys that are not defined or explicitly supplied.',
  'Language examples that are grammatically convenient but unnatural in real communication.',
];

function templatePurpose(key, entityType, questionType) {
  if (key === 'guided_exercise') return ENTITY_CONTRACTS.guided_exercise.purpose;
  if (key === 'bundle') return ENTITY_CONTRACTS.bundle.purpose;
  if (entityType === 'question' && questionType) return QUESTION_CONTRACTS[questionType]?.purpose || ENTITY_CONTRACTS.question.purpose;
  return ENTITY_CONTRACTS[entityType]?.purpose || 'Generate an import-ready Sblocco Inglese Exercise Builder JSON object.';
}

function invariantFields(key, entityType) {
  const base = ['schema_version', 'entity_type', '_template'];
  if (entityType === 'question') return [...base, 'question.type'];
  if (entityType === 'question_pool') return [...base, 'pool'];
  if (entityType === 'exercise') return [...base, 'exercise'];
  if (key === 'bundle') return [...base, 'questions', 'pools', 'exercises'];
  return base;
}

function editableFields(key, entityType) {
  if (entityType === 'question') {
    return [
      'question.client_key', 'question.title', 'question.prompt', 'question.instructions', 'question.instruction_language',
      'question.level', 'question.topic', 'question.subtopic', 'question.primary_skill', 'question.learning_objective',
      'question.difficulty', 'question.content', 'question.grading', 'question.feedback', 'question.diagnostics',
      'question.tags', 'question.foundation_links',
    ];
  }
  if (entityType === 'question_pool') return ['pool.client_key', 'pool.name', 'pool.description', 'pool.level', 'pool.topic', 'pool.primary_skill', 'pool.tags', 'pool.foundation_links', 'pool.questions', 'pool.question_refs'];
  if (entityType === 'exercise') return ['exercise.client_key', 'exercise.title', 'exercise.description', 'exercise.instructions', 'exercise.instruction_language', 'exercise.level', 'exercise.topic', 'exercise.estimated_minutes', 'exercise.settings', 'exercise.sections', 'exercise.tags', 'exercise.foundation_links'];
  if (key === 'bundle') return ['questions', 'pools', 'exercises'];
  return [];
}

export function buildExerciseAuthoringContract({ key, entityType, template }) {
  const questionType = entityType === 'question'
    ? (key === 'dialogue_roleplay_audio_per_turn' ? 'dialogue_roleplay_audio_per_turn' : template?.question?.type)
    : null;
  const entityContractKey = key === 'guided_exercise' ? 'guided_exercise' : key === 'bundle' ? 'bundle' : entityType;
  const entityContract = ENTITY_CONTRACTS[entityContractKey] || ENTITY_CONTRACTS[entityType];
  const questionContract = questionType ? QUESTION_CONTRACTS[questionType] : null;

  return {
    template_id: `exercise-builder-${key}-authoring-v1`,
    template_version: EXERCISE_AUTHORING_CONTRACT_VERSION,
    template_key: key,
    entity_type: entityType,
    question_type: questionType,
    purpose: templatePurpose(key, entityType, questionType),
    workflow: [
      'Read this entire _template object before editing the example payload.',
      'Use the example payload as a structural reference, then replace its pedagogical content with the material requested by the user.',
      'Return one complete JSON object with the same top-level structure and no prose before or after it.',
      'Keep _template unchanged in the returned JSON so the file remains self-contained when reused in another chat.',
      'Before returning, run the validation_checklist mentally and fix every failed item.',
    ],
    generation_contract: {
      output: 'valid_json_only',
      markdown_fences: false,
      comments: false,
      preserve_top_level_metadata: true,
      preserve_authoring_contract: true,
      do_not_rename_keys: true,
      invariant_fields: invariantFields(key, entityType),
      editable_fields: editableFields(key, entityType),
    },
    entity_contract: clone(entityContract),
    question_contract: questionContract ? clone(questionContract) : null,
    common_pedagogical_rules: clone(COMMON_PEDAGOGICAL_RULES),
    metadata_rules: clone(METADATA_RULES),
    diagnostics_rules: clone(DIAGNOSTIC_RULES),
    grading_rules: clone(GRADING_RULES),
    validation_checklist: [
      'The result parses as strict JSON and contains no markdown fences or comments.',
      'schema_version, entity_type, _template and the entity root are still present.',
      'All client_key values in the returned object are stable-format and non-duplicated.',
      'Every learner-facing instruction is clear at the requested level and does not reveal hidden answers.',
      'Every answer, accepted answer, correct option and rubric is internally consistent with the prompt.',
      'Every reference points to a defined or explicitly supplied client_key.',
      'No unverified diagnostic code has been invented.',
      'The English is natural, contemporary and appropriate to the communicative situation.',
      'The requested pedagogical objective can be inferred from the actual task, not only from metadata.',
    ],
    invalid_patterns: clone(INVALID_PATTERNS),
  };
}

export function makeSelfContainedExerciseTemplate(key, template, manifestItem = null) {
  const source = clone(template);
  const { schema_version, entity_type, _template: existingTemplate, ...payload } = source;
  const authoring = existingTemplate || buildExerciseAuthoringContract({
    key,
    entityType: entity_type || manifestItem?.entityType || 'question',
    template: source,
  });

  return {
    schema_version,
    entity_type,
    _template: authoring,
    ...payload,
  };
}

export function makeSelfContainedExerciseTemplates(templates, manifest) {
  return Object.fromEntries(Object.entries(templates).map(([key, template]) => {
    const manifestItem = manifest.find((item) => item.key === key) || null;
    return [key, makeSelfContainedExerciseTemplate(key, template, manifestItem)];
  }));
}
