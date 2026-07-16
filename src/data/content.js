import {
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Globe2,
  GraduationCap,
  Headphones,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Video,
} from 'lucide-react';
import {
  aboutMe,
  brandName,
  caseStudies,
  ctaLabels,
  externalLinks,
  primaryOffer,
  reviews as configuredReviews,
} from '../config/site';

export { aboutMe, brandName, caseStudies, ctaLabels, externalLinks, primaryOffer };

// Edit the longer website content here: FAQ, service cards, process steps, offers, and testimonial placeholders.
// Edit links, price, CTA labels, About text, and reviews in src/config/site.js.

export const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Corsi', to: '/percorsi' },
  { label: 'Simulazione', to: '/simulazione-39' },
  { label: 'Trainer', to: '/trainers' },
  { label: 'Grammatica', to: '/grammar' },
  { label: 'Founder e recensioni', to: '/recensioni' },
  { label: 'Contatti', to: '/contatti' },
  { label: 'Prenota', to: '/prenota' },
];

export const trustBadges = [
  { label: '30 minuti online', icon: Video },
  { label: 'Feedback scritto', icon: FileText },
  { label: 'Per colloqui e lavoro', icon: BriefcaseBusiness },
  { label: 'Pensato per italiani A2-B1/B2', icon: GraduationCap },
];

export const fitCards = [
  {
    title: 'Ti blocchi quando devi parlare',
    text: 'Hai studiato inglese, ma nel momento reale perdi sicurezza.',
    icon: MessageSquareText,
  },
  {
    title: 'Capisci più di quanto riesci a dire',
    text: 'Quando leggi o ascolti capisci abbastanza, ma rispondere ti sembra lento e faticoso.',
    icon: Headphones,
  },
  {
    title: 'Traduci mentalmente dall’italiano',
    text: 'Le frasi arrivano a pezzi e temi che suonino poco naturali.',
    icon: Globe2,
  },
  {
    title: 'Hai un contesto reale da preparare',
    text: 'Colloquio, call, lavoro, clienti, Erasmus o trasferimento.',
    icon: CalendarCheck,
  },
  {
    title: 'Vuoi sapere cosa correggere',
    text: 'Non vuoi solo parlare: vuoi capire quali errori frenano il tuo speaking.',
    icon: Target,
  },
  {
    title: 'Hai circa un livello A2, B1 o B2',
    text: 'Non serve essere perfetti, ma devi riuscire a creare frasi semplici.',
    icon: ClipboardCheck,
  },
];

export const receiveItems = [
  primaryOffer.duration,
  'simulazione pratica',
  'correzione durante la sessione',
  'feedback scritto',
  '5-10 frasi migliorate da riutilizzare',
  'stima del livello',
  'indicazione chiara dei prossimi step',
];

export const processSteps = [
  {
    title: 'Obiettivo iniziale',
    text: 'Capiamo perché ti serve l’inglese: colloquio, lavoro, clienti, Erasmus, trasferimento o altro contesto professionale.',
    detailTitle: 'Qui mettiamo a fuoco la situazione vera.',
    detail:
      'Non partiamo da esercizi generici. Capisco cosa devi dire, a chi lo devi dire e che tipo di pressione senti quando devi rispondere in inglese.',
    focus: 'Risultato: una direzione chiara per la simulazione, non una lezione casuale.',
    icon: Target,
  },
  {
    title: 'Simulazione pratica',
    text: 'Simuliamo una situazione reale in inglese: colloquio, call, cliente, presentazione o contesto specifico.',
    detailTitle: 'Qui il blocco diventa visibile.',
    detail:
      'Ricreiamo una scena concreta: una domanda da colloquio, una call, una richiesta di chiarimento o una risposta professionale. Non serve essere perfetti: serve vedere dove si inceppa il tuo speaking.',
    focus: 'Risultato: capisci cosa succede quando devi parlare davvero.',
    icon: Video,
  },
  {
    title: 'Correzione',
    text: 'Correggo gli errori principali: struttura, vocabolario, frasi poco naturali, esitazione e frasi tradotte dall’italiano.',
    detailTitle: 'Qui togliamo rumore alla risposta.',
    detail:
      'Lavoriamo su frasi troppo italiane, esitazioni, parole deboli e strutture che ti fanno sembrare meno sicuro/a di quanto sei. La correzione resta pratica: cosa dire meglio la prossima volta.',
    focus: 'Risultato: risposte più chiare, più naturali e più credibili.',
    icon: CheckCircle2,
  },
  {
    title: 'Feedback scritto',
    text: 'Dopo la sessione ricevi un breve documento con errori, frasi corrette e indicazioni pratiche.',
    detailTitle: 'Qui la sessione diventa materiale riutilizzabile.',
    detail:
      'Non resta tutto nella call. Ricevi errori ricorrenti, frasi migliorate e prossimi step, così puoi ripassare prima di un colloquio, una call o una conversazione importante.',
    focus: 'Risultato: sai cosa ripetere, non solo che devi parlare di più.',
    icon: FileText,
  },
];

