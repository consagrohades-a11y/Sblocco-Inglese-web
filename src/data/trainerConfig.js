export const trainerConfig = [
  {
    id: 'business-expression',
    title: 'Business Expression Trainer',
    shortTitle: 'Business',
    description: 'Practice the phrases you need for interviews, meetings, emails and professional conversations.',
    route: '/trainers/business-expression',
    status: 'available',
    cardType: 'expression',
    storageKey: 'sblocco_srs_progress_v1',
    categories: [
      'Interview English',
      'Business English',
      'Meetings & Calls',
      'Emails & Follow-ups',
      'Customer-facing English',
      'Small Talk & Natural Reactions',
    ],
  },
  {
    id: 'general-expression',
    title: 'General Expression Trainer',
    shortTitle: 'General',
    description: 'Build natural everyday English for opinions, reactions, travel and real conversations.',
    route: '/trainers/general-expression',
    status: 'available',
    cardType: 'expression',
    storageKey: 'sblocco_general_expression_progress_v1',
    categories: [
      'Everyday Conversation',
      'Opinions & Preferences',
      'Clarification & Repair',
      'Social Situations',
      'Travel & Practical Life',
      'Feelings & Reactions',
      'Storytelling & Past Experiences',
      'Plans, Goals & Future',
    ],
  },
  {
    id: 'word-trainer',
    title: 'Word Trainer',
    shortTitle: 'Words',
    description: 'Learn useful words, pronunciation, meanings, collocations and example sentences.',
    route: '/trainers/word-trainer',
    status: 'available',
    cardType: 'word',
    storageKey: 'sblocco_word_trainer_progress_v1',
    categories: [
      'Work & Career Vocabulary',
      'Business & Money Vocabulary',
      'Meetings, Calls & Communication Vocabulary',
      'Travel & Hospitality Vocabulary',
      'Everyday Life Vocabulary',
      'Feelings, Opinions & Personality Vocabulary',
      'Actions & Phrasal Verbs',
      'Connectors & Useful Adverbs',
      'Common Collocations',
      'False Friends & Italian Interference',
    ],
  },
];

export const trainerHome = {
  id: 'trainer-home',
  title: 'Trainer Home',
  shortTitle: 'Home',
  route: '/trainers',
};

export function getTrainerById(id) {
  return trainerConfig.find((trainer) => trainer.id === id);
}
