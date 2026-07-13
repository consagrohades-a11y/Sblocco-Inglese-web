export const assignmentActivityCatalog = [
  {
    key: 'a1-be-basic-sentences',
    type: 'grammar_unit',
    title: 'A1: Frasi base con be',
    description: 'Unità guidata sulle frasi affermative, negative e interrogative con be.',
    route: '/levels/a1/be-basic-sentences',
  },
  {
    key: 'a1-present-simple-normal-verbs',
    type: 'grammar_unit',
    title: 'A1: Present simple e verbi normali',
    description: 'Domande, negative, do/does e risposte brevi nel present simple.',
    route: '/levels/a1/present-simple-normal-verbs',
  },
  {
    key: 'business-expression-trainer',
    type: 'trainer',
    title: 'Business Expression Trainer',
    description: 'Espressioni per lavoro, colloqui, riunioni e comunicazione professionale.',
    route: '/trainers/business-expression',
  },
  {
    key: 'general-expression-trainer',
    type: 'trainer',
    title: 'General Expression Trainer',
    description: 'Espressioni di uso generale da allenare con ripetizione dilazionata.',
    route: '/trainers/general-expression',
  },
  {
    key: 'hospitality-expression-trainer',
    type: 'trainer',
    title: 'Hospitality Expression Trainer',
    description: 'Espressioni per ristorazione, accoglienza e servizio al cliente.',
    route: '/trainers/hospitality-expression',
  },
  {
    key: 'word-trainer',
    type: 'trainer',
    title: 'Word Trainer',
    description: 'Allenamento del lessico con il sistema di ripetizione dilazionata.',
    route: '/trainers/word-trainer',
  },
];

export const assignmentActivityByKey = Object.fromEntries(
  assignmentActivityCatalog.map((activity) => [activity.key, activity]),
);
