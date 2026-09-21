import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../SEO';
import '../../styles/registerJourney.css';

export default function AuthJourneyShell({
  title,
  description,
  eyebrow,
  children,
  footer,
  topAction,
}) {
  return (
    <div className="register-journey auth-journey">
      <SEO title={`${title} | Sblocco Inglese`} description={description} />

      <header className="register-journey__topbar">
        <Link to="/" className="register-journey__brand" aria-label="Sblocco Inglese, torna alla home">
          <span>SBLOCCO</span>
          <strong>INGLESE</strong>
        </Link>
        <span aria-hidden="true" />
        {topAction ? <div className="auth-journey__top-action">{topAction}</div> : null}
      </header>

      <main className="auth-journey__layout">
        <section className="auth-journey__intro">
          <p className="register-journey__kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </section>

        <section className="auth-journey__content">
          {children}
          {footer ? <div className="auth-journey__footer">{footer}</div> : null}
        </section>
      </main>
    </div>
  );
}
