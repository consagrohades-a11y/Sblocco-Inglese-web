import React from 'react';
import { Check, Info, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import CTAButton from '../components/CTAButton';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import { externalLinks, primaryOffer } from '../config/site';
import { percorsoOffers } from '../data/content';

export default function Percorsi() {
  const [selected, setSelected] = useState(0);
  const selectedOffer = percorsoOffers[selected];

  return (
    <>
      <SEO
        title="Percorsi dopo la simulazione | Sblocco Inglese"
        description={`Percorsi possibili dopo la simulazione da ${primaryOffer.price}: sprint di speaking, preparazione colloquio urgente e training per piccoli team.`}
      />

      <section className="section-shell pb-12 pt-12 lg:pt-16">
        <span className="eyebrow">Dopo la diagnosi</span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-ink sm:text-5xl">
          Dopo la simulazione: i percorsi possibili
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/70">
          Dopo la simulazione, non propongo lo stesso percorso a tutti. In base al tuo livello, al tuo obiettivo e alla
          tua urgenza, posso consigliarti una delle opzioni sotto.
        </p>
      </section>

      <SectionReveal className="pb-16">
        <div className="section-shell">
          <div className="rounded-lg border border-moss/20 bg-mint/50 p-4 text-sm font-semibold leading-6 text-ink/70">
            <Info aria-hidden="true" className="mr-2 inline h-4 w-4 text-moss" />
            Questi percorsi non sono obbligatori. La simulazione da {primaryOffer.price} serve proprio a capire se ha senso continuare e
            con quale direzione.
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {percorsoOffers.map((offer, index) => {
              const Icon = offer.icon;
              const active = selected === index;
              return (
                <button
                  key={offer.title}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(index)}
                  className={`focus-ring flex h-full rounded-lg border p-5 text-left transition hover:-translate-y-1 ${
                    active
                      ? 'border-moss/30 bg-white shadow-soft'
                      : 'border-ink/10 bg-white hover:border-moss/25 hover:bg-white'
                  }`}
                >
                  <div className="flex w-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-mint text-moss">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      {active ? (
                        <span className="rounded-full bg-moss px-3 py-1 text-xs font-black text-white">Selezionato</span>
                      ) : null}
                    </div>
                    <p className="mt-5 text-xs font-black uppercase tracking-[0.08em] text-moss">{offer.type}</p>
                    <h2 className="mt-2 text-2xl font-black leading-tight text-ink">{offer.title}</h2>
                    <p className="mt-3 text-xl font-black text-coral">{offer.price}</p>
                    <p className="mt-4 text-sm leading-6 text-ink/70">{offer.description}</p>
                    <div className="mt-5 grid gap-2">
                      {offer.includes.map((item) => (
                        <span key={item} className="flex items-start gap-2 text-sm font-semibold leading-5 text-ink/70">
                          <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 rounded-lg bg-paper p-4">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-ink/60">Ideale per</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-ink/70">{offer.bestFor}</p>
                    </div>
                    <p className="mt-4 text-sm font-semibold leading-6 text-ink/60">{offer.note}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedOffer ? (
            <div className="mt-8 overflow-hidden rounded-lg border border-moss/20 bg-white shadow-soft">
              <div className="h-1 scanline" />
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-coral">Opzione selezionata</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-ink">{selectedOffer.selectedTitle}</h2>
                  <p className="mt-4 text-base font-semibold leading-7 text-ink/70">{selectedOffer.selectedCopy}</p>
                </div>
                <div className="grid gap-3">
                  {selectedOffer.selectedBullets?.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-lg border border-ink/10 bg-paper p-4">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                      <p className="text-sm font-bold leading-6 text-ink/75">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-10 rounded-lg bg-ink p-6 text-white sm:p-8">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-2xl font-black">Non sai quale percorso scegliere?</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
                  Parti dalla simulazione da {primaryOffer.price}: è il modo più semplice per capire livello, blocco principale e urgenza
                  reale prima di valutare un percorso più grande.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <CTAButton variant="contrast">Prima fai la simulazione da {primaryOffer.price}</CTAButton>
                <a
                  href={externalLinks.whatsapp}
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/10"
                >
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  Richiedi informazioni
                </a>
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>
    </>
  );
}
