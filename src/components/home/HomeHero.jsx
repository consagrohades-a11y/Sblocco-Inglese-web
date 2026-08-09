import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-shell home-hero__grid">
        <div className="home-hero__copy">
          <p className="home-eyebrow">L&apos;INGLESE COSTRUITO INTORNO A CIÒ CHE VUOI FARE.</p>
          <h1 id="home-title" className="home-display home-hero__title">
            <span>Impara l&apos;inglese</span>
            <span>partendo da ciò</span>
            <em>che vuoi farci.</em>
          </h1>
          <p className="home-hero__support">
            Sblocco parte da ciò che vuoi riuscire a fare e costruisce da lì un percorso fatto della lingua che ti serve e della pratica per usarla.
            <strong>Prima l&apos;obiettivo. Poi l&apos;inglese per arrivarci.</strong>
          </p>
          <div className="home-hero__actions">
            <Link to="/#percorsi" className="home-button home-button--primary">
              Trova il tuo percorso <ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/#metodo" className="home-text-link">
              <span>Scopri il metodo</span> <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="home-hero__art" aria-hidden="true">
          <span className="home-hero__halo" />
          <img
            src="/assets/brand/sblocco-editorial-conversation-v2.png"
            alt=""
            width="1254"
            height="1254"
          />
        </div>
      </div>
    </section>
  );
}
