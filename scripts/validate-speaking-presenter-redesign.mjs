import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SPEAKING_ACTIVITY_TITLES,
  SPEAKING_PRESENTER_FAMILIES,
  resolveSpeakingPresenterConfig,
} from '../src/lib/speakingPresenterRegistry.js';
import {
  adaptLegacySpeakingItem,
  parseAnswerFirst,
  parseBadGood,
  parseDialogue,
  parseDifference,
  parseFirstFollowup,
  parseForbidden,
  parseLabelledChoices,
  parsePhraseAuction,
  parseRequiredChunks,
  parseTradeoff,
  parseBeforeAfter,
  parseFieldCards,
  parseSchedule,
} from '../src/lib/speakingPresenterLegacyAdapter.js';

const EXPECTED_TITLES = [
  'Agree, Disagree, It Depends',
  'Bad Advice Only',
  'Bad Small Talk / Good Small Talk',
  'Before / During / After',
  'Build the Perfect...',
  'Change My Mind',
  'Conversation Detective',
  'Conversation Fork',
  'Conversation Roulette',
  'Convince Me',
  'Defend the Opposite',
  'Describe Without Adjectives',
  'Don’t Say Yes',
  'Emergency English',
  'Explain It Without Saying It',
  'Explain the Difference',
  'Explain Your Choice to Someone Who Disagrees',
  'Finish My Thought',
  'Five Whys',
  'Guess My Rule',
  'Interrupt Me Politely',
  'Keep It Going',
  'Make It Less Direct',
  'Make It More Direct',
  'Make It More Specific',
  'Make It Sound Like a Person',
  'Micro Roleplay',
  'Odd One Out — Conversation Edition',
  'One Detail Is False',
  'One Minute, No Escape',
  'Personalise It',
  'Phrase Auction',
  'Problem → Options → Decision',
  'Repair the Conversation',
  'Say It Three Ways',
  'Sell Me Something Useless',
  'Story Chain | But Something Changes',
  'Take a Side',
  'Tell Me What I Mean',
  'The Awkward Silence',
  'The Better Question',
  'The Complaint Ladder',
  'The Forbidden Easy Word',
  'The Missing Detail',
  'The Missing Question',
  'The Unexpected Follow-Up',
  'Three Questions Deeper',
  'Trade-Off',
  'Unpopular Opinion',
  'Upgrade That Answer',
  'Use These 3 Chunks',
  'What Are You Assuming?',
  'What Happened Just Before?',
  'What Would You Say?',
  "What's the Problem?",
  'Which One Sounds More Natural?',
  'Who Said It?',
  'Would You Rather — No Easy Answers',
  'You Have 30 Seconds',
  'Number Mission',
  'Picture Detective',
  'Make the Choice',
  'Quick Pick',
  'Ask to Unlock',
  'Oops, Fix Me!',
  'Build My Day',
  'Three Clues',
  'What Changed?',
  'Mini Map Mission',
  'Pass It Back',
  'Tiny Story Builder',
  'Which One Fits?',
];

assert.equal(SPEAKING_ACTIVITY_TITLES.length, 72, 'All 72 active speaking activities must be registered.');
assert.deepEqual([...SPEAKING_ACTIVITY_TITLES].sort(), [...EXPECTED_TITLES].sort(), 'Presenter registry must cover the complete active library.');

