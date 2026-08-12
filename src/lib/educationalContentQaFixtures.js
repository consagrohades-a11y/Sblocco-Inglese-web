export const educationalContentQaFixtures = [
  {
    key: 'all-section-types',
    label: 'Tutti i section type',
    content: {
      educational_schema_version: 1,
      template_id: 'educational-content-block-v1',
      variant: 'general',
      intro: 'Fixture di sviluppo: ogni tipo semantico deve passare dallo stesso renderer senza layout specifici per la lezione.',
      body: 'Coverage fixture for every structured educational section type.',
      sections: [
        {
          key: 'rule',
          type: 'rule',
          title: 'Una regola breve',
          body: 'Spiega una sola idea e accompagnala con un esempio concreto.',
          examples: [{ text: 'She works from home.', highlight: ['works'] }],
        },
        {
          key: 'example',
          type: 'example',
          title: 'Esempi aggiuntivi',
          examples: [
            { text: 'I usually start at nine.', highlight: ['usually'] },
            { text: 'Today I am starting later.', highlight: ['am starting'] },
          ],
        },
        {
          key: 'mistake',
          type: 'mistake',
          title: 'Errore frequente',
          body: 'Il confronto deve restare leggibile anche quando le due frasi sono abbastanza lunghe.',
          correct: { text: "She doesn't work on Sundays.", highlight: ["doesn't work"] },
          incorrect: { text: "She doesn't works on Sundays.", highlight: ["doesn't works"] },
        },
        {
          key: 'comparison',
          type: 'comparison',
          title: 'Un solo lato disponibile',
          body: 'Il contratto permette correct e/o incorrect: un solo esempio non deve lasciare una colonna vuota.',
          correct: { text: 'Could you explain that in a little more detail?', highlight: ['Could you explain'] },
        },
        {
          key: 'tip',
          type: 'tip',
          title: 'Suggerimento',
          body: 'Usa il contesto per scegliere la struttura invece di cercare una traduzione parola per parola.',
          examples: [{ text: 'What are you doing right now?', highlight: ['right now'] }],
        },
        {
          key: 'pattern',
          type: 'pattern',
          title: 'Pattern riutilizzabile',
          body: 'Un pattern lungo deve andare a capo senza produrre overflow orizzontale.',
          pattern: 'acknowledge the point → explain your concern → give a concrete reason → propose a practical next step',
          examples: [{ text: 'I see your point. However, my main concern is the cost.', highlight: ['I see your point. However'] }],
        },
        {
          key: 'dialogue',
          type: 'dialogue',
          title: 'Dialogo con speaker lunghi',
          turns: [
            { speaker: 'Senior Product Development Manager', text: 'The prototype is ready, but we still need more user feedback.', highlight: ['more user feedback'] },
            { speaker: 'International Brand Strategy Manager', text: 'Could we test it with the Italian and German teams before Friday?', highlight: ['Could we test'] },
          ],
        },
        {
          key: 'vocabulary',
          type: 'vocabulary',
          title: 'Lessico con termini lunghi',
          items: [
            {
              term: 'cross-functional product-development meeting',
              meaning: 'riunione di sviluppo prodotto con più funzioni aziendali',
              example: 'We have a cross-functional product-development meeting tomorrow.',
              highlight: ['cross-functional product-development meeting'],
            },
            {
              term: 'follow up on a customer-support request',
              meaning: 'dare seguito a una richiesta dell’assistenza clienti',
              example: 'I need to follow up on a customer-support request.',
              highlight: ['follow up on a customer-support request'],
            },
            {
              term: 'make a final decision',
              meaning: 'prendere una decisione definitiva',
              example: 'We need to make a final decision today.',
              highlight: ['make a final decision'],
            },
          ],
        },
        {
          key: 'recap',
          type: 'recap',
          title: 'Recap',
          points: [
            'Ogni blocco mantiene una funzione pedagogica riconoscibile.',
            'Testi lunghi devono andare a capo senza allargare la pagina.',
            'Il layout deve restare leggibile in light, dark e mobile.',
          ],
        },
      ],
    },
  },
  {
    key: 'long-dialogue',
    label: 'Dialogo lungo',
    content: {
      educational_schema_version: 1,
      template_id: 'educational-content-block-v1',
      variant: 'dialogue',
      intro: 'Fixture per controllare ritmo verticale, speaker e wrapping su una conversazione più lunga.',
      body: 'Long-dialogue renderer stress fixture.',
      sections: [
        {
          key: 'dialogue_long',
          type: 'dialogue',
          title: 'Una conversazione completa',
          body: 'Le battute devono restare facili da seguire anche quando il dialogo supera il mini-esempio da due turni.',
          turns: [
            { speaker: 'Maya', text: 'Do you usually work from home?', highlight: ['usually'] },
            { speaker: 'Donovan', text: 'Yes, I do. I normally work from home on Fridays.', highlight: ['normally'] },
            { speaker: 'Maya', text: 'What are you doing today?', highlight: ['are you doing'] },
            { speaker: 'Donovan', text: 'I am working in the office because we have a client meeting.', highlight: ['am working'] },
            { speaker: 'Maya', text: 'Is your team preparing the presentation now?', highlight: ['preparing'] },
            { speaker: 'Donovan', text: 'Yes. Lorel is checking the slides and Matt is speaking to the client.', highlight: ['is checking', 'is speaking'] },
            { speaker: 'Maya', text: 'Sounds busy. Do you often have meetings like this?', highlight: ['often'] },
            { speaker: 'Donovan', text: 'Not every week, but this month we are launching a new project.', highlight: ['are launching'] },
          ],
        },
      ],
    },
  },
];
