const supportBlueprint = [
  {
    key: 'essential',
    title: 'Essenziale',
    purpose: 'Per prepararti in autonomia su un obiettivo preciso.',
    includes: ['Guida mirata', 'Espressioni utili', 'Checklist', 'Esercizi', 'Attività di speaking indipendenti'],
    kind: 'checkout',
  },
  {
    key: 'complete',
    title: 'Percorso completo',
    purpose: 'Per seguire una preparazione digitale strutturata dall’inizio alla simulazione.',
    includes: ['Moduli digitali', 'Esercizi', 'Speaking practice', 'Variazioni di scenario', 'Revisione e progressione'],
    kind: 'checkout',
  },
  {
    key: 'guided',
    title: 'Preparazione guidata',
    purpose: 'Per lavorare sul percorso con simulazioni, feedback e supporto.',
    includes: ['Contenuti digitali', 'Sessioni in piccolo gruppo', 'Simulazioni', 'Feedback', 'Accesso ai trainer'],
    kind: 'enquiry',
    cta: 'Scopri la preparazione guidata',
  },
  {
    key: 'individual',
    title: 'Preparazione individuale',
    purpose: 'Per lavorare direttamente sul ruolo, obiettivo o situazione che devi affrontare.',
    includes: ['Analisi del contesto reale', 'Piano mirato', 'Simulazioni individuali', 'Feedback applicato', 'Priorità definite insieme'],
    kind: 'intake',
    cta: 'Lavoriamo sulla mia situazione',
  },
];

function supportOptions(slug, overrides = {}) {
  return supportBlueprint.map((item) => ({
    ...item,
    ...(overrides[item.key] || {}),
    offerId: item.kind === 'checkout' ? `${slug}-${item.key}` : null,
  }));
}

const sharedMethod = [
  {
    label: 'OBIETTIVO',
    title: 'Partiamo dalla situazione reale.',
    description: 'Chiariamo cosa dovrai riuscire a fare, con chi e in quale contesto.',
  },
  {
    label: 'LINGUA UTILE',
    title: 'Costruiamo l’inglese che ti serve.',
    description: 'Scegliamo strutture, parole ed espressioni in funzione di quell’obiettivo.',
  },
  {
    label: 'PRATICA',
    title: 'Lo metti subito alla prova.',
    description: 'Alleni risposte, variazioni e situazioni realistiche, con feedback quando previsto.',
  },
  {
    label: 'USO',
    title: 'Lo rendi più autonomo.',
    description: 'Ripeti, adatti e riutilizzi ciò che hai imparato finché diventa più disponibile quando ti serve.',
  },
];

const sharedFaq = [
  {
    question: 'Devo avere già un livello alto?',
    answer: 'No. Il punto di partenza cambia il percorso, non il valore dell’obiettivo. Se mancano basi importanti, vengono integrate nel lavoro invece di essere ignorate.',
  },
  {
    question: 'Si lavora anche su grammatica e vocabolario?',
    answer: 'Sì. Grammatica, vocabolario ed espressioni restano fondamentali, ma vengono scelti e allenati in funzione delle situazioni che devi gestire.',
  },
  {
    question: 'Posso lavorare su una situazione reale?',
    answer: 'Sì. Nella preparazione mirata, ruolo, settore, interlocutori e situazioni concrete possono diventare il materiale su cui costruire la pratica.',
  },
  {
    question: 'Quale livello di supporto devo scegliere?',
    answer: 'Dipende da quanto è definito il tuo obiettivo, dal tempo disponibile e da quanto feedback ti serve. Puoi partire dal blocco che riconosci nella pagina e confrontare i livelli di supporto senza acquistare nulla.',
  },
];

