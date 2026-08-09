import React from 'react';
import { Link } from 'react-router-dom';

export default function HomeEditorialLogo({ onClick }) {
  return (
    <Link to="/" className="home-wordmark" aria-label="Sblocco Inglese, home" onClick={onClick}>
      <span className="home-wordmark__mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="home-wordmark__text">
        <span>SBLOCCO</span>
        <span>INGLESE</span>
      </span>
    </Link>
  );
}
