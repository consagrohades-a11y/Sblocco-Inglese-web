export const recommendationRegistry = {
  'be-do-confusion': {
    title: 'Fix Be/Do Confusion',
    reason: 'Ripassa la differenza tra domande con be e domande con do/does. L’obiettivo non è solo riconoscere la regola, ma usarla mentre costruisci una frase.',
    actions: [
      { label: 'Studia Present Simple e do/does', path: '/levels/a1/present-simple-normal-verbs' },
      { label: 'Apri il checkpoint grammaticale', path: '/grammar/a1/present-simple' },
    ],
  },
  'missing-auxiliary': {
    title: 'Review Auxiliary Control',
    reason: 'Nelle domande e nelle negative con i verbi normali devi rendere automatico l’uso di do/does o don’t/doesn’t.',
    actions: [
      { label: 'Ripeti l’unità sui verbi normali', path: '/levels/a1/present-simple-normal-verbs' },
    ],
  },
  'question-formation': {
    title: 'Review Question Formation',
    reason: 'La costruzione delle domande non è ancora automatica. Prima identifica se il verbo è be oppure un verbo normale, poi applica l’ordine corretto.',
    actions: [
      { label: 'Ripassa le domande con be', path: '/levels/a1/be-basic-sentences' },
      { label: 'Ripassa le domande con do/does', path: '/levels/a1/present-simple-normal-verbs' },
    ],
  },
  'short-answer-control': {
    title: 'Strengthen Short Answers',
    reason: 'Riprendi il verbo o l’ausiliare della domanda nella risposta breve: Yes, she is / No, he doesn’t.',
    actions: [
      { label: 'Ripeti le short answers con be', path: '/levels/a1/be-basic-sentences' },
    ],
  },
  'spoken-sentence-control': {
    title: 'Build Spoken Sentence Control',
    reason: 'La regola è presente, ma deve diventare più stabile quando produci una frase completa senza scegliere tra opzioni.',
    actions: [
      { label: 'Riparti dalle frasi con be', path: '/levels/a1/be-basic-sentences' },
    ],
  },
  'be-question-formation': {
    title: 'Review Be Questions',
    reason: 'Con be devi portare am/is/are prima del soggetto, senza aggiungere do o does.',
    actions: [
      { label: 'Ripassa Unit 1', path: '/levels/a1/be-basic-sentences' },
    ],
  },
  'missing-third-person-s': {
    title: 'Fix Third-Person -s',
    reason: 'Con he, she e it la frase affermativa richiede normalmente -s. Dopo does o doesn’t, invece, il verbo torna alla forma base.',
    actions: [
      { label: 'Ripassa Unit 2', path: '/levels/a1/present-simple-normal-verbs' },
    ],
  },
};