const newGameSeed = JSON.parse(fs.readFileSync(new URL('../public/templates/sblocco-speaking-new-games-v1.json', import.meta.url), 'utf8'));
assert.equal(newGameSeed.activities.length, 13, 'New speaking pack must contain 13 activities.');
assert.equal(newGameSeed.activities.reduce((sum, activity) => sum + activity.prompts.length, 0), 72, 'New speaking pack must ship 72 playable items.');
for (const activity of newGameSeed.activities) {
  assert.ok(EXPECTED_TITLES.includes(activity.title), 'Seeded activity is missing from presenter registry: ' + activity.title);
}
for (const activity of newGameSeed.activities) {
  for (const item of activity.prompts) {
    if (item.format !== 'picture_detective') continue;
    for (const option of item.material?.options || []) {
      const relative = String(option.image_url || '').replace(/^\//, '');
      assert.ok(relative && fs.existsSync(new URL('../public/' + relative, import.meta.url)), 'Missing Picture Detective asset: ' + option.image_url);
    }
  }
}

const allowedFamilies = new Set(Object.values(SPEAKING_PRESENTER_FAMILIES));
for (const title of EXPECTED_TITLES) {
  const config = resolveSpeakingPresenterConfig({ title });
  assert.ok(allowedFamilies.has(config.family), 'Unsupported presenter family for ' + title);
  assert.ok(config.variant, 'Presenter variant missing for ' + title);
}

assert.deepEqual(parseForbidden('Describe your favourite place.\nFORBIDDEN: nice · good · beautiful'), {
  prompt: 'Describe your favourite place.',
  words: ['nice', 'good', 'beautiful'],
});
assert.deepEqual(parseForbidden('deadline | forbidden: time, finish, date'), {
  prompt: 'deadline',
  words: ['time', 'finish', 'date'],
});
assert.deepEqual(parseForbidden('Explain: umbrella. You cannot say: rain, wet, weather.'), {
  prompt: 'umbrella',
  words: ['rain', 'wet', 'weather'],
});
assert.deepEqual(parseRequiredChunks('TOPIC: Planning a weekend\nCHUNKS:\nI’m thinking of… · it depends on… · in the end…'), {
  topic: 'Planning a weekend',
  chunks: ['I’m thinking of…', 'it depends on…', 'in the end…'],
});
assert.equal(parseLabelledChoices('Question?\nA) first\nB) second\nC) third').choices.length, 3);
assert.equal(parseDialogue('A: Did you tell her?\nB: Not yet.\nA: You can’t keep avoiding it.').turns.length, 3);
assert.deepEqual(parseFirstFollowup('FIRST: What do you like doing?\nFOLLOW-UP: What would you remove?'), {
  first: 'What do you like doing?',
  followup: 'What would you remove?',
});
assert.deepEqual(parseAnswerFirst('ANSWER: About three times a week.'), { answer: 'About three times a week.' });
assert.equal(parsePhraseAuction('SITUATION: disagreement\nBUDGET: 3 phrases\n• I see your point\n• I disagree\n• Maybe\n• Not really').phrases.length, 4);
assert.equal(parseTradeoff('Choose 3 for an apartment: cheap · central · large · quiet · modern').options.length, 5);
assert.deepEqual(parseDifference('trip vs journey'), { left: 'trip', right: 'journey' });
assert.deepEqual(parseBadGood('BAD: How old are you?\nGOOD: What do you do?'), { bad: 'How old are you?', good: 'What do you do?' });
assert.deepEqual(parseBeforeAfter('BEFORE: The café opens at 08:00.\nAFTER: The café opens at 07:30.'), { before: 'The café opens at 08:00.', after: 'The café opens at 07:30.' });
assert.equal(parseFieldCards('WHO: a student\nWHERE: a café\nACTION: meets a friend').length, 3);
assert.equal(parseSchedule('08:00 breakfast\n09:30 class\n13:00 lunch').length, 3);

const forbiddenLegacy = adaptLegacySpeakingItem(
  { text: 'Describe your favourite place.\nFORBIDDEN: nice · good · beautiful' },
  resolveSpeakingPresenterConfig({ title: 'The Forbidden Easy Word' }),
);
assert.equal(forbiddenLegacy.family, 'constraint_focus');
assert.equal(forbiddenLegacy.forbidden.words.length, 3);

const presenter = fs.readFileSync(new URL('../src/pages/SpeakingActivityPresenter.jsx', import.meta.url), 'utf8');
const promptRenderer = fs.readFileSync(new URL('../src/components/speaking/SpeakingPromptContent.jsx', import.meta.url), 'utf8');
const roundRenderer = fs.readFileSync(new URL('../src/components/speaking/SpeakingRoundContent.jsx', import.meta.url), 'utf8');

assert.ok(presenter.includes("resolveSpeakingPresenterConfig"), 'Presenter must use canonical speaking presenter registry.');
assert.ok(presenter.includes("if (controlId) return undefined;"), 'Controlled learner screen must disable keyboard progression.');
assert.ok(presenter.includes("{!controlId ? ("), 'Controlled learner screen must hide learner navigation.');
assert.ok(!presenter.includes('Your teacher can reveal an extra challenge from the control panel.'), 'Unrevealed challenge must render no placeholder UI.');
assert.ok(presenter.includes('hasAside'), 'Presenter must collapse the generic side rail when not needed.');
assert.ok(presenter.includes('config={presenterConfig}'), 'Prompt renderer must receive family configuration.');
assert.ok(promptRenderer.includes("legacy.family === 'constraint_focus'"));
assert.ok(promptRenderer.includes("legacy.family === 'dialogue_inference'"));
assert.ok(promptRenderer.includes("legacy.family === 'choice_tradeoff'"));
assert.ok(promptRenderer.includes("legacy.family === 'transform_repair'"));
assert.ok(promptRenderer.includes("legacy.family === 'rapid_fluency'"));
assert.ok(promptRenderer.includes("legacy.family === 'story_sequence'"));
assert.ok(!roundRenderer.includes('Second stage available'), 'Structured rounds must not advertise hidden challenge state before reveal.');

console.log('Speaking presenter redesign validation passed.');
