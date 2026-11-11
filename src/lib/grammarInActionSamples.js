// Five authored, publish-ready Grammar in Action demonstrations.
// Each example uses the canonical Studio blocks and existing runtime grading.
const build = (title, prompt, chunks, extra = {}) => ({
  type: 'grammar_construction', title, prompt, mode: 'tiles',
  instructions: 'Build the sentence from the movable chunks.',
  chunks, ...extra,
});
const type = (title, prompt, answers, extra = {}) => ({
  type: 'grammar_construction', title, prompt, mode: 'typed',
  instructions: 'Write one complete sentence. Keep the intended meaning.',
  accepted_answers: answers, ...extra,
});
const say = (title, prompt, extra = {}) => ({
  type: 'grammar_construction', title, prompt, mode: 'oral',
  instructions: 'Say your answer. Your teacher will respond and help you improve it.',
  ...extra,
});
const explain = (title, body) => ({ type: 'explanation', title, body });
const contrast = (title, left_body, right_body, body) => ({
  type: 'contrast', title, left_label: 'Compare A', right_label: 'Compare B',
  left_body, right_body, body,
});
const mistake = (title, wrong, correct, why) => ({ type: 'do_dont', title, wrong, correct, why });

export const GRAMMAR_IN_ACTION_SAMPLES = Object.freeze([
  {
    id: 'grammar_action_a1',
    eyebrow: 'Grammar in Action · A1',
    label: 'A1 · Build statements and questions',
    description: 'Construct simple affirmative, negative and question structures; finish with original oral questions.',
    sequence: 'Notice → Build → Negate → Question → Ask',
    internal_title: 'A1 · Present Simple · Sentence Construction',
    learner_title: 'Make your own sentences and questions',
    level: 'A1', topic: 'present_simple', estimated_minutes: 22,
    activity_type: 'mini_course', tags: ['grammar-in-action', 'sentence-building'],
    blocks: [
      explain('How a sentence is built', 'A basic affirmative sentence needs a subject and a verb: She works in a café. With he, she and it, use works. In a negative sentence, use does not / doesn’t + the base form. In a question, use Does + subject + base form? Compare: She works. / She doesn’t work. / Does she work?'),
      contrast('Be and do are different', 'Is she a nurse? (be is the main verb)', 'Does she work in a hospital? (work is the main verb)', 'Do not add do/does to ordinary questions with be.'),
      build('Make an affirmative sentence', 'Say what Nina does every morning.', ['Nina', 'usually', 'drinks', 'coffee', 'before work'], {
        context: 'Nina: coffee before work, most mornings.', target_pattern: 'subject + frequency + verb + object + time',
        learner_hint: 'For Nina (she), the verb drink adds -s.', terminal_punctuation: '.',
        explanation: 'The third-person singular uses drinks; usually comes before the main verb.',
      }),
      build('Ask a complete question', 'Ask where she works.', ['Where', 'does', 'Nina', 'work'], {
        context: 'You do not know Nina’s workplace.', target_pattern: 'question word + does + subject + base verb',
        learner_hint: 'Does carries agreement. The main verb stays work.', terminal_punctuation: '?',
      }),
      type('Make it negative', 'Rewrite exactly: Nina works on Sundays. Make it negative.', [
        'Nina does not work on Sundays.', 'Nina doesn’t work on Sundays.', "Nina doesn't work on Sundays.",
      ], {
        context: 'The original sentence is false. Preserve the other information.',
        target_pattern: 'subject + does not + base verb', learner_hint: 'Use does not or doesn’t; no -s on work.',
        explanation: 'Does carries the third-person agreement; work remains in the base form.',
      }),
      type('Build a yes/no question', 'Turn into a question: He lives near the station.', [
        'Does he live near the station?',
      ], {
        target_pattern: 'Does + he + base verb ... ?', learner_hint: 'Lives becomes live after does.',
        explanation: 'Questions in the present simple use does + subject + base verb for he/she/it.',
      }),
      say('Ask your teacher', 'Find out three things about your teacher’s weekday routine. Ask complete questions, then tell the teacher two things you learned.', {
        context: 'Ask about work, free time and mornings. Ask one follow-up question of your own.',
        learner_hint: 'What time do you…? / Do you usually…? / Where do you…?',
        teacher_note: 'Listen for auxiliary omission, question word order and third-person agreement in the summary. Repeat one previously incorrect question without displaying its pattern.',
      }),
    ],
  },
  {
    id: 'grammar_action_a2',
    eyebrow: 'Grammar in Action · A2',
    label: 'A2 · Build narrative time relationships',
    description: 'Contrast background actions and events, reconstruct clauses and recount an interruption.',
    sequence: 'Interpret → Connect → Transform → Narrate',
    internal_title: 'A2 · Past Simple vs Past Continuous · Sentence Construction',
    learner_title: 'What was happening when it happened?',
    level: 'A2', topic: 'past_simple_past_continuous', estimated_minutes: 22,
    activity_type: 'mini_course', tags: ['grammar-in-action', 'narrative'],
    blocks: [
      contrast('Two different time relationships', 'When I arrived, Tom cooked dinner.', 'When I arrived, Tom was cooking dinner.', 'The second presents the cooking as already in progress when I arrived. The first may describe cooking afterwards.'),
      explain('Actions in progress and completed events', 'Use was/were + -ing to describe an action that was in progress at a past reference point. Use the past simple for an event presented as completed. Do not choose a tense solely because you see when or while: choose the meaning first.'),
      build('Join the two events', 'Explain what was in progress when the phone rang.', ['I', 'was preparing', 'dinner', 'when', 'the phone', 'rang'], {
        context: '19:00: cooking began. 19:10: phone rang. Cooking had not finished.',
        target_pattern: 'past continuous + when + past simple', terminal_punctuation: '.',
        learner_hint: 'The cooking is the background action; the ringing is a completed event.',
      }),
      type('Turn the event into a background action', 'Rewrite exactly with was watching: I watched television when the lights went out.', [
        'I was watching television when the lights went out.',
      ], {
        target_pattern: 'past continuous + when + past simple',
        learner_hint: 'Keep went out in the past simple.',
        explanation: 'Was watching describes an activity already in progress; went out is the interrupting event.',
      }),
      mistake('A common tense problem', 'While I watched TV, the doorbell was ringing once.', 'While I was watching TV, the doorbell rang.', 'The viewing was ongoing; a single ring is treated as a completed event. Other contexts may legitimately allow different aspects.'),
      build('Change the clause order', 'Start with the interruption and include the background action.', ['The alarm', 'went off', 'while', 'we', 'were sleeping'], {
        context: 'Everyone was asleep. The alarm then sounded.', terminal_punctuation: '.',
        target_pattern: 'past simple + while + past continuous',
      }),
      say('Tell a real story', 'Tell your teacher about something unexpected that happened while you were doing something else.', {
        context: 'First describe what was already happening; then describe the unexpected event and the result.',
        learner_hint: 'I was … when … / While we were …, … happened / Afterwards, …',
        teacher_note: 'Ask for two details after the first telling. Then invite a second telling without a visible scaffold. Keep errors tied to time reference.',
      }),
    ],
  },
  {
    id: 'grammar_action_b1',
    eyebrow: 'Grammar in Action · B1',
    label: 'B1 · Choose present perfect or past simple',
    description: 'Build sentences and questions from time frames, then investigate personal experiences.',
    sequence: 'Meaning → Contrast → Build → Interview',
    internal_title: 'B1 · Present Perfect vs Past Simple · Sentence Construction',
    learner_title: 'Experiences and specific past events',
    level: 'B1', topic: 'present_perfect_past_simple', estimated_minutes: 23,
    activity_type: 'mini_course', tags: ['grammar-in-action', 'tense-choice'],
    blocks: [
      contrast('An experience vs a specific occasion', 'I’ve visited Rome three times.', 'I visited Rome in 2023.', 'The first describes experience in an unfinished lifetime. The second locates an event in a specified completed past period.'),
      contrast('Continuing vs finished periods', 'I’ve lived here for five years. (I still live here.)', 'I lived there for five years. (The period is finished.)', 'The speaker’s time frame changes the meaning; do not rely on trigger words alone.'),
      build('Build a life-experience question', 'Ask whether your colleague has ever travelled alone.', ['Have', 'you', 'ever', 'travelled', 'alone'], {
        target_pattern: 'Have + subject + ever + past participle', terminal_punctuation: '?',
        learner_hint: 'No specific past time is given.',
      }),
      type('Move into a specific past event', 'Rewrite exactly as a question about a specific occasion: When have you been to Rome?', [
        'When did you go to Rome?',
      ], {
        context: 'You are asking about the time of a particular completed trip.',
        learner_hint: 'Use did + base verb for an ordinary question about that past event.',
        explanation: 'When did you go to Rome? requests the time of a specific completed trip.',
      }),
      mistake('Do not combine these time references', 'I have met her last Saturday.', 'I met her last Saturday.', 'Last Saturday identifies a completed past time, so the past simple is the natural choice here.'),
      type('Connect past and present', 'Write exactly: I / work / at this company / since 2021. The job continues now. Use the present perfect simple.', [
        'I have worked at this company since 2021.', 'I’ve worked at this company since 2021.', "I've worked at this company since 2021.",
      ], {
        target_pattern: 'have + past participle + since + starting point',
        learner_hint: 'The work started in the past and continues now.',
        explanation: 'Have worked connects the starting point (2021) with the present.',
      }),
      say('Interview and investigate', 'Ask your teacher about two interesting life experiences. For every yes, find out what happened on a particular occasion. Then share one real experience of your own.', {
        context: 'Make the conversation natural. Do not read a fixed series of questions.',
        learner_hint: 'Have you ever…? → When did you…? / What happened next? / How did you feel?',
        teacher_note: 'Note tense switches, overuse of present perfect with finished times and failure to retrieve irregular participles. End with a new topic to check transfer.',
      }),
    ],
  },
  {
    id: 'grammar_action_b2',
    eyebrow: 'Grammar in Action · B2',
    label: 'B2 · Construct counterfactual relationships',
    description: 'Build third and mixed conditionals while controlling time and hypothetical certainty.',
    sequence: 'Reality → Clause logic → Certainty → Consequence',
    internal_title: 'B2 · Third and Mixed Conditionals · Clause Engineering',
    learner_title: 'Past decisions and alternative presents',
    level: 'B2', topic: 'mixed_conditionals', estimated_minutes: 25,
    activity_type: 'mini_course', tags: ['grammar-in-action', 'complex-clauses'],
    blocks: [
      explain('Anchor the meaning in time', 'Third conditional: an unreal past condition with a hypothetical past result (If she had applied, she might have got an interview). Mixed conditional: an unreal past condition with a hypothetical present consequence (If she had taken the offer, she might be living abroad now). Might have/might be express possibility, not certainty.'),
      contrast('Two counterfactual outcomes', 'If I had left earlier, I would have caught the train. (hypothetical past result)', 'If I had taken the remote job, I would be working from home now. (hypothetical present result)', 'Observe both the conditional clause and the time of the result.'),
      build('Construct a mixed conditional', 'Describe a possible present result of an unreal past decision.', ['If', 'Maya had accepted the offer', 'she might be living abroad now'], {
        context: 'Maya rejected the job abroad two years ago and still lives locally.',
        target_pattern: 'if + past perfect, might + base verb (present result)',
        learner_hint: 'The decision was in the past; the imagined consequence is now.',
        terminal_punctuation: '.',
      }),
      type('Change the hypothetical time', 'Convert exactly to a past result: If she had studied harder, she would be more confident now. Replace the result with: she / pass / the exam.', [
        'If she had studied harder, she would have passed the exam.',
      ], {
        target_pattern: 'past perfect condition + would have + past participle',
        learner_hint: 'The exam result belongs to the past, not the present.',
        explanation: 'Would have passed expresses the hypothetical past consequence.',
      }),
      mistake('Do not put would in the standard if-clause', 'If he would have applied, he might have got an interview.', 'If he had applied, he might have got an interview.', 'A standard unreal-past conditional clause uses past perfect. The result can use would/could/might have + past participle.'),
      type('Invert the condition', 'Rewrite exactly without if: If I had known about the delay, I would have taken a different train.', [
        'Had I known about the delay, I would have taken a different train.',
      ], {
        target_pattern: 'Had + subject + past participle, ...',
        learner_hint: 'Move had before the subject and remove if.',
        explanation: 'Conditional inversion replaces if I had known with Had I known, without changing the underlying condition.',
      }),
      say('Explore alternative outcomes', 'Tell your teacher about a past decision. Describe two different outcomes that might have followed and one way your present life might be different.', {
        context: 'Distinguish what really happened, what might have happened, and what might be different now.',
        learner_hint: 'If I’d …, I might have … / If I’d …, I might be … now.',
        teacher_note: 'Challenge overconfident hypothetical claims. Ask which consequences were plausible and whether the student controls past-vs-present reference without a template.',
      }),
    ],
  },
  {
    id: 'grammar_action_c1',
    eyebrow: 'Grammar in Action · C1',
    label: 'C1 · Control emphasis, evidence and register',
    description: 'Construct advanced structures to change a sentence’s focus or epistemic force without changing facts.',
    sequence: 'Interpret → Refocus → Hedge → Defend',
    internal_title: 'C1 · Emphasis and Hedging · Precision Editor',
    learner_title: 'Say exactly what you mean',
    level: 'C1', topic: 'advanced_information_structure', estimated_minutes: 25,
    activity_type: 'mini_course', tags: ['grammar-in-action', 'advanced-syntax'],
    blocks: [
      explain('Advanced grammar is a choice, not a decoration', 'Cleft sentences direct attention to a constituent (What concerns me is the lack of evidence). Negative adverbial inversion adds marked emphasis (Only after the meeting did we realise the error). Hedging calibrates certainty (The results may suggest…). Use them because they change focus, force or register, not just to make sentences longer.'),
      contrast('Statement vs emphasis', 'We realised the mistake only after the meeting.', 'Only after the meeting did we realise the mistake.', 'Inversion foregrounds how late the realisation occurred and normally suits more deliberate or emphatic styles.'),
      build('Build an emphatic sentence', 'Emphasise that the realisation came late.', ['Only after the meeting', 'did we realise', 'the mistake'], {
        target_pattern: 'negative/restrictive initial adverbial + auxiliary inversion',
        learner_hint: 'After Only after the meeting, invert did and the subject.',
        terminal_punctuation: '.',
      }),
      type('Construct a what-cleft', 'Rewrite exactly to emphasise the main concern: I am concerned about the lack of clear evidence.', [
        'What concerns me is the lack of clear evidence.',
      ], {
        target_pattern: 'What + verb + object + is + focus',
        learner_hint: 'Start with What concerns me is…',
        explanation: 'The what-cleft makes the lack of evidence the focus of the statement.',
      }),
      mistake('Avoid overclaiming', 'These results prove that every customer is unhappy.', 'These results suggest that some customers may be unhappy.', 'Suggest and may communicate limited evidence. Any factual statement must still match the actual sample; the revised wording is an illustration of calibrated certainty, not proof of the proportion.'),
      type('Make an accurate qualified claim', 'Write exactly with appears: The warning was ignored. → It / appear / that / the warning / be / overlook.', [
        'It appears that the warning was overlooked.',
      ], {
        target_pattern: 'It appears that + clause',
        learner_hint: 'Use the passive form after the warning.',
        explanation: 'Appears that marks an inference; was overlooked avoids asserting who is responsible.',
      }),
      say('Control the implication', 'Tell your teacher about a claim you have heard recently. Explain what is known, what is uncertain, and how you would word the claim for a public audience.', {
        context: 'Use a claim where the facts can be checked or make clear that you are discussing a hypothetical example.',
        learner_hint: 'What concerns me is… / It appears that… / While that may be true… / Only after… did…',
        teacher_note: 'Evaluate precision, audience, emphasis, and whether the grammar exaggerates the evidence. Ask for a simpler version and justify which is clearer.',
      }),
    ],
  },
]);
