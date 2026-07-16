export const launchCourses = [
  {
    id: 'business-english-flow',
    name: 'Business English Flow',
    status: 'Cohort fondatrice di settembre',
    price: '€199',
    standardPrice: 'Prezzo futuro previsto: €249',
    level: 'A2+/B1-B2',
    duration: '8 settimane',
    liveHours: '12 ore live',
    totalHours: '29-35 ore totali',
    groupSize: '6-8 persone',
    route: '/corsi/business-english-flow',
    summary:
      'Per chi usa o vuole usare l’inglese nel lavoro e ha bisogno di partecipare alle conversazioni, non solo di prepararsi in anticipo.',
    outcome:
      'Alla fine saprai gestire aggiornamenti, richieste di chiarimento, clienti, problemi e discussioni professionali con più controllo.',
    includes: [
      '8 incontri live da 90 minuti',
      'assessment iniziale e finale',
      'attività settimanali nella piattaforma',
      'listening realistici e roleplay registrati',
      'Trainer di espressioni professionali',
      'feedback umano e report finale',
    ],
    featured: true,
    availability: 'Prima edizione a pagamento prevista per settembre 2026',
  },
  {
    id: 'speaking-under-pressure',
    name: 'Speaking Under Pressure',
    status: 'Lista prioritaria',
    price: '€159',
    standardPrice: 'Prezzo futuro previsto: €189',
    level: 'B1-B2',
    duration: '6 settimane',
    liveHours: '7,5 ore live',
    totalHours: '18-21 ore totali',
    groupSize: '6-8 persone',
    route: '/contatti',
    summary:
      'Per chi conosce l’inglese, ma rallenta, traduce mentalmente o si blocca quando deve rispondere senza preparazione.',
    outcome:
      'Lavorerai sulla velocità di risposta, sulla gestione degli errori e sulla capacità di continuare a parlare anche quando la situazione cambia.',
    includes: [
      '6 incontri live da 75 minuti',
      'sfide vocali settimanali',
      'listening con risposta immediata',
      'Trainer mirato',
      'confronto tra prova iniziale e finale',
    ],
    featured: false,
    availability: 'Iscrizioni aperte dopo la prima cohort Business English Flow',
  },
  {
    id: 'interview-sprint',
    name: 'Interview Sprint',
    status: 'Percorso privato',
    price: '€229',
    standardPrice: 'Da €299 per preparazione urgente',
    level: 'A2+-C1',
    duration: '2 settimane',
    liveHours: '3 ore live',
    totalHours: '7-9 ore totali',
    groupSize: 'Individuale',
    route: '/contatti',
    summary:
      'Preparazione mirata per un colloquio reale, con lavoro sulle risposte, sul ruolo e sulle domande che potrebbero metterti in difficoltà.',
    outcome:
      'Arriverai al colloquio con risposte più solide, esempi professionali ben costruiti e una strategia per gestire domande impreviste.',
    includes: [
      'analisi del ruolo e del colloquio',
      '3 sessioni individuali',
      'risposte corrette e migliorate',
      'simulazione completa',
      'materiale finale da ripassare',
    ],
    featured: false,
    availability: 'Disponibilità limitata in base alla scadenza',
  },
  {
    id: 'private-coaching',
    name: 'Private Coaching',
    status: 'Percorso mensile',
    price: '€219',
    standardPrice: '4 settimane',
    level: 'A1-C1',
    duration: '4 settimane',
    liveHours: '4 ore live',
    totalHours: '10-13 ore totali',
    groupSize: 'Individuale',
    route: '/contatti',
    summary:
      'Per chi ha un obiettivo molto specifico e ha bisogno di un percorso costruito intorno al proprio lavoro, alle proprie difficoltà e ai propri tempi.',
    outcome:
      'Ogni mese lavorerai su un obiettivo preciso con lezioni, esercizi assegnati, Trainer personalizzato e verifiche dei progressi.',
    includes: [
      '4 sessioni individuali',
      'attività settimanali',
      'Trainer personalizzato',
      '2 produzioni corrette',
      'riepilogo dei progressi',
    ],
    featured: false,
    availability: 'Pochi posti mensili',
  },
];

export const waitlistCourses = [
  {
    name: 'English Foundations',
    level: 'A0-A1+',
    duration: '2 moduli da 8 settimane',
    price: 'Da €199 per modulo',
    summary:
      'Un percorso strutturato per costruire basi affidabili prima di passare a conversazioni più complesse.',
  },
  {
    name: 'Everyday English Flow',
    level: 'A2',
    duration: '8 settimane',
    price: 'Prezzo previsto: €179',
    summary:
      'Per gestire con più autonomia conversazioni quotidiane, viaggi, richieste, appuntamenti e imprevisti.',
  },
  {
    name: 'Listening & Response Lab',
    level: 'A2-B2',
    duration: '4 settimane',
    price: 'Prezzo previsto: €99',
    summary:
      'Per chi legge e parla meglio di quanto riesca a capire l’inglese naturale quando viene pronunciato a velocità normale.',
  },
  {
    name: 'Professional English Tracks',
    level: 'A2+-B2',
    duration: '6 settimane',
    price: 'Da €199',
    summary:
      'Percorsi specialistici per hospitality, vino, customer service, vendite e altre professioni con situazioni comunicative specifiche.',
  },
];

