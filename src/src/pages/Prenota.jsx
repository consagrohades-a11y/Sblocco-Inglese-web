import React from 'react';
import { CalendarCheck, CheckCircle2, CreditCard, FileText, ShieldCheck } from 'lucide-react';
import AfterFormSteps from '../components/AfterFormSteps';
import BookingForm from '../components/BookingForm';
import BookingPaymentFlow from '../components/BookingPaymentFlow';
import CTAButton from '../components/CTAButton';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { ctaLabels, externalLinks, primaryOffer } from '../config/site';

export default function Prenota() {
  return (
    <>
      <SEO
        title="Prenota la tua simulazione | Sblocco Inglese"
        description={`Compila il modulo per richiedere la Simulazione Inglese per Colloqui e Lavoro da ${primaryOffer.price}. Il posto viene confermato solo dopo il pagamento.`}
      />

      <section className="section-shell grid gap-10 pb-16 pt-12 lg:grid-cols-[1fr_0.8fr] lg:items-start lg:pt-16">
        <div>
          <span className="eyebrow">
            <CalendarCheck aria-hidden="true" className="h-3.5 w-3.5" />
            Prenotazione
          </span>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            Prenota la tua simulazione
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70">
            Compila il modulo per richiedere la Simulazione Inglese per Colloqui e Lavoro. Poi scegli lo slot e
            confermi il posto con PayPal.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <CTAButton href="#booking-form">{ctaLabels.form}</CTAButton>
            <CTAButton href="#booking-flow" variant="secondary">
              {ctaLabels.calendly}
            </CTAButton>
          </div>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ink/60">
            Il posto viene confermato solo dopo il pagamento.
          </p>
        </div>

        <div className="rounded-lg border border-moss/20 bg-white p-5 shadow-soft sm:p-7">
          <span className="rounded-full bg-butter px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-ink">
            {primaryOffer.priceLabel}
          </span>
          <p className="mt-4 text-5xl font-black text-moss">{primaryOffer.price}</p>
          <p className="mt-2 text-sm font-bold text-ink/60">Simulazione: {primaryOffer.duration}</p>
          <div className="mt-6 grid gap-3">
            <div className="flex items-start gap-3 text-sm leading-6 text-ink/70">
              <CreditCard aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
              Il posto viene confermato solo dopo il pagamento.
            </div>
            <div className="flex items-start gap-3 text-sm leading-6 text-ink/70">
              <CalendarCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
              Puoi spostare la sessione una volta con almeno 24 ore di preavviso.
            </div>
            <div className="flex items-start gap-3 text-sm leading-6 text-ink/70">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
              Ricevi feedback scritto dopo la sessione.
            </div>
          </div>
        </div>
      </section>

      <SectionReveal className="bg-white/70 py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-start">
          <BookingForm />
          <div className="grid gap-5">
            <AfterFormSteps />
            <div className="rounded-lg border border-ink/10 bg-paper p-5">
              <CalendarCheck aria-hidden="true" className="h-6 w-6 text-moss" />
              <h2 className="mt-4 text-xl font-black text-ink">Slot e pagamento</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">
                Dopo il modulo scegli lo slot su Calendly e confermi il posto con PayPal.
              </p>
              <div className="mt-5">
                <CTAButton href="#booking-flow" variant="secondary">
                  {ctaLabels.calendly}
                </CTAButton>
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell">
          <BookingPaymentFlow />
        </div>
      </SectionReveal>

      <SectionReveal className="bg-white/70 py-16">
        <div className="section-shell grid gap-6 lg:grid-cols-3">
          {[
            {
              title: 'Modulo semplice',
              text: 'Indichi livello, obiettivo e situazione da simulare. Le risposte servono a preparare meglio la sessione.',
              icon: FileText,
            },
            {
              title: 'Pagamento PayPal',
              text: 'Il pagamento conferma lo slot. I dati di pagamento vengono gestiti da PayPal.',
              icon: CreditCard,
            },
            {
              title: 'Conferma chiara',
              text: 'Dopo la prenotazione sai esattamente quando si svolge la sessione e cosa riceverai dopo.',
              icon: ShieldCheck,
            },
          ].map(({ title, text, icon: Icon }) => (
            <div key={title} className="rounded-lg border border-ink/10 bg-paper p-5">
              <Icon aria-hidden="true" className="h-6 w-6 text-moss" />
              <h2 className="mt-4 text-xl font-black text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">{text}</p>
            </div>
          ))}
        </div>
      </SectionReveal>

    </>
  );
}
