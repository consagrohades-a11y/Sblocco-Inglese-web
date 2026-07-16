export const assessmentQuestions = [
  {
    id: 'goal',
    section: 'Obiettivo',
    eyebrow: 'Il punto di partenza',
    title: 'Dove vuoi sentire la differenza per prima?',
    description:
      'Scegli il contesto che conta di più adesso. Il risultato terrà conto anche delle competenze pratiche che mostrerai.',
    type: 'single',
    options: [
      {
        value: 'business',
        label: 'Lavoro e Business English',
        description:
          'Riunioni, call, clienti, aggiornamenti e comunicazione professionale.',
      },
      {
        value: 'interview',
        label: 'Colloquio o selezione',
        description:
          'Presentarti, raccontare l’esperienza e gestire domande impreviste.',
      },
      {
        value: 'everyday',
        label: 'Vita quotidiana e viaggi',
        description:
          'Conversazioni, spostamenti, richieste, imprevisti e socialità.',
      },
      {
        value: 'hospitality',
        label: 'Clienti e hospitality',
        description:
          'Accoglienza, servizio, raccomandazioni, problemi e customer care.',
      },
      {
        value: 'foundations',
        label: 'Ricostruire le basi',
        description:
          'Frasi, domande, tempi essenziali e sicurezza nelle strutture.',
      },
      {
        value: 'team',
        label: 'Formazione per un team',
        description:
          'Un percorso per colleghi, dipendenti o un gruppo professionale.',
      },
    ],
  },
  {
    id: 'situations',
    section: 'Obiettivo',
    eyebrow: 'Le situazioni reali',
    title: 'In quali momenti senti maggiormente il limite?',
    description: 'Puoi scegliere fino a quattro situazioni.',
    type: 'multiple',
    maxSelections: 4,
    options: [
      { value: 'meetings', label: 'Riunioni e call' },
      { value: 'clients', label: 'Clienti e richieste' },
      { value: 'updates', label: 'Aggiornamenti e problemi' },
      { value: 'presentations', label: 'Presentazioni e spiegazioni' },
      { value: 'interviews', label: 'Colloqui e selezioni' },
      {
        value: 'fast-listening',
        label: 'Capire persone che parlano velocemente',
      },
      { value: 'travel', label: 'Viaggi e situazioni quotidiane' },
      { value: 'social', label: 'Conversazioni spontanee' },
    ],
  },
  {
    id: 'speaking_blocker',
    section: 'Come lo vivi',
    eyebrow: 'Quando devi rispondere',
    title: 'Cosa succede più spesso mentre parli?',
    description:
      'Scegli la risposta che descrive meglio il momento reale, non quello ideale.',
    type: 'single',
    options: [
      {
        value: 'freeze',
        label: 'Mi blocco quasi completamente',
        description: 'So che dovrei dire qualcosa, ma non riesco a partire.',
      },
      {
        value: 'translate',
        label: 'Traduco mentalmente e arrivo tardi',
        description:
          'La frase nasce in italiano e perde ritmo mentre la costruisco.',
      },
      {
        value: 'vocabulary',
        label: 'Conosco le parole, ma non mi vengono',
        description:
          'Riconosco molto più inglese di quello che riesco a recuperare.',
      },
      {
        value: 'grammar',
        label: 'La grammatica interrompe il messaggio',
        description:
          'Controllo ogni frase e perdo il filo della conversazione.',
      },
      {
        value: 'pronunciation',
        label: 'Temo di non essere capito/a',
        description:
          'Pronuncia e intelligibilità mi fanno ridurre ciò che dico.',
      },
      {
        value: 'comfortable',
        label: 'Riesco normalmente a continuare',
        description:
          'Posso esitare, ma il messaggio arriva e la conversazione prosegue.',
      },
    ],
  },
  {
    id: 'listening_blocker',
    section: 'Come lo vivi',
    eyebrow: 'Quando ascolti',
    title: 'Quale difficoltà descrive meglio il tuo listening?',
    description:
      'Il problema non è sempre “non capisco”. Spesso riguarda dettagli, velocità o capacità di reagire.',
    type: 'single',
    options: [
      {
        value: 'lost',
        label: 'Perdo il senso generale',
        description: 'Dopo alcune frasi non so più cosa stia succedendo.',
      },
      {
        value: 'speed',
        label: 'Capisco solo quando parlano lentamente',
        description:
          'Le parole conosciute diventano difficili a velocità naturale.',
      },
      {
        value: 'details',
        label: 'Capisco il tema, ma perdo i dettagli',
        description: 'Scadenze, numeri, richieste e decisioni mi sfuggono.',
      },
      {
        value: 'accents',
        label: 'Accenti e pronunce diverse mi confondono',
        description: 'La comprensione cambia molto in base alla persona.',
      },
      {
        value: 'response',
        label: 'Capisco, ma non riesco a rispondere in tempo',
        description: 'Elaborare e formulare la risposta insieme è difficile.',
      },
      {
        value: 'comfortable',
        label: 'Di solito capisco ciò che mi serve',
        description:
          'Posso perdere qualcosa, ma seguo e reagisco con sufficiente autonomia.',
      },
    ],
  },
  {
    id: 'foundations',
    section: 'Come lo vivi',
    eyebrow: 'Le fondamenta',
    title: 'Quanto sono stabili le strutture di base?',
    description:
      'Pensa a frasi, domande, presente, passato e futuro essenziale.',
    type: 'single',
    options: [
      {
        value: 'fragile',
        label: 'Molto fragili',
        description:
          'Faccio fatica anche a costruire frasi semplici senza aiuto.',
      },
      {
        value: 'basic',
        label: 'Riesco nelle frasi semplici',
        description:
          'Quando la frase si allunga, iniziano confusione e molti errori.',
      },
      {
        value: 'developing',
        label: 'Abbastanza presenti, ma instabili',
        description:
          'Comunico, anche se alcune strutture continuano a crollare sotto pressione.',
      },
      {
        value: 'solid',
        label: 'Generalmente solide',
        description:
          'Gli errori esistono, ma raramente impediscono di comunicare.',
      },
    ],
  },
  {
    id: 'level',
    section: 'Come lo vivi',
    eyebrow: 'Il livello percepito',
    title: 'Dove ti collocheresti oggi?',
    description:
      'Non deve essere perfetto. Confronteremo questa percezione con le risposte pratiche.',
    type: 'single',
    options: [
      { value: 'beginner', label: 'Principiante assoluto o quasi' },
      { value: 'a1', label: 'A1, basi iniziali' },
      { value: 'a2', label: 'A2, riesco nelle situazioni semplici' },
      { value: 'b1', label: 'B1, comunico ma con limiti evidenti' },
      { value: 'b2', label: 'B2, abbastanza autonomo/a' },
      { value: 'c1', label: 'C1, avanzato ma con obiettivi specifici' },
      { value: 'unsure', label: 'Non ne ho idea' },
    ],
  },
  {
    id: 'present_question',
    section: 'English in action',
    eyebrow: 'Strutture pratiche 1 di 4',
    title: 'Completa la domanda più naturale.',
    description: 'How often ___ you speak English at work?',
    type: 'single',
    correctAnswer: 'b',
    options: [
      { value: 'a', label: 'are' },
      { value: 'b', label: 'do' },
      { value: 'c', label: 'does' },
      { value: 'd', label: 'have' },
    ],
  },
  {
    id: 'past_update',
    section: 'English in action',
    eyebrow: 'Strutture pratiche 2 di 4',
    title: 'Scegli la frase corretta.',
    description: 'Ieri abbiamo inviato la versione finale al cliente.',
    type: 'single',
    correctAnswer: 'a',
    options: [
      {
        value: 'a',
        label: 'Yesterday we sent the final version to the client.',
      },
      {
        value: 'b',
        label: 'Yesterday we sended the final version to the client.',
      },
      {
        value: 'c',
        label: 'Yesterday we have send the final version to the client.',
      },
      {
        value: 'd',
        label: 'Yesterday we were send the final version to the client.',
      },
    ],
  },
  {
    id: 'future_intention',
    section: 'English in action',
    eyebrow: 'Strutture pratiche 3 di 4',
    title: 'Completa la frase.',
    description:
      'We ___ launch the new service next month. The plan is already approved.',
    type: 'single',
    correctAnswer: 'c',
    options: [
      { value: 'a', label: 'will to' },
      { value: 'b', label: 'going' },
      { value: 'c', label: 'are going to' },
      { value: 'd', label: 'are go to' },
    ],
  },
  {
    id: 'information_quantity',
    section: 'English in action',
    eyebrow: 'Strutture pratiche 4 di 4',
    title: 'Quale frase è corretta e naturale?',
    description: 'Devi chiedere altri dettagli sul nuovo orario.',
    type: 'single',
    correctAnswer: 'b',
    options: [
      {
        value: 'a',
        label: 'Could you send me more informations about the new schedule?',
      },
      {
        value: 'b',
        label:
          'Could you send me some more information about the new schedule?',
      },
      {
        value: 'c',
        label: 'Could you send me an information about the new schedule?',
      },
      {
        value: 'd',
        label: 'Could you send me many information about the new schedule?',
      },
    ],
  },
  {
    id: 'meeting_naturalness',
    section: 'English in action',
    eyebrow: 'In riunione 1 di 4',
    title: 'Non sei convinto/a da una proposta. Cosa suona meglio?',
    description:
      'Scegli la risposta che mantiene il confronto professionale e diretto.',
    type: 'single',
    correctAnswer: 'd',
    options: [
      {
        value: 'a',
        label: 'I do not agree with you because this idea is wrong.',
      },
      { value: 'b', label: 'I am not agree, this cannot function.' },
      { value: 'c', label: 'For me no, we need another thing.' },
      {
        value: 'd',
        label:
          'I see your point, but I’m not sure this will solve the main issue.',
      },
    ],
  },
  {
    id: 'clarification',
    section: 'English in action',
    eyebrow: 'In riunione 2 di 4',
    title: 'Hai perso l’ultimo passaggio. Come chiedi di ripeterlo?',
    description: 'La frase deve essere naturale e abbastanza professionale.',
    type: 'single',
    correctAnswer: 'a',
    options: [
      { value: 'a', label: 'Sorry, could you go over the last point again?' },
      { value: 'b', label: 'Can you repeat again what you have said before?' },
      { value: 'c', label: 'I didn’t listen. Say it another time.' },
      { value: 'd', label: 'Excuse me, I have not understood nothing.' },
    ],
  },
  {
    id: 'delay_update',
    section: 'English in action',
    eyebrow: 'In riunione 3 di 4',
    title: 'Qual è l’aggiornamento più chiaro?',
    description:
      'Il progetto è in ritardo di due giorni perché manca l’approvazione finale.',
    type: 'single',
    correctAnswer: 'c',
    options: [
      {
        value: 'a',
        label: 'The project has a delay because we wait the final approval.',
      },
      { value: 'b', label: 'We are late of two days for the final approval.' },
      {
        value: 'c',
        label:
          'We’re running two days behind schedule because we’re still waiting for final approval.',
      },
      {
        value: 'd',
        label:
          'The project is delayed since two days because approval is missing.',
      },
    ],
  },
  {
    id: 'vocabulary_context',
    section: 'English in action',
    eyebrow: 'In riunione 4 di 4',
    title: 'Scegli la parola giusta.',
    description: 'We need to finish this by Friday. Friday is our ___.',
    type: 'single',
    correctAnswer: 'b',
    options: [
      { value: 'a', label: 'shift' },
      { value: 'b', label: 'deadline' },
      { value: 'c', label: 'request' },
      { value: 'd', label: 'issue' },
    ],
  },
  {
    id: 'scenario_delay',
    section: 'English in action',
    eyebrow: 'Scenario reale 1 di 2',
    title: 'Un collega chiede perché la consegna sarà in ritardo.',
    description:
      'Quale risposta dà causa, conseguenza e prossimo aggiornamento con maggiore chiarezza?',
    type: 'single',
    correctAnswer: 'a',
    options: [
      {
        value: 'a',
        label:
          'We’re waiting for the supplier’s confirmation, so delivery will be two days late. I’ll update you by 3 p.m.',
      },
      {
        value: 'b',
        label:
          'There is a problem with the supplier and the delivery is not possible at the moment.',
      },
      {
        value: 'c',
        label:
          'The supplier didn’t answer, therefore maybe we will have a delay, I don’t know.',
      },
      { value: 'd', label: 'Because of the supplier. I’ll let you know.' },
    ],
  },
  {
    id: 'scenario_clarify',
    section: 'English in action',
    eyebrow: 'Scenario reale 2 di 2',
    title: 'La richiesta del cliente non è chiara.',
    description:
      'Quale risposta controlla la comprensione senza sembrare insicura?',
    type: 'single',
    correctAnswer: 'd',
    options: [
      { value: 'a', label: 'I don’t understand what you want.' },
      { value: 'b', label: 'Can you explain better your request?' },
      { value: 'c', label: 'What do you mean exactly with this?' },
      {
        value: 'd',
        label:
          'Just to make sure I understood, would you like us to change the design or only the wording?',
      },
    ],
  },
  {
    id: 'listening_01',
    section: 'Listening reale',
    eyebrow: 'Messaggio 1 di 3',
    title: 'Ascolta l’aggiornamento e rispondi a entrambe le domande.',
    description:
      'La voce è reale e il testo non viene mostrato. Puoi riascoltare, ma prova prima con un solo ascolto.',
    type: 'listening',
    audioSrc: '/audio/assessment/assessment-listening-01.m4a.mp3',
    replayKey: 'listening_01_replays',
    audioPrompt: 'Un breve aggiornamento su una call e una scadenza.',
    items: [
      {
        id: 'meeting',
        prompt: 'Quando si terrà la call?',
        correctAnswer: 'c',
        options: [
          { value: 'a', label: 'Martedì mattina' },
          { value: 'b', label: 'Mercoledì a pranzo' },
          { value: 'c', label: 'Giovedì alle 15:30' },
          { value: 'd', label: 'Venerdì alle 15:00' },
        ],
      },
      {
        id: 'budget',
        prompt: 'Entro quando deve essere inviato il budget aggiornato?',
        correctAnswer: 'b',
        options: [
          { value: 'a', label: 'Martedì sera' },
          { value: 'b', label: 'Mercoledì a ora di pranzo' },
          { value: 'c', label: 'Giovedì mattina' },
          { value: 'd', label: 'Dopo la call' },
        ],
      },
    ],
  },
  {
    id: 'listening_02',
    section: 'Listening reale',
    eyebrow: 'Messaggio 2 di 3',
    title: 'Ascolta il ragionamento e individua il problema reale.',
    description:
      'Qui non basta riconoscere una parola. Devi capire la preoccupazione del cliente e la risposta proposta.',
    type: 'listening',
    audioSrc: '/audio/assessment/assessment-listening-02.m4a.mp3',
    replayKey: 'listening_02_replays',
    audioPrompt:
      'Un commento informale su una proposta e sulle possibilità di convincere il cliente.',
    items: [
      {
        id: 'concern',
        prompt: 'Qual è la vera preoccupazione del cliente?',
        correctAnswer: 'a',
        options: [
          { value: 'a', label: 'La durata dell’implementazione' },
          { value: 'b', label: 'Il prezzo della proposta' },
          { value: 'c', label: 'La qualità del prodotto' },
          { value: 'd', label: 'La disponibilità del team' },
        ],
      },
      {
        id: 'action',
        prompt: 'Cosa potrebbe aumentare le possibilità di successo?',
        correctAnswer: 'd',
        options: [
          { value: 'a', label: 'Ridurre il prezzo senza cambiare altro' },
          { value: 'b', label: 'Rimandare la presentazione' },
          { value: 'c', label: 'Aggiungere più funzionalità alla proposta' },
          {
            value: 'd',
            label: 'Accorciare i tempi o spiegare meglio la prima fase',
          },
        ],
      },
    ],
  },
  {
    id: 'listening_03',
    section: 'Listening reale',
    eyebrow: 'Messaggio 3 di 3',
    title: 'Ascolta le informazioni pratiche.',
    description: 'Concentrati sugli orari e sul servizio aggiuntivo offerto.',
    type: 'listening',
    audioSrc: '/audio/assessment/assessment-listening-03.m4a.mp3',
    replayKey: 'listening_03_replays',
    audioPrompt:
      'Un messaggio di accoglienza con orari e assistenza per il giorno successivo.',
    items: [
      {
        id: 'hours',
        prompt: 'Quale combinazione di orari è corretta?',
        correctAnswer: 'b',
        options: [
          {
            value: 'a',
            label: 'Colazione 7:30-10:00, ristorante fino alle 21:00',
          },
          {
            value: 'b',
            label: 'Colazione 7:00-10:00, ristorante fino alle 21:30',
          },
          {
            value: 'c',
            label: 'Colazione 7:00-9:30, ristorante fino alle 22:00',
          },
          {
            value: 'd',
            label: 'Colazione 8:00-10:00, ristorante fino alle 21:30',
          },
        ],
      },
      {
        id: 'service',
        prompt: 'Quale aiuto viene offerto?',
        correctAnswer: 'c',
        options: [
          { value: 'a', label: 'Prenotare un tavolo per la sera' },
          { value: 'b', label: 'Cambiare la camera' },
          { value: 'c', label: 'Prenotare un taxi per la mattina successiva' },
          { value: 'd', label: 'Portare la colazione in camera' },
        ],
      },
    ],
  },
  {
    id: 'urgency',
    section: 'Il percorso',
    eyebrow: 'Le tempistiche',
    title: 'Hai una scadenza concreta?',
    description: 'L’urgenza cambia il tipo di percorso più utile.',
    type: 'single',
    options: [
      { value: 'seven_days', label: 'Sì, entro 7 giorni' },
      { value: 'one_month', label: 'Sì, entro un mese' },
      {
        value: 'three_months',
        label: 'Voglio risultati nei prossimi 2-3 mesi',
      },
      { value: 'no_deadline', label: 'Nessuna scadenza precisa' },
    ],
  },
  {
    id: 'commitment',
    section: 'Il percorso',
    eyebrow: 'Il ritmo sostenibile',
    title: 'Quanto tempo puoi dedicare ogni settimana?',
    description:
      'Una risposta realistica vale più di una promessa ambiziosa che poi diventa impossibile mantenere.',
    type: 'single',
    options: [
      { value: 'under_one', label: 'Meno di un’ora' },
      { value: 'one_two', label: '1-2 ore' },
      { value: 'two_three', label: '2-3 ore' },
      { value: 'four_plus', label: '4 ore o più' },
    ],
  },
  {
    id: 'format',
    section: 'Il percorso',
    eyebrow: 'Il formato',
    title: 'Come preferiresti lavorare?',
    description:
      'Non è un impegno definitivo. Serve a capire quale proposta avrebbe più senso per te.',
    type: 'single',
    options: [
      {
        value: 'group',
        label: 'Piccolo gruppo',
        description:
          'Mi aiuta confrontarmi con altre persone e praticare situazioni diverse.',
      },
      {
        value: 'private',
        label: 'Percorso individuale',
        description:
          'Ho esigenze molto specifiche o tempi difficili da coordinare.',
      },
      {
        value: 'hybrid',
        label: 'Valuterei entrambe le opzioni',
        description: 'Scelgo in base a struttura, orari e obiettivo.',
      },
      {
        value: 'unsure',
        label: 'Non lo so ancora',
        description: 'Prima voglio capire cosa mi sarebbe davvero utile.',
      },
    ],
  },
];

