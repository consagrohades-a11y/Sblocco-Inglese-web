const publicEnv = typeof import.meta.env === 'object' ? import.meta.env : {};

function publicPaymentLink(key) {
  const value = String(publicEnv[key] || '').trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'buy.stripe.com' || url.hostname.endsWith('.stripe.com'))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export const interviewOffers = [
  {
    id: 'interview-kit',
    offerId: 'colloquio-essential',
    name: 'Kit Colloquio',
    price: 19,
    currency: 'EUR',
    badge: 'Essenziale',
    type: 'digital',
    active: true,
    featured: false,
    paymentUrl: publicPaymentLink('VITE_STRIPE_INTERVIEW_KIT_URL'),
    positioning: 'Per preparare velocemente struttura, lingua e domande più comuni.',
    cta: 'Prendi il Kit',
    includes: [
      'Question bank e answer frameworks',
      'Tell me about yourself builder',
      'STAR framework senza risposte robotiche',
      'Espressioni utili e domande difficili',
      'Emergency language e checklist',
      'Workbook scaricabile',
    ],
  },
  {
    id: 'interview-core',
    offerId: 'colloquio-complete',
    name: 'Sblocco Colloquio',
    price: 49,
    currency: 'EUR',
    badge: 'Più scelto',
    type: 'digital',
    active: true,
    featured: true,
    paymentUrl: publicPaymentLink('VITE_STRIPE_INTERVIEW_CORE_URL'),
    positioning: 'Il sistema completo per allenarti a produrre le risposte, non solo a studiarle.',
    cta: 'Inizia Sblocco Colloquio',
    includes: [
      'Percorso self-guided completo',
      'Scenari HR, behavioral e motivazionali',
      'Lingua per colloqui tecnici e pratici',
      'Strategie per domande difficili e imprevisti',
      'Speaking drills e mock interview',
      'Esercizi attivi dentro Sblocco Inglese',
    ],
  },
  {
    id: 'interview-complete',
    offerId: 'colloquio-complete-plus',
    name: 'Sblocco Colloquio Complete',
    price: 79,
    currency: 'EUR',
    badge: 'Miglior valore',
    type: 'bundle',
    active: true,
    featured: true,
    bestValue: true,
    paymentUrl: publicPaymentLink('VITE_STRIPE_INTERVIEW_COMPLETE_URL'),
    positioning: 'Percorso completo e materiali extra per prepararti in modo più specifico.',
    cta: 'Scegli Complete',
    includes: [
      'Tutto Sblocco Colloquio',
      'Kit Colloquio incluso',
      'Due role pack a scelta quando disponibili',
      'Mock interview aggiuntive',
      'Risorse extra di preparazione',
    ],
  },
];

export const interviewLab = {
  id: 'interview-lab',
  name: 'Interview Lab',
  price: 129,
  pricePrefix: 'da',
  currency: 'EUR',
  type: 'group',
  active: false,
  comingSoon: true,
  paymentUrl: publicPaymentLink('VITE_STRIPE_INTERVIEW_LAB_URL'),
  badge: 'Piccolo gruppo',
  cta: 'Avvisami della prossima edizione',
  cohort: {
    dates: null,
    capacity: null,
  },
  includes: ['4 sessioni live', 'Domande e mock interview', 'Feedback mirato', 'Pratica sotto pressione'],
};

export const interviewRolePacks = [
  ['tech', 'Tech', 'Spiegare processi, decisioni, trade-off e ragionamento tecnico.'],
  ['marketing', 'Marketing', 'Presentare campagne, dati, scelte e impatto sul business.'],
  ['sales', 'Sales', 'Raccontare risultati, obiezioni, negoziazione e relazioni con i clienti.'],
  ['finance', 'Finance', 'Commentare numeri, analisi, rischio e decisioni con precisione.'],
  ['hospitality', 'Hospitality', 'Gestire scenari di servizio, ospitalità e problem solving.'],
  ['graduate', 'Graduate / First Job', 'Valorizzare studi, progetti e potenziale quando l’esperienza è ancora breve.'],
].map(([slug, name, description]) => ({
  id: `interview-role-${slug}`,
  slug,
  name,
  description,
  price: 14,
  currency: 'EUR',
  type: 'add-on',
  active: false,
  comingSoon: true,
  bundleEligible: true,
  paymentUrl: publicPaymentLink(`VITE_STRIPE_INTERVIEW_${slug.toUpperCase()}_URL`),
}));

export const interviewPrivateSimulation = {
  id: 'interview-private-simulation',
  name: 'Simulazione privata',
  price: 119,
  pricePrefix: 'da',
  currency: 'EUR',
  type: 'premium-service',
  active: true,
  cta: 'Richiedi una simulazione',
  includes: [
    'Questionario prima dell’incontro',
    'Mock interview realistica',
    'Follow-up costruiti sul tuo profilo',
    'Feedback, correzioni e prossimi passi',
  ],
};

export function formatInterviewPrice(product) {
  const price = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: product.currency || 'EUR',
    maximumFractionDigits: 0,
  }).format(product.price);
  return product.pricePrefix ? `${product.pricePrefix} ${price}` : price;
}

