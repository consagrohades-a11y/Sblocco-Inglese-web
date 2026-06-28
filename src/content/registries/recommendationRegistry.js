export const recommendationRegistry = {
  'be-do-confusion': {
    title: 'Fix be/do question confusion',
    reason: 'You are using be where English needs do/does with normal verbs.',
    actions: [
      { label: 'Practice A1 question formation', path: '/grammar/a1/present-simple' },
      { label: 'Book the diagnostic audit', path: '/simulazione-39' },
    ],
  },
  'missing-auxiliary': {
    title: 'Train auxiliary control',
    reason: 'Your answers show missing auxiliaries in questions or negatives.',
    actions: [
      { label: 'Review basic question structure', path: '/grammar/a1/present-simple' },
    ],
  },
  'question-formation': {
    title: 'Strengthen question formation',
    reason: 'Your answers suggest that English question structure is not automatic yet.',
    actions: [
      { label: 'Repeat A1 present simple questions', path: '/grammar/a1/present-simple' },
    ],
  },
};