const courseCatalog = {
  business: {
    key: 'business-english-flow',
    name: 'Business English Flow',
    price: 'Cohort fondatrice: €199',
    route: '/corsi/business-english-flow',
    cta: 'Scopri la cohort',
  },
  speaking: {
    key: 'speaking-under-pressure',
    name: 'Speaking Under Pressure',
    price: 'Prezzo previsto: €159',
    route: '/percorsi',
    cta: 'Entra nella lista prioritaria',
  },
  interview: {
    key: 'interview-sprint',
    name: 'Interview Sprint',
    price: 'Da €229',
    route: '/contatti',
    cta: 'Richiedi informazioni',
  },
  foundations: {
    key: 'english-foundations',
    name: 'English Foundations',
    price: 'Da €199 per modulo',
    route: '/percorsi',
    cta: 'Entra nella lista d’interesse',
  },
  everyday: {
    key: 'everyday-english-flow',
    name: 'Everyday English Flow',
    price: 'Prezzo previsto: €179',
    route: '/percorsi',
    cta: 'Entra nella lista d’interesse',
  },
  listening: {
    key: 'listening-response-lab',
    name: 'Listening & Response Lab',
    price: 'Prezzo previsto: €99',
    route: '/percorsi',
    cta: 'Entra nella lista d’interesse',
  },
  private: {
    key: 'private-coaching',
    name: 'Private Coaching',
    price: 'Da €219 per 4 settimane',
    route: '/contatti',
    cta: 'Parla del tuo obiettivo',
  },
  team: {
    key: 'team-training',
    name: 'Team Training',
    price: 'Preventivo su obiettivi e numero di partecipanti',
    route: '/contatti',
    cta: 'Richiedi una consulenza team',
  },
};

