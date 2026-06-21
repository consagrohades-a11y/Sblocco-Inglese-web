import React from 'react';
import CTAButton from '../components/CTAButton';
import SEO from '../components/SEO';
import { primaryOffer } from '../config/site';

export default function NotFound() {
  return (
    <>
      <SEO
        title="Pagina non trovata | Sblocco Inglese"
        description="La pagina richiesta non è disponibile."
      />
      <section className="section-shell pb-20 pt-16">
        <h1 className="text-4xl font-black text-ink">Pagina non trovata</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-ink/70">
          Questa pagina non esiste, ma la simulazione da {primaryOffer.price} è a un click.
        </p>
        <div className="mt-7">
          <CTAButton href="/">Torna alla home</CTAButton>
        </div>
      </section>
    </>
  );
}
