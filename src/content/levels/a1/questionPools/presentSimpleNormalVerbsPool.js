const unitId = 'a1-present-simple-normal-verbs';

const selection = (form, languageFunction, topic, productionMode = 'controlled-production') => ({
  grammarArea: 'present-simple',
  form,
  languageFunction,
  topic,
  productionMode,
});

const blank = (id, prompt, correctAnswers, visibleExplanation, feedbackKeys, itemSelection) => ({
  id,
  unitId,
  type: 'blank',
  prompt,
  correctAnswers,
  answer: correctAnswers[0],
  visibleExplanation,
  feedbackKeys,
  ...itemSelection,
  selection: itemSelection,
});

const choice = (id, prompt, options, correctIndex, visibleExplanation, feedbackKeys, itemSelection) => ({
  id,
  unitId,
  type: 'choice',
  prompt,
  options,
  correctIndex,
  visibleExplanation,
  feedbackKeys,
  ...itemSelection,
  selection: itemSelection,
});

export const presentSimpleNormalVerbsPool = [
  blank('a1-u2-demo-01', 'I ___ in Bologna.', ['live'], 'Con I usa la forma base live.', [], selection('base-affirmative-review', 'answer-about-home', 'home')),
  blank('a1-u2-demo-02', 'We ___ English after work.', ['study'], 'Con we usa la forma base study.', [], selection('base-affirmative-review', 'answer-about-study', 'study')),
  blank('a1-u2-demo-03', 'They ___ help with the form.', ['need'], 'Con they usa la forma base need.', [], selection('base-affirmative-review', 'answer-about-needs', 'basic-needs')),
  blank('a1-u2-demo-04', 'She ___ in a hotel.', ['works'], 'Con she il verbo affermativo prende -s.', ['third-person-s-missing'], selection('third-person-affirmative-review', 'answer-about-work', 'work')),
  blank('a1-u2-demo-05', 'He ___ English every evening.', ['studies'], 'Con he, study diventa studies.', ['third-person-s-missing'], selection('third-person-affirmative-review', 'answer-about-study', 'study')),
  blank('a1-u2-demo-06', 'Marco ___ near the station.', ['lives'], 'Con Marco il verbo affermativo prende -s.', ['third-person-s-missing'], selection('third-person-affirmative-review', 'answer-about-home', 'home')),
  blank('a1-u2-demo-07', 'The shop ___ at nine.', ['opens'], 'The shop corrisponde a it, quindi open prende -s.', ['third-person-s-missing'], selection('third-person-affirmative-review', 'answer-about-routines', 'routine')),
  blank('a1-u2-demo-08', '___ you live near here?', ['do'], 'Con you e un verbo normale usa do.', ['normal-verb-question-needs-do', 'do-does-subject-agreement'], selection('do-does-choice', 'ask-about-home', 'home')),
  blank('a1-u2-demo-09', '___ they work on Saturdays?', ['do'], 'Con they usa do + soggetto + verbo base.', ['normal-verb-question-needs-do', 'do-does-subject-agreement'], selection('do-does-choice', 'ask-about-work', 'work')),
  blank('a1-u2-demo-10', '___ she speak English?', ['does'], 'Con she usa does e speak resta alla forma base.', ['normal-verb-question-needs-do', 'does-followed-by-base-verb', 'do-does-subject-agreement'], selection('do-does-choice', 'ask-about-language', 'language')),
  blank('a1-u2-demo-11', '___ Marco need help?', ['does'], 'Con Marco usa does e need resta alla forma base.', ['normal-verb-question-needs-do', 'does-followed-by-base-verb', 'do-does-subject-agreement'], selection('do-does-choice', 'ask-about-needs', 'basic-needs')),
  blank('a1-u2-demo-12', 'Where ___ you study?', ['do'], 'La domanda usa where + do + soggetto + verbo base.', ['normal-verb-question-needs-do'], selection('wh-do-question', 'ask-about-study', 'study')),
  blank('a1-u2-demo-13', 'Where ___ he work?', ['does'], 'Con he usa does; work non prende la -s.', ['normal-verb-question-needs-do', 'does-followed-by-base-verb'], selection('wh-does-question', 'ask-about-work', 'work')),
  choice('a1-u2-demo-14', 'Choose the correct question.', ['Does she like coffee?', 'Does she likes coffee?', 'Is she like coffee?'], 0, 'Does è seguito dal verbo base like.', ['normal-verb-question-needs-do', 'does-followed-by-base-verb', 'be-and-do-confusion'], selection('does-base-verb-control', 'ask-about-likes', 'likes', 'recognition')),
  choice('a1-u2-demo-15', 'Choose the correct question.', ['Does he work here?', 'Does he works here?', 'Is he work here?'], 0, 'La forma corretta è does + soggetto + verbo base.', ['normal-verb-question-needs-do', 'does-followed-by-base-verb', 'be-and-do-confusion'], selection('does-base-verb-control', 'ask-about-work', 'work', 'recognition')),
  blank('a1-u2-demo-16', 'I ___ work on Sundays.', ["don't", 'do not'], 'Con I usa don’t + verbo base.', ['present-simple-negative-needs-dont-doesnt'], selection('negative-dont', 'answer-about-routines', 'routine')),
  blank('a1-u2-demo-17', 'She ___ speak German.', ["doesn't", 'does not'], 'Con she usa doesn’t + speak.', ['present-simple-negative-needs-dont-doesnt', 'does-followed-by-base-verb'], selection('negative-doesnt', 'answer-about-language', 'language')),
  blank('a1-u2-demo-18', 'We ___ need a taxi.', ["don't", 'do not'], 'Con we usa don’t + need.', ['present-simple-negative-needs-dont-doesnt'], selection('negative-dont', 'answer-about-needs', 'basic-needs')),
  blank('a1-u2-demo-19', 'He ___ live in Rome.', ["doesn't", 'does not'], 'Con he usa doesn’t e il verbo resta live.', ['present-simple-negative-needs-dont-doesnt', 'does-followed-by-base-verb'], selection('negative-doesnt', 'answer-about-home', 'home')),
  choice('a1-u2-demo-20', 'Choose the correct negative sentence.', ["She doesn't work here.", "She don't work here.", "She doesn't works here."], 0, 'Con she usa doesn’t + verbo base work.', ['present-simple-negative-needs-dont-doesnt', 'does-followed-by-base-verb'], selection('negative-doesnt', 'correct-basic-information', 'work', 'recognition')),
  blank('a1-u2-demo-21', 'Do you work here? — Yes, I ___.', ['do'], 'La risposta breve riprende do.', ['short-answer-uses-auxiliary'], selection('short-answer-do', 'answer-about-work', 'work')),
  blank('a1-u2-demo-22', 'Does she speak English? — No, she ___.', ["doesn't", 'does not'], 'La risposta breve negativa riprende does.', ['short-answer-uses-auxiliary'], selection('short-answer-does', 'answer-about-language', 'language')),
  blank('a1-u2-demo-23', 'Do they live nearby? — Yes, they ___.', ['do'], 'Con they la risposta breve usa do.', ['short-answer-uses-auxiliary'], selection('short-answer-do', 'answer-about-home', 'home')),
  blank('a1-u2-demo-24', 'Does he need help? — No, he ___.', ["doesn't", 'does not'], 'Con he la risposta breve negativa usa doesn’t.', ['short-answer-uses-auxiliary'], selection('short-answer-does', 'answer-about-needs', 'basic-needs')),
];
