import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = 'content/recovery/curriculum-v2/fragments';
const curriculumPath = 'content/recovery/curriculum-years-1-3.json';

const outcomeMap = {
  'present-simple': { 1: ['RY1-GRAM-002'], 2: ['RY2-GRAM-001', 'RY2-GRAM-002'] },
  'present-continuous': { 1: ['RY1-GRAM-002'], 2: ['RY2-GRAM-001', 'RY2-GRAM-002'] },
  'present-simple-vs-present-continuous': { 1: ['RY1-GRAM-002'], 2: ['RY2-GRAM-001'] },
  'past-simple': { 1: ['RY1-GRAM-003'], 2: ['RY2-GRAM-001', 'RY2-GRAM-002'], 3: ['RY3-GRAM-001', 'RY3-GRAM-006'] },
  'irregular-verbs': { 1: ['RY1-GRAM-003'], 2: ['RY2-GRAM-001'], 3: ['RY3-GRAM-001', 'RY3-GRAM-003'] },
  'past-continuous': { 2: ['RY2-GRAM-001'], 3: ['RY3-GRAM-001'] },
  'present-perfect': { 2: ['RY2-GRAM-001', 'RY2-GRAM-002'], 3: ['RY3-GRAM-003'] },
  'past-simple-vs-present-perfect': { 2: ['RY2-GRAM-001'], 3: ['RY3-GRAM-003'] },
  'future-forms': { 1: ['RY1-GRAM-004'], 2: ['RY2-GRAM-001', 'RY2-GRAM-003'] },
  'will': { 1: ['RY1-GRAM-004'], 2: ['RY2-GRAM-001', 'RY2-GRAM-003'] },
  'going-to': { 1: ['RY1-GRAM-004'], 2: ['RY2-GRAM-001', 'RY2-GRAM-003'] },
  'present-continuous-future': { 1: ['RY1-GRAM-004'], 2: ['RY2-GRAM-001'] },
  'comparatives': { 1: ['RY1-GRAM-006'], 2: ['RY2-GRAM-005'] },
  'superlatives': { 1: ['RY1-GRAM-006'], 2: ['RY2-GRAM-005'] },
  'modal-verbs': { 1: ['RY1-GRAM-007'], 2: ['RY2-GRAM-002', 'RY2-GRAM-003'], 3: ['RY3-GRAM-004'] },
  'countable-uncountable': { 1: ['RY1-GRAM-005'], 2: ['RY2-GRAM-005'] },
  'some-any': { 1: ['RY1-GRAM-005'], 2: ['RY2-GRAM-005'] },
  'much-many-a-lot-of': { 1: ['RY1-GRAM-005'], 2: ['RY2-GRAM-005'] },
  'articles': { 1: ['RY1-GRAM-001', 'RY1-GRAM-005'], 2: ['RY2-GRAM-004', 'RY2-GRAM-005'], 3: ['RY3-GRAM-005', 'RY3-GRAM-007'] },
  'pronouns': { 1: ['RY1-GRAM-001', 'RY1-GRAM-005'], 2: ['RY2-GRAM-004', 'RY2-GRAM-005'], 3: ['RY3-GRAM-005', 'RY3-GRAM-006', 'RY3-GRAM-007'] },
  'possessives': { 1: ['RY1-GRAM-001', 'RY1-GRAM-005'], 2: ['RY2-GRAM-004', 'RY2-GRAM-005'] },
  'prepositions': { 1: ['RY1-GRAM-006'], 2: ['RY2-GRAM-004'], 3: ['RY3-GRAM-005', 'RY3-GRAM-007'] },
  'question-formation': { 1: ['RY1-GRAM-001'], 2: ['RY2-GRAM-002'], 3: ['RY3-GRAM-006', 'RY3-GRAM-007'] },
  'negatives': { 1: ['RY1-GRAM-001'], 2: ['RY2-GRAM-002'], 3: ['RY3-GRAM-007'] },
};

const sg = (text, blanks, subskills, objective) => ({ kind: 'select_gap', text, blanks, subskills, objective });
const ec = (prompt, answers, subskill, objective) => ({ kind: 'error_correction', prompt, answers, subskills: [subskill], objective });