export const businessEnglishWeeks = [
  {
    number: '01',
    title: 'Presentarti e spiegare il tuo ruolo',
    result:
      'Parlare del tuo lavoro senza ridurlo a frasi troppo semplici o tradotte direttamente dall’italiano.',
    listening: 'Introduzioni professionali, responsabilità e relazioni tra ruoli.',
    production: 'Presentazione professionale registrata.',
  },
  {
    number: '02',
    title: 'Partecipare alle riunioni',
    result:
      'Entrare nella conversazione, reagire a una proposta e prendere la parola senza aspettare la frase perfetta.',
    listening: 'Proposte, accordo, dubbi e punti d’azione durante una riunione.',
    production: 'Roleplay di una riunione con interventi vocali.',
  },
  {
    number: '03',
    title: 'Chiarire e controllare le informazioni',
    result:
      'Fare domande precise, confermare ciò che hai capito e intervenire quando le istruzioni non sono chiare.',
    listening: 'Informazioni incomplete, richieste indirette e dettagli da confermare.',
    production: 'Conversazione registrata con richieste di chiarimento.',
  },
  {
    number: '04',
    title: 'Dare aggiornamenti e spiegare problemi',
    result:
      'Descrivere progressi, ritardi, dipendenze e prossimi passaggi in modo ordinato e credibile.',
    listening: 'Scadenze, ostacoli, numeri e decisioni in un project update.',
    production: 'Aggiornamento professionale con domande successive.',
  },
  {
    number: '05',
    title: 'Capire il cliente e proporre una soluzione',
    result:
      'Raccogliere le informazioni necessarie, riconoscere le priorità e formulare una raccomandazione adatta.',
    listening: 'Bisogni, preferenze, obiezioni e preoccupazioni non dette esplicitamente.',
    production: 'Roleplay cliente-professionista a più turni.',
  },
  {
    number: '06',
    title: 'Gestire conversazioni difficili',
    result:
      'Disaccordo, correzioni, reclami e negoziazione senza diventare bruschi o troppo vaghi.',
    listening: 'Tono, frustrazione, esitazione e linguaggio diplomatico.',
    production: 'Risposta a un problema con un collega o un cliente.',
  },
  {
    number: '07',
    title: 'Presentare e difendere una raccomandazione',
    result:
      'Strutturare una proposta, confrontare opzioni e rispondere alle domande senza perdere il filo.',
    listening: 'Domande critiche, richieste di motivazione e reazioni a una proposta.',
    production: 'Breve presentazione seguita da domande.',
  },
  {
    number: '08',
    title: 'Simulazione finale integrata',
    result:
      'Usare insieme ascolto, interazione, chiarezza e linguaggio professionale in uno scenario completo.',
    listening: 'Conversazione a più interlocutori con informazioni da usare nella risposta.',
    production: 'Prova finale parallela all’assessment iniziale.',
  },
];

export const sbloccoMethodSteps = [
  {
    number: '01',
    title: 'Partiamo da una situazione reale',
    text: 'Il lavoro nasce da ciò che devi fare davvero: partecipare a una call, rispondere a un cliente, spiegare un problema o affrontare un colloquio.',
  },
  {
    number: '02',
    title: 'Prepariamo il linguaggio che ti serve',
    text: 'Costruiamo espressioni, strutture e vocabolario utili per quella situazione, senza riempire la lezione di teoria che non userai.',
  },
  {
    number: '03',
    title: 'Lo usi in una prova concreta',
    text: 'Roleplay, listening e risposte registrate ti obbligano a trasformare ciò che conosci in una risposta vera.',
  },
  {
    number: '04',
    title: 'Ricevi un feedback che puoi riutilizzare',
    text: 'Correggiamo ciò che limita il messaggio: chiarezza, grammatica, tono, esitazione e frasi troppo tradotte dall’italiano.',
  },
  {
    number: '05',
    title: 'Il materiale torna nel Trainer',
    text: 'Le espressioni importanti non spariscono dopo la lezione. Tornano nella pratica finché diventano più facili da recuperare.',
  },
  {
    number: '06',
    title: 'Confrontiamo il prima e il dopo',
    text: 'Ogni corso termina con una prova comparabile a quella iniziale e un report che mostra cosa è cambiato e cosa resta da consolidare.',
  },
];