export const bookingSteps = [
  {
    title: 'Compili il quiz',
    text: 'Rispondi ad alcune domande sul tuo livello, il tuo obiettivo e il motivo per cui ti serve l’inglese.',
    detailTitle: 'Serve a evitare una partenza generica.',
    detail:
      'Il quiz raccoglie contesto, livello percepito e urgenza. Così la simulazione non parte da zero: parte già da ciò che ti serve davvero.',
    focus: 'Ideale se vuoi capire se la simulazione è il primo passo giusto.',
  },
  {
    title: 'Scegli lo slot',
    text: 'Scegli un orario disponibile nel calendario. Lo slot viene confermato dopo il pagamento.',
    detailTitle: 'Blocchi un momento preciso per lavorare sul problema.',
    detail:
      'Scegli un orario comodo e ti prepari sapendo che la sessione avrà un obiettivo chiaro, non una conversazione vaga.',
    focus: 'Lo slot diventa definitivo dopo il pagamento.',
  },
  {
    title: 'Paghi con PayPal',
    text: 'Completi il pagamento con il pulsante PayPal ufficiale. Il sito non raccoglie dati di pagamento.',
    detailTitle: 'Pagamento semplice, senza dati sensibili sul sito.',
    detail:
      'Il pagamento passa da PayPal. Sblocco Inglese non gestisce direttamente carte o dati bancari: ti serve solo confermare il posto.',
    focus: 'Dopo il pagamento, la sessione è confermata.',
  },
  {
    title: 'Ricevi la conferma',
    text: 'Dopo il pagamento, il posto è confermato.',
    detailTitle: 'Hai tutto pronto per la simulazione.',
    detail:
      'Conferma, orario e obiettivo sono allineati. A quel punto resta una cosa: arrivare alla sessione con il contesto che vuoi preparare.',
    focus: 'Da qui si passa alla simulazione online.',
  },
  {
    title: 'Facciamo la simulazione online',
    text: 'La sessione dura 30 minuti e si svolge online.',
    detailTitle: 'Trenta minuti concentrati su una situazione reale.',
    detail:
      'Lavoriamo su risposte, chiarezza, frasi tradotte male dall’italiano e sicurezza sotto pressione. Breve, ma molto mirata.',
    focus: 'Obiettivo: uscire con correzioni utili, non con teoria astratta.',
  },
  {
    title: 'Ricevi il feedback scritto',
    text: 'Dopo la sessione ricevi correzioni, frasi migliorate e indicazioni pratiche.',
    detailTitle: 'Il lavoro continua dopo la call.',
    detail:
      'Il feedback ti aiuta a rivedere ciò che è emerso: errori, alternative migliori e indicazioni per capire se proseguire con un corso o con pratica autonoma.',
    focus: 'Questo è il ponte verso corsi, trainer o prossimo step.',
  },
];

