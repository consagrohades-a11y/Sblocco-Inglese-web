import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomeFinalCTA() {
  return (
    <section className="home-final" aria-labelledby="home-final-title">
      <div className="home-shell">
        <h2 id="home-final-title" className="home-display">E tu, cosa <em>vuoi riuscire a fare?</em></h2>
        <p>Raccontacelo. Ti mostreremo il percorso più adatto a te.</p>
        <Link to="/prenota" className="home-button home-button--primary">
          Inizia ora <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