const structureKeys = [
  'present_question',
  'past_update',
  'future_intention',
  'information_quantity',
];
const functionalKeys = [
  'meeting_naturalness',
  'clarification',
  'delay_update',
  'vocabulary_context',
  'scenario_delay',
  'scenario_clarify',
];
const listeningQuestionIds = ['listening_01', 'listening_02', 'listening_03'];

const clamp = (value) => Math.max(12, Math.min(94, Math.round(value)));

function levelScore(value) {
  return (
    { beginner: 22, a1: 34, a2: 50, b1: 68, b2: 82, c1: 91, unsure: 50 }[
      value
    ] || 50
  );
}

function levelName(value) {
  return (
    {
      beginner: 'Principiante o quasi',
      a1: 'A1 percepito',
      a2: 'A2 percepito',
      b1: 'B1 percepito',
      b2: 'B2 percepito',
      c1: 'C1 percepito',
      unsure: 'Livello non indicato',
    }[value] || 'Livello non indicato'
  );
}

function foundationScore(value) {
  return { fragile: 24, basic: 43, developing: 63, solid: 82 }[value] || 50;
}

function speakingScore(value) {
  return (
    {
      freeze: 24,
      translate: 39,
      vocabulary: 46,
      grammar: 44,
      pronunciation: 55,
      comfortable: 82,
    }[value] || 50
  );
}

