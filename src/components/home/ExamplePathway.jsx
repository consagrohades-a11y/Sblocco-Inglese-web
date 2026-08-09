import React, { useState } from 'react';
import {
  ArrowRight,
  CircleCheck,
  Handshake,
  Languages,
  ListChecks,
  MapPinned,
  MessagesSquare,
  Plane,
  Presentation,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  UserRound,
} from 'lucide-react';

const scenarios = [
  {
    key: 'interview',
    label: 'Colloquio',
    title: <>Per esempio<br />hai da fare<br />un <em>colloquio.</em></>,
    subtitle: 'Un percorso pensato per aiutarti ad arrivare preparato e sicuro in ogni fase.',
    stages: [
      { title: "Capire l'azienda", description: 'Analizziamo il contesto e gli obiettivi del ruolo.', icon: Search },
      { title: 'Preparare le risposte', description: 'Strutturiamo risposte chiave alle domande più frequenti.', icon: MessagesSquare },
      { title: 'Allenarsi', description: 'Simulazioni guidate con feedback mirato per migliorare.', icon: UserRound },
      { title: 'Affrontare il colloquio', description: 'Arrivi preparato e parli con sicurezza.', icon: CircleCheck },
    ],
  },
  {
    key: 'meeting',
    label: 'Riunione',
    title: <>Per esempio<br />devi gestire<br />una <em>riunione.</em></>,
    subtitle: 'Un percorso per organizzare il messaggio, intervenire con chiarezza e arrivare a decisioni precise.',
    stages: [
      { title: "Definire l'obiettivo", description: 'Chiarisci il risultato che vuoi ottenere e i punti essenziali.', icon: Target },
      { title: "Preparare l'agenda", description: 'Metti gli argomenti nel giusto ordine e anticipa le priorità.', icon: ListChecks },
      { title: 'Intervenire', description: 'Esprimi idee, accordo e disaccordo con sicurezza.', icon: MessagesSquare },
      { title: 'Chiudere con chiarezza', description: 'Riepiloghi decisioni, responsabilità e prossimi passi.', icon: CircleCheck },
    ],
  },
  {
    key: 'international-client',
    label: 'Cliente internazionale',
    title: <>Per esempio<br />lavori con un<br /><em>cliente internazionale.</em></>,
    subtitle: 'Un percorso per capire i bisogni, comunicare il tuo valore e costruire fiducia in inglese.',
    stages: [
      { title: 'Capire il cliente', description: 'Fai domande mirate e riconosci bisogni, priorità e vincoli.', icon: Search },
      { title: 'Presentare il valore', description: 'Spieghi la proposta in modo concreto e rilevante.', icon: Presentation },
      { title: 'Gestire le domande', description: 'Rispondi con calma e chiarisci dubbi o obiezioni.', icon: MessagesSquare },
      { title: 'Concordare i prossimi passi', description: 'Chiudi la conversazione con accordi chiari e condivisi.', icon: Handshake },
    ],
  },
  {
    key: 'abroad',
    label: 'Estero',
    title: <>Per esempio<br />devi prepararti<br />per <em>l&apos;estero.</em></>,
    subtitle: 'Un percorso per affrontare le situazioni pratiche e muoverti con sicurezza fin dal primo giorno.',
    stages: [
      { title: 'Preparare le situazioni', description: 'Individui i momenti reali in cui dovrai usare inglese.', icon: MapPinned },
      { title: 'Usare frasi essenziali', description: 'Costruisci un repertorio semplice, utile e immediato.', icon: Languages },
      { title: 'Affrontare gli imprevisti', description: 'Impari a chiedere aiuto, spiegare problemi e trovare soluzioni.', icon: ShieldCheck },
      { title: 'Muoversi in autonomia', description: 'Parti con gli strumenti per comunicare nella vita quotidiana.', icon: Plane },
    ],
  },
];

export default function ExamplePathway() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const scenario = scenarios[scenarioIndex];
  const nextScenario = scenarios[(scenarioIndex + 1) % scenarios.length];

  function showNextScenario() {
    setScenarioIndex((currentIndex) => (currentIndex + 1) % scenarios.length);
  }

  return (
    <section className="home-example" aria-labelledby="home-example-title">
      <div className="home-shell">
        <div className="home-example__panel" aria-live="polite">
          <div key={`${scenario.key}-intro`} className="home-example__intro home-example__swap">
            <h2 id="home-example-title" className="home-display">
              {scenario.title}
            </h2>
            <p>{scenario.subtitle}</p>
          </div>

          <div className="home-example__journey">
            <div className="home-example__controls">
              <button
                type="button"
                onClick={showNextScenario}
                aria-label={`Mostra il prossimo esempio: ${nextScenario.label}`}
              >
                <RefreshCw aria-hidden="true" /> Cambia esempio <ArrowRight aria-hidden="true" />
              </button>
            </div>
            <ol
              key={`${scenario.key}-stages`}
              className="home-example__steps home-example__swap"
              aria-label={`Percorso: ${scenario.label}`}
            >
              {scenario.stages.map(({ title, description, icon: Icon }, index) => (
                <li key={title}>
                  <span className="home-example__number">{index + 1}</span>
                  <span className="home-example__step-icon"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
