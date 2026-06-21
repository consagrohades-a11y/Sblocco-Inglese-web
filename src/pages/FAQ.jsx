import React from 'react';
import { HelpCircle } from 'lucide-react';
import CTAButton from '../components/CTAButton';
import FAQAccordion from '../components/FAQAccordion';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { ctaLabels, primaryOffer } from '../config/site';
import { faqItems } from '../data/content';

export default function FAQ() {
  return (
    <>
      <SEO
        title={`FAQ | Simulazione inglese da ${primaryOffer.price}`}
        description="Domande frequenti sulla Simulazione Inglese per Colloqui e Lavoro: livello, pagamento, spostamento, feedback scritto e risultati."
      />

      <section className="section-shell pb-12 pt-12 lg:pt-16">
        <span className="eyebrow">
          <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
          Domande frequenti
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-ink sm:text-5xl">
          FAQ sulla simulazione
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70">
          Qui trovi le risposte ai dubbi più comuni prima di prenotare la simulazione da {primaryOffer.price}.
        </p>
      </section>

      <SectionReveal className="pb-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="rounded-lg bg-ink p-6 text-white shadow-soft lg:sticky lg:top-28">
            <h2 className="text-2xl font-black">Hai ancora un dubbio?</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Se il quiz ti sembra in linea con il tuo caso, puoi procedere con modulo, slot e pagamento.
            </p>
            <CTAButton variant="contrast" className="mt-5">{ctaLabels.primary}</CTAButton>
          </div>
          <FAQAccordion items={faqItems} />
        </div>
      </SectionReveal>
    </>
  );
}