export const pathways = {
  colloquio: {
    slug: 'colloquio',
    seo: {
      title: 'Colloquio in inglese | Sblocco Inglese',
      description: 'Prepara presentazione, esperienza, domande impreviste e prove pratiche per gestire un colloquio in inglese con maggiore controllo.',
    },
    eyebrow: 'COLLOQUIO IN INGLESE',
    title: 'Non preparare solo le risposte.\nPreparati a gestire il colloquio.',
    support: 'Presentarti, raccontare la tua esperienza, gestire domande impreviste, affrontare una prova pratica e spiegare le tue scelte.',
    primaryCta: 'Inizia dal tuo colloquio',
    secondaryCta: 'Vedi cosa allenerai',
    goals: [
      { title: 'Prepararti al contesto', description: 'Capire il ruolo, individuare il lessico utile e scegliere le esperienze che vale la pena raccontare.' },
      { title: 'Presentarti', description: 'Parlare di te senza recitare una risposta imparata a memoria.' },
      { title: 'Raccontare la tua esperienza', description: 'Spiegare progetti, responsabilità, risultati, difficoltà e decisioni.' },
      { title: 'Rispondere alle domande', description: 'Gestire domande previste, impreviste e domande di approfondimento.' },
      { title: 'Affrontare una prova pratica', description: 'Capire la consegna, chiedere chiarimenti, ragionare ad alta voce e spiegare ciò che stai facendo.' },
      { title: 'Concludere', description: 'Fare domande, chiarire gli ultimi dubbi e chiudere il colloquio in modo naturale.' },
    ],
    bottleneckIntro: 'Non tutti hanno bisogno di lavorare sulle stesse cose.',
    bottlenecks: [
      { label: 'So cosa voglio dire, ma ci metto troppo a costruire la frase.', recommendation: 'essential' },
      { label: 'Mi preparo le risposte, ma se la domanda cambia mi blocco.', recommendation: 'complete' },
      { label: 'Faccio fatica a raccontare bene la mia esperienza.', recommendation: 'guided' },
      { label: 'Mi preoccupano le domande tecniche o le prove pratiche.', recommendation: 'individual' },
      { label: 'Il mio inglese è ancora troppo debole per affrontare il colloquio con sicurezza.', recommendation: 'guided' },
      { label: 'Non so da dove partire.', recommendation: 'individual' },
    ],
    methodHeading: 'Come lo prepariamo',
    method: [
      { label: 'OBIETTIVO', title: 'Prepararti a ciò che dovrai affrontare.', description: 'Partiamo dal tipo di colloquio, dal ruolo e dalle situazioni che dovrai gestire.' },
      { label: 'LINGUA UTILE', title: 'Costruiamo l’inglese che ti serve.', description: 'Strutture ed espressioni per raccontare esperienze, spiegare decisioni, chiarire una domanda, guadagnare tempo e ragionare ad alta voce.' },
      { label: 'PRATICA', title: 'Lo metti alla prova.', description: 'Domande, follow-up, variazioni, audio, simulazioni e prove realistiche.' },
      { label: 'USO', title: 'Arrivi avendo già affrontato situazioni simili.', description: 'La preparazione serve a rendere meno nuova la situazione che incontrerai il giorno del colloquio.' },
    ],
    tryIt: {
      prompt: 'Tell me about a project you’re particularly proud of.',
      instruction: 'Non cercare la risposta perfetta. Prova a costruirla in quattro passaggi.',
      steps: ['CONTESTO', 'COSA DOVEVI FARE', 'COSA HAI FATTO', 'RISULTATO'],
      modelAnswer: 'One project I’m particularly proud of was the launch of a new customer support system at my previous company. My task was to organise the information and help the team move to the new platform without interrupting the service. I created a simple migration plan, tested the most important processes and ran short training sessions for my colleagues. We completed the change on time, and the team was able to answer customer requests more quickly after the launch.',
      explanation: 'La risposta presenta prima il contesto, chiarisce la responsabilità, descrive azioni concrete e conclude con un risultato. Non elenca tutto: sceglie dettagli che aiutano l’intervistatore a seguire il racconto.',
    },
    supportOptions: supportOptions('colloquio', {
      individual: {
        purpose: 'Per lavorare direttamente sul colloquio, ruolo o situazione che devi affrontare.',
        cta: 'Lavora sul mio colloquio',
      },
    }),
    intake: true,
    faqs: [
      { question: 'Il mio livello è basso. Posso comunque prepararmi?', answer: 'Sì, ma il percorso deve partire anche dalle basi linguistiche che ti mancano. Preparare un colloquio non significa ignorare grammatica o vocabolario: significa lavorarci in funzione di quello che dovrai riuscire a dire e capire.' },
      { question: 'E se il colloquio è tecnico?', answer: 'Il percorso può includere spiegazione di progetti, ragionamento ad alta voce, domande di chiarimento e prove pratiche. La parte tecnica resta la tua competenza; lavoriamo su come comunicarla in inglese.' },
      { question: 'Non so quali domande mi faranno.', answer: 'È normale. Prepararsi non significa prevedere ogni domanda, ma allenare i tipi di risposta e le strategie che puoi riutilizzare quando la domanda cambia.' },
      { question: 'Ho poco tempo. Ha comunque senso prepararmi?', answer: 'Sì, se il lavoro viene prioritizzato. Con poco tempo si parte dalle situazioni più probabili e dai blocchi che incidono di più sulla tua capacità di rispondere.' },
      { question: 'Devo migliorare tutto il mio inglese prima?', answer: 'No. Puoi lavorare direttamente sull’obiettivo, intervenendo sulle lacune grammaticali, lessicali e comunicative che emergono durante la preparazione.' },
      { question: 'Posso prepararmi sul mio ruolo o sulla mia azienda reale?', answer: 'Sì. Se scegli una preparazione mirata, ruolo, settore e tipo di colloquio possono diventare parte degli scenari di lavoro.' },
    ],
    finalCta: {
      title: 'Quando hai il tuo colloquio?',
      copy: 'Parti da quello che dovrai affrontare e prepara l’inglese intorno a quella situazione.',
      primary: 'Inizia la preparazione',
      secondary: 'Non ho ancora una data',
    },
  },
  lavorare: {
    slug: 'lavorare',
    seo: { title: 'Inglese per il lavoro | Sblocco Inglese', description: 'Allena l’inglese per riunioni, clienti, aggiornamenti, problemi e decisioni nel tuo contesto professionale reale.' },
    eyebrow: 'INGLESE PER IL LAVORO',
    title: 'L’inglese che ti serve per fare il tuo lavoro, anche quando devi farlo in inglese.',
    support: 'Riunioni, clienti, presentazioni, aggiornamenti, problemi da spiegare e decisioni da motivare.',
    primaryCta: 'Parti dal tuo lavoro',
    secondaryCta: 'Vedi cosa allenerai',
    goals: [
      { title: 'Partecipare alle riunioni', description: 'Intervenire, reagire e chiedere chiarimenti senza aspettare una frase perfetta.' },
      { title: 'Dare aggiornamenti', description: 'Dire dove siete, cosa è successo e quali saranno i prossimi passi.' },
      { title: 'Spiegare problemi', description: 'Descrivere con precisione una difficoltà, il suo impatto e ciò che serve.' },
      { title: 'Motivare decisioni', description: 'Rendere comprensibili criteri, alternative e conseguenze.' },
      { title: 'Parlare con clienti e colleghi', description: 'Adattare tono, chiarezza e livello di dettaglio all’interlocutore.' },
      { title: 'Presentare il proprio lavoro', description: 'Organizzare informazioni e rispondere alle domande senza perdere il filo.' },
    ],
    bottleneckIntro: 'Il blocco non è sempre la mancanza di inglese: spesso è la difficoltà a renderlo disponibile mentre lavori.',
    bottlenecks: [
      { label: 'Capisco, ma durante le riunioni intervengo poco.', recommendation: 'guided' },
      { label: 'Prima di una call preparo quasi tutto quello che voglio dire.', recommendation: 'complete' },
      { label: 'Conosco il mio lavoro, ma in inglese sembro molto meno preciso.', recommendation: 'essential' },
      { label: 'Faccio fatica a spiegare problemi complessi.', recommendation: 'individual' },
      { label: 'Quando mi fanno una domanda non prevista perdo il filo.', recommendation: 'guided' },
    ],
    methodHeading: 'Come lavoriamo sul tuo inglese professionale',
    method: sharedMethod,
    tryIt: {
      scenario: 'Devi dare un breve aggiornamento sul progetto durante una riunione.',
      prompt: 'Can you give us a quick project update?',
      instruction: 'Usa una struttura che aiuti chi ascolta a capire subito stato, problema e prossimo passo.',
      steps: ['DOVE SIAMO', 'COSA È SUCCESSO', 'COSA STIAMO FACENDO', 'COSA SUCCEDE DOPO'],
      modelAnswer: 'We’re in the final testing phase. Yesterday we found an issue with the payment confirmation emails, so the launch may be one day later than planned. The development team is fixing it now, and we are testing the update this afternoon. If everything works, we’ll confirm the new launch time tomorrow morning.',
      explanation: 'L’aggiornamento parte dallo stato attuale, nomina il problema senza perdersi nei dettagli, spiega l’azione in corso e chiude con il prossimo momento decisionale.',
    },
    supportOptions: supportOptions('lavorare'),
    faqs: sharedFaq,
    finalCta: { title: 'In quale situazione di lavoro vuoi essere più pronto?', copy: 'Parti dalle attività che svolgi davvero e costruisci l’inglese intorno a riunioni, persone e decisioni reali.', primary: 'Scegli come lavorarci', secondary: 'Non so ancora da dove partire' },
  },
  parlare: {
    slug: 'parlare',
    seo: { title: 'Parlare inglese | Sblocco Inglese', description: 'Allena risposte più sviluppate, reazioni, domande e strategie per continuare a parlare anche quando manca una parola.' },
    eyebrow: 'PARLARE IN INGLESE',
    title: 'Non vuoi solo capire di più.\nVuoi riuscire a dire di più.',
    support: 'Costruire risposte, svilupparle, reagire, fare domande e continuare anche quando non trovi subito la parola giusta.',
    primaryCta: 'Inizia a parlare di più',
    secondaryCta: 'Vedi cosa allenerai',
    goals: [
      { title: 'Costruire una risposta', description: 'Partire da una posizione chiara senza tradurre parola per parola.' },
      { title: 'Svilupparla', description: 'Aggiungere motivi, dettagli ed esempi senza aspettare un’altra domanda.' },
      { title: 'Reagire a ciò che senti', description: 'Mostrare accordo, sorpresa, dubbio o un punto di vista diverso.' },
      { title: 'Fare domande', description: 'Portare avanti lo scambio e chiedere ciò che ti interessa davvero.' },
      { title: 'Parafrasare quando manca una parola', description: 'Spiegare l’idea in un altro modo invece di fermarti.' },
      { title: 'Parlare con più autonomia', description: 'Continuare senza dipendere continuamente dalle domande dell’altra persona.' },
    ],
    bottleneckIntro: 'Riconoscere come si interrompe la tua risposta aiuta a scegliere che cosa allenare per primo.',
    bottlenecks: [
      { label: 'Rispondo con una frase e poi mi fermo.', recommendation: 'essential' },
      { label: 'So la risposta, ma devo tradurla mentalmente.', recommendation: 'complete' },
      { label: 'Se non conosco una parola mi blocco.', recommendation: 'essential' },
      { label: 'Parlo solo quando qualcuno mi fa domande.', recommendation: 'guided' },
      { label: 'Capisco molto più di quanto riesco a dire.', recommendation: 'complete' },
    ],
    methodHeading: 'Come rendiamo lo speaking più autonomo',
    method: sharedMethod,
    tryIt: {
      prompt: 'Would you rather work from home or in an office?',
      instruction: 'Parti da “I prefer working from home.”, poi aggiungi un elemento alla volta.',
      steps: ['OPINIONE', 'MOTIVO', 'ESEMPIO', 'CONTRASTO / ECCEZIONE'],
      modelAnswer: 'I prefer working from home because I can concentrate better in a quiet environment. For example, when I have to write a report, I usually finish it faster at home. However, I still like going to the office once or twice a week because face-to-face conversations are useful for teamwork.',
      explanation: 'Una frase breve diventa una risposta completa: posizione, motivo, esempio e un contrasto che rende l’opinione meno rigida e più interessante.',
    },
    supportOptions: supportOptions('parlare'),
    faqs: sharedFaq,
    finalCta: { title: 'Che cosa vorresti riuscire a dire senza fermarti?', copy: 'Non serve aspettare di sapere tutto. Parti da una risposta e impara a svilupparla con più autonomia.', primary: 'Scegli come allenarti', secondary: 'Aiutami a capire il mio blocco' },
  },
  estero: {
    slug: 'estero',
    seo: { title: 'Inglese per vivere e lavorare all’estero | Sblocco Inglese', description: 'Prepara l’inglese per colleghi, casa, servizi, appuntamenti e imprevisti della vita reale all’estero.' },
    eyebrow: 'VIVERE E LAVORARE ALL’ESTERO',
    title: 'Preparati alle situazioni che dovrai davvero gestire.',
    support: 'Dalla prima conversazione con un collega a un appuntamento, un problema in casa o una telefonata che non avevi previsto.',
    primaryCta: 'Parti dalle tue situazioni',
    secondaryCta: 'Vedi cosa allenerai',
    goals: [
      { title: 'Presentarti e conoscere persone', description: 'Iniziare uno scambio, raccontare qualcosa di te e continuare la conversazione.' },
      { title: 'Gestire situazioni quotidiane', description: 'Chiedere, capire e rispondere nei contesti che fanno parte della tua giornata.' },
      { title: 'Casa, servizi e appuntamenti', description: 'Spiegare ciò che ti serve e verificare informazioni importanti.' },
      { title: 'Parlare al lavoro', description: 'Entrare nelle conversazioni con colleghi e gestire le attività essenziali del ruolo.' },
      { title: 'Gestire imprevisti', description: 'Descrivere un problema, capire le opzioni e chiedere una soluzione.' },
      { title: 'Diventare più autonomo', description: 'Dipendere meno da traduzioni, messaggi preparati o dall’aiuto di altre persone.' },
    ],
    bottleneckIntro: 'Vivere all’estero richiede un inglese flessibile, non una lista di frasi da turista.',
    bottlenecks: [
      { label: 'Le conversazioni semplici mi mettono più in difficoltà di quanto dovrebbero.', recommendation: 'essential' },
      { label: 'Al telefono faccio molta fatica.', recommendation: 'guided' },
      { label: 'Non so come spiegare un problema.', recommendation: 'complete' },
      { label: 'Ho paura di non capire quando parlano velocemente.', recommendation: 'guided' },
      { label: 'Per il lavoro me la cavo, ma nella vita quotidiana molto meno.', recommendation: 'complete' },
    ],
    methodHeading: 'Come prepariamo la vita reale',
    method: sharedMethod,
    tryIt: {
      scenario: 'You’ve just moved into a flat and the heating isn’t working.',
      prompt: 'Call the landlord and explain what is happening.',
      instruction: 'Organizza le informazioni in modo che l’altra persona capisca il problema e possa agire.',
      steps: ['SPIEGA IL PROBLEMA', 'DA QUANDO', 'COSA HAI GIÀ PROVATO', 'COSA TI SERVE'],
      modelAnswer: 'Hi, I’m calling because the heating in my flat isn’t working. It stopped yesterday evening, and the rooms are getting quite cold. I’ve checked the thermostat and restarted the boiler, but it still doesn’t turn on. Could someone come and look at it as soon as possible, please?',
      explanation: 'La richiesta dà subito il problema, aggiunge il tempo, mostra ciò che è già stato controllato e termina con una richiesta concreta.',
    },
    supportOptions: supportOptions('estero'),
    faqs: sharedFaq,
    finalCta: { title: 'Quale situazione vuoi riuscire a gestire da solo?', copy: 'Costruisci l’inglese intorno alla vita che avrai davvero, dal lavoro agli imprevisti quotidiani.', primary: 'Scegli come prepararti', secondary: 'Raccontami la mia situazione' },
  },
  basi: {
    slug: 'basi',
    seo: { title: 'Inglese dalle basi | Sblocco Inglese', description: 'Costruisci grammatica, parole e strutture di base mentre inizi subito a usarle in scambi semplici e concreti.' },
    eyebrow: 'PARTIRE DALLE BASI',
    title: 'Parti dalle basi.\nMa parti subito da qualcosa che puoi usare.',
    support: 'Costruisci grammatica, parole e strutture attraverso le cose che vuoi iniziare a dire e capire.',
    primaryCta: 'Inizia dalle basi',
    secondaryCta: 'Vedi cosa imparerai a fare',
    goals: [
      { title: 'Presentarti', description: 'Dire chi sei, da dove vieni e che cosa fai con frasi semplici.' },
      { title: 'Fare domande semplici', description: 'Chiedere informazioni usando strutture essenziali e riconoscibili.' },
      { title: 'Parlare della tua giornata', description: 'Descrivere abitudini, orari e attività quotidiane.' },
      { title: 'Chiedere ciò che ti serve', description: 'Usare richieste brevi, chiare e cortesi.' },
      { title: 'Capire e rispondere in situazioni semplici', description: 'Riconoscere parole chiave e dare una risposta utile.' },
      { title: 'Gestire brevi scambi quotidiani', description: 'Unire domande e risposte in una piccola conversazione.' },
    ],
    bottleneckIntro: 'Non devi sapere già che cosa ti manca. Puoi partire da ciò che oggi non riesci ancora a dire o capire.',
    bottlenecks: [
      { label: 'Non riesco ancora a costruire frasi semplici.', recommendation: 'complete' },
      { label: 'Conosco alcune parole, ma non so unirle.', recommendation: 'essential' },
      { label: 'Le domande mi confondono.', recommendation: 'complete' },
      { label: 'Ho studiato in passato, ma ricordo molto poco.', recommendation: 'guided' },
      { label: 'Non so da quale argomento iniziare.', recommendation: 'guided' },
    ],
    methodHeading: 'Basi che iniziano subito a servirti',
    method: [
      { label: 'OBIETTIVO', title: 'Parti da una cosa semplice da fare.', description: 'Presentarti, chiedere un’informazione o parlare della tua giornata dà una direzione alle basi.' },
      { label: 'LINGUA UTILE', title: 'Costruisci la struttura essenziale.', description: 'Grammatica, parole e pronuncia vengono introdotte nella quantità che ti serve per iniziare.' },
      { label: 'PRATICA', title: 'La usi in piccoli scambi.', description: 'Frasi brevi, domande e risposte ti fanno vedere subito che cosa sai già fare.' },
      { label: 'USO', title: 'Aggiungi un pezzo alla volta.', description: 'Riprendi le stesse strutture in contesti diversi finché diventano più familiari.' },
    ],
    foundationNote: 'Partire da un obiettivo non significa saltare le basi. Significa impararle mentre inizi a usarle.',
    foundationLink: '/grammar/a1',
    tryIt: {
      scenario: 'You meet a new colleague.',
      prompt: 'Say four simple things to start the conversation.',
      instruction: 'Leggi la struttura, poi sostituisci le informazioni con le tue.',
      steps: ['My name is…', 'I’m from…', 'I work / study…', 'What about you?'],
      modelAnswer: 'My name is Giulia. I’m from Italy. I work in customer service. What about you?',
      explanation: 'Hai già completato uno scambio utile: ti presenti, aggiungi due informazioni e fai una domanda per continuare. La semplicità non è un problema quando la frase funziona.',
    },
    supportOptions: supportOptions('basi'),
    faqs: [
      { question: 'Devo studiare prima tutta la grammatica?', answer: 'No. Impari le strutture fondamentali in un ordine progressivo, ma inizi a usarle subito per dire e capire qualcosa di concreto.' },
      { question: 'Questo percorso sostituisce English Foundations?', answer: 'No. Questa pagina ti aiuta a capire l’obiettivo e il livello di supporto. Quando è appropriato, il percorso continua nei contenuti English Foundations già presenti nella piattaforma.' },
      { question: 'E se ho già studiato inglese anni fa?', answer: 'Puoi ripartire da ciò che riconosci e concentrarti sui punti che non sono più disponibili quando devi usarli. Non è necessario ricominciare ogni argomento da zero.' },
      { question: 'Quando inizierò a parlare?', answer: 'Da subito, con compiti molto accessibili. Le risposte saranno brevi all’inizio, poi diventeranno più ricche man mano che aumentano strutture e vocabolario.' },
    ],
    finalCta: { title: 'Da quale piccola cosa vuoi iniziare?', copy: 'Costruisci basi solide senza aspettare mesi prima di usarle in una situazione vera.', primary: 'Scegli come iniziare', secondary: 'Apri English Foundations' },
  },
};

export const pathwaySlugs = Object.keys(pathways);

export function getPathway(slug) {
  return pathways[slug] || null;
}

