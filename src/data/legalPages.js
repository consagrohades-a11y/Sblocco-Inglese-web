const contactEmail = 'consagrohades@gmail.com';
const siteUrl = 'https://sbloccoinglese.com';
const brand = 'Sblocco Inglese';
const lastUpdated = '24 giugno 2026';

const ownerDetails = [
  brand,
  `Email: ${contactEmail}`,
  `Sito web: ${siteUrl}`,
  'Dati fiscali: non esposti pubblicamente in questa fase; eventuale documentazione fiscale, se dovuta, sarà gestita secondo la normativa applicabile.',
];

export const legalPages = {
  terms: {
    title: 'Termini e Condizioni',
    description: 'Termini e condizioni per i servizi online di Sblocco Inglese.',
    updated: lastUpdated,
    intro: [
      'I presenti Termini e Condizioni regolano la richiesta, la prenotazione e l’utilizzo dei servizi online offerti tramite il sito Sblocco Inglese.',
      'Prima di prenotare o pagare un servizio, l’utente è invitato a leggere attentamente questa pagina.',
    ],
    sections: [
      {
        title: '1. Titolare del servizio',
        paragraphs: ['Il servizio è offerto tramite il progetto di formazione linguistica online Sblocco Inglese.'],
        details: ownerDetails,
      },
      {
        title: '2. Servizio principale',
        paragraphs: [
          'Il servizio principale acquistabile dal sito è la Simulazione Inglese per Colloqui e Lavoro al prezzo beta di €39.',
          'La simulazione consiste in una sessione online di 30 minuti per testare e migliorare lo speaking in una situazione pratica, come colloquio, call di lavoro, presentazione personale, conversazione con clienti o contesto internazionale.',
          'La sessione include simulazione pratica, correzioni durante la sessione, feedback scritto dopo la sessione, frasi migliorate da riutilizzare e indicazioni operative su cosa migliorare.',
        ],
      },
      {
        title: '3. Prenotazione e conferma dello slot',
        paragraphs: [
          'L’utente compila il quiz di idoneità, sceglie uno slot disponibile tramite lo strumento di prenotazione indicato e completa il pagamento tramite PayPal.',
          'La scelta dello slot non è sufficiente a confermare la sessione: lo slot è confermato solo dopo il pagamento completato.',
          'Se il pagamento non viene completato, la sessione non si considera confermata.',
        ],
      },
      {
        title: '4. Prezzo e pagamento',
        paragraphs: [
          'Il prezzo beta della simulazione è €39.',
          'Il pagamento viene gestito tramite PayPal Hosted Buttons. Il sito non raccoglie né conserva dati completi della carta o altri dati sensibili di pagamento.',
          'PayPal può trattare i dati dell’utente secondo le proprie condizioni e informative privacy.',
        ],
      },
      {
        title: '5. Requisiti tecnici',
        paragraphs: [
          'La sessione si svolge online. L’utente è responsabile di avere una connessione internet stabile, un dispositivo funzionante, microfono e webcam se richiesti, e un ambiente adatto alla conversazione.',
        ],
      },
      {
        title: '6. Spostamento della sessione',
        paragraphs: [
          'L’utente può richiedere di spostare la sessione una sola volta con almeno 24 ore di preavviso.',
          'Le richieste con meno di 24 ore di preavviso potrebbero non essere accettate, salvo diversa disponibilità.',
          'In caso di mancata presenza senza preavviso, la sessione si considera svolta e non viene recuperata né rimborsata.',
          'Se la sessione viene annullata da parte di Sblocco Inglese, verrà proposta una nuova data oppure, se non è possibile trovare un accordo, verrà effettuato il rimborso dell’importo pagato.',
        ],
      },
      {
        title: '7. Rimborsi e recesso',
        paragraphs: [
          'Il servizio è una prestazione online con data e orario concordati. Eventuali richieste di rimborso vengono valutate caso per caso e secondo la normativa applicabile.',
          'Se il servizio è già stato completamente erogato, di norma non è previsto rimborso, salvo casi specifici previsti dalla legge o accordi diversi.',
          'Non sono garantiti rimborsi in caso di assenza dell’utente, ritardo significativo dell’utente o impossibilità tecnica imputabile all’utente.',
        ],
      },
      {
        title: '8. Nessuna garanzia di risultato',
        paragraphs: [
          'Il servizio ha lo scopo di aiutare l’utente a testare e migliorare il proprio inglese in una situazione pratica, ricevendo correzioni e feedback.',
          'Non vengono garantiti superamento di colloqui, ottenimento di un lavoro, trasferimento all’estero, ammissione a programmi o miglioramenti specifici entro un tempo garantito.',
          'I risultati dipendono dal livello di partenza, dalla pratica personale, dall’obiettivo, dalla costanza e dal contesto individuale.',
        ],
      },
      {
        title: '9. Materiali e feedback',
        paragraphs: [
          'Il feedback scritto e gli eventuali materiali forniti sono destinati all’uso personale dell’utente.',
          'Non è consentito copiare, rivendere, distribuire o utilizzare commercialmente materiali, template, feedback o contenuti forniti, salvo autorizzazione scritta.',
        ],
      },
      {
        title: '10. Comportamento durante la sessione',
        paragraphs: [
          'L’utente si impegna a mantenere un comportamento rispettoso durante la sessione.',
          'Sblocco Inglese si riserva il diritto di interrompere la sessione in caso di comportamenti offensivi, inappropriati, aggressivi o contrari al normale svolgimento del servizio.',
        ],
      },
      {
        title: '11. Modifiche ai servizi e ai prezzi',
        paragraphs: [
          'Prezzi, servizi e modalità di erogazione possono essere modificati nel tempo.',
          'Le modifiche non incidono sui servizi già pagati e confermati, salvo diverso accordo tra le parti.',
        ],
      },
      {
        title: '12. Contatti',
        paragraphs: [`Per domande sui presenti Termini e Condizioni, è possibile scrivere a: ${contactEmail}.`],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'Privacy Policy per il sito e i servizi online di Sblocco Inglese.',
    updated: lastUpdated,
    intro: [
      'La presente Privacy Policy descrive come vengono trattati i dati personali degli utenti che visitano il sito Sblocco Inglese e che richiedono informazioni, compilano il quiz, prenotano una sessione o completano un pagamento tramite strumenti esterni collegati al sito.',
    ],
    sections: [
      {
        title: '1. Titolare del trattamento',
        paragraphs: ['Il titolare del trattamento dei dati personali è Sblocco Inglese.'],
        details: ownerDetails,
      },
      {
        title: '2. Tipologie di dati raccolti',
        paragraphs: ['Attraverso il sito e gli strumenti collegati possono essere raccolti i seguenti dati personali:'],
        bullets: [
          'nome e cognome',
          'indirizzo email',
          'numero di telefono o contatto WhatsApp',
          'informazioni sul livello di inglese',
          'obiettivo per cui viene richiesto il servizio',
          'eventuale scadenza o urgenza indicata dall’utente',
          'informazioni inviate volontariamente tramite modulo, email o WhatsApp',
          'dati relativi alla prenotazione della sessione',
          'informazioni relative allo stato del pagamento, gestite tramite PayPal',
          'dati tecnici di navigazione eventualmente raccolti dal provider di hosting',
        ],
        paragraphsAfter: ['Non viene richiesto all’utente di inviare dati sensibili o informazioni non necessarie alla valutazione della richiesta.'],
      },
      {
        title: '3. Finalità del trattamento',
        paragraphs: ['I dati personali vengono trattati per le seguenti finalità:'],
        bullets: [
          'rispondere alle richieste inviate dall’utente',
          'valutare se la simulazione è adatta al livello e all’obiettivo dell’utente',
          'gestire la prenotazione della sessione',
          'gestire comunicazioni relative al pagamento e alla conferma dello slot',
          'erogare il servizio richiesto',
          'inviare il feedback scritto dopo la sessione',
          'gestire eventuali comunicazioni successive relative al servizio',
          'adempiere a eventuali obblighi legali, fiscali o contabili',
          'tutelare i diritti del titolare in caso di contestazioni',
        ],
        paragraphsAfter: ['I dati non vengono utilizzati per newsletter o comunicazioni promozionali continuative, salvo consenso espresso dell’utente.'],
      },
      {
        title: '4. Base giuridica del trattamento',
        paragraphs: ['Il trattamento dei dati si basa su una o più delle seguenti basi giuridiche:'],
        bullets: [
          'esecuzione di misure precontrattuali richieste dall’utente',
          'esecuzione del contratto quando l’utente acquista o prenota un servizio',
          'adempimento di obblighi legali, fiscali o contabili',
          'legittimo interesse del titolare, ad esempio per gestire comunicazioni e tutelare i propri diritti',
          'consenso dell’utente, quando richiesto per finalità specifiche',
        ],
      },
      {
        title: '5. Strumenti esterni utilizzati',
        paragraphs: ['Per gestire richieste, prenotazioni, comunicazioni e pagamenti possono essere utilizzati servizi esterni, tra cui:'],
        bullets: [
          'Google Forms o Google Workspace, per la raccolta delle richieste',
          'Calendly, per la prenotazione degli slot',
          'PayPal, per la gestione dei pagamenti',
          'WhatsApp ed email, per comunicazioni con l’utente',
          'Vercel o altro provider di hosting, per la pubblicazione del sito',
        ],
        paragraphsAfter: [
          'Questi servizi possono trattare dati personali secondo le proprie privacy policy e condizioni di utilizzo.',
          'L’utente è invitato a consultare anche le informative privacy dei servizi esterni utilizzati.',
        ],
      },
      {
        title: '6. Conservazione dei dati',
        paragraphs: [
          'I dati personali vengono conservati per il tempo necessario a gestire la richiesta, erogare il servizio e adempiere a eventuali obblighi legali o fiscali.',
          'I dati relativi a richieste non concluse possono essere conservati fino a 12 mesi. I dati relativi a clienti e pagamenti possono essere conservati per il periodo richiesto dagli obblighi fiscali e contabili applicabili.',
        ],
      },
      {
        title: '7. Comunicazione dei dati',
        paragraphs: ['I dati personali non vengono venduti a terzi.', 'I dati possono essere comunicati a fornitori di servizi tecnici, piattaforme di pagamento, strumenti di prenotazione, consulenti fiscali o legali se necessario, e autorità competenti nei casi previsti dalla legge.'],
      },
      {
        title: '8. Trasferimento dei dati fuori dallo Spazio Economico Europeo',
        paragraphs: [
          'Alcuni strumenti esterni utilizzati, come Google, Calendly, PayPal o WhatsApp, possono comportare il trasferimento di dati al di fuori dello Spazio Economico Europeo.',
          'In questi casi, il trasferimento avviene secondo le garanzie previste dalla normativa applicabile e dalle policy dei rispettivi fornitori.',
        ],
      },
      {
        title: '9. Diritti dell’utente',
        paragraphs: ['L’utente può esercitare i diritti previsti dalla normativa in materia di protezione dei dati personali, tra cui accesso, rettifica, cancellazione, limitazione, opposizione, portabilità quando applicabile e revoca del consenso quando il trattamento si basa sul consenso.'],
        paragraphsAfter: [
          `Per esercitare i propri diritti, l’utente può scrivere a: ${contactEmail}.`,
          'L’utente ha inoltre il diritto di proporre reclamo al Garante per la protezione dei dati personali, secondo le modalità previste dall’autorità competente.',
        ],
      },
      {
        title: '10. Dati di minori',
        paragraphs: [
          'Il servizio è pensato principalmente per adulti.',
          'Se una persona minorenne desidera utilizzare il servizio, è necessario il consenso di un genitore o di chi esercita la responsabilità genitoriale.',
        ],
      },
      {
        title: '11. Modifiche alla Privacy Policy',
        paragraphs: ['La presente Privacy Policy può essere aggiornata nel tempo. La versione aggiornata sarà pubblicata su questa pagina con indicazione della data dell’ultimo aggiornamento.'],
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    description: 'Cookie Policy per il sito Sblocco Inglese.',
    updated: lastUpdated,
    intro: ['La presente Cookie Policy descrive l’utilizzo di cookie e strumenti simili sul sito Sblocco Inglese.'],
    sections: [
      {
        title: '1. Cosa sono i cookie',
        paragraphs: [
          'I cookie sono piccoli file di testo che possono essere salvati sul dispositivo dell’utente durante la navigazione di un sito web.',
          'Possono servire a far funzionare correttamente il sito, ricordare preferenze, raccogliere statistiche o supportare attività di marketing.',
        ],
      },
      {
        title: '2. Cookie utilizzati da questo sito',
        paragraphs: [
          'Al momento, il sito non utilizza volutamente strumenti di tracciamento come Google Analytics, Meta Pixel, strumenti di remarketing, heatmap, newsletter tracking o sistemi di profilazione.',
          'Il sito può utilizzare cookie tecnici o strumenti strettamente necessari al funzionamento tecnico della piattaforma di hosting, alla sicurezza del sito o al funzionamento di servizi esterni collegati.',
        ],
      },
      {
        title: '3. Link a servizi esterni',
        paragraphs: ['Il sito può contenere link o embed a servizi esterni come Google Forms, Calendly, PayPal, WhatsApp, email o altri strumenti di prenotazione e pagamento.'],
        paragraphsAfter: [
          'Quando l’utente clicca su un link esterno o utilizza un servizio incorporato, può accedere a piattaforme di terzi che trattano dati e cookie secondo le proprie informative.',
          'L’utente è invitato a consultare le informative dei servizi esterni prima di utilizzarli.',
        ],
      },
      {
        title: '4. Gestione dei cookie dal browser',
        paragraphs: [
          'L’utente può gestire o disabilitare i cookie tramite le impostazioni del proprio browser.',
          'La disabilitazione di alcuni cookie tecnici potrebbe compromettere il corretto funzionamento del sito o dei servizi collegati.',
        ],
      },
      {
        title: '5. Aggiornamenti',
        paragraphs: ['La presente Cookie Policy può essere aggiornata nel tempo, soprattutto se vengono aggiunti strumenti di analytics, tracciamento, video incorporati, form incorporati o altri servizi di terze parti.'],
      },
    ],
  },
};
