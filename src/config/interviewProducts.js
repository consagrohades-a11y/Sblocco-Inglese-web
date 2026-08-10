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
    slug: 'kit',
    offerId: 'colloquio-essential',
    name: 'Kit Colloquio',
    price: 19,
    currency: 'EUR',
    badge: 'Prepara',
    commercialRole: 'PREPARA',
    hubCta: 'Guarda cosa include',
    detailPath: '/percorsi/colloquio/kit',
    type: 'resource',
    status: 'preview',
    active: false,
    featured: false,
    paymentUrl: publicPaymentLink('VITE_STRIPE_INTERVIEW_KIT_URL'),
    positioning: 'Domande, strutture, espressioni e workbook per organizzare la preparazione.',
    cta: 'Ottieni il Kit — 19 €',
    shortDescription: 'Risorse per preparare rapidamente domande, esempi e lingua utile.',
    formatItems: ['Question Bank', 'Answer Builders', 'STAR', 'Emergency English', 'Workbook'],
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
    slug: 'sblocco-colloquio',
    offerId: 'colloquio-complete',
    name: 'Sblocco Colloquio',
    price: 49,
    currency: 'EUR',
    badge: 'Allenati',
    commercialRole: 'ALLENATI',
    recommended: true,
    hubCta: 'Esplora il percorso',
    detailPath: '/percorsi/colloquio/sblocco-colloquio',
    type: 'training',
    status: 'active',
    active: true,
    featured: true,
    paymentUrl: publicPaymentLink('VITE_STRIPE_INTERVIEW_CORE_URL'),
    positioning: 'Speaking, esercizi attivi, Interview File e mock interview per allenarti prima del colloquio.',
    cta: 'Acquista Sblocco Colloquio — 49 €',
    shortDescription: 'Il sistema interattivo e self-guided per allenare speaking e performance.',
    formatItems: ['8 moduli', 'Speaking', 'Interview File', 'Story Bank', '3 mock interview'],
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
    slug: 'complete',
    offerId: 'colloquio-complete-plus',
    name: 'Sblocco Colloquio Complete',
    price: 79,
    currency: 'EUR',
    badge: 'Prepara + allenati',
    commercialRole: 'PREPARA + ALLENATI + SPECIALIZZA',
    hubCta: 'Scopri Complete',
    detailPath: '/percorsi/colloquio/complete',
    type: 'bundle',
    status: 'comingSoon',
    active: false,
    featured: true,
    bestValue: false,
    paymentUrl: publicPaymentLink('VITE_STRIPE_INTERVIEW_COMPLETE_URL'),
    positioning: 'Il percorso insieme alle risorse e alla preparazione specialistica disponibile al lancio.',
    cta: 'Scegli Complete — 79 €',
    shortDescription: 'Preparazione, allenamento e materiali specialistici in un solo sistema.',
    formatItems: ['Kit', 'Training', 'Interview File', 'Specialised practice', 'Mock interview'],
    includes: [
      'Tutto Sblocco Colloquio',
      'Kit Colloquio incluso',
      'Preparazione specialistica solo quando pubblicata',
      'Pratica extra solo quando pubblicata',
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
  status: 'comingSoon',
  active: false,
  comingSoon: true,
  includedInComplete: false,
  paymentUrl: publicPaymentLink(`VITE_STRIPE_INTERVIEW_${slug.toUpperCase()}_URL`),
}));

export function getInterviewProductBySlug(slug) {
  return interviewOffers.find((product) => product.slug === slug) || null;
}

export function isInterviewProductPurchasable(product) {
  return Boolean(product?.status === 'active' && product.active);
}

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
