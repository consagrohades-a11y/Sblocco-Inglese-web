const createTrainerPlaceholder = () => ({
  enabled: false,
  targetItems: 70,
  itemTypes: ['word', 'chunk', 'sentence-frame', 'question-frame', 'short-answer-frame'],
});

const createUnit = (unit) => ({
  ...unit,
  trainer: createTrainerPlaceholder(),
});

export const a1EnglishFoundationsUnits = [
  createUnit({
    unitNumber: 1,
    unitId: 'a1-be-basic-sentences',
    title: 'Introduce Yourself',
    status: 'available',
    path: '/levels/a1/be-basic-sentences',
  }),
  createUnit({
    unitNumber: 2,
    title: 'Ask Personal Questions',
    status: 'planned',
  }),
  createUnit({
    unitNumber: 3,
    title: 'People, Family, and Possession',
    status: 'planned',
  }),
  createUnit({
    unitNumber: 4,
    title: 'Objects, Articles, and Plurals',
    status: 'planned',
  }),
  createUnit({
    unitNumber: 5,
    title: 'Places and Rooms',
    status: 'planned',
  }),
  createUnit({
    unitNumber: 6,
    title: 'My Daily Routine',
    status: 'planned',
  }),
  createUnit({
    unitNumber: 7,
    title: 'Other People’s Routines',
    status: 'planned',
  }),
  createUnit({
    unitNumber: 8,
    unitId: 'a1-present-simple-normal-verbs',
    title: 'Ask About Daily Life',
    subtitle: 'Present Simple questions, negatives, and short answers with do/does.',
    status: 'in-progress',
    path: '/levels/a1/present-simple-normal-verbs',
  }),
  createUnit({
    unitNumber: 9,
    title: 'Ability, Permission, and Requests',
    status: 'planned',
  }),
  createUnit({
    unitNumber: 10,
    title: 'Needs, Food, Shopping, and Quantity',
    status: 'planned',
  }),
  createUnit({
    title: 'Final A1 Checkpoint',
    status: 'planned',
  }),
];

export default a1EnglishFoundationsUnits;