function listeningSelfScore(value) {
  return (
    {
      lost: 25,
      speed: 42,
      details: 52,
      accents: 49,
      response: 45,
      comfortable: 82,
    }[value] || 50
  );
}

function retrievalScore(value) {
  return (
    {
      freeze: 34,
      translate: 40,
      vocabulary: 30,
      grammar: 52,
      pronunciation: 60,
      comfortable: 80,
    }[value] || 50
  );
}

function levelLabel(score) {
  if (score < 38) return 'Da costruire';
  if (score < 58) return 'In sviluppo';
  if (score < 75) return 'Abbastanza presente';
  return 'Solido';
}

function observedLabel(score) {
  if (score < 35) return 'Fondamenta iniziali';
  if (score < 55) return 'Comunicazione essenziale';
  if (score < 72) return 'Autonomia in sviluppo';
  if (score < 86) return 'Autonomia pratica';
  return 'Uso solido e flessibile';
}

function performanceScore(percent) {
  return 18 + percent * 0.76;
}

function correctPercent(keys, answers) {
  const questions = assessmentQuestions.filter((question) =>
    keys.includes(question.id),
  );
  const correct = questions.filter(
    (question) => answers[question.id] === question.correctAnswer,
  ).length;
  return {
    correct,
    total: questions.length,
    percent: questions.length ? (correct / questions.length) * 100 : 0,
  };
}

