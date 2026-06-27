const sentenceDiagnostic = {
  skills: ['sentence-control'],
  grammar: ['present-simple'],
  errorPatterns: ['italian-word-order-transfer'],
  contexts: ['general-speaking', 'interview'],
  production: 'controlled-production',
  severity: 2,
};

const questionDiagnostic = {
  skills: ['question-formation', 'sentence-control'],
  grammar: ['present-simple', 'auxiliary-do'],
  errorPatterns: ['missing-auxiliary', 'be-do-confusion'],
  contexts: ['general-speaking', 'hospitality', 'interview'],
  production: 'controlled-production',
  severity: 3,
};

export const englishBlockerDiagnostic = {
  id: 'english-blocker',
  title: 'English Blocker Diagnostic',
  description: 'Find what blocks your English and what to train next.',
  sections: [
    {
      id: 'goal-use-case',
      title: '1. Goal and use-case',
      description: 'Choose the situation where English matters most to you.',
      question: {
        id: 'goal',
        options: ['General speaking', 'Hospitality', 'Work or business', 'Interview'],
      },
    },
    {
      id: 'confidence-blocker',
      title: '2. Confidence and speaking blocker',
      description: 'Notice what happens when you need to speak without preparation.',
      question: {
        id: 'blocker',
        options: ['I freeze', 'I translate slowly', 'I know the words but cannot build the sentence', 'I can usually respond'],
      },
    },
    {
      id: 'sentence-control',
      title: '3. Sentence control',
      description: 'Build a basic sentence without relying only on recognition.',
      exercises: [
        {
          id: 'blocker-sentence-control',
          level: 'a1',
          track: 'core',
          unit: 'diagnostic-sentence-control',
          type: 'gap-fill',
          purpose: 'controlled-production',
          title: 'Complete the sentence',
          instructions: 'Write the missing verb.',
          items: [
            {
              id: 'blocker-sentence-001',
              type: 'blank',
              prompt: 'I ___ in Rome.',
              correctAnswers: ['live'],
              answer: 'live',
              baseForm: 'live',
              diagnostic: sentenceDiagnostic,
              feedback: {
                correct: 'Correct. With I, use the base verb live.',
                incorrect: 'Use the base verb with I: I live in Rome.',
              },
              explanation: 'Present simple statements with I/you/we/they use the base verb.',
            },
          ],
        },
      ],
    },
    {
      id: 'basic-grammar',
      title: '4. Basic grammar',
      description: 'Check whether be and do stay separate in basic questions.',
      exercises: [
        {
          id: 'blocker-basic-grammar',
          level: 'a1',
          track: 'core',
          unit: 'diagnostic-basic-grammar',
          type: 'multiple-choice',
          purpose: 'recognition',
          title: 'Choose the correct structure',
          instructions: 'Select the correct sentence.',
          items: [
            {
              id: 'blocker-grammar-001',
              type: 'choice',
              prompt: 'Which sentence is correct?',
              options: ['She work in a hotel.', 'She works in a hotel.', 'She does works in a hotel.'],
              correctIndex: 1,
              diagnostic: {
                ...sentenceDiagnostic,
                production: 'recognition',
              },
              feedback: {
                correct: 'Correct. She takes the third-person -s in an affirmative sentence.',
                incorrect: 'Use works in the affirmative: She works in a hotel.',
              },
              explanation: 'He/she/it takes -s in present simple affirmative sentences.',
            },
            {
              id: 'blocker-grammar-002',
              type: 'choice',
              prompt: 'Which question is correct?',
              options: ['Are you work here?', 'Do you work here?', 'You work here?'],
              correctIndex: 1,
              diagnostic: {
                ...questionDiagnostic,
                production: 'recognition',
              },
              feedback: {
                correct: 'Correct. Work is a normal verb, so the question needs do.',
                incorrect: 'Use do with the normal verb work: Do you work here?',
              },
              explanation: 'Use do/does to form present simple questions with normal verbs.',
            },
          ],
        },
      ],
    },
    {
      id: 'applied-situation',
      title: '5. Applied situation',
      description: 'Use the same structure inside a realistic exchange.',
      exercises: [
        {
          id: 'blocker-applied-situation',
          level: 'a1',
          track: 'hospitality',
          unit: 'diagnostic-applied-situation',
          type: 'dialogue-gap-fill',
          purpose: 'applied-use',
          title: 'Ask a guest a basic question',
          instructions: 'Complete the question.',
          lines: [
            { speaker: 'Guest', parts: ['I am from London.'] },
            { speaker: 'Staff', parts: ['Where ', { blankId: 'blocker-applied-001' }, ' you live now?'] },
          ],
          items: [
            {
              id: 'blocker-applied-001',
              type: 'blank',
              prompt: 'Where ___ you live now?',
              correctAnswers: ['do'],
              answer: 'do',
              baseForm: 'live',
              diagnostic: {
                ...questionDiagnostic,
                contexts: ['guest-interaction', 'hospitality'],
                production: 'applied-use',
              },
              feedback: {
                correct: 'Correct. You used do to ask about the normal verb live.',
                incorrect: 'Use do: Where do you live now?',
              },
              explanation: 'Applied questions still use do/does + subject + base verb.',
            },
          ],
        },
      ],
    },
  ],
};

export default englishBlockerDiagnostic;

