export const assessmentQuestions = [
  {
    id: 'goal',
    eyebrow: 'Il punto di partenza',
    title: 'Dove vuoi sentire la differenza per prima?',
    description: 'Scegli il contesto che conta di più adesso. Potremo comunque tenere conto anche degli altri.',
    type: 'single',
    options: [
      { value: 'business', label: 'Lavoro e Business English', description: 'Riunioni, call, clienti, aggiornamenti e comunicazione professionale.' },
      { value: 'interview', label: 'Colloquio o selezione', description: 'Presentarti, raccontare l’esperienza e gestire domande impreviste.' },
      { value: 'everyday', label: 'Vita quotidiana e viaggi', description: 'Conversazioni, spostamenti, richieste, imprevisti e socialità.' },
      { value: 'hospitality', label: 'Clienti e hospitality', description: 'Accoglienza, servizio, raccomandazioni, problemi e customer care.' },
      { value: 'foundations', label: 'Ricostruire le basi', description: 'Frasi, domande, tempi essenziali e sicurezza nelle strutture.' },
      { value: 'team', label: 'Formazione per un team', description: 'Un percorso per colleghi, dipendenti o un gruppo professionale.' },
    ],
  },
  {
    id: 'situations',
    eyebrow: 'Le situazioni reali',
    title: 'In quali momenti senti maggiormente il limite?',
    description: 'Puoi scegliere fino a quattro situazioni.',
    type: 'multiple',
    maxSelections: 4,
    options: [
      { value: 'meetings', label: 'Riunioni e call' },
      { value: 'clients', label: 'Clienti e richieste' },
      { value: 'updates', label: 'Aggiornamenti e problemi' },
      { value: 'presentations', label: 'Presentazioni e spiegazioni' },
      { value: 'interviews', label: 'Colloqui e selezioni' },
      { value: 'fast-listening', label: 'Capire persone che parlano velocemente' },
      { value: 'travel', label: 'Viaggi e situazioni quotidiane' },
      { value: 'social', label: 'Conversazioni spontanee' },
    ],
  },
  {
    id: 'speaking_blocker',
    eyebrow: 'Quando devi rispondere',
    title: 'Cosa succede più spesso mentre parli?',
    description: 'Scegli la risposta che descrive meglio il momento reale, non quello ideale.',
    type: 'single',
    options: [
      { value: 'freeze', label: 'Mi blocco quasi completamente', description: 'So che dovrei dire qualcosa, ma non riesco a partire.' },
      { value: 'translate', label: 'Traduco mentalmente e arrivo tardi', description: 'La frase nasce in italiano e perde ritmo mentre la costruisco.' },
      { value: 'vocabulary', label: 'Conosco le parole, ma non mi vengono', description: 'Riconosco molto più inglese di quello che riesco a recuperare.' },
      { value: 'grammar', label: 'La grammatica interrompe il messaggio', description: 'Controllo ogni frase e perdo il filo della conversazione.' },
      { value: 'pronunciation', label: 'Temo di non essere capito/a', description: 'Pronuncia e intelligibilità mi fanno ridurre ciò che dico.' },
      { value: 'comfortable', label: 'Riesco normalmente a continuare', description: 'Posso esitare, ma il messaggio arriva e la conversazione prosegue.' },
    ],
  },
  {
    id: 'listening_blocker',
    eyebrow: 'Quando ascolti',
    title: 'Quale difficoltà descrive meglio il tuo listening?',
    description: 'Il problema non è sempre “non capisco”. Spesso riguarda dettagli, velocità o capacità di reagire.',
    type: 'single',
    options: [
      { value: 'lost', label: 'Perdo il senso generale', description: 'Dopo alcune frasi non so più cosa stia succedendo.' },
      { value: 'speed', label: 'Capisco solo quando parlano lentamente', description: 'Le parole conosciute diventano difficili a velocità naturale.' },
      { value: 'details', label: 'Capisco il tema, ma perdo i dettagli', description: 'Scadenze, numeri, richieste e decisioni mi sfuggono.' },
      { value: 'accents', label: 'Accenti e pronunce diverse mi confondono', description: 'La comprensione cambia molto in base alla persona.' },
      { value: 'response', label: 'Capisco, ma non riesco a rispondere in tempo', description: 'Elaborare e formulare la risposta insieme è difficile.' },
      { value: 'comfortable', label: 'Di solito capisco ciò che mi serve', description: 'Posso perdere qualcosa, ma seguo e reagisco con sufficiente autonomia.' },
    ],
  },
  {
    id: 'foundations',
    eyebrow: 'Le fondamenta',
    title: 'Quanto sono stabili le strutture di base?',
    description: 'Pensa a frasi, domande, presente, passato e futuro essenziale.',
    type: 'single',
    options: [
      { value: 'fragile', label: 'Molto fragili', description: 'Faccio fatica anche a costruire frasi semplici senza aiuto.' },
      { value: 'basic', label: 'Riesco nelle frasi semplici', description: 'Quando la frase si allunga, iniziano confusione e molti errori.' },
      { value: 'developing', label: 'Abbastanza presenti, ma instabili', description: 'Comunico, anche se alcune strutture continuano a crollare sotto pressione.' },
      { value: 'solid', label: 'Generalmente solide', description: 'Gli errori esistono, ma raramente impediscono di comunicare.' },
    ],
  },
  {
    id: 'level',
    eyebrow: 'Il livello percepito',
    title: 'Dove ti collocheresti oggi?',
    description: 'Non deve essere perfetto. Serve solo per evitare di consigliarti un formato troppo facile o troppo avanzato.',
    type: 'single',
    options: [
      { value: 'beginner', label: 'Principiante assoluto o quasi' },
      { value: 'a1', label: 'A1, basi iniziali' },
      { value: 'a2', label: 'A2, riesco nelle situazioni semplici' },
      { value: 'b1', label: 'B1, comunico ma con limiti evidenti' },
      { value: 'b2', label: 'B2, abbastanza autonomo/a' },
      { value: 'c1', label: 'C1, avanzato ma con obiettivi specifici' },
      { value: 'unsure', label: 'Non ne ho idea' },
    ],
  },
  {
    id: 'language_check',
    eyebrow: 'Un segnale pratico',
    title: 'Quale risposta suona più naturale in una situazione di lavoro?',
    description: 'Non preoccuparti del voto. Questa domanda serve solo a confrontare percezione e riconoscimento.',
    type: 'single',
    options: [
      { value: 'a', label: 'I am agree, but we need more informations.' },
      { value: 'b', label: 'I agree, but we need some more information.' },
      { value: 'c', label: 'I agree myself, but we need other informations.' },
      { value: 'd', label: 'I am in agreement, but we are needing more information.' },
    ],
  },
  {
    id: 'listening_check',
    eyebrow: 'Listening rapido',
    title: 'Ascolta una volta e scegli l’informazione principale.',
    description: 'Puoi riascoltare. Il numero di replay ci aiuta a capire quanto supporto ti serve.',
    type: 'listening',
    audioText: "We need to move the meeting to Thursday because the client hasn't approved the final figures yet.",
    options: [
      { value: 'a', label: 'La riunione è cancellata perché il cliente ha rifiutato il progetto.' },
      { value: 'b', label: 'La riunione viene spostata a giovedì perché mancano ancora i dati approvati.' },
      { value: 'c', label: 'Il cliente vuole ricevere i dati finali entro giovedì.' },
      { value: 'd', label: 'La riunione resta oggi, ma senza il cliente.' },
    ],
  },
  {
    id: 'urgency',
    eyebrow: 'Le tempistiche',
    title: 'Hai una scadenza concreta?',
    description: 'L’urgenza cambia il tipo di percorso più utile.',
    type: 'single',
    options: [
      { value: 'seven_days', label: 'Sì, entro 7 giorni' },
      { value: 'one_month', label: 'Sì, entro un mese' },
      { value: 'three_months', label: 'Voglio risultati nei prossimi 2-3 mesi' },
      { value: 'no_deadline', label: 'Nessuna scadenza precisa' },
    ],
  },
  {
    id: 'commitment',
    eyebrow: 'Il ritmo sostenibile',
    title: 'Quanto tempo puoi dedicare ogni settimana?',
    description: 'Una risposta realistica vale più di una promessa ambiziosa che poi diventa impossibile mantenere.',
    type: 'single',
    options: [
      { value: 'under_one', label: 'Meno di un’ora' },
      { value: 'one_two', label: '1-2 ore' },
      { value: 'two_three', label: '2-3 ore' },
      { value: 'four_plus', label: '4 ore o più' },
    ],
  },
  {
    id: 'format',
    eyebrow: 'Il formato',
    title: 'Come preferiresti lavorare?',
    description: 'Non è un impegno definitivo. Serve a capire quale proposta avrebbe più senso per te.',
    type: 'single',
    options: [
      { value: 'group', label: 'Piccolo gruppo', description: 'Mi aiuta confrontarmi con altre persone e praticare situazioni diverse.' },
      { value: 'private', label: 'Percorso individuale', description: 'Ho esigenze molto specifiche o tempi difficili da coordinare.' },
      { value: 'hybrid', label: 'Valuterei entrambe le opzioni', description: 'Scelgo in base a struttura, orari e obiettivo.' },
      { value: 'unsure', label: 'Non lo so ancora', description: 'Prima voglio capire cosa mi sarebbe davvero utile.' },
    ],
  },
];