// Edit the correction examples shown on the homepage here.
export const feedbackExamples = [
  {
    label: 'Presentarsi in modo professionale',
    before: 'I have experience in marketing and I want work in international company.',
    after:
      'I have experience in marketing, and I’d like to work in an international company where I can use English in a professional context.',
    note: 'Correggiamo struttura, naturalezza e chiarezza del messaggio.',
  },
  {
    label: 'Spiegare il proprio ruolo',
    before: 'I do many things for social media and I follow the brand.',
    after:
      'I manage different aspects of the brand’s communication, especially social media, content planning, and how the brand presents itself online.',
    note: 'Rendiamo la risposta più precisa e professionale.',
  },
  {
    label: 'Rispondere senza tradurre dall’italiano',
    before: 'I am interested to this job because I want grow and make experience.',
    after:
      'I’m interested in this role because I want to grow professionally and gain experience in an international environment.',
    note: 'Lavoriamo sulle frasi che in italiano sembrano naturali, ma in inglese vanno costruite diversamente.',
  },
];

// Edit the short "Dopo il quiz" process here.
export const afterFormSteps = [
  'Compili il quiz.',
  'Leggi l’esito.',
  'Scegli lo slot nel calendario.',
  'Paghi con PayPal.',
  'Ricevi la conferma.',
  'Facciamo la simulazione online.',
  'Ricevi il feedback scritto.',
];

export const situations = [
  {
    label: 'Colloquio di lavoro',
    title: 'Prepari risposte più chiare per un colloquio',
    context:
      'Se hai un colloquio vero, lavoriamo su come presentarti, spiegare esperienza e rispondere senza sembrare rigido/a.',
    detail:
      'La parte importante non è imparare risposte a memoria: è costruire una struttura che resti naturale anche quando la domanda cambia.',
    items: [
      'Tell me about yourself.',
      'Why are you interested in this position?',
      'Can you describe your experience?',
      'What are your strengths?',
    ],
  },
  {
    label: 'Lavoro e call',
    title: 'Ti alleni su call, clienti e comunicazione professionale',
    context:
      'Se lavori già con l’inglese, ci concentriamo sulle frasi che ti servono quando devi intervenire, chiarire, chiedere tempo o rispondere a un cliente.',
    detail:
      'L’obiettivo è sembrare più presente in conversazione: meno traduzione mentale, più formule pronte e più controllo del tono.',
    items: [
      'presentarti in una call',
      'spiegare il tuo ruolo',
      'chiedere chiarimenti',
      'parlare con un cliente',
    ],
  },
  {
    label: 'Erasmus / tirocinio / trasferimento',
    title: 'Rendi più fluide le situazioni pratiche all’estero',
    context:
      'Se stai preparando un periodo fuori, lavoriamo sulle conversazioni che ti fanno sentire esposto/a: presentarti, chiedere informazioni, spiegare cosa cerchi.',
    detail:
      'Qui conta la sicurezza quotidiana: non parlare in modo perfetto, ma riuscire a cavartela con frasi chiare e reazioni più rapide.',
    items: [
      'presentarti',
      'spiegare il tuo percorso',
      'parlare dei tuoi obiettivi',
      'rispondere a domande pratiche',
    ],
  },
];

