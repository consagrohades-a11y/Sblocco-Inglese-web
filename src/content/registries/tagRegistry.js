export const tagRegistry = {
  global: {
    skills: {
      'question-formation': {
        label: 'Question formation',
        description: 'Building English questions with the correct auxiliary and word order.',
      },
      'sentence-control': {
        label: 'Sentence control',
        description: 'Building basic English sentences accurately.',
      },
    },
    production: {
      recognition: {
        label: 'Recognition',
        description: 'The learner recognizes the correct form.',
      },
      'controlled-production': {
        label: 'Controlled production',
        description: 'The learner must produce the answer, not only recognize it.',
      },
      'applied-use': {
        label: 'Applied use',
        description: 'The learner uses English in a realistic situation.',
      },
    },
  },
  levels: {
    a1: {
      grammar: {
        'be-present': {
          label: 'Present simple of be',
          description: 'Control of am/is/are in basic sentences and questions.',
        },
        'present-simple': {
          label: 'Present simple',
          description: 'Basic present simple sentence control.',
        },
        'auxiliary-do': {
          label: 'Auxiliary do/does',
          description: 'Use of do/does in questions and negatives with normal verbs.',
        },
      },
      errorPatterns: {
        'be-do-confusion': {
          label: 'Be/do confusion',
          description: 'Using be as if it can form every English question.',
        },
        'missing-auxiliary': {
          label: 'Missing auxiliary',
          description: 'Leaving out do/does/did in questions or negatives.',
        },
        'italian-word-order-transfer': {
          label: 'Italian word order transfer',
          description: 'Using Italian-style question structure in English.',
        },
      },
    },
  },
  tracks: {
    hospitality: {
      contexts: {
        'guest-interaction': {
          label: 'Guest interaction',
          description: 'English used with guests, clients, tourists, or customers.',
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

  return {
    tag,
    dimension,
    known: false,
    label: fallbackLabel(tag),
    description: 'Evidence was recorded for this tag, but registry details have not been added yet.',
  };
}

