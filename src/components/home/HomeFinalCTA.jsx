import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomeFinalCTA() {
  return (
    <section className="home-final" aria-labelledby="home-final-title">
      <div className="home-shell">
        <h2 id="home-final-title" className="home-display">E tu, cosa <em>vuoi riuscire a fare?</em></h2>
        <p>Raccontacelo. Ti aiutiamo a capire da dove partire e quale percorso ha più senso per te.</p>
        <Link to="/#percorsi" className="home-button home-button--primary">
          Trova il tuo percorso <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
