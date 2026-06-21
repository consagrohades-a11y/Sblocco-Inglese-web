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
  { label: `Simulazione ${primaryOffer.price}`, to: '/simulazione-39' },
  { label: 'Percorsi', to: '/percorsi' },
  { label: 'Recensioni', to: '/recensioni' },
  { label: 'Casi reali', to: '/casi-reali' },
  { label: 'FAQ', to: '/faq' },
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
    icon: Target,
  },
  {
    title: 'Simulazione pratica',
    text: 'Simuliamo una situazione reale in inglese: colloquio, call, cliente, presentazione o contesto specifico.',
    icon: Video,
  },
  {
    title: 'Correzione',
    text: 'Correggo gli errori principali: struttura, vocabolario, frasi poco naturali, esitazione e frasi tradotte dall’italiano.',
    icon: CheckCircle2,
  },
  {
    title: 'Feedback scritto',
    text: 'Dopo la sessione ricevi un breve documento con errori, frasi corrette e indicazioni pratiche.',
    icon: FileText,
  },
];

export const bookingSteps = [
  {
    title: 'Compili il quiz',
    text: 'Rispondi ad alcune domande sul tuo livello, il tuo obiettivo e il motivo per cui ti serve l’inglese.',
  },
  {
    title: 'Scegli lo slot',
    text: 'Scegli un orario disponibile nel calendario. Lo slot viene confermato dopo il pagamento.',
  },
  {
    title: 'Paghi con PayPal',
    text: 'Completi il pagamento con il pulsante PayPal ufficiale. Il sito non raccoglie dati di pagamento.',
  },
  {
    title: 'Ricevi la conferma',
    text: 'Dopo il pagamento, il posto è confermato.',
  },
  {
    title: 'Facciamo la simulazione online',
    text: 'La sessione dura 30 minuti e si svolge online.',
  },
  {
    title: 'Ricevi il feedback scritto',
    text: 'Dopo la sessione ricevi correzioni, frasi migliorate e indicazioni pratiche.',
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
    title: 'English for Work Sprint',
    type: 'Small group program',
    price: '€179 beta / prezzo futuro €199-249',
    description:
      'Percorso di 6 settimane in piccolo gruppo per italiani A2-B1/B2 che vogliono migliorare lo speaking in contesti professionali.',
    includes: [
      '6 settimane',
      'piccolo gruppo',
      'speaking pratico',
      'colloqui',
      'call',
      'email e frasi professionali',
      'correzione degli errori comuni',
      'simulazioni guidate',
    ],
    bestFor:
      'Chi non ha un colloquio urgentissimo, ma vuole sbloccarsi con pratica strutturata.',
    note:
      `Se hai già fatto la simulazione da ${primaryOffer.price}, il costo può essere scalato dal prezzo del percorso se ti iscrivi entro 7 giorni.`,
    icon: Users,
  },
  {
    title: 'Urgent Interview Prep Package',
    type: 'Private preparation',
    price: '€249-299',
    description:
      'Percorso privato per chi ha un colloquio o una scadenza ravvicinata e ha bisogno di preparare risposte, simulazioni e correzioni in modo più intensivo.',
    includes: [
      '3 sessioni private',
      'preparazione risposte',
      'simulazione colloquio',
      'feedback scritto',
      'correzione frasi',
      'pratica personalizzata',
    ],
    bestFor:
      'Chi ha un colloquio vero, una candidatura importante o poco tempo per prepararsi.',
    note:
      'Di solito ha senso dopo una prima diagnosi, così il lavoro privato parte già da problemi chiari.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Team English for Work',
    type: 'Small company/team training',
    price: 'Da €800',
    description:
      'Percorso per piccoli team o attività che lavorano con clienti stranieri e vogliono migliorare inglese pratico per email, call, accoglienza, customer service o vendita.',
    includes: [
      'programma su misura',
      'sessioni online',
      'focus su situazioni reali dell’azienda',
      'frasi e template pratici',
      'simulazioni con clienti',
      'feedback sul team',
    ],
    bestFor:
      'Piccole aziende, studi, attività turistiche, hospitality, customer service, beauty/wellness, eventi o servizi con clienti internazionali.',
    note:
      'La prima conversazione serve a capire se il bisogno del team è abbastanza specifico.',
    icon: ShieldCheck,
  },
];

export const proofPlaceholders = [
  ...aboutMe.placeholders,
  '[PLACEHOLDER — TEFL certificate or credentials if needed]',
];

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
