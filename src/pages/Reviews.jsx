import React from 'react';
import { Award, Check, ShieldAlert } from 'lucide-react';
import AboutSection from '../components/AboutSection';
import ReviewCarousel from '../components/ReviewCarousel';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { reviews } from '../data/content';

export default function Reviews() {
  return (
    <>
      <SEO
        title="Rhema e recensioni | Sblocco Inglese"
        description={`Conosci Rhema e leggi le esperienze degli studenti con Sblocco Inglese: speaking, colloqui e situazioni pratiche per italiani.`}
      />

      <section className="section-shell bg-paper pb-12 pt-12 dark:bg-[#0f1715] lg:pt-16">
        <span className="eyebrow">
          <Award aria-hidden="true" className="h-3.5 w-3.5" />
          Esperienza e metodo
        </span>
        <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight text-ink dark:text-white sm:text-5xl">
          Chi sono e cosa dicono gli studenti
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70 dark:text-white/70">
          Conosci Rhema, scopri come lavora e leggi le esperienze degli studenti.
          Il metodo Sblocco Inglese nasce da lezioni strutturate, correzioni
          mirate e situazioni concrete.
        </p>
      </section>

      <SectionReveal id="rhema" className="scroll-mt-24 bg-white/70 py-16">
        <div className="section-shell">
          <div className="mb-8">
            <span className="eyebrow">Dietro il metodo</span>
            <h2 className="section-title">Perché impari con Rhema, non con un corso generico</h2>
          </div>
          <AboutSection />
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <ReviewCarousel />
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <div key={review.image || review.text} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-moss">{review.role}</p>
                <h2 className="mt-3 text-lg font-black text-ink">{review.name}</h2>
                <p className="mt-3 text-sm leading-6 text-ink/70">{review.text}</p>
                {review.image ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-ink/10 bg-paper">
                    <img src={review.image} alt={`${review.name} - screenshot`} className="w-full" loading="lazy" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-linen/50 py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Metodo</span>
            <h2 className="section-title">Il metodo non è semplice conversazione</h2>
            <p className="section-copy">
              Il punto è correggere quello che succede mentre parli: esitazioni, frasi tradotte, parole mancanti,
              risposte troppo vaghe e strutture che rendono il messaggio meno chiaro.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              'si lavora su situazioni reali, non su argomenti casuali',
              'si correggono gli errori che bloccano lo speaking',
              'le frasi deboli diventano alternative più riutilizzabili',
              'ricevi un feedback scritto, non solo impressioni a voce',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg bg-paper p-4">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                <p className="text-sm font-bold leading-6 text-ink/70">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell">
          <div className="rounded-lg border border-coral/20 bg-blush p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-coral" />
              <div>
                <h2 className="text-xl font-black text-ink">Nota importante</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
                  I risultati individuali dipendono dal livello di partenza, dall’obiettivo e dalla pratica personale.
                  Il servizio non promette risultati lavorativi o trasferimenti garantiti.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>
    </>
  );
}
