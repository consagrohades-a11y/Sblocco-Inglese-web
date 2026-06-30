import { presentSimpleNormalVerbsPool } from './questionPools/presentSimpleNormalVerbsPool.js';

const makeDiagnostic = ({
  skills,
  grammar,
  errorPatterns,
  production,
  severity = 2,
}) => ({
  skills,
  grammar,
  errorPatterns,
  contexts: ['general-speaking'],
  production,
  severity,
});

const choice = (id, prompt, options, correctIndex, diagnostic, feedback, explanation) => ({
  id,
  type: 'choice',
  prompt,
  options,
  correctIndex,
  diagnostic,
  feedback,
  explanation,
});

const blank = (id, prompt, correctAnswers, diagnostic, feedback, explanation, baseForm = null) => ({
  id,
  type: 'blank',
  prompt,
  correctAnswers,
  answer: correctAnswers[0],
  baseForm,
  diagnostic,
  feedback,
  explanation,
});

const sentenceDiagnostic = (production, severity = 2, extraErrors = []) => makeDiagnostic({
  skills: ['spoken-sentence-control', 'sentence-control'],
  grammar: ['present-simple', 'present-simple-affirmative'],
  errorPatterns: ['italian-word-order-transfer', ...extraErrors],
  production,
  severity,
});

const thirdPersonDiagnostic = (production, severity = 2) => makeDiagnostic({
  skills: ['spoken-sentence-control', 'sentence-control'],
  grammar: ['present-simple', 'present-simple-third-person'],
  errorPatterns: ['missing-third-person-s'],
  production,
  severity,
});

const questionDiagnostic = (production, severity = 3, extraErrors = []) => makeDiagnostic({
  skills: ['question-formation', 'spoken-sentence-control'],
  grammar: ['present-simple', 'auxiliary-do', 'do-does-question-formation'],
  errorPatterns: ['missing-auxiliary', 'be-do-confusion', 'italian-word-order-transfer', ...extraErrors],
  production,
  severity,
});

const negativeDiagnostic = (production, severity = 3) => makeDiagnostic({
  skills: ['spoken-sentence-control', 'sentence-control'],
  grammar: ['present-simple', 'auxiliary-do', 'present-simple-negative'],
  errorPatterns: ['missing-auxiliary', 'be-do-confusion'],
  production,
  severity,
});

const shortAnswerDiagnostic = (production, severity = 2) => makeDiagnostic({
  skills: ['short-answer-control', 'spoken-sentence-control'],
  grammar: ['auxiliary-do', 'do-does-question-formation'],
  errorPatterns: ['short-answer-omission'],
  production,
  severity,
});

