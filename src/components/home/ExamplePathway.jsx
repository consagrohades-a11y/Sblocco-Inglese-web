import React from 'react';
import { ArrowRight, CircleCheck, MessagesSquare, RefreshCw, Search, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  { title: "Capire l'azienda", text: <>Analizziamo il contesto<br />e gli obiettivi del ruolo.</>, icon: Search },
  { title: 'Preparare le risposte', text: <>Strutturiamo risposte<br />chiave alle domande<br />più frequenti.</>, icon: MessagesSquare },
  { title: 'Allenarsi', text: <>Simulazioni guidate<br />con feedback mirato<br />per migliorare.</>, icon: UserRound },
  { title: 'Affrontare il colloquio', text: <>Arrivi preparato<br />e parli con sicurezza.</>, icon: CircleCheck },
];

export default function ExamplePathway() {
  function scrollToGoals() {
    document.getElementById('home-goals')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <section className="home-example" aria-labelledby="home-example-title">
      <div className="home-shell">
        <div className="home-example__panel">
          <div className="home-example__intro">
            <h2 id="home-example-title" className="home-display">
              Per esempio<br />hai da fare<br />un <em>colloquio.</em>
            </h2>
            <p>
              Ecco un esempio di percorso pensato<br />
              per aiutarti ad arrivare preparato<br />
              e sicuro in ogni fase.
            </p>
          </div>

          <div className="home-example__journey">
            <div className="home-example__controls">
              <button type="button" onClick={scrollToGoals}>
                <RefreshCw aria-hidden="true" /> Cambia esempio <ArrowRight aria-hidden="true" />
              </button>
              <Link to="/percorsi">Scopri altri scenari <ArrowRight aria-hidden="true" /></Link>
            </div>
            <ol className="home-example__steps">
              {steps.map(({ title, text, icon: Icon }, index) => (
                <li key={title}>
                  <span className="home-example__number">{index + 1}</span>
                  <span className="home-example__step-icon"><Icon aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