function listeningPerformance(answers) {
  let correct = 0;
  let total = 0;
  let totalReplays = 0;
  let includedListeningCount = 0;
  let unavailableCount = 0;

  listeningQuestionIds.forEach((questionId) => {
    const question = assessmentQuestions.find((item) => item.id === questionId);
    const selected = answers[questionId] || {};
    if (selected._unavailable) {
      unavailableCount += 1;
      return;
    }
    includedListeningCount += 1;
    question.items.forEach((item) => {
      total += 1;
      if (selected[item.id] === item.correctAnswer) correct += 1;
    });
    totalReplays += Number(answers[question.replayKey] || 0);
  });

  const percent = total ? (correct / total) * 100 : 0;
  const replayPenalty = Math.min(
    12,
    Math.max(0, totalReplays - includedListeningCount) * 2,
  );
  return {
    correct,
    total,
    percent,
    totalReplays,
    unavailableCount,
    score: total
      ? Math.max(12, performanceScore(percent) - replayPenalty)
      : null,
  };
}

const blockerCopy = {
  foundations: {
    title: 'Le fondamenta non sono ancora abbastanza automatiche',
    summary:
      'Le risposte pratiche mostrano che frasi, domande e tempi essenziali richiedono ancora troppo controllo. La priorità è rendere affidabili le strutture che servono davvero, poi aumentare velocità e complessità.',
  },
  listening: {
    title: 'Il listening assorbe troppa energia',
    summary:
      'Nei messaggi a velocità naturale perdi informazioni centrali o dettagli operativi. Ti serve un ascolto guidato che termini sempre con una decisione, una risposta o un’azione concreta.',
  },
  response: {
    title: 'Sai più inglese di quanto riesci a usare sotto pressione',
    summary:
      'Riconosci una parte importante della lingua, ma scegliere una risposta chiara mentre qualcuno aspetta resta difficile. Il lavoro deve allenare tempi di risposta, strategie di continuità e comunicazione funzionale.',
  },
  retrieval: {
    title: 'Il linguaggio non arriva abbastanza velocemente',
    summary:
      'Parole ed espressioni sono spesso riconoscibili, ma non ancora disponibili quando devi usarle. Il lavoro deve collegare recupero attivo, Trainer e roleplay dentro situazioni reali.',
  },
};

