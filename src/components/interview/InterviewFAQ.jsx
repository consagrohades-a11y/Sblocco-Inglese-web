import React from 'react';
import FAQAccordion from '../FAQAccordion.jsx';

const interviewFaqs = [
  { question: 'Che livello di inglese serve?', answer: 'Il percorso è pensato soprattutto per chi riesce già a costruire frasi semplici, ma vuole rispondere meglio quando è sotto pressione. Non è un corso completo per principianti assoluti. Se emergono lacune di grammatica o vocabolario, le affronti in funzione delle risposte che devi costruire.' },
  { question: 'Devo avere già un colloquio fissato?', answer: 'No. Puoi prepararti con calma e rendere più disponibili le strutture che ti serviranno. Se hai già una data, puoi invece dare priorità alle situazioni più probabili e ai blocchi che incidono di più.' },
  { question: 'È utile anche per colloqui tecnici?', answer: 'Sì. Alleni l’inglese necessario per spiegare ragionamenti, decisioni, soluzioni e processi, confrontare alternative e chiedere chiarimenti. Il percorso non insegna la materia tecnica della tua professione.' },
  { question: 'Ricevo risposte da imparare a memoria?', answer: 'No. Modelli, strutture ed espressioni servono come supporto. Il lavoro centrale consiste nel produrre risposte personali, provarle, migliorarle e adattarle quando la domanda cambia.' },
  { question: 'È un corso registrato?', answer: 'È un percorso self-guided composto da scenari, domande, esempi, lingua utile ed esercizi attivi dentro Sblocco Inglese. Non è presentato come una semplice raccolta di videolezioni.' },
  { question: 'Posso prepararmi per il mio settore?', answer: 'Sì. I role pack aggiungono situazioni e linguaggio legati a specifiche aree professionali. I primi pack saranno Tech, Marketing, Sales, Finance, Hospitality e Graduate / First Job.' },
  { question: 'Ci sono lezioni individuali?', answer: 'Solo come opzione premium. Puoi richiedere una simulazione privata con domande mirate e feedback, ma la proposta principale resta il percorso digitale che puoi usare in autonomia.' },
  { question: 'Quanto tempo serve?', answer: 'Dipende dalla data del colloquio e da quanto vuoi approfondire. Puoi usare il materiale in modo intensivo prima di un incontro già fissato oppure lavorarci più gradualmente. Non promettiamo risultati in un numero fisso di giorni.' },
];

export default function InterviewFAQ() {
  return (
    <section className="interview-section interview-faq" aria-labelledby="interview-faq-title">
      <div className="interview-shell interview-faq__layout">
        <div className="interview-heading">
          <p className="interview-eyebrow">DOMANDE FREQUENTI</p>
          <h2 id="interview-faq-title">Prima di scegliere.</h2>
          <p>Risposte concrete sul livello, il formato e il tipo di preparazione.</p>
        </div>
        <FAQAccordion items={interviewFaqs} defaultOpen={-1} />
      </div>
    </section>
  );
}

