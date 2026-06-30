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

const beSentenceDiagnostic = (production, severity = 2) => makeDiagnostic({
  skills: ['spoken-sentence-control', 'sentence-control'],
  grammar: ['subject-pronouns', 'be-present'],
  errorPatterns: ['italian-word-order-transfer'],
  production,
  severity,
});

const beQuestionDiagnostic = (production, severity = 3) => makeDiagnostic({
  skills: ['question-formation', 'spoken-sentence-control'],
  grammar: ['be-present', 'be-question-formation'],
  errorPatterns: ['italian-word-order-transfer'],
  production,
  severity,
});

const shortAnswerDiagnostic = (production, severity = 2) => makeDiagnostic({
  skills: ['short-answer-control', 'spoken-sentence-control'],
  grammar: ['be-present'],
  errorPatterns: ['short-answer-omission'],
  production,
  severity,
});

export const unitBeBasicSentences = {
  id: 'a1-be-basic-sentences',
  slug: 'be-basic-sentences',
  level: 'a1',
  track: 'core',
  title: 'Introduce Yourself',
  displayTitle: 'A1 Unit 1 — Introduce Yourself',
  subtitle: 'Costruisci le prime frasi in inglese con am, is e are.',
  outcome: 'Alla fine dell’unità saprai creare frasi semplici con be, fare domande basilari e dare brevi risposte.',
  grammarPoints: [
    'Subject pronouns: I, you, he, she, it, we, they',
    'Be: am / is / are',
    'Frasi affermative e negative con be',
    'Domande e short answers con be',
    'Question words con be: who, what, where',
    'Location language: here, there, at home, at work, in Italy',
  ],
  activeLanguageOutcomes: [
    'Dire chi sei, da dove vieni e dove ti trovi.',
    'Descrivere lo stato o la posizione di una persona.',
    'Fare domande semplici con be senza tradurre parola per parola.',
    'Rispondere in modo breve ma grammaticalmente completo.',
  ],
  ruleCards: [
    {
      grammarPoint: 'be — am / is / are',
      explanation: 'In italiano diciamo “sono”, “sei”, “è”, ma in inglese devi scegliere la forma giusta di be in base al soggetto: I am, you are, he/she/it is, we/you/they are.',
      activeUse: 'Usi be per dire chi sei, dove sei, come stai, da dove vieni o per descrivere una persona, un luogo o una cosa.',
      examples: ['I am Marco.', 'She is at work.', 'They are from Italy.', 'Are you ready?', 'Where is she?'],
    },
    {
      grammarPoint: 'Negative sentences with be',
      explanation: 'Per creare la forma negativa aggiungi not dopo am, is o are: I am not, she is not, they are not. Nel parlato sono comuni isn’t e aren’t.',
      activeUse: 'La forma negativa serve per correggere un’informazione, dire che non sei pronto o specificare dove una persona non si trova.',
      examples: ['I am not ready.', 'She isn’t at home.', 'They aren’t from Rome.'],
    },
    {
      grammarPoint: 'Questions with be',
      explanation: 'Con be non usi do o does. Sposti am, is o are prima del soggetto: She is ready → Is she ready? They are at work → Are they at work?',
      activeUse: 'Questa struttura ti permette di verificare identità, luogo, stato e provenienza.',
      examples: ['Is he your brother?', 'Are they from Italy?', 'Is she at work?'],
    },
    {
      grammarPoint: 'Who, what and where with be',
      explanation: 'Le question words vengono prima di be: Where is she? What is it? Who are they? Non aggiungere do/does quando il verbo principale è be.',
      activeUse: 'Usi queste domande per identificare persone e cose o chiedere dove si trovano.',
      examples: ['Where is she?', 'What is your job?', 'Who are they?'],
    },
  ],
  italianTransferNotes: [
    {
      title: 'Il soggetto non si può sottintendere',
      body: 'In italiano puoi dire “Sono a casa”. In inglese devi esprimere il soggetto: I am at home. Evita frasi come “Am at home”.',
    },
    {
      title: 'La domanda cambia ordine',
      body: 'L’intonazione italiana non basta. “Lei è al lavoro?” diventa Is she at work?, con is prima del soggetto.',
    },
    {
      title: 'Be non usa do/does',
      body: 'Non dire “Does she be ready?” o “Do they are here?”. Con be, la domanda si forma direttamente: Is she ready? / Are they here?',
    },
  ],
  usefulChunks: [
    'I’m not ready yet.',
    'She’s at work.',
    'Are you from Italy?',
    'Is he your brother?',
    'Where are they?',
    'Yes, I am. / No, I’m not.',
  ],
  exercises: [
    {
      id: 'a1-be-recognition',
      level: 'a1',
      track: 'core',
      unit: 'be-basic-sentences',
      type: 'multiple-choice',
      purpose: 'recognition',
      productionMode: 'recognition',
      grammarFocus: 'Be: frasi, domande e posizione',
      skillFocus: 'Grammar recognition',
      title: 'Recognize flexible uses of be',
      instructions: 'Scegli la frase che completa correttamente ogni situazione.',
      items: [
        choice(
          'be-recognition-1',
          'You are looking for Laura. Which question is correct?',
          ['Where does Laura?', 'Where is Laura?', 'Where Laura is?'],
          1,
          beQuestionDiagnostic('recognition'),
          { correct: 'Corretto. Con be, is viene prima del soggetto.', incorrect: 'Per chiedere dove si trova Laura usa Where is Laura?' },
          'Il verbo principale è be, quindi non serve do/does.',
        ),
        choice(
          'be-recognition-2',
          'Your colleagues are not in the office. Choose the correct sentence.',
          ['They aren’t at work.', 'They don’t at work.', 'They not are at work.'],
          0,
          beSentenceDiagnostic('recognition'),
          { correct: 'Corretto. Aren’t è la forma negativa di are.', incorrect: 'Con they usa are; la negativa è are not oppure aren’t.' },
          'Be forma la negativa con not e non usa don’t.',
        ),
        choice(
          'be-recognition-3',
          'Complete the exchange: “Is he your manager?” — “Yes, ___.”',
          ['he does', 'is he', 'he is'],
          2,
          shortAnswerDiagnostic('recognition'),
          { correct: 'Corretto. La short answer riprende be: Yes, he is.', incorrect: 'La domanda usa is, quindi la risposta breve deve usare is.' },
          'Le short answers ripetono il soggetto e la forma corretta di be.',
        ),
      ],
    },
    {
      id: 'a1-be-controlled-practice',
      level: 'a1',
      track: 'core',
      unit: 'be-basic-sentences',
      type: 'gap-fill',
      purpose: 'controlled-practice',
      productionMode: 'controlled practice',
      grammarFocus: 'Am / is / are in frasi diverse',
      skillFocus: 'Spoken sentence control',
      title: 'Build accurate sentences with be',
      instructions: 'Completa con la forma di be adatta al significato e al soggetto.',
      items: [
        blank('be-control-1', 'My colleagues ___ at work, but I am at home.', ['are'], beSentenceDiagnostic('controlled-practice'), { correct: 'Corretto. My colleagues è plurale, quindi usa are.', incorrect: 'My colleagues equivale a they: serve are.' }, 'La forma di be dipende dal soggetto, non dalla parola successiva.'),
        blank('be-control-2', 'Where ___ your manager today?', ['is'], beQuestionDiagnostic('controlled-practice'), { correct: 'Corretto. Your manager è singolare, quindi usa is.', incorrect: 'La domanda riguarda una persona singolare: Where is your manager?' }, 'Con where + be, metti be prima del soggetto.'),
        blank('be-control-3', 'I ___ not ready yet, but they are ready.', ['am'], beSentenceDiagnostic('controlled-practice'), { correct: 'Corretto. Con I si usa am, anche nella negativa.', incorrect: 'Con I la forma corretta è am: I am not ready.' }, 'La negativa è soggetto + be + not.'),
        blank('be-control-4', '___ Anna and Luca from Italy?', ['are'], beQuestionDiagnostic('controlled-practice'), { correct: 'Corretto. Due persone richiedono are.', incorrect: 'Anna and Luca è un soggetto plurale: Are Anna and Luca...?' }, 'Nelle domande con be, are precede il soggetto plurale.'),
      ],
    },
    {
      id: 'a1-be-dialogue',
      level: 'a1',
      track: 'core',
      unit: 'be-basic-sentences',
      type: 'dialogue-gap-fill',
      purpose: 'applied-use',
      productionMode: 'applied use',
      grammarFocus: 'Be in una conversazione breve',
      skillFocus: 'Applied sentence control',
      title: 'Use be in a first conversation',
      instructions: 'Completa il dialogo mantenendo il controllo di soggetto, domanda e short answer.',
      lines: [
        { speaker: 'Anna', parts: ['Hi, I ', { blankId: 'be-dialogue-1' }, ' Anna.'] },
        { speaker: 'Marco', parts: ['Nice to meet you. I ', { blankId: 'be-dialogue-2' }, ' Marco.'] },
        { speaker: 'Anna', parts: [{ blankId: 'be-dialogue-3' }, ' you from Rome?'] },
        { speaker: 'Marco', parts: ['No, I ', { blankId: 'be-dialogue-4' }, '. I’m from Bari.'] },
      ],
      items: [
        blank('be-dialogue-1', 'I ___ Anna.', ['am'], beSentenceDiagnostic('applied-use'), { correct: 'Corretto. Con I si usa am.', incorrect: 'Per presentarti usa I am + nome.' }, 'Il soggetto I richiede sempre am.'),
        blank('be-dialogue-2', 'I ___ Marco.', ['am'], beSentenceDiagnostic('applied-use'), { correct: 'Corretto. La struttura è I am Marco.', incorrect: 'Con I non usare is o are: usa am.' }, 'La stessa regola deve restare stabile durante il dialogo.'),
        blank('be-dialogue-3', '___ you from Rome?', ['are'], beQuestionDiagnostic('applied-use'), { correct: 'Corretto. La domanda con you inizia con Are.', incorrect: 'Con you, porta are davanti al soggetto: Are you...?' }, 'Le domande con be invertono verbo e soggetto.'),
        blank('be-dialogue-4', 'No, I ___.', ["am not", "'m not"], shortAnswerDiagnostic('applied-use'), { correct: 'Corretto. La risposta breve negativa è No, I’m not.', incorrect: 'Riprendi be nella risposta: No, I am not / I’m not.' }, 'Non rispondere soltanto “No”: completa la short answer con be.'),
      ],
    },
    {
      id: 'a1-be-short-answers',
      level: 'a1',
      track: 'core',
      unit: 'be-basic-sentences',
      type: 'gap-fill',
      purpose: 'flexible-production',
      productionMode: 'flexible production',
      grammarFocus: 'Short answers con be',
      skillFocus: 'Short Answer Control',
      title: 'Answer without rebuilding the whole sentence',
      instructions: 'Completa la risposta breve con la forma corretta di be.',
      items: [
        blank('be-short-1', 'Is she at work? — Yes, she ___.', ['is'], shortAnswerDiagnostic('flexible-production'), { correct: 'Corretto. Yes, she is.', incorrect: 'La domanda usa is: ripeti is nella short answer.' }, 'Le short answers usano pronome + be.'),
        blank('be-short-2', 'Are they ready? — No, they ___.', ["aren't", 'are not'], shortAnswerDiagnostic('flexible-production'), { correct: 'Corretto. No, they aren’t.', incorrect: 'Con they usa are not oppure aren’t.' }, 'La forma negativa breve mantiene lo stesso verbo della domanda.'),
        blank('be-short-3', 'Are you Italian? — Yes, I ___.', ['am'], shortAnswerDiagnostic('flexible-production'), { correct: 'Corretto. Con I la risposta è Yes, I am.', incorrect: 'Anche se la domanda usa are you, la risposta con I usa am.' }, 'La forma di be cambia quando cambia il soggetto della risposta.'),
      ],
    },
    {
      id: 'a1-be-final-check',
      level: 'a1',
      track: 'core',
      unit: 'be-basic-sentences',
      type: 'multiple-choice',
      purpose: 'final-check',
      productionMode: 'final check',
      grammarFocus: 'Be: controllo completo',
      skillFocus: 'Flexible grammar control',
      title: 'Final unit check',
      instructions: 'Scegli la frase o lo scambio corretto senza affidarti a un solo indizio.',
      items: [
        choice('be-final-1', 'You see two people you do not know. What do you ask?', ['Who is they?', 'Who are they?', 'Who do they?'], 1, beQuestionDiagnostic('final-check', 3), { correct: 'Corretto. They richiede are: Who are they?', incorrect: 'Con they usa are e mettilo prima del soggetto.' }, 'Who + are + they forma una domanda completa con be.'),
        choice('be-final-2', 'Choose the correct correction: someone thinks you are at home, but you are at work.', ["I don’t at home. I at work.", 'I’m not at home. I’m at work.', 'I not am at home. I am at work.'], 1, beSentenceDiagnostic('final-check', 3), { correct: 'Corretto. Entrambe le frasi mantengono la struttura con be.', incorrect: 'Usa be sia nella negativa sia nell’affermativa: I’m not... / I’m...' }, 'Be deve comparire in ogni frase e la negativa usa not dopo be.'),
        choice('be-final-3', 'Which exchange is correct?', ['Is he at work? — No, he isn’t.', 'Does he at work? — No, he doesn’t.', 'He is at work? — No, isn’t.'], 0, shortAnswerDiagnostic('final-check', 3), { correct: 'Corretto. Domanda e short answer usano entrambe is.', incorrect: 'Con una posizione usa be: Is he...? — No, he isn’t.' }, 'La short answer deve mantenere il soggetto e il verbo della domanda.'),
        choice('be-final-4', 'Which answer matches “Where is she?”', ['She does at work.', 'She at work.', 'She is at work.'], 2, makeDiagnostic({ skills: ['spoken-sentence-control'], grammar: ['be-present'], errorPatterns: ['basic-location-overtranslation'], production: 'final-check', severity: 3 }), { correct: 'Corretto. La risposta completa richiede She is.', incorrect: 'In inglese la frase ha bisogno di be: She is at work.' }, 'Il soggetto non può restare senza verbo; qui il verbo è is.'),
      ],
    },
  ],
  navigation: {
    next: {
      label: 'Back to A1 English Foundations',
      path: '/grammar/a1',
      description: 'Torna alla panoramica del percorso A1.',
    },
  },
};

export default unitBeBasicSentences;

