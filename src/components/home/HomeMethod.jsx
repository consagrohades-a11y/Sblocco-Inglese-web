import React from 'react';
import { BookOpenText, MessagesSquare, Repeat2, Target } from 'lucide-react';

const pillars = [
  {
    key: 'objective',
    label: 'OBIETTIVO',
    title: 'Prima capiamo dove vuoi arrivare.',
    text: 'Definiamo cosa devi riuscire a fare e in quali situazioni userai l’inglese.',
    icon: Target,
  },
  {
    key: 'language',
    label: 'LINGUA UTILE',
    title: 'Costruiamo l’inglese che ti serve.',
    text: 'Parole, strutture ed espressioni scelte in funzione di quell’obiettivo.',
    icon: BookOpenText,
  },
  {
    key: 'practice',
    label: 'PRATICA',
    title: 'Lo metti subito in uso.',
    text: 'Esercizi, variazioni, simulazioni e feedback per passare dal capire al fare.',
    icon: MessagesSquare,
  },
  {
    key: 'use',
    label: 'USO',
    title: 'Lo rendi sempre più tuo.',
    text: 'Ripeti, adatti e riutilizzi ciò che hai imparato, finché riesci a usarlo con più autonomia.',
    icon: Repeat2,
  },
];

export default function HomeMethod() {
  return (
    <section id="metodo" className="home-method" aria-labelledby="home-method-title">
      <div className="home-method__scenery" aria-hidden="true">
        <span className="home-method__arch" />
        <span className="home-method__stairs" />
        <span className="home-method__plant" />
        <span className="home-method__mountains" />
        <span className="home-method__flag" />
      </div>
      <div className="home-shell home-method__grid">
        <div className="home-method__intro">
          <p className="home-method__eyebrow">IL METODO SBLOCCO</p>
          <h2 id="home-method-title" className="home-display">Partiamo da ciò<br />che vuoi riuscire a fare.</h2>
          <p className="home-method__lead">Poi costruiamo l&apos;inglese per arrivarci.</p>
          <p className="home-method__support">
            Grammatica, vocabolario ed espressioni restano fondamentali. Li scegliamo e li alleniamo in funzione di ciò che ti serve davvero.
          </p>
        </div>
        <div className="home-method__pillars" aria-label="Obiettivo, lingua utile, pratica e uso">
          {pillars.map(({ key, label, title, text, icon: Icon }) => (
            <article key={key} className="home-method__pillar">
              <span className="home-method__icon"><Icon aria-hidden="true" /></span>
              <span className="home-method__label">{label}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
