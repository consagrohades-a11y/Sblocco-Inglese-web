// Main website settings.
// Edit this file first when you need to change links, price, CTA labels, reviews, or the About text.

export const siteConfig = {
  teacherName: 'Rhema',
  brandName: 'Sblocco Inglese by Rhema',

  // Edit links here. Main booking CTAs open the internal quiz; the quiz itself submits to Google Forms.
  links: {
    bookingPage: '/prenota#booking-form',
    bookingFlow: '/prenota#booking-flow',
    googleForm: 'https://forms.gle/D95Y9hafyP9k3DEcA',
    calendly: 'https://calendly.com/consagrohades/30min',
    payment: '[STRIPE_PAYMENT_LINK_PLACEHOLDER]',
    whatsapp: '[WHATSAPP_LINK_PLACEHOLDER]',
  },

  // Edit the internal-looking booking quiz here.
  // These entry IDs come from the connected Google Form. If you change questions in Google Forms,
  // update the matching field names below.
  bookingForm: {
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSfpGh_Mb7ds4l4L-JQRWmWPm4Lc7OwSMBw-Q5mIGcWst1cMGQ/formResponse',
    fields: {
      fullName: {
        label: 'Nome e cognome',
        name: 'entry.2092238618',
        type: 'text',
        placeholder: 'Es. Nome Cognome',
        required: true,
      },
      email: {
        label: 'Email',
        name: 'entry.1556369182',
        type: 'email',
        placeholder: 'nome@email.com',
        required: true,
      },
      whatsapp: {
        label: 'Numero WhatsApp',
        name: 'entry.479301265',
        type: 'tel',
        placeholder: '+39 ...',
        required: true,
      },
      level: {
        label: 'Qual è il tuo livello di inglese?',
        name: 'entry.1753222212',
        required: true,
        options: ['A1', 'A2', 'B1', 'B2', 'Non lo so'],
      },
      purpose: {
        label: 'Perché ti serve l’inglese?',
        name: 'entry.588393791',
        required: true,
        options: ['Colloquio', 'Lavoro', 'Clienti', 'Trasferimento', 'Erasmus/Tirocinio/Università'],
        allowOther: true,
      },
      blocker: {
        label: 'Cosa ti blocca di più quando parli?',
        name: 'entry.1235892007',
        required: false,
        options: ['Paura di sbagliare', 'Non trovo le parole', 'Grammatica', 'Pronuncia', 'Ascolto', 'Mi blocco completamente'],
      },
      deadline: {
        label: 'Hai una scadenza concreta?',
        name: 'entry.470399885',
        required: false,
        options: ['Sì, un colloquio (preparazione urgente)', 'Sì, entro un mese', 'No, ma voglio essere pronto'],
        allowOther: true,
      },
      paymentReadiness: {
        label: 'Confermi di voler procedere con la simulazione da €39, con 30 minuti online e feedback scritto?',
        name: 'entry.2109138769',
        required: true,
        options: ['Sì', 'Forse', 'No'],
      },
    },
  },

  // Edit the quiz/booking/payment journey here. Calendly stays external, but it is displayed inside the booking page.
  bookingFlow: {
    title: 'Quiz, slot e pagamento',
    intro:
      'Completi il quiz di idoneità, scegli l’orario e paghi con PayPal per confermare il posto.',
    calendlyEmbedUrl:
      'https://calendly.com/consagrohades/30min?hide_event_type_details=1&hide_gdpr_banner=1&primary_color=0e7c66',
    steps: [
      {
        title: '1. Quiz',
        text: 'Compili il quiz con livello, obiettivo e contesto da preparare. Subito dopo vedi se procedere.',
      },
      {
        title: '2. Scegli lo slot',
        text: 'Scegli un orario disponibile nel calendario. Lo slot viene confermato dopo il pagamento.',
      },
      {
        title: '3. Paga con PayPal',
        text: 'Completi il pagamento con il pulsante PayPal ufficiale. Il sito non raccoglie dati di pagamento.',
      },
      {
        title: '4. Conferma',
        text: 'Dopo il pagamento, il posto è confermato. Poi facciamo la simulazione online e ricevi feedback scritto.',
      },
    ],
  },

  // Edit PayPal hosted button settings here if you create a new button in PayPal.
  paypalPayment: {
    sdkUrl:
      'https://www.paypal.com/sdk/js?client-id=BAAJKHpKbOWKX0bP-6zAwGzDGpLoLDZGwJq-C24ydY2_lQ3TM2-QnZyxqIek_zM_O_9WP9bEIBtfJal1SQ&components=hosted-buttons&disable-funding=venmo&currency=EUR&locale=it_IT',
    hostedButtonId: 'YRB8MRH7FYKKA',
    containerId: 'paypal-container-YRB8MRH7FYKKA',
  },

  // Edit the main offer name, price, and duration here.
  primaryOffer: {
    title: 'Simulazione Inglese per Colloqui e Lavoro',
    fullTitle: 'Simulazione Inglese per Colloqui e Lavoro — €39',
    price: '€39',
    priceLabel: 'Prezzo beta',
    duration: '30 minuti online',
  },

  // Edit recurring button labels here.
  ctaLabels: {
    primary: 'Prenota la simulazione da €39',
    mobile: 'Prenota da €39',
    form: 'Compila il quiz',
    calendly: 'Scegli lo slot',
    secondary: 'Scopri come funziona',
  },

  // Edit the homepage/Reviews trust section here.
  aboutMe: {
    title: 'Migliora con Rhema',
    paragraphs: [
      'Rhema è un’insegnante di inglese online bilingue italiano/inglese. Lavora con studenti italiani e internazionali, anche su Preply, e si concentra soprattutto su speaking, inglese pratico, colloqui e situazioni professionali.',
      'Il suo punto di forza è capire sia come ragiona uno studente italiano quando prova a parlare inglese, sia cosa rende una risposta più naturale, chiara e credibile in un contesto anglofono.',
      'Il suo approccio non si basa su conversazione generica, ma su simulazioni pratiche, correzioni mirate e frasi che lo studente può davvero riutilizzare.',
      'Molti studenti non hanno solo un problema di grammatica: spesso il blocco nasce quando devono parlare sotto pressione, trovare le parole giuste o rispondere senza tradurre tutto dall’italiano.',
      'Con Sblocco Inglese, Rhema aiuta gli studenti a capire cosa li blocca nello speaking e a rendere il loro inglese più chiaro, naturale e utilizzabile.',
    ],
    disclaimer:
      'Questo non significa promettere risultati lavorativi: significa lavorare in modo concreto su speaking, chiarezza e preparazione.',
    badges: [
      'Bilingue italiano/inglese',
      'Preply teacher',
      'Speaking-focused',
      'Work English',
      'Interview preparation',
      'Feedback scritto',
    ],
    placeholders: [
      '[PLACEHOLDER — foto di Rhema]',
      '[PLACEHOLDER — screenshot profilo Preply]',
      '[PLACEHOLDER — recensione Preply]',
      '[PLACEHOLDER — breve video introduttivo]',
    ],
  },

  // Replace these placeholders with real testimonials or Preply review summaries.
  reviews: [
    {
      name: '[PLACEHOLDER — Screenshot recensione Preply 1]',
      role: 'Studente online',
      text: 'Spazio per una recensione reale da Preply, con focus su speaking, chiarezza delle correzioni e sicurezza nel parlare.',
    },
    {
      name: '[PLACEHOLDER — Screenshot recensione Preply 2]',
      role: 'Preparazione pratica',
      text: 'Spazio per una recensione reale legata a obiettivi concreti: lavoro, colloqui, trasferimento o studio all’estero.',
    },
    {
      name: '[PLACEHOLDER — Screenshot recensione Preply 3]',
      role: 'Feedback sul metodo',
      text: 'Spazio per una recensione reale sul metodo: correzioni utili, frasi migliorate e pratica mirata.',
    },
  ],

  // Edit the anonymized case studies page here.
  caseStudies: {
    disclaimer:
      'I risultati individuali dipendono dal livello di partenza, dall’obiettivo, dalla costanza e dal contesto personale. Questi esempi non sono garanzie di risultato, ma mostrano il tipo di lavoro pratico che può essere fatto quando l’inglese è collegato a un obiettivo concreto.',
    items: [
      {
        title: 'Software developer con buon CV, bloccato dall’inglese',
        label: 'Relocation English',
        paragraphs: [
          'Uno studente con profilo da software developer aveva un buon CV e un obiettivo chiaro: prepararsi a un possibile trasferimento all’estero.',
          'Il problema principale non era la mancanza di competenze professionali, ma la difficoltà a usare l’inglese con sicurezza quando doveva parlare di sé, della propria esperienza e dei propri obiettivi.',
          'Il lavoro si è concentrato su speaking, risposte più strutturate, frasi riutilizzabili e simulazioni di situazioni pratiche legate al trasferimento e al lavoro.',
          'L’obiettivo non era studiare inglese in modo astratto, ma rendere il suo inglese più utilizzabile in conversazioni reali: presentarsi, spiegare il proprio ruolo, parlare del proprio percorso e rispondere con più chiarezza.',
        ],
        result: 'Lo studente è riuscito a completare il suo percorso di trasferimento.',
        focus: [
          'software developer',
          'buon CV',
          'inglese parlato',
          'relocation',
          'speaking confidence',
          'professional self-presentation',
          'practical English',
        ],
      },
      {
        title: 'Business English per uno studente Brand Manager',
        label: 'Work English',
        paragraphs: [
          'Uno studente con ruolo e interessi legati al Brand Management aveva bisogno di usare l’inglese in modo più naturale e professionale in contesti lavorativi.',
          'Il lavoro non si è limitato a conversazioni generiche. Sono state fatte molte simulazioni, assumendo ruoli diversi e ricreando vari contesti professionali: riunioni, conversazioni con colleghi, presentazioni, spiegazione di decisioni, gestione di situazioni lavorative e comunicazione con interlocutori internazionali.',
          'L’obiettivo era rendere l’inglese più concreto, meno scolastico e più adatto a situazioni di lavoro reali.',
          'Il percorso si è concentrato su lessico professionale, chiarezza, fluidità, capacità di spiegare il proprio ruolo e maggiore sicurezza nello speaking.',
        ],
        focus: [
          'Brand Manager',
          'business English',
          'roleplay',
          'workplace simulations',
          'different professional situations',
          'clearer communication',
          'less school-like English',
        ],
      },
      {
        title: 'Preparazione per Emirates Cabin Crew',
        label: 'Interview English',
        paragraphs: [
          'Una studentessa stava preparando un percorso legato a Emirates Cabin Crew e aveva bisogno di lavorare sull’inglese per colloqui, presentazione personale e risposte professionali.',
          'Il lavoro si è concentrato su domande tipiche da colloquio, chiarezza nelle risposte, sicurezza nello speaking, vocabolario legato al servizio clienti e capacità di presentarsi in modo professionale.',
          'Sono state colmate velocemente anche alcune lacune grammaticali che le servivano per rispondere in modo più preciso e sicuro. L’obiettivo non era studiare grammatica in modo isolato, ma sistemare ciò che le impediva di esprimersi bene durante la preparazione.',
          'Il percorso l’ha aiutata a costruire risposte più strutturate, ridurre l’esitazione e sentirsi più pronta davanti a domande professionali in inglese.',
        ],
        focus: [
          'Emirates Cabin Crew',
          'interview preparation',
          'customer service English',
          'personal presentation',
          'grammar gaps quickly addressed',
          'structured answers',
          'confidence under pressure',
        ],
      },
    ],
  },
};

export const brandName = siteConfig.brandName;
export const primaryOffer = siteConfig.primaryOffer;
export const ctaLabels = siteConfig.ctaLabels;
export const bookingForm = siteConfig.bookingForm;
export const bookingFlow = siteConfig.bookingFlow;
export const paypalPayment = siteConfig.paypalPayment;
export const aboutMe = siteConfig.aboutMe;
export const reviews = siteConfig.reviews;
export const caseStudies = siteConfig.caseStudies;

export const externalLinks = {
  form: siteConfig.links.bookingPage,
  bookingFlow: siteConfig.links.bookingFlow,
  googleForm: siteConfig.links.googleForm,
  calendar: siteConfig.links.calendly,
  payment: siteConfig.links.payment,
  whatsapp: siteConfig.links.whatsapp,
};