export function buildAssessmentResult(answers = {}) {
  const structure = correctPercent(structureKeys, answers);
  const functional = correctPercent(functionalKeys, answers);
  const practicalCorrect = structure.correct + functional.correct;
  const practicalTotal = structure.total + functional.total;
  const practicalPercent = practicalTotal
    ? (practicalCorrect / practicalTotal) * 100
    : 0;
  const listening = listeningPerformance(answers);

  const structurePerformance = performanceScore(structure.percent);
  const functionalPerformance = performanceScore(functional.percent);
  const listeningCoverage =
    (listeningQuestionIds.length - listening.unavailableCount) /
    listeningQuestionIds.length;
  const listeningDimensionWeight =
    listening.score === null ? 0 : 0.75 * listeningCoverage;
  const rawFoundation =
    structurePerformance * 0.72 +
    foundationScore(answers.foundations) * 0.18 +
    levelScore(answers.level) * 0.1;
  const rawListening =
    listening.score === null
      ? listeningSelfScore(answers.listening_blocker)
      : listening.score * listeningDimensionWeight +
        listeningSelfScore(answers.listening_blocker) *
          (1 - listeningDimensionWeight);
  const rawResponse =
    functionalPerformance * 0.68 +
    speakingScore(answers.speaking_blocker) * 0.32;
  const rawRetrieval =
    functionalPerformance * 0.48 +
    structurePerformance * 0.18 +
    retrievalScore(answers.speaking_blocker) * 0.34;

  const dimensions = [
    {
      key: 'foundations',
      label: 'Strutture e fondamenta',
      score: clamp(rawFoundation),
    },
    {
      key: 'listening',
      label: 'Comprensione in tempo reale',
      score: clamp(rawListening),
    },
    {
      key: 'response',
      label: 'Risposta funzionale',
      score: clamp(rawResponse),
    },
    {
      key: 'retrieval',
      label: 'Recupero di parole ed espressioni',
      score: clamp(rawRetrieval),
    },
  ].map((dimension) => ({ ...dimension, level: levelLabel(dimension.score) }));

  const listeningObservedWeight =
    listening.score === null ? 0 : 0.3 * listeningCoverage;
  const observedScore = clamp(
    performanceScore(practicalPercent) * (1 - listeningObservedWeight) +
      (listening.score || 0) * listeningObservedWeight,
  );
  const selfReportedScore = levelScore(answers.level);
  const scoreGap = observedScore - selfReportedScore;

  let alignmentTitle = 'Percezione e performance sono abbastanza allineate';
  let alignmentSummary =
    'Il livello che hai indicato è coerente con ciò che hai mostrato nelle domande pratiche e nei listening.';
  if (scoreGap >= 13) {
    alignmentTitle = 'Hai mostrato più risorse di quanto pensi';
    alignmentSummary =
      'Nelle risposte pratiche hai ottenuto un risultato superiore alla tua autovalutazione. La priorità potrebbe essere trasformare queste conoscenze in sicurezza e velocità.';
  } else if (scoreGap <= -14) {
    alignmentTitle = 'Alcune competenze vanno rese più affidabili';
    alignmentSummary =
      'La tua autovalutazione è più alta della performance osservata in questa prova breve. Non significa che tu non sappia l’inglese: indica quali strutture e situazioni cedono quando devi scegliere rapidamente.';
  }

  const primary = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const primaryCopy = blockerCopy[primary.key];
  const goal = answers.goal;
  const urgentInterview =
    goal === 'interview' &&
    ['seven_days', 'one_month'].includes(answers.urgency);
  const needsFoundations =
    dimensions.find((item) => item.key === 'foundations').score < 48 ||
    structure.percent < 45;
  const listeningIsPrimary = primary.key === 'listening';
  const responseIsPrimary = ['response', 'retrieval'].includes(primary.key);
  const prefersPrivate = answers.format === 'private';

  let course = courseCatalog.business;
  if (goal === 'team') course = courseCatalog.team;
  else if (urgentInterview) course = courseCatalog.interview;
  else if (needsFoundations) course = courseCatalog.foundations;
  else if (prefersPrivate) course = courseCatalog.private;
  else if (goal === 'everyday')
    course = listeningIsPrimary
      ? courseCatalog.listening
      : courseCatalog.everyday;
  else if (goal === 'interview') course = courseCatalog.interview;
  else if (listeningIsPrimary && !['business', 'hospitality'].includes(goal))
    course = courseCatalog.listening;
  else if (responseIsPrimary && !['business', 'hospitality'].includes(goal))
    course = courseCatalog.speaking;
  else if (['business', 'hospitality'].includes(goal))
    course = courseCatalog.business;

  const betaEligible =
    course.key === 'business-english-flow' &&
    observedScore >= 48 &&
    dimensions.find((item) => item.key === 'foundations').score >= 48 &&
    !['beginner', 'a1'].includes(answers.level) &&
    answers.commitment !== 'under_one' &&
    answers.urgency !== 'seven_days';

  const situationLabels = {
    meetings: 'riunioni e call',
    clients: 'clienti',
    updates: 'aggiornamenti e problemi',
    presentations: 'presentazioni',
    interviews: 'colloqui',
    'fast-listening': 'listening veloce',
    travel: 'viaggi',
    social: 'conversazioni spontanee',
  };
  const selectedSituations = Array.isArray(answers.situations)
    ? answers.situations.map((item) => situationLabels[item]).filter(Boolean)
    : [];

  const recommendationReason =
    course.key === 'business-english-flow'
      ? 'La prova mostra fondamenta sufficienti per lavorare su interazioni professionali reali, ma ascolto, recupero del linguaggio o risposta funzionale limitano ancora quanto partecipi.'
      : course.key === 'english-foundations'
        ? 'Le risposte pratiche indicano che conviene rendere più affidabili le strutture essenziali prima di spingere sulla velocità. In questo modo la conversazione richiederà meno controllo mentale.'
        : course.key === 'interview-sprint'
          ? 'Hai un obiettivo definito e una scadenza che richiede lavoro mirato su risposte, esempi professionali e gestione delle domande successive.'
          : course.key === 'listening-response-lab'
            ? 'La difficoltà principale riguarda ciò che succede tra ascolto, identificazione dei dettagli e costruzione della risposta.'
            : course.key === 'speaking-under-pressure'
              ? 'La priorità è ridurre il blocco, la traduzione mentale e il tempo necessario per trasformare un’idea in una risposta completa.'
              : course.key === 'private-coaching'
                ? 'Il tuo formato preferito e la specificità dell’obiettivo indicano che un lavoro individuale potrebbe essere più efficiente.'
                : course.key === 'team-training'
                  ? 'La necessità riguarda più persone e richiede obiettivi, situazioni e misurazione condivisi a livello di team.'
                  : 'Il percorso più adatto deve trasformare l’inglese conosciuto in autonomia nelle situazioni quotidiane che hai indicato.';

  return {
    version: 3,
    profileKey: primary.key,
    primaryTitle: primaryCopy.title,
    primarySummary: primaryCopy.summary,
    dimensions,
    performance: {
      observedScore,
      observedLabel: observedLabel(observedScore),
      selfReportedScore,
      selfReportedLabel: levelName(answers.level),
      practicalScore: clamp(performanceScore(practicalPercent)),
      practicalCorrect,
      practicalTotal,
      listeningScore: listening.score === null ? null : clamp(listening.score),
      listeningCorrect: listening.correct,
      listeningTotal: listening.total,
      listeningReplays: listening.totalReplays,
      listeningUnavailable: listening.unavailableCount,
      functionalScore: clamp(functionalPerformance),
      alignmentTitle,
      alignmentSummary,
    },
    selectedSituations,
    recommendation: { ...course, reason: recommendationReason },
    betaEligible,
    qualification: betaEligible ? 'beta_priority' : course.key,
    disclaimer:
      'Lo Sblocco Check è una valutazione orientativa basata su una prova breve. Non sostituisce una certificazione ufficiale del livello CEFR.',
  };
}