export const faqItems = [
  {
    question: 'Devo avere già un buon livello?',
    answer:
      'No. La simulazione è pensata soprattutto per persone A2, B1 o B2. Devi però riuscire a costruire frasi semplici.',
  },
  {
    question: 'È una lezione normale?',
    answer:
      'No. È una simulazione con correzione e feedback scritto. Non è conversazione generica.',
  },
  {
    question: 'Ricevo materiale dopo?',
    answer:
      'Sì. Ricevi un feedback scritto con errori principali, frasi corrette, frasi migliorate e consigli pratici.',
  },
  {
    question: 'Posso usarla per preparare un colloquio vero?',
    answer:
      'Sì. In quel caso possiamo simulare domande tipiche da colloquio e lavorare su risposte più chiare e naturali.',
  },
  {
    question: 'Posso fare la simulazione anche se non so il mio livello?',
    answer: 'Sì. Nel quiz puoi indicare “non lo so”.',
  },
  {
    question: 'Ho fatto il quiz: posso prenotare?',
    answer:
      'Sì, se il risultato dice che la simulazione è adatta o probabilmente adatta, puoi procedere con slot e pagamento.',
  },
  {
    question: 'Come avviene il pagamento?',
    answer:
      'Dopo aver scelto lo slot, completi il pagamento con PayPal. Il sito non raccoglie dati di pagamento.',
  },
  {
    question: 'Posso spostare la sessione?',
    answer: 'Sì, puoi spostarla una volta con almeno 24 ore di preavviso.',
  },
  {
    question: 'Mi garantisce che passerò un colloquio?',
    answer:
      'No. La simulazione ti aiuta a prepararti meglio, correggere errori e parlare in modo più chiaro. Non garantisce esiti lavorativi.',
  },
  {
    question: 'È adatta a principianti assoluti?',
    answer:
      'Non è ideale per chi parte completamente da zero. In quel caso è meglio iniziare da un percorso base.',
  },
];

export const reviews = configuredReviews;

