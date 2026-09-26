import assert from 'node:assert/strict';
import {
  projectSpeakingRoundForLearner,
  validateSpeakingRoundBlock,
} from '../src/lib/speakingRoundContract.js';
import {
  compileStudioBlock,
  getStudioBlockDefinition,
  normalizeStudioBlock,
} from '../src/lib/exerciseStudioBlockRegistry.js';
import { createStudioDocument } from '../src/lib/exerciseStudioDocument.js';
import { preflightStudioDocument } from '../src/lib/exerciseStudioCompiler.js';

const fixtures = [
  {
    format: 'number_mission',
    title: 'Fix my booking',
    instructions: 'Book a table. Listen carefully when the restaurant checks your details.',
    outcome: 'The final booking matches the request.',
    material: { facts: [
      { label: 'People', value: 2, kind: 'quantity' },
      { label: 'Time', value: '19:00', display: '7 p.m.', kind: 'time' },
      { label: 'Day', value: 'Saturday', kind: 'weekday' },
    ] },
    teacher: { private_cue: 'Seven people at two p.m. on Saturday?', final_confirmation: 'Two people at seven p.m. on Saturday.' },
    support: ['A table for two, please.', 'Sorry, ..., not ...'],
    challenge: { text: 'One more friend wants to come.', reveal: 'teacher-controlled' },
    teacher_note: 'Observe whether the learner notices both mismatches.',
  },
  {
    format: 'picture_detective',
    title: 'Which one am I thinking of?',
    instructions: 'Ask questions, then choose your guess.',
    material: { show_labels: false, options: [
      { key: 'A', label: 'Camera', image_url: '/assets/speaking/camera.png', image_alt: 'A camera' },
      { key: 'B', label: 'Key', image_url: '/assets/speaking/key.png', image_alt: 'A key' },
      { key: 'C', label: 'Umbrella', image_url: '/assets/speaking/umbrella.png', image_alt: 'An umbrella' },
      { key: 'D', label: 'Headphones', image_url: '/assets/speaking/headphones.png', image_alt: 'Headphones' },
    ] },
    teacher: { secret_option_key: 'C' },
    support: ['Do you use it outside?', 'Can you put it in a pocket?'],
  },
  {
    format: 'explain_without_saying',
    title: 'A refund',
    instructions: 'Describe the target without saying it or any of the words below.',
    material: { target: 'A refund', forbidden_words: ['money', 'back', 'return'] },
    teacher: { model_response: 'A shop gives you the amount you paid because the product is faulty.' },
    support: ['You might ask for this when…'],
  },
  {
    format: 'conversation_detective',
    title: 'Read between the lines',
    instructions: 'Read the three lines and infer the situation.',
    material: {
      turns: [
        { speaker: 'Alex', text: 'You kept the receipt, right?' },
        { speaker: 'Sam', text: 'Yes. But I took the label off.' },
        { speaker: 'Alex', text: 'Let’s ask anyway.' },
      ],
      question: 'What are they probably going to ask?',
      follow_up: 'Choose a clue from the conversation to explain your idea.',
    },
    teacher: { hidden_clue: 'Sam takes a jumper out of a shopping bag.', interpretation: 'They may want to exchange or return a purchase.' },
    support: ['I think this because…'],
  },
  {
    format: 'make_the_choice',
    title: 'Where should we stay?',
    instructions: 'Choose a room and explain how you could both enjoy the evening.',
    material: {
      situation: 'You want a quiet night. Your friend wants dinner out. You have €120 for one room.',
      task: 'Choose a room and explain how you could both enjoy the evening.',
      options: [
        { key: 'lake', title: 'Lake cabin', details: [{ label: 'Price', value: '€90' }, { label: 'Advantage', value: 'Quiet, beside the lake' }, { label: 'Trade-off', value: 'Restaurants are 30 minutes away by bus' }] },
        { key: 'city', title: 'City room', details: [{ label: 'Price', value: '€110' }, { label: 'Advantage', value: 'Restaurants a short walk away' }, { label: 'Trade-off', value: 'Faces a busy street' }] },
      ],
    },
    teacher: { complication: 'The last bus back to the lake leaves at 6 p.m.', role_note: 'Friend who wants dinner out.' },
    support: ['We could…', 'What if we…?'],
  },
];

assert.ok(getStudioBlockDefinition('speaking_round'), 'speaking_round must be registered in the canonical Studio registry');

for (const fixture of fixtures) {
  const raw = {
    type: 'speaking_round',
    primary_skill: 'speaking',
    learning_objective: 'Complete the communicative task.',
    roles: [
      { key: 'learner', name: 'Learner', goal: 'Complete the task.', private_cue: '' },
      { key: 'teacher', name: 'Teacher', goal: 'Facilitate the task.', private_cue: 'PRIVATE ROLE CUE' },
    ],
    role_swap: { enabled: true, instruction: 'Swap roles and repeat with new information.' },
    ...fixture,
  };

  const normalized = normalizeStudioBlock(raw);
  assert.equal(normalized.format, fixture.format);
  assert.deepEqual(validateSpeakingRoundBlock(normalized), [], fixture.format + ' should validate');

  const learner = projectSpeakingRoundForLearner(normalized);
  const learnerJson = JSON.stringify(learner);
  assert.ok(!learnerJson.includes('PRIVATE ROLE CUE'), fixture.format + ' learner projection leaked a private role cue');
  if (normalized.teacher_note) assert.ok(!learnerJson.includes(normalized.teacher_note), fixture.format + ' learner projection leaked teacher notes');
  if (fixture.teacher) {
    for (const value of Object.values(fixture.teacher)) {
      if (typeof value === 'string' && value) assert.ok(!learnerJson.includes(value), fixture.format + ' learner projection leaked teacher-only content');
    }
  }

  const document = createStudioDocument({
    internal_title: fixture.title,
    learner_title: fixture.title,
    level: fixture.format === 'conversation_detective' || fixture.format === 'make_the_choice' ? 'A2' : fixture.format === 'explain_without_saying' ? 'B1' : 'A1',
    topic: 'speaking',
    activity_type: 'lesson',
  });
  document.blocks = [{ id: 'block_' + fixture.format, ...normalized }];
  const preflight = preflightStudioDocument(document);
  assert.equal(preflight.valid, true, fixture.format + ' should pass Studio preflight: ' + JSON.stringify(preflight.errors));
  const compiled = compileStudioBlock(normalized, {
    document: preflight.document,
    blockIndex: 0,
    clientKey: 'fixture_' + fixture.format,
  });
  assert.equal(compiled.type, 'content_block');
  assert.equal(compiled.content.presentation, 'speaking_round');
  assert.equal(compiled.grading.mode, 'ungraded');
}

const invalidPicture = normalizeStudioBlock({
  type: 'speaking_round',
  format: 'picture_detective',
  title: 'Broken picture task',
  instructions: 'Ask questions.',
  material: { options: [
    { key: 'A', label: 'Camera', image_url: '', image_alt: 'A camera' },
    { key: 'B', label: 'Key', image_url: '/assets/key.png', image_alt: 'A key' },
    { key: 'C', label: 'Umbrella', image_url: '/assets/umbrella.png', image_alt: 'An umbrella' },
  ] },
  teacher: { secret_option_key: 'C' },
});
assert.ok(validateSpeakingRoundBlock(invalidPicture).some((item) => item.field.includes('image_url')), 'Missing required imagery must stay a repairable publish issue');

console.log('Speaking Studio round contract validation passed.');
