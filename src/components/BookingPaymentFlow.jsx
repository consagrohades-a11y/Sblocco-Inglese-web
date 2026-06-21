import React, { useState } from 'react';
import { CalendarCheck, CheckCircle2, CreditCard, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { bookingFlow, externalLinks, primaryOffer } from '../config/site';
import PayPalHostedButton from './PayPalHostedButton';

const icons = [FileText, CalendarCheck, CreditCard, CheckCircle2];

export default function BookingPaymentFlow() {
  const [activeStep, setActiveStep] = useState(1);
  const ActiveIcon = icons[activeStep] || CalendarCheck;

  return (
    <div id="booking-flow" className="scroll-mt-28">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="eyebrow">
            <CreditCard aria-hidden="true" className="h-3.5 w-3.5" />
            Slot + pagamento
          </span>
          <h2 className="mt-4 text-3xl font-black leading-tight text-ink sm:text-4xl">
            {bookingFlow.title}
          </h2>
          <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-ink/68">
            {bookingFlow.intro}
          </p>
        </div>
        <div className="rounded-lg border border-moss/20 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/55">Da confermare</p>
          <p className="mt-1 text-2xl font-black text-moss">{primaryOffer.price}</p>
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="grid gap-3">
          {bookingFlow.steps.map((step, index) => {
            const Icon = icons[index] || FileText;
            const isActive = activeStep === index;

            return (
              <button
                key={step.title}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`focus-ring group rounded-lg border p-4 text-left transition ${
                  isActive
                    ? 'border-moss bg-mint shadow-soft'
                    : 'border-ink/10 bg-white/80 hover:border-moss/25 hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                      isActive ? 'bg-moss text-white' : 'bg-paper text-moss group-hover:bg-mint'
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-base font-black text-ink">{step.title}</span>
                    <span className="mt-1 block text-sm font-semibold leading-6 text-ink/65">{step.text}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-moss/20 bg-white p-4 shadow-soft sm:p-5">
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-paper px-4 py-3">
            <ActiveIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
            <div>
              <h3 className="text-lg font-black text-ink">{bookingFlow.steps[activeStep].title}</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-ink/62">{bookingFlow.steps[activeStep].text}</p>
            </div>
          </div>

          {activeStep === 0 ? (
            <div className="grid gap-4">
              <p className="text-sm font-semibold leading-6 text-ink/70">
                Il quiz serve a capire il tuo obiettivo, mostrarti un esito immediato e rendere la simulazione più mirata.
              </p>
              <a
                href="#booking-form"
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-moss px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#096d58] hover:shadow-soft"
              >
                Vai al quiz
                <FileText aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          ) : null}

          {activeStep === 1 ? (
            <div>
              <div className="overflow-hidden rounded-lg border border-ink/10 bg-paper">
                <iframe
                  title="Calendly - scegli lo slot"
                  src={bookingFlow.calendlyEmbedUrl}
                  className="h-[680px] w-full bg-white"
                />
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={externalLinks.calendar}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-extrabold text-ink transition hover:border-moss/30 hover:bg-mint/50"
                >
                  Apri Calendly in una nuova scheda
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </a>
                <p className="text-xs font-bold leading-5 text-ink/55">
                  Lo slot viene confermato dopo il pagamento con PayPal.
                </p>
              </div>
            </div>
          ) : null}

          {activeStep === 2 ? (
            <div className="grid gap-4">
              <div className="rounded-lg border border-butter bg-butter/70 p-4">
                <h4 className="text-lg font-black text-ink">Pagamento PayPal</h4>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
                  Dopo aver scelto lo slot, completa il pagamento con PayPal. Il sito non raccoglie dati di pagamento.
                </p>
              </div>
              <PayPalHostedButton />
              <div className="flex items-start gap-3 rounded-lg bg-paper px-4 py-3 text-xs font-bold leading-5 text-ink/55">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                <p>
                  Il pagamento conferma il posto e ti permette di procedere con la sessione online.
                </p>
              </div>
            </div>
          ) : null}

          {activeStep === 3 ? (
            <div className="grid gap-4">
              <div className="rounded-lg border border-moss/20 bg-mint p-4">
                <h4 className="text-lg font-black text-ink">Sessione online e feedback scritto</h4>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">
                  Durante i 30 minuti lavoriamo su una situazione reale. Dopo la simulazione ricevi feedback scritto,
                  correzioni e frasi migliorate da riutilizzare.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-paper px-4 py-3 text-sm font-bold leading-6 text-ink/65">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-moss" />
                <p>
                  Ricevi un riepilogo pratico con correzioni, frasi migliorate e prossimi step chiari.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
