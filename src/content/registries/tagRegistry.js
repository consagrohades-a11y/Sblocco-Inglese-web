import { feedbackRuleRegistry } from './feedbackRuleRegistry.js';

export const tagRegistry = {
  global: {
    skills: {
      'question-formation': {
        label: 'Question Formation',
        description: 'Devi rendere più automatica la costruzione delle domande, soprattutto quando passi dall’italiano all’inglese.',
      },
      'sentence-control': {
        label: 'Sentence Control',
        description: 'Devi costruire frasi inglesi complete mantenendo soggetto, verbo e ordine corretti.',
      },
      'spoken-sentence-control': {
        label: 'Spoken Sentence Control',
        description: 'Devi trasformare la regola grammaticale in una frase che riesci a produrre con maggiore immediatezza.',
      },
      'short-answer-control': {
        label: 'Short Answer Control',
        description: 'Devi riprendere correttamente be oppure do/does nelle risposte brevi senza ricostruire tutta la frase.',
      },
    },
    production: {
      recognition: {
        label: 'Recognition',
        description: 'Riconosci la forma corretta tra più alternative.',
      },
      'controlled-production': {
        label: 'Controlled Production',
        description: 'Produci una risposta con un supporto chiaro, invece di limitarti a riconoscerla.',
      },
      'controlled-practice': {
        label: 'Controlled Practice',
        description: 'Produci la struttura grammaticale all’interno di un compito guidato.',
      },
      'flexible-production': {
        label: 'Flexible Production',
        description: 'Usi la stessa regola in frasi diverse e con meno supporto.',
      },
      'applied-use': {
        label: 'Applied Use',
        description: 'Usi la grammatica in uno scambio realistico e contestualizzato.',
      },
      'final-check': {
        label: 'Final Check',
        description: 'Controlli se la regola resta stabile quando cambiano soggetto, significato e tipo di frase.',
      },
    },
    contexts: {
      'general-speaking': {
        label: 'General Speaking',
        description: 'Questo pattern può influire sulla capacità di costruire frasi e domande nella conversazione generale.',
      },
    },
  },
  levels: {
    a1: {
      grammar: {
        'subject-pronouns': {
          label: 'Subject Pronouns',
          description: 'Devi scegliere ed esprimere il pronome soggetto corretto: I, you, he, she, it, we o they.',
        },
        'be-present': {
          label: 'Present Simple of Be',
          description: 'Devi controllare am, is e are in frasi affermative, negative e interrogative.',
        },
        'be-question-formation': {
          label: 'Be Question Formation',
          description: 'Con be devi invertire verbo e soggetto: Is she...? / Are they...?, senza usare do/does.',
        },
        'be-negative': {
          label: 'Be Negative',
          description: 'La forma negativa richiede am/is/are + not, incluse le contrazioni isn’t e aren’t.',
        },
        'present-simple': {
          label: 'Present Simple',
          description: 'Devi controllare i verbi normali al Present Simple in frasi, domande e negative.',
        },
        'present-simple-affirmative': {
          label: 'Present Simple Affirmative',
          description: 'Devi usare il verbo base con I/you/we/they e una forma corretta con he/she/it.',
        },
        'present-simple-third-person': {
          label: 'Present Simple Third Person',
          description: 'Con he, she e it la forma affermativa richiede normalmente -s o -es.',
        },
        'auxiliary-do': {
          label: 'Auxiliary Do/Does',
          description: 'Con i verbi normali devi usare do/does nelle domande e don’t/doesn’t nelle negative.',
        },
        'do-does-question-formation': {
          label: 'Do/Does Question Formation',
          description: 'La domanda richiede do/does + soggetto + verbo base, anche quando l’italiano usa solo l’intonazione.',
        },
        'present-simple-negative': {
          label: 'Present Simple Negative',
          description: 'La negativa usa don’t/doesn’t + verbo base; non usare be davanti a un verbo normale.',
        },
      },
      errorPatterns: {
        'be-do-confusion': {
          label: 'Be/Do Confusion',
          description: 'Stai confondendo le domande con be e le domande con do/does. Devi identificare il verbo principale prima di costruire la frase.',
        },
        'missing-auxiliary': {
          label: 'Missing Auxiliary',
          description: 'Stai omettendo do/does nelle domande o nelle negative con i verbi normali.',
        },
        'italian-word-order-transfer': {
          label: 'Italian Word Order Transfer',
          description: 'Stai trasferendo l’ordine italiano nella frase inglese invece di usare la struttura richiesta.',
        },
        'missing-third-person-s': {
          label: 'Missing Third-Person -s',
          description: 'Con he, she o it stai dimenticando la -s nella frase affermativa.',
        },
        'short-answer-omission': {
          label: 'Short Answer Omission',
          description: 'La risposta breve deve includere soggetto e verbo o ausiliare: Yes, she is / No, he doesn’t.',
        },
        'enjoy-infinitive-transfer': {
          label: 'Enjoy + -ing Transfer',
          description: 'Dopo enjoy devi usare un’attività in -ing, per esempio enjoy swimming.',
        },
      },
    },
  },
  tracks: {
    hospitality: {
      contexts: {
        'guest-interaction': {
          label: 'Guest interaction',
          description: 'Inglese usato con ospiti, clienti, turisti o persone in una situazione di servizio.',
        },
      },
    },
  },
};

function fallbackLabel(tag = '') {
  return tag
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Unknown tag';
}

export function getTagInfo({ dimension, tag, level, track } = {}) {
  const info = tagRegistry.global?.[dimension]?.[tag]
    || tagRegistry.levels?.[level]?.[dimension]?.[tag]
    || tagRegistry.tracks?.[track]?.[dimension]?.[tag];

  if (info) return { tag, dimension, known: true, ...info };

  const feedbackRule = dimension === 'errorPatterns' ? feedbackRuleRegistry[tag] : null;
  if (feedbackRule) {
    return {
      tag,
      dimension,
      known: true,
      label: feedbackRule.title,
      description: feedbackRule.learnerMessage,
    };
  }

  return {
    tag,
    dimension,
    known: false,
    label: fallbackLabel(tag),
    description: 'Questo pattern è stato registrato nelle tue risposte, ma non ha ancora una descrizione specifica nel registro.',
  };
}
