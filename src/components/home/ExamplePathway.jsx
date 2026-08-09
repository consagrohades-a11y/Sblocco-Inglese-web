import React, { useState } from 'react';
import {
  ArrowRight,
  CircleCheck,
  Handshake,
  Languages,
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

const scenarioSupport = 'Vediamo cosa devi riuscire a fare, poi costruiamo la lingua e la pratica intorno a quelle situazioni.';

const scenarios = [
  {
    key: 'interview',
    label: 'Colloquio',
    singleLineTitle: true,
    title: <>Per esempio, hai un <em>colloquio.</em></>,
    stages: [
      { title: 'Presentarti', description: 'Parlare di te in modo chiaro, naturale e pertinente.', icon: UserRound },
      { title: 'Raccontare la tua esperienza', description: 'Spiegare cosa hai fatto, cosa sai fare e cosa hai imparato.', icon: Presentation },
      { title: 'Rispondere a domande impreviste', description: 'Costruire una risposta anche quando la domanda non è quella che avevi preparato.', icon: MessagesSquare },
      { title: 'Affrontare una prova pratica', description: 'Capire la richiesta, fare domande se serve e ragionare ad alta voce.', icon: Target },
      { title: 'Spiegare una scelta e concludere', description: 'Motivare le tue decisioni, riassumere e lasciare una buona impressione.', icon: CircleCheck },
    ],
  },
  {
    key: 'meeting',
    label: 'Riunione',
    compactTitle: true,
    title: <>Per esempio,<br />devi partecipare<br />a una <em>riunione.</em></>,
    stages: [
      { title: 'Entrare nella conversazione', description: 'Intervenire senza aspettare che qualcuno ti dia la parola.', icon: MessagesSquare },
      { title: 'Dare la tua opinione', description: 'Spiegare cosa ne pensi e sviluppare il tuo punto di vista.', icon: UserRound },
      { title: 'Chiedere chiarimenti', description: 'Fermare la conversazione quando qualcosa non è chiaro.', icon: Search },
      { title: 'Essere d’accordo o dissentire', description: 'Rispondere alle idee degli altri senza risultare brusco.', icon: Handshake },
      { title: 'Chiudere il tuo intervento', description: 'Riassumere il punto e lasciare spazio alla conversazione.', icon: CircleCheck },
    ],
  },
  {
    key: 'international-client',
    label: 'Cliente internazionale',
    compactTitle: true,
    title: <>Per esempio,<br />devi parlare con<br />un <em>cliente internazionale.</em></>,
    stages: [
      { title: 'Capire di cosa ha bisogno', description: 'Fare le domande giuste e verificare di aver capito.', icon: Search },
      { title: 'Spiegare una soluzione', description: 'Presentare informazioni in modo semplice e ordinato.', icon: Presentation },
      { title: 'Gestire domande e dubbi', description: 'Rispondere senza perdere il filo della conversazione.', icon: MessagesSquare },
      { title: 'Affrontare un problema', description: 'Spiegare cosa è successo e proporre cosa fare.', icon: ShieldCheck },
      { title: 'Chiudere la conversazione', description: 'Confermare i prossimi passi e lasciare tutto chiaro.', icon: Handshake },
    ],
  },
  {
    key: 'abroad',
    label: 'Estero',
    compactTitle: true,
    title: <>Per esempio,<br />tra poco ti trasferisci<br /><em>all&apos;estero.</em></>,
    stages: [
      { title: 'Presentarti e conoscere persone', description: 'Parlare di te e fare domande senza fermarti alle frasi da manuale.', icon: UserRound },
      { title: 'Cavartela nella vita quotidiana', description: 'Chiedere informazioni, prendere appuntamenti e risolvere piccoli problemi.', icon: MapPinned },
      { title: 'Parlare al lavoro', description: 'Capire i colleghi, fare domande e spiegare cosa stai facendo.', icon: Languages },
      { title: 'Gestire gli imprevisti', description: 'Spiegare un problema anche quando non conosci tutte le parole.', icon: ShieldCheck },
      { title: 'Diventare più autonomo', description: 'Affrontare sempre più situazioni senza preparare ogni frase prima.', icon: Plane },
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
            <h2
              id="home-example-title"
              className={`home-display${scenario.compactTitle ? ' home-example__title--compact' : ''}${scenario.singleLineTitle ? ' home-example__title--single-line' : ''}`}
            >
              {scenario.title}
            </h2>
            <p>{scenarioSupport}</p>
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
