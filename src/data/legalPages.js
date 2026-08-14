const contactEmail = 'consagrohades@gmail.com';
const siteUrl = 'https://sbloccoinglese.com';
const brand = 'Sblocco Inglese';
const lastUpdated = '14 agosto 2026';

const ownerDetails = [
  brand,
  `Email attualmente indicata: ${contactEmail}`,
  `Sito web: ${siteUrl}`,
  'DECISIONE RICHIESTA PRIMA DELLA PUBBLICAZIONE: completare identità legale del venditore/titolare e dati fiscali applicabili.',
];

export const legalPages = {
  terms: {
    title: 'Termini e Condizioni',
    description: 'Termini e condizioni per i prodotti e servizi digitali di Sblocco Inglese.',
    updated: lastUpdated,
    intro: [
      'Questa versione descrive il flusso digitale attuale di Sblocco Inglese e, in particolare, Recupero Debito Inglese. Le parti contrassegnate come decisioni richieste devono essere completate dal titolare prima della pubblicazione in produzione.',
      'Prima di completare un acquisto, l’utente deve poter leggere questi Termini, la Privacy Policy e le informazioni sul diritto di recesso applicabili al prodotto acquistato.',
    ],
    sections: [
      {
        title: '1. Venditore e contatti',
        paragraphs: [
          'Il sito e il prodotto sono presentati con il marchio Sblocco Inglese.',
          'L’identità legale completa del soggetto che conclude il contratto con il cliente e i dati fiscali applicabili non vengono inventati in questa bozza tecnica e devono essere confermati prima della messa in vendita.',
        ],
        details: ownerDetails,
      },
      {
        title: '2. Recupero Debito Inglese',
        paragraphs: [
          'Recupero Debito Inglese è un percorso digitale di preparazione alla prova scolastica di recupero di inglese.',
          'Il percorso utilizza il test diagnostico, il programma indicato dalla scuola e la data dell’esame per organizzare le priorità di studio. Include recupero guidato degli argomenti, pratica, modalità scuola, verifiche per argomento e recupero mirato degli errori.',
          'Il programma assegnato dalla scuola resta il riferimento per gli argomenti da preparare. Il servizio non sostituisce le indicazioni della scuola o dell’insegnante.',
        ],
      },
      {
        title: '3. Test diagnostico e account',
        paragraphs: [
          'Il test diagnostico può essere svolto gratuitamente senza acquistare il percorso.',
          'Per procedere all’acquisto è necessario accedere a un account o crearne uno. Sullo stesso dispositivo, il risultato diagnostico può essere collegato all’account dopo l’attivazione dell’accesso.',
        ],
      },
      {
        title: '4. Prezzo e pagamento',
        paragraphs: [
          'Il prezzo di lancio mostrato per Recupero Debito Inglese è €39 con pagamento unico. Non è un abbonamento.',
          'Il pagamento viene effettuato tramite Stripe Hosted Checkout. I dati completi della carta non vengono raccolti dal modulo di pagamento di Sblocco Inglese; il pagamento è gestito da Stripe secondo le condizioni applicabili al suo servizio.',
          'Il browser non determina il prezzo o il tipo di accesso: l’offerta e il prezzo utilizzati dal Checkout vengono risolti dal server.',
        ],
      },
      {
        title: '5. Attivazione dell’accesso',
        paragraphs: [
          'L’accesso al prodotto viene attribuito dopo che il sistema riceve la conferma di pagamento riuscito tramite il flusso server-to-server collegato a Stripe.',
          'Il semplice caricamento o aggiornamento della pagina di conferma non attribuisce l’accesso. In caso di breve ritardo tecnico nella conferma, la pagina può mostrare lo stato di elaborazione e consentire di ricontrollarlo.',
        ],
      },
      {
        title: '6. Durata dell’accesso — decisione richiesta',
        paragraphs: [
          'La durata esatta dell’accesso acquistato con €39 deve essere definita dal titolare e indicata chiaramente prima dell’acquisto. Questa bozza non stabilisce una durata per conto del venditore.',
        ],
      },
      {
        title: '7. Accesso immediato e diritto di recesso — conferma legale richiesta',
        paragraphs: [
          'Il flusso di acquisto richiede una scelta positiva e separata con cui il cliente chiede l’avvio dell’accesso digitale subito dopo il pagamento e conferma di aver compreso che l’avvio immediato può incidere sul diritto di recesso nei casi e nei limiti previsti dalla legge.',
          'La qualificazione giuridica esatta del prodotto e la formulazione definitiva sulle conseguenze del recesso devono essere confermate dal titolare con un professionista competente prima della pubblicazione. Questa pagina non presume che il diritto di recesso venga automaticamente meno in ogni caso.',
        ],
      },
      {
        title: '8. Rimborsi — decisione richiesta',
        paragraphs: [
          'La politica commerciale sui rimborsi non è definita in questa bozza. Deve essere stabilita dal titolare senza limitare i diritti inderogabili riconosciuti al consumatore dalla normativa applicabile.',
        ],
      },
      {
        title: '9. Studenti minorenni — decisione richiesta',
        paragraphs: [
          'Recupero Debito Inglese è rivolto anche a studenti delle scuole superiori e può quindi essere utilizzato da persone minorenni.',
          'Prima della vendita deve essere definito chi conclude il contratto quando lo studente è minorenne e quale conferma del genitore o di chi esercita la responsabilità genitoriale è richiesta. Questa bozza non sostituisce tale decisione.',
        ],
      },
      {
        title: '10. Nessuna garanzia sul voto o sull’esito',
        paragraphs: [
          'Il percorso fornisce strumenti di studio, pratica e verifica, ma non garantisce un voto specifico, il superamento della prova o un risultato entro un tempo determinato.',
          'L’esito dipende anche dal programma effettivamente assegnato, dal livello di partenza, dal tempo disponibile, dalla costanza dello studente e dai criteri della scuola.',
        ],
      },
      {
        title: '11. Uso dei contenuti',
        paragraphs: [
          'I contenuti e i materiali resi disponibili tramite l’account sono destinati all’uso personale collegato all’accesso acquistato.',
          'Non è consentito rivendere, distribuire o riutilizzare commercialmente materiali e contenuti proprietari senza autorizzazione.',
        ],
      },
      {
        title: '12. Contatti',
        paragraphs: [
          `L’indirizzo attualmente indicato per le richieste relative al servizio è ${contactEmail}. Il titolare deve confermare che questo sia l’indirizzo di assistenza da pubblicare al lancio.`,
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'Informativa privacy per il sito e la piattaforma Sblocco Inglese.',
    updated: lastUpdated,
    intro: [
      'Questa informativa descrive le categorie di dati trattate dal flusso digitale attuale di Sblocco Inglese. L’identità legale completa del titolare del trattamento e i relativi dati di contatto devono essere confermati prima della pubblicazione in produzione.',
    ],
    sections: [
      {
        title: '1. Titolare del trattamento',
        paragraphs: [
          'Il servizio è presentato con il marchio Sblocco Inglese. La denominazione legale completa del titolare del trattamento deve essere inserita e verificata dal titolare prima del lancio.',
        ],
        details: ownerDetails,
      },
      {
        title: '2. Dati trattati',
        paragraphs: ['In base alle funzioni utilizzate, possono essere trattate le seguenti categorie di dati:'],
        bullets: [
          'dati dell’account, come indirizzo email e identificativo utente',
          'risposte e risultati del test diagnostico di recupero',
          'informazioni inserite per organizzare il percorso, come anno scolastico, data dell’esame e argomenti del programma della scuola',
          'stato del percorso, attività svolte, risultati delle verifiche ed errori necessari a fornire la funzione didattica richiesta',
          'dati relativi all’ordine e allo stato del pagamento, come identificativi Stripe, importo, valuta e stato di fulfillment',
          'parametri di campagna UTM limitati a source, medium, campaign e content quando presenti nel percorso di acquisto',
          'dati tecnici e di sicurezza necessari a fornire il sito, autenticare l’utente e diagnosticare errori del servizio',
        ],
        paragraphsAfter: [
          'Il sito non chiede di inserire dati sensibili nei parametri UTM. I parametri di campagna vengono filtrati e limitati prima di essere associati all’acquisto.',
          'Il pagamento avviene su Stripe Hosted Checkout: Sblocco Inglese non riceve dal proprio modulo i dati completi della carta.',
        ],
      },
      {
        title: '3. Finalità del trattamento',
        bullets: [
          'creare e gestire l’account',
          'fornire il test diagnostico e, quando applicabile, collegarlo all’account',
          'costruire e mostrare il percorso richiesto sulla base delle informazioni scolastiche inserite',
          'erogare esercizi, verifiche e recupero mirato',
          'gestire il pagamento, registrare l’acquisto e attribuire l’accesso',
          'assistere l’utente e gestire problemi tecnici o contestazioni',
          'proteggere il servizio da abusi e garantire sicurezza e integrità',
          'misurare, in forma limitata, la provenienza commerciale di un acquisto tramite i parametri UTM conservati con l’ordine',
          'adempiere agli obblighi legali, contabili o fiscali applicabili al titolare',
        ],
      },
      {
        title: '4. Base giuridica',
        paragraphs: [
          'La base giuridica dipende dalla specifica operazione e può includere l’esecuzione di misure precontrattuali richieste dall’utente, l’esecuzione del contratto, l’adempimento di obblighi legali, il legittimo interesse del titolare quando applicabile e il consenso quando la legge lo richiede.',
          'La scelta definitiva delle basi giuridiche e la relativa documentazione restano responsabilità del titolare del trattamento e devono essere verificate rispetto all’uso effettivo del servizio.',
        ],
      },
      {
        title: '5. Fornitori tecnici principali',
        paragraphs: ['Il flusso attuale utilizza fornitori tecnici per ospitare il servizio, i dati e i pagamenti, tra cui:'],
        bullets: [
          'Vercel, per hosting e distribuzione dell’applicazione',
          'Supabase, per autenticazione, database e funzioni server collegate alla piattaforma',
          'Stripe, per il Checkout e l’elaborazione dei pagamenti',
          'servizi email utilizzati per le comunicazioni di assistenza, quando l’utente li contatta',
        ],
        paragraphsAfter: ['I fornitori trattano dati secondo i rispettivi ruoli, accordi e informative applicabili.'],
      },
      {
        title: '6. Attribuzione commerciale di prima parte',
        paragraphs: [
          'Quando un link contiene utm_source, utm_medium, utm_campaign o utm_content, l’applicazione può mantenere questi valori sanitizzati nella URL durante il percorso verso diagnostica, accesso e Checkout.',
          'Non viene installato per questa funzione un pixel pubblicitario, Google Analytics, Google Tag Manager o Meta Pixel. I valori UTM consentiti possono essere registrati nel database insieme all’acquisto pagato per ricostruirne la provenienza commerciale.',
          'I parametri UTM non vengono utilizzati per autorizzare l’account, scegliere il prezzo o attribuire diritti di accesso.',
        ],
      },
      {
        title: '7. Conservazione',
        paragraphs: [
          'I dati vengono conservati per il tempo necessario alle finalità per cui sono trattati e, quando applicabile, per rispettare obblighi legali, fiscali, contabili, di sicurezza o di tutela dei diritti.',
          'Questa bozza non inventa periodi di conservazione specifici non ancora formalizzati dal titolare. I periodi applicabili alle diverse categorie devono essere definiti e documentati prima del lancio.',
        ],
      },
      {
        title: '8. Comunicazione e trasferimenti',
        paragraphs: [
          'I dati non vengono venduti a terzi.',
          'Possono essere trattati dai fornitori tecnici necessari al servizio e comunicati ad autorità o consulenti quando richiesto dalla legge o necessario per tutelare diritti. Eventuali trasferimenti internazionali dipendono dai fornitori utilizzati e devono essere gestiti con le garanzie previste dalla normativa applicabile.',
        ],
      },
      {
        title: '9. Diritti dell’interessato',
        paragraphs: [
          'L’interessato può esercitare, quando applicabili, i diritti previsti dalla normativa sulla protezione dei dati, inclusi accesso, rettifica, cancellazione, limitazione, opposizione, portabilità e revoca del consenso per i trattamenti basati sul consenso.',
          `L’indirizzo attualmente indicato per le richieste privacy è ${contactEmail}; il titolare deve confermarlo prima del lancio. È inoltre possibile proporre reclamo al Garante per la protezione dei dati personali nei casi previsti dalla legge.`,
        ],
      },
      {
        title: '10. Minori',
        paragraphs: [
          'Il prodotto può essere utilizzato da studenti minorenni. Le informative destinate a minori devono essere comprensibili e proporzionate alla loro età.',
          'Le regole sul consenso privacy dei minori non risolvono da sole la validità o formazione del contratto. Il modello contrattuale con genitore o tutore deve essere definito dal titolare prima della vendita a minorenni.',
        ],
      },
      {
        title: '11. Aggiornamenti',
        paragraphs: ['Questa informativa può essere aggiornata per riflettere modifiche del servizio o del trattamento. La data dell’ultima versione è indicata in alto.'],
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    description: 'Cookie Policy e informazioni sugli strumenti di memorizzazione usati da Sblocco Inglese.',
    updated: lastUpdated,
    intro: ['Questa pagina descrive cookie, memorizzazione locale e strumenti analoghi utilizzati dal sito nel flusso tecnico attuale.'],
    sections: [
      {
        title: '1. Strumenti tecnici',
        paragraphs: [
          'Il sito può utilizzare cookie o memorizzazione locale strettamente necessari per autenticazione, sicurezza, continuità della sessione e funzioni richieste dall’utente.',
          'Il risultato del test diagnostico può essere associato a un token tecnico sul dispositivo per consentire, sullo stesso dispositivo, il successivo collegamento all’account dopo l’acquisto.',
        ],
      },
      {
        title: '2. Attribuzione UTM',
        paragraphs: [
          'Il flusso di lancio non salva i parametri UTM in localStorage o in un cookie di marketing. Se presenti, i quattro parametri UTM consentiti vengono mantenuti nella URL durante il percorso e possono essere associati all’ordine soltanto al momento del Checkout.',
          'Non vengono installati Google Analytics, Google Tag Manager, Meta Pixel o un altro stack di tracciamento pubblicitario per questa attribuzione di lancio.',
        ],
      },
      {
        title: '3. Stripe Checkout e servizi esterni',
        paragraphs: [
          'Quando l’utente sceglie di pagare, viene reindirizzato a Stripe Hosted Checkout. Stripe può utilizzare cookie o altri strumenti secondo le proprie informative e le impostazioni del proprio servizio.',
          'Altri fornitori tecnici possono utilizzare strumenti strettamente necessari per autenticazione, sicurezza e funzionamento della piattaforma.',
        ],
      },
      {
        title: '4. Strumenti non tecnici',
        paragraphs: [
          'Se in futuro verranno introdotti strumenti di analytics, profilazione o marketing che richiedono consenso, il relativo meccanismo di scelta dovrà essere implementato prima della loro attivazione e questa informativa dovrà essere aggiornata.',
        ],
      },
      {
        title: '5. Contatti',
        paragraphs: [`Per domande su cookie e privacy, l’indirizzo attualmente indicato è ${contactEmail}. Il titolare deve confermarlo prima del lancio.`],
      },
    ],
  },
};
