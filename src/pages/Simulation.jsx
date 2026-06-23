import React from 'react';
import { AlertTriangle, CalendarClock, Check, CreditCard, FileText, ShieldCheck, Target } from 'lucide-react';
import CTAButton from '../components/CTAButton';
import PricingCard from '../components/PricingCard';
import ProcessSteps from '../components/ProcessSteps';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import SituationTabs from '../components/SituationTabs';
import TrustBadges from '../components/TrustBadges';
import { ctaLabels, externalLinks, primaryOffer } from '../config/site';
import { bookingSteps, processSteps, receiveItems } from '../data/content';

function DetailCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-mint text-moss">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-xl font-black text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/70">{children}</p>
    </div>
  );
}

export default function Simulation() {
  return (
    <>
      <SEO
        title={`${primaryOffer.fullTitle} | Sblocco Inglese`}
        description="30 minuti online per capire cosa ti blocca quando parli inglese e ricevere feedback scritto con frasi migliorate da riutilizzare."
      />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="h-1 scanline" />
        <div className="section-shell grid gap-10 pb-16 pt-12 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:pt-16">
          <div>
            <span className="eyebrow border-white/15 bg-white/10 !text-white">Diagnosi iniziale - {primaryOffer.price}</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.05] text-white sm:text-5xl">
              La simulazione è il modo più veloce per vedere dove si blocca il tuo inglese.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">
              Non è il prodotto finale: è il punto di ingresso intelligente. In 30 minuti vediamo cosa succede quando
              devi rispondere davvero, poi trasformiamo il blocco in correzioni, frasi migliori e una direzione di corso.
            </p>
            <p className="mt-5 max-w-3xl rounded-lg border border-white/10 bg-white/[0.08] p-4 text-sm font-semibold leading-6 text-white/70">
              È pensata per chi ha già una base di inglese ma perde lucidità sotto pressione. Non è conversazione
              generica, non è una promessa magica, e non è ideale per principianti assoluti.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <CTAButton variant="contrast">{ctaLabels.primary}</CTAButton>
              <CTAButton href="#dettagli-simulazione" variant="secondary">
                Scopri i dettagli
              </CTAButton>
            </div>
            <div className="mt-8 rounded-lg bg-white/90 p-3">
              <TrustBadges />
            </div>
          </div>
          <PricingCard compact />
        </div>
      </section>

      <SectionReveal id="dettagli-simulazione" className="bg-white/70 py-16">
        <div className="section-shell">
          <span className="eyebrow">
            <Target aria-hidden="true" className="h-3.5 w-3.5" />
            Prima di prenotare
          </span>
          <h2 className="section-title">Per chi è e per chi non è</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-moss/20 bg-mint/50 p-5">
              <h3 className="text-xl font-black text-ink">È adatta se...</h3>
              <div className="mt-5 grid gap-3">
                {[
                  'capisci un po’ di inglese ma ti blocchi quando devi parlare',
                  'devi preparare colloqui, call, clienti, Erasmus o trasferimento',
                  'vuoi correzioni precise e frasi migliori da riutilizzare',
                  'hai circa un livello A2, B1 o B2',
                ].map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-bold leading-6 text-ink/100">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-coral/20 bg-blush p-5">
              <h3 className="text-xl font-black text-ink">Non è ideale se...</h3>
              <div className="mt-5 grid gap-3">
                {[
                  'parti completamente da zero',
                  'cerchi una garanzia di superare un colloquio',
                  'vuoi una lezione generica senza obiettivo concreto',
                  'non riesci ancora a costruire frasi semplici',
                ].map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-bold leading-6 text-ink/70">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell">
          <span className="eyebrow">Scegli il contesto</span>
          <h2 className="section-title">Che situazione vuoi simulare?</h2>
          <p className="section-copy">
            Il contenuto della simulazione cambia in base al tuo obiettivo. Non facciamo esercizi casuali.
          </p>
          <div className="mt-8">
            <SituationTabs />
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-linen/50 py-16">
        <div className="section-shell">
          <span className="eyebrow">Prima, durante, dopo</span>
          <h2 className="section-title">Cosa succede nella pratica?</h2>
          <div className="mt-8">
            <ProcessSteps steps={processSteps} title="Fasi della simulazione" />
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="eyebrow">
              <FileText aria-hidden="true" className="h-3.5 w-3.5" />
              Output concreto
            </span>
            <h2 className="section-title">Cosa ricevi esattamente</h2>
            <p className="section-copy">
              Alla fine non rimani con “devo parlare di più”. Rimani con errori chiari, frasi corrette e un’indicazione
              su cosa lavorare dopo.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {receiveItems.map((item) => (
              <div key={item} className="rounded-lg border border-ink/10 bg-white px-4 py-4 shadow-sm">
                <Check aria-hidden="true" className="h-5 w-5 text-moss" />
                <p className="mt-3 text-sm font-bold text-ink/100">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-white/70 py-16">
        <div className="section-shell grid gap-5 lg:grid-cols-3">
          <DetailCard icon={CreditCard} title="Regola pagamento">
            Il posto viene confermato solo dopo il pagamento. Il pagamento avviene con PayPal e il sito non raccoglie
            dati di pagamento.
          </DetailCard>
          <DetailCard icon={CalendarClock} title="Spostamento sessione">
            Puoi spostare la sessione una volta con almeno 24 ore di preavviso. In caso di mancata presenza senza
            preavviso, la sessione non viene recuperata.
          </DetailCard>
          <DetailCard icon={ShieldCheck} title="Prima di prenotare">
            Se il quiz ti indica che la simulazione è adatta o probabilmente adatta, puoi procedere con slot e
            pagamento.
          </DetailCard>
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[1fr_0.88fr]">
          <div>
            <span className="eyebrow">Prenotazione</span>
            <h2 className="section-title">Come confermi il tuo posto</h2>
            <p className="section-copy">
              Il percorso è semplice: quiz di idoneità, scelta dello slot, pagamento con PayPal, sessione e feedback scritto.
            </p>
            <div className="mt-8">
              <ProcessSteps steps={bookingSteps} title="Prenotazione simulazione" />
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CTAButton>{ctaLabels.primary}</CTAButton>
              <CTAButton href={externalLinks.bookingFlow} variant="secondary">
                {ctaLabels.calendly}
              </CTAButton>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/60">
              Puoi guardare le disponibilità, ma il posto viene confermato solo dopo il pagamento.
            </p>
          </div>
          <div className="lg:sticky lg:top-28">
            <PricingCard compact />
          </div>
        </div>
      </SectionReveal>
    </>
  );
}