const courseCatalog = {
  business: {
    key: 'business-english-flow',
    name: 'Business English Flow',
    price: 'Cohort fondatrice: €199',
    route: '/corsi/business-english-flow',
    cta: 'Scopri la cohort',
  },
  speaking: {
    key: 'speaking-under-pressure',
    name: 'Speaking Under Pressure',
    price: 'Prezzo previsto: €159',
    route: '/percorsi',
    cta: 'Entra nella lista prioritaria',
  },
  interview: {
    key: 'interview-sprint',
    name: 'Interview Sprint',
    price: 'Da €229',
    route: '/contatti',
    cta: 'Richiedi informazioni',
  },
  foundations: {
    key: 'english-foundations',
    name: 'English Foundations',
    price: 'Da €199 per modulo',
    route: '/percorsi',
    cta: 'Entra nella lista d’interesse',
  },
  everyday: {
    key: 'everyday-english-flow',
    name: 'Everyday English Flow',
    price: 'Prezzo previsto: €179',
    route: '/percorsi',
    cta: 'Entra nella lista d’interesse',
  },
  listening: {
    key: 'listening-response-lab',
    name: 'Listening & Response Lab',
    price: 'Prezzo previsto: €99',
    route: '/percorsi',
    cta: 'Entra nella lista d’interesse',
  },
  private: {
    key: 'private-coaching',
    name: 'Private Coaching',
    price: 'Da €219 per 4 settimane',
    route: '/contatti',
    cta: 'Parla del tuo obiettivo',
  },
  team: {
    key: 'team-training',
    name: 'Team Training',
    price: 'Preventivo su obiettivi e numero di partecipanti',
    route: '/contatti',
    cta: 'Richiedi una consulenza team',
  },
};