export const percorsoOffers = [
  {
    title: 'Speaking Under Pressure',
    type: 'Corso principale',
    price: '€179 beta',
    description:
      'Percorso di 6 settimane per italiani A2-B1/B2 che capiscono l’inglese ma si bloccano quando devono parlare dal vivo.',
    includes: [
      '6 settimane',
      'piccolo gruppo',
      'speaking pratico',
      'colloqui',
      'call',
      'risposte più naturali',
      'correzione degli errori comuni',
      'simulazioni guidate',
      'allenamento fuori lezione con feedback',
      'Trainer Suite inclusa durante il corso',
    ],
    bestFor:
      'Chi vuole sbloccarsi con pratica strutturata, senza aspettare un colloquio urgente. Per non farsi cogliere di sorpresa.',
    note:
      `Se hai già fatto la simulazione da ${primaryOffer.price}, il costo può essere scalato dal prezzo del corso se ti iscrivi entro 7 giorni.`,
    selectedTitle: 'Quando scegli questo sprint',
    selectedCopy:
      'Il lavoro diventa costante ma leggero e definito: ogni settimana alleni speaking professionale, risposte da colloquio, call, email e frasi che ti servono davvero. È pensato per chi vuole crescere senza aspettare una scadenza drammatica.',
    selectedBullets: [
      'più ritmo e continuità rispetto a una singola simulazione',
      'correzioni ricorrenti sugli errori che tornano spesso',
      'frasi professionali da riutilizzare in contesti diversi',
      'organizzazione mirata a risultati tangibili',
    ],
    icon: Users,
  },
  {
    title: 'Business English Flow',
    type: 'Corso lavoro e comunicazione',
    price: '€219 beta',
    description:
      'Percorso per rendere più fluide call, email, aggiornamenti, richieste di chiarimento e conversazioni con colleghi o clienti.',
    includes: [
      '6 settimane',
      'call e riunioni',
      'email e follow-up',
      'frasi professionali',
      'customer-facing English',
      'speaking in ambienti quali expo, congressi, networking',
      'trainer business incluso durante il corso',
    ],
    bestFor:
      'Chi usa già l’inglese al lavoro e vuole sembrare più chiaro, presente e professionale.',
    note:
      'È una buona evoluzione dopo la simulazione se il blocco emerge soprattutto in call, email o contatto clienti.',
    selectedTitle: 'Quando scegli Business English Flow',
    selectedCopy:
      'Il corso lavora sulle situazioni che si ripetono davvero al lavoro: spiegare, chiedere, rispondere, seguire una call, chiudere un messaggio senza suonare tradotto, usare la lingua in maniera professionale ma non robotica, creando connessioni reali con colleghi, clienti e futuri partner lavorativi.',
    selectedBullets: [
      'più formule pronte per call ed email',
      'meno traduzione mentale nelle risposte professionali',
      'trainer business collegato al lavoro fatto nel corso',
    ],
    icon: BriefcaseBusiness,
  },
  {
    title: 'Urgent Interview Prep',
    type: 'Preparazione privata',
    price: '€249-299',
    description:
      'Percorso privato per chi ha un colloquio o una scadenza ravvicinata e ha bisogno di preparare risposte, simulazioni e correzioni in modo più intensivo.',
    includes: [
      '6 sessioni private, con una cadenza adatta alla tua scadenza',
      'preparazione risposte',
      'simulazione colloquio',
      'feedback scritto',
      'correzione frasi',
      'pratica personalizzata',
      'review CV (ATTENZIONE!, in inglese si scrive diversamente...)',
      'Trainer Suite incluso durante la preparazione. Qui diventa fondamentale e aumenta la tua probabilità di successo',
    ],
    bestFor:
      'Chi ha un colloquio vero, una candidatura importante o poco tempo per prepararsi.',
    note:
      'Di solito ha senso dopo una prima diagnosi, così il lavoro privato parte già da problemi chiari.',
    selectedTitle: 'Quando scegli la preparazione urgente',
    selectedCopy:
      'Qui andiamo dritti sulla performance: prepariamo risposte, simuliamo domande difficili e rendiamo il tuo inglese più ordinato sotto pressione. È il percorso più indicato quando il tempo è poco e la posta è concreta.',
    selectedBullets: [
      'risposte personalizzate per ruolo, azienda e obiettivo',
      'simulazioni più intense con correzione mirata',
      'feedback scritto per ripassare prima del colloquio',
    ],
    icon: BriefcaseBusiness,
  },
  {
    title: 'Team English for Work',
    type: 'Training per team',
    price: 'Da €800',
    description:
      'Percorso per piccoli team o attività che lavorano con clienti stranieri o in espansione di mercato e vogliono migliorare inglese pratico per email, call, accoglienza, customer service o vendita.',
    includes: [
      'programma su misura',
      'sessioni online',
      'focus su situazioni reali dell’azienda',
      'frasi e template pratici',
      'simulazioni con clienti',
      'feedback sul team',
      'Trainer Suite disponibile per tutto il team durante il percorso',
    ],
    bestFor:
      'Piccole aziende, studi, attività turistiche, hospitality, customer service, beauty/wellness, eventi o servizi con clienti internazionali.',
    note:
      'La prima conversazione serve a capire se il bisogno del team è abbastanza specifico.',
    selectedTitle: 'Quando scegli il training per team',
    selectedCopy:
      "Il focus non è “fare inglese”, ma rendere il team più chiaro con clienti, ospiti o interlocutori internazionali. Partiamo dalle situazioni ripetute dell’attività e costruiamo frasi, simulazioni e template utili. LET'S UPSKILL",
    selectedBullets: [
      'programma adattato a ruoli, clienti e settore',
      'call, email, accoglienza o vendita in inglese pratico',
      'materiale comune per rendere il team più coerente',
    ],
    icon: ShieldCheck,
  },
];

export const proofPlaceholders = [];

export const simulationIncludes = [
  primaryOffer.duration,
  'simulazione pratica',
  'correzione live',
  'feedback scritto',
  'frasi migliorate',
  'consiglio sui prossimi step',
];

export const riskNotes = [
  'Il quiz ti aiuta a capire se la simulazione è una buona scelta per te.',
  'Non è pensata per principianti assoluti.',
  'Non prometto risultati lavorativi garantiti.',
  'Ricevi comunque feedback scritto e frasi migliorate.',
];

export const heroMockupItems = [
  { title: 'Simulazione', text: 'Una situazione reale, non chiacchiera generica', icon: Video },
  { title: 'Correzione', text: 'Errori che frenano chiarezza e sicurezza', icon: CheckCircle2 },
  { title: 'Feedback scritto', text: 'Punti chiari da rivedere dopo la call', icon: FileText },
  { title: 'Frasi migliorate', text: '5-10 alternative da riutilizzare', icon: Sparkles },
];