const topicSpecs = {
  'present-simple': {
    a: sg('1) My parents [[blank_1]] in Modena. 2) My brother [[blank_2]] to school there every day.', [
      { answer: 'live', options: ['live', 'are living', 'lived'] },
      { answer: 'goes', options: ['goes', 'is going', 'went'] },
    ], ['routine_fact', 'third_person_singular'], 'Use the base form and third-person singular in stable routines and facts.'),
    b: ec('Correggi: «Does Marta walks to school every day?»', ['Does Marta walk to school every day?'], 'auxiliary_base_form', 'Keep the base verb after does.'),
  },
  'present-continuous': {
    a: sg('1) Be quiet — Tom [[blank_1]] for his test right now. 2) This month, we [[blank_2]] with my aunt while our flat is being repaired.', [
      { answer: 'is studying', options: ['studies', 'is studying', 'studied'] },
      { answer: 'are staying', options: ['stay', 'are staying', 'stayed'] },
    ], ['action_now', 'temporary_situation'], 'Use the ongoing form for actions now and temporary situations.'),
    b: ec('Correggi: «What you are doing at the moment?»', ['What are you doing at the moment?'], 'question_word_order', 'Build an ongoing-action question with correct auxiliary order.'),
  },
  'present-simple-vs-present-continuous': {
    a: sg('Marta usually [[blank_1]] to school by bus, but today she [[blank_2]] because the buses are on strike.', [
      { answer: 'goes', options: ['goes', 'is going', 'went'] },
      { answer: 'is cycling', options: ['cycles', 'is cycling', 'cycled'] },
    ], ['routine_vs_now', 'contextual_form_choice'], 'Distinguish a routine from what is happening today.'),
    b: ec('Correggi: «My uncle works in Rome, but this month he works in Milan for a project.»', ['My uncle works in Rome, but this month he is working in Milan for a project.'], 'permanent_vs_temporary', 'Distinguish a stable situation from a temporary one.'),
  },
  'past-simple': {
    a: sg('1) Yesterday we [[blank_1]] the new film after school. 2) What time [[blank_2]] the film start?', [
      { answer: 'saw', options: ['saw', 'seen', 'see'] },
      { answer: 'did', options: ['did', 'was', 'has'] },
    ], ['completed_past', 'past_question_auxiliary'], 'Use a completed-past form and did in a past question.'),
    b: ec('Correggi: «I didn’t went to training last night.»', ["I didn't go to training last night.", 'I did not go to training last night.'], 'negative_base_form', 'Keep the base verb after did not.'),
  },
  'irregular-verbs': {
    a: sg('1) Last Saturday Maya [[blank_1]] a new jacket. 2) She has already [[blank_2]] it twice.', [
      { answer: 'bought', options: ['bought', 'buyed', 'buy'] },
      { answer: 'worn', options: ['wore', 'worn', 'wear'] },
    ], ['irregular_past', 'irregular_participle'], 'Choose high-frequency irregular past and participle forms from context.'),
    b: ec('Correggi: «Have you ever saw snow in August?»', ['Have you ever seen snow in August?'], 'past_vs_participle', 'Use the irregular participle after have.'),
  },
  'past-continuous': {
    a: sg('1) At 8 last night I [[blank_1]] my homework. 2) When the lights went out, my parents [[blank_2]] dinner.', [
      { answer: 'was doing', options: ['did', 'was doing', 'have done'] },
      { answer: 'were cooking', options: ['cooked', 'were cooking', 'are cooking'] },
    ], ['action_in_progress_at_past_time', 'background_action'], 'Use an action-in-progress form for a past time and background action.'),
    b: ec('Correggi: «She wasn’t listen when the teacher explained the task.»', ["She wasn't listening when the teacher explained the task.", 'She was not listening when the teacher explained the task.'], 'negative_ing_form', 'Build the negative ongoing-past form correctly.'),
  },
  'present-perfect': {
    a: sg('1) [[blank_1]] you ever tried sushi? 2) I [[blank_2]] my keys, so I can’t open the door. 3) We [[blank_3]] here since 2022.', [
      { answer: 'Have', options: ['Have', 'Did', 'Do'] },
      { answer: 'have lost', options: ['lost', 'have lost', 'am losing'] },
      { answer: 'have lived', options: ['lived', 'have lived', 'are living'] },
    ], ['life_experience', 'recent_result', 'unfinished_time'], 'Use experience, present result and unfinished-time meanings from context.'),
    b: ec('Correggi: «She has went home, so she isn’t here now.»', ["She has gone home, so she isn't here now.", 'She has gone home, so she is not here now.'], 'participle_form', 'Use the participle after has.'),
  },
  'past-simple-vs-present-perfect': {
    a: sg('1) I [[blank_1]] London in 2024. 2) I [[blank_2]] London three times.', [
      { answer: 'visited', options: ['visited', 'have visited', 'visit'] },
      { answer: 'have visited', options: ['visited', 'have visited', 'am visiting'] },
    ], ['finished_time', 'experience_without_finished_time'], 'Distinguish a finished past time from experience without a finished time.'),
    b: ec('Correggi: «Have you seen Marco yesterday?»', ['Did you see Marco yesterday?'], 'finished_time_marker', 'Use a finished-past form with yesterday.'),
  },
  'future-forms': {
    a: sg('1) The phone’s ringing — I [[blank_1]] it. 2) Look at those black clouds. It [[blank_2]]. 3) We [[blank_3]] the teacher at 4; the appointment is in the calendar.', [
      { answer: 'will answer', options: ['will answer', 'am going to answer', 'am answering'] },
      { answer: 'is going to rain', options: ['will rain', 'is going to rain', 'is raining'] },
      { answer: 'are meeting', options: ['will meet', 'are going to meet', 'are meeting'] },
    ], ['instant_decision', 'evidence_prediction', 'fixed_arrangement'], 'Choose a future form from the meaning of the context.'),
    b: ec('Correggi: «We are meet Sara at six tomorrow; it’s in the calendar.»', ["We are meeting Sara at six tomorrow; it's in the calendar.", 'We are meeting Sara at six tomorrow; it is in the calendar.'], 'arrangement_form', 'Build a fixed-arrangement form correctly.'),
  },
  'will': {
    a: sg('1) I think our team [[blank_1]] tomorrow. 2) Don’t worry, I [[blank_2]] you with those bags.', [
      { answer: 'will win', options: ['will win', 'is winning', 'won'] },
      { answer: 'will help', options: ['will help', 'am helping', 'helped'] },
    ], ['prediction', 'offer'], 'Use the form for a prediction and an immediate offer.'),
    b: ec('Correggi: «I will to call you after class.»', ['I will call you after class.'], 'modal_base_form', 'Use the base verb after will.'),
  },
  'going-to': {
    a: sg('1) I bought the paint yesterday. I [[blank_1]] my room this weekend. 2) Look at that glass! It [[blank_2]].', [
      { answer: 'am going to repaint', options: ['will repaint', 'am going to repaint', 'repainted'] },
      { answer: 'is going to fall', options: ['will fall', 'is going to fall', 'falls'] },
    ], ['prior_intention', 'evidence_prediction'], 'Use an intention already formed and an evidence-based prediction.'),
    b: ec('Correggi: «She going to apply for the course next week.»', ['She is going to apply for the course next week.'], 'be_going_to_form', 'Include the correct form of be.'),
  },
  'present-continuous-future': {
    a: sg('1) We [[blank_1]] to Paris on Friday; the tickets are booked. 2) I [[blank_2]] the dentist at three tomorrow; it’s in my calendar.', [
      { answer: 'are flying', options: ['will fly', 'are flying', 'fly'] },
      { answer: 'am seeing', options: ['will see', 'am seeing', 'see'] },
    ], ['travel_arrangement', 'appointment_arrangement'], 'Use fixed arrangements with explicit future time.'),
    b: ec('Correggi: «What time you are meeting Luca tomorrow?»', ['What time are you meeting Luca tomorrow?'], 'arrangement_question_order', 'Build a question about a fixed arrangement.'),
  },
  'comparatives': {
    a: sg('1) This test is [[blank_1]] than the last one. 2) My new phone is [[blank_2]] than the old one.', [
      { answer: 'easier', options: ['easier', 'more easy', 'easiest'] },
      { answer: 'more reliable', options: ['reliabler', 'more reliable', 'most reliable'] },
    ], ['short_adjective_form', 'long_adjective_form'], 'Build short- and long-adjective comparisons from context.'),
    b: ec('Correggi: «This result is gooder than the last one.»', ['This result is better than the last one.'], 'irregular_comparative', 'Use an irregular comparative form.'),
  },
  'superlatives': {
    a: sg('1) Mount Everest is [[blank_1]] mountain in the world. 2) This is [[blank_2]] book in the series.', [
      { answer: 'the highest', options: ['higher', 'the highest', 'the most high'] },
      { answer: 'the most interesting', options: ['more interesting', 'the most interesting', 'the interestingest'] },
    ], ['short_adjective_superlative', 'long_adjective_superlative'], 'Build superlatives with the correct form and article.'),
    b: ec('Correggi: «It was the goodest day of the holiday.»', ['It was the best day of the holiday.'], 'irregular_superlative', 'Use an irregular superlative form.'),
  },
  'modal-verbs': {
    a: sg('1) You [[blank_1]] wear a helmet here — it’s compulsory. 2) You [[blank_2]] talk to your teacher if you’re worried. 3) It [[blank_3]] rain later, so take a jacket.', [
      { answer: 'must', options: ['must', 'should', 'might'] },
      { answer: 'should', options: ['must', 'should', 'might'] },
      { answer: 'might', options: ['must', 'should', 'might'] },
    ], ['obligation', 'advice', 'possibility'], 'Choose a modal from obligation, advice and possibility meanings.'),
    b: ec('Correggi: «She can to swim very well.»', ['She can swim very well.'], 'modal_plus_base', 'Keep the base verb after a modal.'),
  },
  'countable-uncountable': {
    a: sg('1) There are three [[blank_1]] in the waiting room. 2) There isn’t much [[blank_2]] on the notice.', [
      { answer: 'chairs', options: ['chair', 'chairs', 'furniture'] },
      { answer: 'information', options: ['informations', 'information', 'messages'] },
    ], ['countable_plural', 'uncountable_noun'], 'Distinguish common countable and uncountable nouns.'),
    b: ec('Correggi: «I need an advice about the exam.»', ['I need some advice about the exam.', 'I need a piece of advice about the exam.'], 'article_quantifier_compatibility', 'Avoid an indefinite article directly before an uncountable noun.'),
  },
  'some-any': {
    a: sg('1) There are [[blank_1]] biscuits on the table. 2) We don’t have [[blank_2]] milk.', [
      { answer: 'some', options: ['some', 'any', 'much'] },
      { answer: 'any', options: ['some', 'any', 'many'] },
    ], ['affirmative_some', 'negative_any'], 'Choose basic quantity words in affirmative and negative contexts.'),
    b: ec('Correggi: «We don’t have some clean glasses.»', ["We don't have any clean glasses.", 'We do not have any clean glasses.'], 'negative_any_control', 'Use the normal negative quantity form.'),
  },
  'much-many-a-lot-of': {
    a: sg('1) How [[blank_1]] students are in your class? 2) We don’t have [[blank_2]] time before the bus leaves.', [
      { answer: 'many', options: ['much', 'many', 'a lot'] },
      { answer: 'much', options: ['much', 'many', 'a lot'] },
    ], ['many_plural_countable', 'much_uncountable'], 'Match quantity words to plural countable and uncountable nouns.'),
    b: ec('Correggi: «How much students are absent today?»', ['How many students are absent today?'], 'question_quantifier_compatibility', 'Use the countable quantity form in a question.'),
  },
  'articles': {
    a: sg('I saw [[blank_1]] dog outside the station. [[blank_2]] dog was waiting by the gate.', [
      { answer: 'a', options: ['a', 'an', 'the'] },
      { answer: 'The', options: ['A', 'The', '—'] },
    ], ['first_mention', 'specific_reference'], 'Distinguish first mention from an already identified noun.'),
    b: ec('Correggi: «She is a student and she goes to the school every weekday.»', ['She is a student and she goes to school every weekday.'], 'zero_article_institution', 'Use zero article for school as the normal institution/activity.'),
  },
  'pronouns': {
    a: sg('1) Marta called [[blank_1]] after class. 2) [[blank_2]] are waiting for the bus outside.', [
      { answer: 'me', options: ['I', 'me', 'my'] },
      { answer: 'They', options: ['Them', 'They', 'Their'] },
    ], ['object_pronoun', 'subject_pronoun'], 'Choose subject and object pronouns from sentence position.'),
    b: ec('Nessuno ha insegnato a Luca. Correggi: «He taught him to play the guitar.»', ['He taught himself to play the guitar.'], 'reflexive_reference', 'Use a reflexive form when subject and object refer to the same person.'),
  },
  'possessives': {
    a: sg('1) This is [[blank_1]] notebook. 2) The blue notebook is [[blank_2]].', [
      { answer: 'my', options: ['me', 'my', 'mine'] },
      { answer: 'hers', options: ['her', 'hers', 'she'] },
    ], ['possessive_adjective', 'possessive_pronoun'], 'Distinguish a possessive determiner from a standalone possessive pronoun.'),
    b: ec('Correggi: «This is Maria bag.»', ["This is Maria's bag."], 'possessive_s', 'Mark possession with apostrophe-s.'),
  },
  'prepositions': {
    a: sg('1) The lesson starts [[blank_1]] nine. 2) Your keys are [[blank_2]] the desk, next to the laptop.', [
      { answer: 'at', options: ['at', 'on', 'in'] },
      { answer: 'on', options: ['at', 'on', 'in'] },
    ], ['time_preposition', 'place_preposition'], 'Choose common prepositions of time and place.'),
    b: ec('Correggi: «We arrived to school at eight.»', ['We arrived at school at eight.'], 'verb_preposition_combination', 'Use the normal preposition after arrive with a place.'),
  },
  'question-formation': {
    a: sg('1) Where [[blank_1]] your sister work? 2) [[blank_2]] you ready to leave?', [
      { answer: 'does', options: ['does', 'is', 'did'] },
      { answer: 'Are', options: ['Do', 'Are', 'Does'] },
    ], ['auxiliary_choice', 'be_question'], 'Choose the correct auxiliary and distinguish be questions from do-support.'),
    b: ec('Correggi: «What time did you arrived home?»', ['What time did you arrive home?'], 'did_base_form_order', 'Keep correct question order and the base verb after did.'),
  },
  'negatives': {
    a: sg('1) She [[blank_1]] coffee. 2) They [[blank_2]] at home today.', [
      { answer: "doesn't like", options: ["doesn't like", "isn't like", "doesn't likes"] },
      { answer: "aren't", options: ["don't", "aren't", "doesn't"] },
    ], ['do_negative', 'be_negative'], 'Build negatives with do-support and with be.'),
    b: ec('Correggi: «She not is ready for the test.»', ['She is not ready for the test.', "She isn't ready for the test."], 'not_placement', 'Place not correctly with be.'),
  },
};

const liveCurriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
const liveTopics = (liveCurriculum.topics || [])
  .filter((topic) => topic?.runtime_status === 'ready-for-content')
  .map((topic) => topic.key)
  .filter(Boolean)
  .sort();
const supportedTopics = Object.keys(topicSpecs).sort();
assert.deepEqual(supportedTopics, liveTopics, 'Checkpoint topic specs must exactly cover the current live Recovery topic catalogue.');
assert.deepEqual(Object.keys(outcomeMap).sort(), liveTopics, 'Every live topic needs an existing Curriculum-v2 evidence mapping.');

function genericQuestionBase(topicKey, formKey, spec) {
  const clientKey = `recovery_checkpoint_v1_${topicKey.replaceAll('-', '_')}_${formKey.toLowerCase()}_question`;
  const common = {
    client_key: clientKey,
    title: 'Parte',
    instructions: 'Leggi il contesto e scegli o produci la risposta più naturale.',
    instruction_language: 'it',
    level: 'A2',
    topic: topicKey,
    subtopic: spec.subskills.join('__'),
    primary_skill: 'grammar',
    learning_objective: spec.objective,
    difficulty: formKey === 'A' ? 'standard' : 'challenge',
    grading: { mode: 'automatic', weight: 1, nearly_correct_multiplier: 0.5 },
    feedback: {},
    diagnostics: { tested_codes: [], fallback_error_code: null },
    tags: ['recovery', 'mixed-checkpoint-v1', 'transfer', 'unlabelled'],
    foundation_links: [],
  };
  if (spec.kind === 'select_gap') {
    return {
      ...common,
      type: 'select_gap',
      prompt: spec.text,
      content: {
        text_template: spec.text,
        blanks: spec.blanks.map((blank, index) => ({
          key: `blank_${index + 1}`,
          accepted_answers: [blank.answer],
          options: blank.options,
          points: 1,
          feedback: {},
        })),
      },
    };
  }
  return {
    ...common,
    type: 'error_correction',
    prompt: spec.prompt,
    content: { accepted_answers: spec.answers },
  };
}