const clamp = (value) => Math.max(12, Math.min(94, Math.round(value)));

function levelScore(value) {
  return ({ beginner: 22, a1: 34, a2: 54, b1: 70, b2: 82, c1: 90, unsure: 50 }[value] || 50);
}

function foundationScore(value) {
  return ({ fragile: 24, basic: 44, developing: 64, solid: 82 }[value] || 50);
}

function speakingScore(value) {
  return ({ freeze: 24, translate: 39, vocabulary: 46, grammar: 44, pronunciation: 55, comfortable: 82 }[value] || 50);
}

function listeningScore(value) {
  return ({ lost: 25, speed: 42, details: 52, accents: 49, response: 45, comfortable: 82 }[value] || 50);
}

function retrievalScore(value) {
  return ({ freeze: 34, translate: 40, vocabulary: 30, grammar: 52, pronunciation: 60, comfortable: 80 }[value] || 50);
}

function levelLabel(score) {
  if (score < 38) return 'Da costruire';
  if (score < 58) return 'In sviluppo';
  if (score < 75) return 'Abbastanza presente';
  return 'Solido';
}

const blockerCopy = {
  foundations: {
    title: 'Le fondamenta non sono ancora abbastanza automatiche',
    summary: 'Prima di chiederti di reagire più velocemente, conviene stabilizzare frasi, domande e tempi essenziali. Il problema non è la mancanza di volontà: stai ancora usando troppa energia per costruire la struttura di base.',
  },
  listening: {
    title: 'Il listening assorbe troppa energia',
    summary: 'Riesci a cogliere parti del messaggio, ma velocità, dettagli o necessità di rispondere riducono la comprensione reale. Ti serve un ascolto guidato che porti sempre a un’azione o a una risposta.',
  },
  response: {
    title: 'Sai più inglese di quanto riesci a usare sotto pressione',
    summary: 'Il limite principale appare nel passaggio tra ciò che conosci e ciò che riesci a dire quando qualcuno aspetta. Servono pratica realistica, tempi di risposta e strategie per continuare anche senza la frase perfetta.',
  },
  retrieval: {
    title: 'Il linguaggio non arriva abbastanza velocemente',
    summary: 'Parole ed espressioni sono spesso riconoscibili, ma non ancora disponibili nel momento in cui devi usarle. Il lavoro deve collegare Trainer, roleplay e ripetizione dentro situazioni reali.',
  },
};

