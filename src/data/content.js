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