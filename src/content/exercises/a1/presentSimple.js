const sharedQuestionDiagnostic = {
  skills: ['question-formation', 'sentence-control'],
  grammar: ['present-simple', 'auxiliary-do'],
  errorPatterns: ['missing-auxiliary', 'be-do-confusion', 'italian-word-order-transfer'],
  contexts: ['general-speaking', 'hospitality', 'interview'],
  severity: 3,
};

export const presentSimpleExercises = [
  {
    id: 'a1-present-simple-recognition-01',
    level: 'a1',
    track: 'core',
    unit: 'basic-questions',
    type: 'multiple-choice',
    purpose: 'recognition',
    title: 'Recognize the correct question',
    instructions: 'Choose the sentence with the correct English question structure.',
    items: [
      {
        id: 'a1-present-choice-001',
        type: 'choice',
        prompt: 'Which question is correct?',
        options: ['Where you live?', 'Where do you live?', 'Where are you live?'],
        correctIndex: 1,
        correctAnswers: ['Where do you live?'],
        diagnostic: {
          ...sharedQuestionDiagnostic,
          production: 'recognition',
        },
        feedback: {
          correct: 'Correct. Normal verbs use do/does in present simple questions.',
          incorrect: 'Use do before the subject with a normal verb: Where do you live?',
        },
        explanation: 'Present simple questions use question word + do/does + subject + base verb.',
      },
      {
        id: 'a1-present-choice-002',
        type: 'choice',
        prompt: 'Choose the correct question about work.',
        options: ['Does she work here?', 'Does she works here?', 'Is she work here?'],
        correctIndex: 0,
        diagnostic: {
          ...sharedQuestionDiagnostic,
          production: 'recognition',
        },
        feedback: {
          correct: 'Correct. After does, keep work in the base form.',
          incorrect: 'Use does + subject + base verb: Does she work here?',
        },
        explanation: 'Does already carries the third-person marker, so the main verb stays in its base form.',
      },
    ],
  },
  {
    id: 'a1-present-simple-questions-01',
    level: 'a1',
    track: 'core',
    unit: 'basic-questions',
    type: 'gap-fill',
    purpose: 'controlled-production',
    title: 'Ask basic questions',
    instructions: 'Complete the questions.',
    items: [
      {
        id: 'a1-present-gap-001',
        type: 'blank',
        prompt: 'Where ___ you live?',
        correctAnswers: ['do'],
        answer: 'do',
        baseForm: 'live',
        diagnostic: {
          ...sharedQuestionDiagnostic,
          errorPatterns: [...sharedQuestionDiagnostic.errorPatterns, 'overliteral-italian-question-transfer'],
          production: 'controlled-production',
        },
        feedback: {
          correct: 'Correct. With a normal verb like live, use do in the question.',
          incorrect: 'Use do because live is a normal verb. Are is only for be, not for normal verbs.',
        },
        explanation: 'Present simple questions use do/does + subject + base verb.',
      },
      {
        id: 'a1-present-gap-002',
        type: 'blank',
        prompt: '___ your brother work in a hotel?',
        correctAnswers: ['does'],
        answer: 'does',
        baseForm: 'work',
        diagnostic: {
          ...sharedQuestionDiagnostic,
          production: 'controlled-production',
        },
        feedback: {
          correct: 'Correct. Your brother is third-person singular, so use does.',
          incorrect: 'Use does with he, she, it, or a singular person such as your brother.',
        },
        explanation: 'Use does with third-person singular subjects, followed by the base verb.',
      },
    ],
  },
  {
    id: 'a1-present-simple-dialogue-01',
    level: 'a1',
    track: 'core',
    unit: 'basic-questions',
    type: 'dialogue-gap-fill',
    purpose: 'applied-use',
    title: 'Use questions in a short dialogue',
    instructions: 'Complete the two missing words in the conversation.',
    lines: [
      { speaker: 'Anna', parts: ['Where ', { blankId: 'a1-present-dialogue-001' }, ' you work?'] },
      { speaker: 'Marco', parts: ['I work in a hotel. ', { blankId: 'a1-present-dialogue-002' }, ' you work nearby?'] },
    ],
    items: [
      {
        id: 'a1-present-dialogue-001',
        type: 'blank',
        prompt: 'Where ___ you work?',
        correctAnswers: ['do'],
        answer: 'do',
        baseForm: 'work',
        diagnostic: {
          ...sharedQuestionDiagnostic,
          contexts: ['general-speaking', 'hospitality'],
          production: 'applied-use',
        },
        feedback: {
          correct: 'Correct. Use do with you and the normal verb work.',
          incorrect: 'The question needs do: Where do you work?',
        },
        explanation: 'Questions with you use do + subject + base verb.',
      },
      {
        id: 'a1-present-dialogue-002',
        type: 'blank',
        prompt: '___ you work nearby?',
        correctAnswers: ['do'],
        answer: 'do',
        baseForm: 'work',
        diagnostic: {
          ...sharedQuestionDiagnostic,
          contexts: ['general-speaking', 'hospitality'],
          production: 'applied-use',
        },
        feedback: {
          correct: 'Correct. Do starts this yes/no question.',
          incorrect: 'Start the question with do: Do you work nearby?',
        },
        explanation: 'Yes/no questions with you use Do you + base verb.',
      },
    ],
  },
];

export default presentSimpleExercises;