const exercises = [];
const fragments = [];
let fragmentNumber = 1;

for (const topicKey of liveTopics) {
  const profiles = Object.keys(outcomeMap[topicKey]).map(Number).sort((a, b) => a - b);
  const outcomeIds = [...new Set(Object.values(outcomeMap[topicKey]).flat())].sort();
  for (const formKey of ['A', 'B']) {
    const spec = topicSpecs[topicKey][formKey.toLowerCase()];
    const question = genericQuestionBase(topicKey, formKey, spec);
    const exerciseClientKey = `recovery_checkpoint_v1_${topicKey.replaceAll('-', '_')}_${formKey.toLowerCase()}`;
    const decisionCount = spec.kind === 'select_gap' ? spec.blanks.length : 1;
    const assessmentMode = spec.kind === 'error_correction' ? 'error_correction' : 'mixed_grammar';
    const schoolTaskFamily = spec.kind === 'error_correction' ? 'error_correction' : 'gap_or_open_cloze';
    const formFamilyKey = `checkpoint-v1-${topicKey}-${formKey.toLowerCase()}`;

    exercises.push({
      client_key: exerciseClientKey,
      title: 'Verifica mista · Parte',
      description: 'Una breve parte della verifica mista, senza indicazioni sulla regola da usare.',
      instructions: 'Completa la parte senza cercare il nome della regola. Le correzioni saranno disponibili solo dopo la consegna finale.',
      instruction_language: 'it',
      level: 'A2',
      topic: 'recovery-mixed-checkpoint-v1',
      estimated_minutes: 3,
      settings: {
        display_mode: 'one_at_a_time',
        feedback_timing: 'hidden',
        show_score: false,
        show_correct_answers: false,
        show_explanations: false,
        show_diagnostic_summary: false,
        allow_retry: false,
      },
      sections: [{
        client_key: `${exerciseClientKey}_section`,
        title: 'Completa la parte',
        instructions: 'Decidi tu quale struttura è adatta al contesto.',
        selection_mode: 'fixed',
        feedback_timing: 'hidden',
        questions: [question],
        question_refs: [],
        pool_rules: [],
      }],
      tags: ['recovery', 'mixed-checkpoint-v1', 'assessment-fragment', 'transfer'],
      foundation_links: [],
    });

    fragments.push({
      fragment_id: `RAF-RCPV1-${String(fragmentNumber).padStart(2, '0')}-${topicKey.toUpperCase()}-${formKey}`,
      status: 'approved',
      exercise_client_key: exerciseClientKey,
      year_profiles: profiles,
      primary_axis: 'grammar_sentence_control',
      secondary_axes: [],
      outcome_ids: outcomeIds,
      assessment_modes: [assessmentMode],
      estimated_minutes: 3,
      difficulty_band: 'A1+/B1',
      school_task_family: schoolTaskFamily,
      transfer_level: 'transfer',
      content_source_policy: 'unseen_original_for_recovery_mixed_checkpoint_v1',
      unseen_or_mixed_context: true,
      form_family_key: formFamilyKey,
      question_mappings: outcomeIds.map((outcomeId) => ({
        question_client_key: question.client_key,
        outcome_id: outcomeId,
        assessment_mode: assessmentMode,
        evidence_role: 'primary',
        production_evidence: spec.kind === 'error_correction',
        evidence_weight: 1,
      })),
      metadata: {
        launch_profile: 'h30_checkpoint_v1',
        runtime_profile: 'h30_checkpoint_v1',
        topic_keys: [topicKey],
        required_distinct_topics: 4,
        forms_per_topic: 2,
        scored_decisions: decisionCount,
        subskill_keys: spec.subskills,
        class_years: profiles,
        normal_budget_minutes: 24,
        feedback_policy: 'hidden_until_checkpoint_completion',
        target_rule_labels_visible: false,
      },
    });
    fragmentNumber += 1;
  }
}

const bundle = { schema_version: 2, entity_type: 'bundle', questions: [], pools: [], exercises };
const manifest = {
  schema_version: 1,
  manifest_id: 'recovery-mixed-checkpoint-v1',
  status: 'approved',
  fragments,
  metadata: {
    launch_profile: 'h30_checkpoint_v1',
    live_topic_count: liveTopics.length,
    supported_topic_count: liveTopics.length,
    supported_topic_keys: liveTopics,
    resource_count_per_checkpoint: 8,
    selected_topic_count: 4,
    forms_per_selected_topic: 2,
    scored_decisions_per_selected_topic_min: 3,
    scored_decisions_per_checkpoint_min: 12,
    scored_decisions_per_checkpoint_max: 16,
    estimated_minutes: 24,
    generated_from_current_live_recovery_catalogue: true,
  },
};

fs.writeFileSync(`${root}/mixed-checkpoint-v1.bundle.json`, `${JSON.stringify(bundle, null, 2)}\n`);
fs.writeFileSync(`${root}/mixed-checkpoint-v1.fragments.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated Recovery mixed checkpoint v1: ${liveTopics.length} live topics, ${fragments.length} fresh forms.`);
