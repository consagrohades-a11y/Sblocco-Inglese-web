const contactEmail = 'consagrohades@gmail.com';
const siteUrl = 'https://sbloccoinglese.com';
const brand = 'Sblocco Inglese';
const lastUpdated = '14 agosto 2026';

const ownerDetails = [
  brand,
  `Contatto operativo attuale: ${contactEmail}`,
  `Sito web: ${siteUrl}`,
  'DA COMPLETARE PRIMA DELLA MESSA IN VENDITA: identità legale del venditore/titolare e indirizzo geografico da pubblicare, con la privacy personale come vincolo operativo.',
  'DA CONFERMARE CON UN PROFESSIONISTA FISCALE: inquadramento dell’iniziativa commerciale temporanea e processo di documentazione/dichiarazione dei corrispettivi.',
];

export const legalPages = {
  terms: {
    title: 'Termini e Condizioni',
    description: 'Termini e condizioni per i prodotti e servizi digitali di Sblocco Inglese.',
    updated: lastUpdated,
    intro: [
      'Questa versione descrive il flusso digitale attuale di Sblocco Inglese e, in particolare, Recupero Debito Inglese. Restano da completare prima della messa in vendita i dati identificativi del venditore e l’inquadramento fiscale/documentale applicabile.',
      'Prima di completare un acquisto, l’utente deve poter leggere questi Termini, la Privacy Policy e le informazioni sul diritto di recesso applicabili al prodotto acquistato.',
    ],
    sections: [
      {
        title: '1. Venditore e contatti',
        paragraphs: [
          'Il sito e il prodotto sono presentati con il marchio Sblocco Inglese.',
          'L’identità legale completa del soggetto che conclude il contratto con il cliente, l’indirizzo geografico da pubblicare e i dati fiscali applicabili non vengono inventati in questa bozza tecnica e devono essere completati prima della messa in vendita.',
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
          'Il prezzo di lancio mostrato per Recupero Debito Inglese è €39 con pagamento unico. Non è un abbonamento e non prevede rinnovo automatico.',
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
        title: '6. Durata dell’accesso',
        paragraphs: [
          'L’acquisto di Recupero Debito Inglese concede accesso al percorso per 90 giorni dalla prima attivazione conseguente al pagamento riuscito.',
          'Il pagamento è una tantum: allo scadere dei 90 giorni l’accesso termina senza rinnovo automatico e senza nuovi addebiti.',
        ],
      },
      {
        title: '7. Accesso immediato e diritto di recesso',
        paragraphs: [
          'Prima del Checkout, il cliente deve chiedere espressamente che l’accesso digitale inizi subito dopo il pagamento, senza attendere la scadenza del periodo di recesso, e confermare di aver letto le informazioni sul recesso e sulla politica di rimborso.',
          'La politica commerciale di rimborso prevista per questo lancio non limita eventuali diritti inderogabili riconosciuti al consumatore dalla normativa applicabile. La qualificazione giuridica definitiva del servizio e la formulazione di dettaglio sul recesso devono comunque essere verificate prima della messa in vendita.',
        ],
      },
      {
        title: '8. Politica di rimborso di lancio',
        paragraphs: [
          'Per Recupero Debito Inglese viene riconosciuto un rimborso integrale del prezzo pagato quando la richiesta viene inviata entro 14 giorni dalla conclusione del contratto.',
          `La richiesta può essere inviata a ${contactEmail}, indicando l’indirizzo email dell’account usato per l’acquisto e le informazioni necessarie a identificare l’ordine. Questa politica commerciale non limita eventuali diritti inderogabili previsti dalla legge.`,
        ],
      },
      {
        title: '9. Studenti minorenni e acquirente',
        paragraphs: [
          'Recupero Debito Inglese può essere utilizzato da studenti delle scuole superiori, inclusi studenti minorenni.',
          'Il soggetto che conclude l’acquisto deve avere almeno 18 anni. Se il percorso è destinato a uno studente minorenne, l’acquirente deve essere il genitore o tutore legale che effettua l’acquisto per il minore.',
          'Prima del Checkout viene richiesta una conferma positiva separata relativa alla maggiore età dell’acquirente e, quando applicabile, al ruolo di genitore o tutore legale.',
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
          `L’indirizzo operativo attualmente utilizzato per assistenza, richieste di rimborso e comunicazioni relative al servizio è ${contactEmail}. Gli indirizzi di dominio dedicati verranno pubblicati solo dopo la loro effettiva attivazione.`,
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'Informativa privacy per il sito e la piattaforma Sblocco Inglese.',
    updated: lastUpdated,
    intro: [
      'Questa informativa descrive le categorie di dati trattate dal flusso digitale attuale di Sblocco Inglese. L’identità legale completa del titolare del trattamento e l’indirizzo geografico da pubblicare devono essere completati prima della messa in vendita.',
    ],
    sections: [
      {
        title: '1. Titolare del trattamento',
        paragraphs: [
          'Il servizio è presentato con il marchio Sblocco Inglese. La denominazione legale completa del titolare del trattamento e gli ulteriori dati identificativi richiesti devono essere inseriti e verificati prima del lancio commerciale.',
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
          'conferme registrate al momento del Checkout, inclusa la versione delle condizioni accettate e l’orario della registrazione',
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
          'registrare le conferme precontrattuali richieste nel flusso di acquisto',
          'assistere l’utente e gestire rimborsi, problemi tecnici o contestazioni',
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
          'La durata di accesso al prodotto è di 90 giorni, ma questo non determina automaticamente la cancellazione di ogni dato allo scadere dell’accesso: alcuni dati possono dover essere conservati più a lungo per finalità legali, fiscali, contabili, di sicurezza o di tutela dei diritti.',
          'I periodi di conservazione applicabili alle diverse categorie devono essere definiti e documentati in modo coerente con le finalità effettive del trattamento.',
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
          `L’indirizzo operativo attualmente utilizzato per le richieste privacy è ${contactEmail}. È inoltre possibile proporre reclamo al Garante per la protezione dei dati personali nei casi previsti dalla legge.`,
        ],
      },
      {
        title: '10. Minori',
        paragraphs: [
          'Il prodotto può essere utilizzato da studenti minorenni. Le informative destinate a minori devono essere comprensibili e proporzionate alla loro età.',
          'Quando lo studente è minorenne, il contratto di acquisto viene concluso dal genitore o tutore legale maggiorenne. I dati dell’acquirente e quelli dello studente possono quindi riferirsi a persone diverse e vengono trattati soltanto per le finalità pertinenti al rispettivo ruolo.',
          'Le regole sul consenso privacy dei minori e quelle sulla formazione del contratto restano distinte e devono essere applicate in base alla specifica operazione di trattamento.',
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
        paragraphs: [`Per domande su cookie e privacy, l’indirizzo operativo attualmente utilizzato è ${contactEmail}. Gli indirizzi di dominio dedicati verranno pubblicati solo dopo la loro effettiva attivazione.`],
      },
    ],
  },
};