export const unitPresentSimpleNormalVerbs = {
  id: 'a1-present-simple-normal-verbs',
  slug: 'present-simple-normal-verbs',
  level: 'a1',
  track: 'core',
  title: 'Ask About Daily Life',
  displayTitle: 'A1 Unit 8 — Ask About Daily Life',
  subtitle: 'Present Simple questions, negatives, and short answers with do/does.',
  outcome: 'Alla fine dell’unità saprai costruire frasi con i verbi normali, usare la -s alla terza persona e creare domande, negative e short answers con do/does.',
  grammarPoints: [
    'Normal verbs: live, work, study, speak, like, want, need, enjoy',
    'Present Simple affirmative',
    'Third person -s: he lives / she works',
    'Questions with do/does',
    'Negatives with don’t/doesn’t',
    'Short answers with do/does',
    'Question words with do/does',
    'Useful chunk: enjoy + -ing',
  ],
  activeLanguageOutcomes: [
    'Parlare di dove vivi, lavori o studi.',
    'Chiedere informazioni sulla vita e sul lavoro di un’altra persona.',
    'Esprimere preferenze e necessità con verbi frequenti.',
    'Creare negative e short answers senza confondere be con do/does.',
  ],
  ruleCards: [
    {
      grammarPoint: 'Present Simple with normal verbs',
      explanation: 'Con I, you, we e they usi la forma base del verbo: I work, you live, we study. Il soggetto resta sempre espresso, anche quando in italiano lo ometteresti.',
      activeUse: 'Usi il Present Simple per parlare di lavoro, studio, lingua, preferenze, bisogni e attività abituali.',
      examples: ['I live in Bologna.', 'We study English.', 'They need help.'],
    },
    {
      grammarPoint: 'Third person -s',
      explanation: 'Con he, she e it il verbo affermativo prende normalmente -s: she works, he speaks. Study diventa studies. Questa -s scompare dopo does o doesn’t.',
      activeUse: 'La terza persona ti serve per parlare di colleghi, familiari, clienti o qualsiasi altra persona.',
      examples: ['She works in a hotel.', 'He studies English.', 'Marco lives near here.'],
    },
    {
      grammarPoint: 'Do/does questions',
      explanation: 'In italiano puoi trasformare una frase in domanda cambiando intonazione: “Tu vivi qui?”. In inglese, con i verbi normali, devi usare do o does: Do you live here? / Does she live here?',
      activeUse: 'Usi do/does per fare domande su vita quotidiana, lavoro, studio, preferenze e abilità linguistiche.',
      examples: ['Do you live here?', 'Where do you work?', 'Does she speak English?', 'Do you enjoy swimming?'],
    },
    {
      grammarPoint: 'Don’t/doesn’t and short answers',
      explanation: 'La negativa usa don’t o doesn’t + verbo base: I don’t work / She doesn’t work. Anche la risposta breve riprende l’ausiliare: Yes, I do / No, she doesn’t.',
      activeUse: 'Queste forme ti permettono di negare informazioni e rispondere rapidamente senza ripetere tutta la frase.',
      examples: ['I don’t work on Sundays.', 'She doesn’t speak German.', 'Does he work here? — Yes, he does.'],
    },
    {
      grammarPoint: 'Enjoy + -ing',
      explanation: 'Dopo enjoy usi un verbo in -ing: enjoy swimming, enjoy reading, enjoy working with people. Non dire enjoy to swim in questo uso A1.',
      activeUse: 'Questo chunk ti aiuta a parlare in modo naturale di attività che ti piacciono.',
      examples: ['I enjoy swimming.', 'Do you enjoy working with people?'],
    },
  ],
  italianTransferNotes: [
    {
      title: 'L’intonazione italiana non crea la domanda inglese',
      body: '“Tu lavori qui?” non diventa “You work here?”. Con un verbo normale serve Do you work here? Con he/she/it usa does.',
    },
    {
      title: 'Does prende la -s al posto del verbo',
      body: 'Dopo does il verbo torna alla forma base: Does she work?, non “Does she works?”. Lo stesso vale dopo doesn’t.',
    },
    {
      title: 'Be e verbi normali seguono due motori diversi',
      body: 'Dici Where is she? perché il verbo è be. Dici Where does she live? perché live è un verbo normale. La differenza deve diventare automatica mentre costruisci la frase.',
    },
  ],
  comparison: {
    title: 'Crucial distinction — be questions vs normal verb questions',
    introduction: 'Prima di creare una domanda, identifica il verbo principale. Se è be, inverti be e soggetto. Se è un verbo normale, usa do/does.',
    columns: [
      {
        label: 'Questions with be',
        rule: 'question word + am/is/are + subject',
        examples: ['Where is she?', 'Is he at work?', 'Are they ready?'],
      },
      {
        label: 'Questions with normal verbs',
        rule: 'question word + do/does + subject + base verb',
        examples: ['Where does she live?', 'Does he work here?', 'Do they speak English?'],
      },
    ],
  },
  usefulChunks: [
    'What do you do?',
    'Where do you live?',
    'Does she work here?',
    'I don’t work on Sundays.',
    'She doesn’t speak German.',
    'Do you enjoy swimming?',
  ],
  exercises: [
    {
      id: 'a1-present-recognition',
      level: 'a1',
      track: 'core',
      unit: 'present-simple-normal-verbs',
      type: 'multiple-choice',
      purpose: 'recognition',
      productionMode: 'recognition',
      grammarFocus: 'Present Simple e distinzione be/do',
      skillFocus: 'Grammar recognition',
      title: 'Recognize the sentence engine',
      instructions: 'Scegli la struttura corretta osservando soggetto, verbo e significato.',
      items: [
        choice('present-recognition-1', 'You are describing Sara’s job. Which sentence is correct?', ['She work in a hotel.', 'She works in a hotel.', 'She does works in a hotel.'], 1, thirdPersonDiagnostic('recognition'), { correct: 'Corretto. Con she, il verbo affermativo prende -s.', incorrect: 'In una frase affermativa con she usa works, senza does.' }, 'La terza persona singolare aggiunge -s al verbo affermativo.'),
        choice('present-recognition-2', 'You want to know Sara’s workplace. Which question is correct?', ['Where is Sara work?', 'Where does Sara work?', 'Where does Sara works?'], 1, questionDiagnostic('recognition'), { correct: 'Corretto. La domanda usa does + soggetto + verbo base.', incorrect: 'Work è un verbo normale: usa Where does Sara work?' }, 'Does porta la marca di terza persona, quindi work resta alla forma base.'),
        choice('present-recognition-3', 'Choose the natural question about an activity.', ['Do you enjoy swimming?', 'Are you enjoy swimming?', 'Does you enjoy swim?'], 0, questionDiagnostic('recognition'), { correct: 'Corretto. Con you usa do e dopo enjoy usa swimming.', incorrect: 'La struttura corretta è Do you enjoy swimming?' }, 'Enjoy è un verbo normale e regge spesso un’attività in -ing.'),
        choice('present-recognition-4', 'Which pair uses the correct question engine?', ['Where is she? / Where does she work?', 'Where does she? / Where is she work?', 'Where she is? / Where she works?'], 0, questionDiagnostic('recognition', 3), { correct: 'Corretto. Be si inverte; il verbo normale usa does.', incorrect: 'Distingui Where is she? da Where does she work?' }, 'Il verbo principale determina se usare be oppure do/does.'),
      ],
    },
    {
      id: 'a1-present-controlled-practice',
      level: 'a1',
      track: 'core',
      unit: 'present-simple-normal-verbs',
      type: 'gap-fill',
      purpose: 'controlled-practice',
      productionMode: 'controlled practice',
      grammarFocus: 'Affermative, domande e negative',
      skillFocus: 'Spoken sentence control',
      title: 'Control the form across different sentences',
      instructions: 'Completa ogni frase. Il tipo di struttura cambia da un item all’altro.',
      questionPool: presentSimpleNormalVerbsPool,
      questionCount: 4,
      selectionRules: [
        { count: 1, match: { type: 'blank', grammarFocus: ['present-simple', 'affirmative'] } },
        { count: 1, match: { type: 'blank', grammarFocus: ['present-simple', 'third-person-affirmative'] } },
        { count: 1, match: { type: 'blank', grammarFocus: ['present-simple', 'yes-no-question'] } },
        { count: 1, match: { type: 'blank', grammarFocus: ['present-simple', 'negative'] } },
      ],
    },
    {
      id: 'a1-present-dialogue',
      level: 'a1',
      track: 'core',
      unit: 'present-simple-normal-verbs',
      type: 'dialogue-gap-fill',
      purpose: 'applied-use',
      productionMode: 'applied use',
      grammarFocus: 'Do/does in una conversazione sul lavoro',
      skillFocus: 'Applied question formation',
      title: 'Ask and answer about work',
      instructions: 'Completa il dialogo usando affermative, domande e short answers.',
      lines: [
        { speaker: 'Luca', parts: ['What ', { blankId: 'present-dialogue-1' }, ' you do?'] },
        { speaker: 'Chiara', parts: ['I ', { blankId: 'present-dialogue-2' }, ' in a language school.'] },
        { speaker: 'Luca', parts: [{ blankId: 'present-dialogue-3' }, ' your sister work there too?'] },
        { speaker: 'Chiara', parts: ['No, she ', { blankId: 'present-dialogue-4' }, '. She works in a hotel.'] },
      ],
      items: [
        blank('present-dialogue-1', 'What ___ you do?', ['do'], questionDiagnostic('applied-use'), { correct: 'Corretto. What do you do? chiede il lavoro o l’attività.', incorrect: 'Con you e il verbo do usa l’ausiliare do: What do you do?' }, 'Il primo do è l’ausiliare; il secondo è il verbo principale.'),
        blank('present-dialogue-2', 'I ___ in a language school.', ['work'], sentenceDiagnostic('applied-use'), { correct: 'Corretto. Con I usa work.', incorrect: 'La frase affermativa con I usa il verbo base work.' }, 'Il contesto cambia, ma la forma resta I work.', 'work'),
        blank('present-dialogue-3', '___ your sister work there too?', ['does'], questionDiagnostic('applied-use'), { correct: 'Corretto. Your sister richiede does.', incorrect: 'Con your sister usa Does + soggetto + work.' }, 'Dopo does il verbo principale resta work.', 'work'),
        blank('present-dialogue-4', 'No, she ___.', ["doesn't", 'does not'], shortAnswerDiagnostic('applied-use'), { correct: 'Corretto. La short answer negativa è No, she doesn’t.', incorrect: 'Riprendi l’ausiliare della domanda: No, she doesn’t.' }, 'La risposta breve non ripete il verbo work.'),
      ],
    },
    {
      id: 'a1-present-flexible-production',
      level: 'a1',
      track: 'core',
      unit: 'present-simple-normal-verbs',
      type: 'gap-fill',
      purpose: 'flexible-production',
      productionMode: 'flexible production',
      grammarFocus: 'Italiano → inglese con verbi normali',
      skillFocus: 'Flexible sentence production',
      title: 'Move from Italian meaning to English structure',
      instructions: 'Completa la parte mancante. Non tradurre parola per parola: costruisci la struttura inglese.',
      items: [
        blank('present-flex-1', '“Vivi vicino a qui?” → ___ near here?', ['do you live'], questionDiagnostic('flexible-production', 3, ['overliteral-italian-question-transfer']), { correct: 'Corretto. La domanda completa inizia con Do you live.', incorrect: 'Non basta cambiare intonazione: usa Do you live near here?' }, 'Con un verbo normale, la domanda richiede do + soggetto + verbo base.', 'live'),
        blank('present-flex-2', '“Lei non parla tedesco.” → She ___ German.', ["doesn't speak", 'does not speak'], negativeDiagnostic('flexible-production'), { correct: 'Corretto. Doesn’t è seguito dalla forma base speak.', incorrect: 'Usa doesn’t speak, non isn’t speak o doesn’t speaks.' }, 'La negativa alla terza persona usa doesn’t + verbo base.', 'speak'),
        blank('present-flex-3', '“Ti piace nuotare?” → Do you ___?', ['enjoy swimming'], sentenceDiagnostic('flexible-production', 2, ['enjoy-infinitive-transfer']), { correct: 'Corretto. Dopo enjoy usa swimming.', incorrect: 'Completa con enjoy swimming.' }, 'Il chunk enjoy + -ing rende naturale la frase.', 'enjoy'),
        blank('present-flex-4', '“Dove lavora lei?” → Where ___?', ['does she work'], questionDiagnostic('flexible-production', 3), { correct: 'Corretto. Where does she work? mantiene il verbo alla forma base.', incorrect: 'Costruisci la sequenza: Where + does + she + work.' }, 'L’ordine inglese non segue quello italiano parola per parola.', 'work'),
      ],
    },
    {
      id: 'a1-present-final-check',
      level: 'a1',
      track: 'core',
      unit: 'present-simple-normal-verbs',
      type: 'multiple-choice',
      purpose: 'final-check',
      productionMode: 'final check',
      grammarFocus: 'Present Simple: controllo completo',
      skillFocus: 'Flexible grammar control',
      title: 'Final unit check',
      instructions: 'Scegli la soluzione che mantiene il controllo della struttura in un contesto completo.',
      items: [
        choice('present-final-1', 'Which pair correctly distinguishes location from work?', ['Where is she? / Where does she work?', 'Where does she? / Where is she work?', 'Where she is? / Where she works?'], 0, questionDiagnostic('final-check', 3), { correct: 'Corretto. La posizione usa be; il lavoro usa does + work.', incorrect: 'Usa Where is she? per la posizione e Where does she work? per il verbo normale.' }, 'La scelta dell’ausiliare dipende dal verbo principale.'),
        choice('present-final-2', 'Choose the complete correct exchange.', ['Does he need help? — Yes, he does.', 'Is he need help? — Yes, he is.', 'Does he needs help? — Yes, he need.'], 0, shortAnswerDiagnostic('final-check', 3), { correct: 'Corretto. Domanda e risposta breve usano does.', incorrect: 'Need è un verbo normale: Does he need...? — Yes, he does.' }, 'Dopo does usa need, non needs.'),
        choice('present-final-3', 'Your colleague speaks English but not German. Which sentence is correct?', ["She isn’t speak German.", "She doesn’t speaks German.", "She doesn’t speak German."], 2, negativeDiagnostic('final-check', 3), { correct: 'Corretto. Doesn’t è seguito da speak.', incorrect: 'La negativa corretta è She doesn’t speak German.' }, 'L’ausiliare doesn’t porta la terza persona; il verbo resta base.'),
        choice('present-final-4', 'Which question is natural and grammatically complete?', ['Do you enjoy swimming?', 'Are you enjoy swimming?', 'Do enjoy you swimming?'], 0, questionDiagnostic('final-check', 3), { correct: 'Corretto. La sequenza è Do + you + enjoy + swimming.', incorrect: 'Usa Do you enjoy swimming?' }, 'La domanda combina do/you con il chunk enjoy + -ing.'),
      ],
    },
  ],
  navigation: {
    previous: {
      label: 'Back to A1 English Foundations',
      path: '/grammar/a1',
      description: 'Torna alla panoramica del percorso A1.',
    },
  },
};

export default unitPresentSimpleNormalVerbs;

