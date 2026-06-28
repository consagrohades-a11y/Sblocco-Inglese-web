export const feedbackRuleRegistry = {
  'normal-verb-question-needs-do': {
    key: 'normal-verb-question-needs-do',
    title: 'Usa do/does con i verbi normali',
    learnerMessage: 'Con verbi come live, work, study, like, want e need, la domanda ha bisogno di do o does prima del soggetto.',
    fixRule: 'Chiediti prima se il verbo principale è be. Se non lo è, costruisci la domanda con do/does + soggetto + verbo base.',
    practiceAdvice: 'Ripeti domande brevi come Do you live here?, Does she work here? e Where do they study?',
  },
  'third-person-s-missing': {
    key: 'third-person-s-missing',
    title: 'Ricorda la -s con he, she e it',
    learnerMessage: 'Nelle frasi affermative al Present Simple, he, she e it richiedono normalmente la -s sul verbo.',
    fixRule: 'Controlla il soggetto: con he, she o it usa works, lives, needs; study diventa studies.',
    practiceAdvice: 'Descrivi tre persone con frasi brevi: She works..., He lives..., Marco studies....',
  },
  'does-followed-by-base-verb': {
    key: 'does-followed-by-base-verb',
    title: 'Dopo does usa il verbo base',
    learnerMessage: 'Does porta già la forma della terza persona, quindi il verbo successivo non prende la -s.',
    fixRule: 'Usa Does she work? e She doesn’t work, non does...works o doesn’t...works.',
    practiceAdvice: 'Trasforma coppie come She works → Does she work? → She doesn’t work.',
  },
  'present-simple-negative-needs-dont-doesnt': {
    key: 'present-simple-negative-needs-dont-doesnt',
    title: 'Costruisci la negativa con don’t/doesn’t',
    learnerMessage: 'Con i verbi normali, la negativa del Present Simple usa don’t o doesn’t prima del verbo.',
    fixRule: 'Usa don’t con I/you/we/they e doesn’t con he/she/it, poi mantieni il verbo alla forma base.',
    practiceAdvice: 'Alterna affermativa e negativa: I work / I don’t work; She speaks / She doesn’t speak.',
  },
  'short-answer-uses-auxiliary': {
    key: 'short-answer-uses-auxiliary',
    title: 'Riprendi do/does nella risposta breve',
    learnerMessage: 'Le risposte brevi riprendono l’ausiliare della domanda invece di ripetere il verbo principale.',
    fixRule: 'Rispondi Yes, I do / No, I don’t oppure Yes, she does / No, she doesn’t.',
    practiceAdvice: 'Abbina ogni domanda a due risposte brevi: una positiva e una negativa.',
  },
};
