import fs from 'node:fs';

const root = 'content/recovery/curriculum-v2/fragments';
const sourceBundle = JSON.parse(fs.readFileSync(`${root}/year-2-grammar-a.bundle.json`, 'utf8'));
const sourceManifest = JSON.parse(fs.readFileSync(`${root}/year-2-grammar-a.fragments.json`, 'utf8'));

const topicForms = [
  ['present-simple-vs-present-continuous', 'ry2_g1_a_1', 'ry2_g1_b_2'],
  ['past-continuous', 'ry2_g1_b_1', 'ry2_g1_b_4'],
  ['future-forms', 'ry2_g1_a_3', 'ry2_g1_b_3'],
  ['present-perfect', 'ry2_g1_a_5', 'ry2_g1_b_5'],
  ['question-formation', 'ry2_g2_a_1', 'ry2_g2_b_5'],
  ['countable-uncountable', 'ry2_g5_a_3', 'ry2_g5_b_5'],
  ['comparatives', 'ry2_g5_a_2', 'ry2_g5_b_2'],
  ['superlatives', 'ry2_g5_a_4', 'ry2_g5_b_3'],
];

const sourceQuestions = new Map();
for (const exercise of sourceBundle.exercises) {
  for (const section of exercise.sections || []) {
    for (const question of section.questions || []) {
      sourceQuestions.set(question.client_key, question);
    }
  }
}

const sourceMappings = new Map();
for (const fragment of sourceManifest.fragments) {
  for (const mapping of fragment.question_mappings || []) {
    sourceMappings.set(mapping.question_client_key, {
      mapping,
      primary_axis: fragment.primary_axis,
      outcome_ids: fragment.outcome_ids,
      assessment_modes: fragment.assessment_modes,
      school_task_family: fragment.school_task_family,
    });
  }
}

const exercises = [];
const fragments = [];
let fragmentNumber = 0;

for (const [topicKey, ...questionKeys] of topicForms) {
  for (const [formIndex, questionKey] of questionKeys.entries()) {
    const sourceQuestion = sourceQuestions.get(questionKey);
    const source = sourceMappings.get(questionKey);
    if (!sourceQuestion || !source) throw new Error(`Missing checkpoint source question: ${questionKey}`);

    fragmentNumber += 1;
    const suffix = String(fragmentNumber).padStart(2, '0');
    const form = formIndex === 0 ? 'a' : 'b';
    const clientKey = `recovery_checkpoint_v1_${topicKey.replaceAll('-', '_')}_${form}`;
    const questionClientKey = `${clientKey}_question`;
    const question = {
      ...sourceQuestion,
      client_key: questionClientKey,
      title: 'Parte',
      instructions: 'Leggi il contesto e scegli o produci la risposta più naturale.',
      topic: topicKey,
      feedback: {},
      diagnostics: { tested_codes: [], fallback_error_code: null },
      tags: ['recovery', 'mixed-checkpoint-v1', 'transfer', 'unlabelled'],
    };

    exercises.push({
      client_key: clientKey,
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
        client_key: `${clientKey}_section`,
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
      fragment_id: `RAF-H30-CHK-${suffix}`,
      status: 'approved',
      exercise_client_key: clientKey,
      year_profiles: [2],
      primary_axis: source.primary_axis,
      secondary_axes: [],
      outcome_ids: source.outcome_ids,
      assessment_modes: source.assessment_modes,
      estimated_minutes: 3,
      difficulty_band: 'A2/A2+',
      school_task_family: sourceQuestion.type,
      transfer_level: 'transfer',
      content_source_policy: 'curated_from_recovery_v2_unseen_original',
      unseen_or_mixed_context: true,
      form_family_key: `checkpoint-v1-${topicKey}-${form}`,
      metadata: {
        topic_keys: [topicKey],
        launch_profile: 'h30_checkpoint_v1',
        source_question_client_key: questionKey,
      },
      question_mappings: [{
        ...source.mapping,
        question_client_key: questionClientKey,
        metadata: { recovery_topic_key: topicKey },
      }],
    });
  }
}

const bundle = {
  schema_version: 2,
  entity_type: 'bundle',
  questions: [],
  pools: [],
  exercises,
};
const manifest = {
  schema_version: 1,
  manifest_id: 'recovery-mixed-checkpoint-v1',
  status: 'approved',
  metadata: {
    launch_profile: 'h30_checkpoint_v1',
    required_distinct_topics: 4,
    forms_per_topic: 2,
    normal_budget_minutes: 24,
  },
  fragments,
};

fs.writeFileSync(`${root}/mixed-checkpoint-v1.bundle.json`, `${JSON.stringify(bundle, null, 2)}\n`);
fs.writeFileSync(`${root}/mixed-checkpoint-v1.fragments.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${exercises.length} mixed-checkpoint exercises and ${fragments.length} approved fragments.`);