export function buildAssessmentResult(answers = {}) {
  const rawFoundation = (foundationScore(answers.foundations) * 0.62) + (levelScore(answers.level) * 0.28) + (answers.language_check === 'b' ? 10 : 0);
  const rawListening = listeningScore(answers.listening_blocker) + (answers.listening_check === 'b' ? 10 : -6) - Math.max(0, Number(answers.listening_replays || 0) - 2) * 2;
  const rawResponse = speakingScore(answers.speaking_blocker) + (answers.commitment === 'under_one' ? -5 : 3);
  const rawRetrieval = retrievalScore(answers.speaking_blocker) + (answers.language_check === 'b' ? 7 : -4);

  const dimensions = [
    { key: 'foundations', label: 'Strutture e fondamenta', score: clamp(rawFoundation) },
    { key: 'listening', label: 'Comprensione in tempo reale', score: clamp(rawListening) },
    { key: 'response', label: 'Risposta sotto pressione', score: clamp(rawResponse) },
    { key: 'retrieval', label: 'Recupero di parole ed espressioni', score: clamp(rawRetrieval) },
  ].map((dimension) => ({ ...dimension, level: levelLabel(dimension.score) }));

  const primary = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const primaryCopy = blockerCopy[primary.key];
  const goal = answers.goal;
  const urgentInterview = goal === 'interview' && ['seven_days', 'one_month'].includes(answers.urgency);
  const needsFoundations = dimensions.find((item) => item.key === 'foundations').score < 48;
  const listeningIsPrimary = primary.key === 'listening';
  const responseIsPrimary = ['response', 'retrieval'].includes(primary.key);
  const prefersPrivate = answers.format === 'private';

  let course = courseCatalog.business;
  if (goal === 'team') course = courseCatalog.team;
  else if (urgentInterview) course = courseCatalog.interview;
  else if (needsFoundations) course = courseCatalog.foundations;
  else if (prefersPrivate) course = courseCatalog.private;
  else if (goal === 'everyday') course = listeningIsPrimary ? courseCatalog.listening : courseCatalog.everyday;
  else if (goal === 'interview') course = courseCatalog.interview;
  else if (listeningIsPrimary && !['business', 'hospitality'].includes(goal)) course = courseCatalog.listening;
  else if (responseIsPrimary && !['business', 'hospitality'].includes(goal)) course = courseCatalog.speaking;
  else if (['business', 'hospitality'].includes(goal)) course = courseCatalog.business;

  const betaEligible = course.key === 'business-english-flow'
    && !['beginner', 'a1'].includes(answers.level)
    && answers.commitment !== 'under_one'
    && answers.urgency !== 'seven_days';

  const situationLabels = {
    meetings: 'riunioni e call', clients: 'clienti', updates: 'aggiornamenti e problemi', presentations: 'presentazioni',
    interviews: 'colloqui', 'fast-listening': 'listening veloce', travel: 'viaggi', social: 'conversazioni spontanee',
  };
  const selectedSituations = Array.isArray(answers.situations) ? answers.situations.map((item) => situationLabels[item]).filter(Boolean) : [];

  const recommendationReason = course.key === 'business-english-flow'
    ? 'Il tuo profilo mostra abbastanza fondamenta per lavorare su interazioni professionali reali, ma ascolto, recupero del linguaggio o risposta sotto pressione limitano ancora quanto partecipi.'
    : course.key === 'english-foundations'
      ? 'Prima di spingere sulla velocità, conviene rendere più affidabili le strutture essenziali. In questo modo la conversazione richiederà meno controllo mentale.'
      : course.key === 'interview-sprint'
        ? 'Hai un obiettivo definito e una scadenza che richiede lavoro mirato su risposte, esempi professionali e gestione delle domande successive.'
        : course.key === 'listening-response-lab'
          ? 'La difficoltà principale riguarda ciò che succede tra ascolto, identificazione dei dettagli e costruzione della risposta.'
          : course.key === 'speaking-under-pressure'
            ? 'La priorità è ridurre il blocco, la traduzione mentale e il tempo necessario per trasformare un’idea in una risposta completa.'
            : course.key === 'private-coaching'
              ? 'Il tuo formato preferito e la specificità dell’obiettivo indicano che un lavoro individuale potrebbe essere più efficiente.'
              : course.key === 'team-training'
                ? 'La necessità riguarda più persone e richiede obiettivi, situazioni e misurazione condivisi a livello di team.'
                : 'Il percorso più adatto deve trasformare l’inglese conosciuto in autonomia nelle situazioni quotidiane che hai indicato.';

  return {
    version: 1,
    profileKey: primary.key,
    primaryTitle: primaryCopy.title,
    primarySummary: primaryCopy.summary,
    dimensions,
    selectedSituations,
    recommendation: { ...course, reason: recommendationReason },
    betaEligible,
    qualification: betaEligible ? 'beta_priority' : course.key,
    disclaimer: 'Questo profilo orienta il percorso e non sostituisce una certificazione ufficiale del livello CEFR.',
  };
}
