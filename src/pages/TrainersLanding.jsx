import React from 'react';
import { Brain, CheckCircle2, Clock3, Lock, Sparkles } from 'lucide-react';
import CTAButton from '../components/CTAButton';
import SEO from '../components/SEO';
import TrainerLayout from '../components/TrainerLayout';
import { CtaBand, FeatureList, ProductCard, SectionHeader } from '../components/VisualSystem';
import { primaryOffer } from '../config/site';
import { trainerConfig } from '../data/trainerConfig';

const useCases = [
  {
    title: 'Parlare sotto pressione',
    text: 'Rivedi frasi che servono per averle sempre pronte: colloqui, call, clienti, chiarimenti.',
  },
  {
    title: 'Uscire dalla traduzione mentale',
    text: 'Incontri più volte le strutture naturali, così non parti sempre dall’italiano. Automatizzi.',
  },
  {
    title: 'Allenare il recupero veloce',
    text: 'Le card difficili tornano prima; quelle facili tornano più avanti quando sono già più stabili.',
  },
  {
    title: 'Continuare dopo la lezione',
    text: 'La simulazione ti dà diagnosi e frasi. Il trainer ti aiuta a non perderle.',
  },
];

const srsSteps = [
  'Scegli trainer, categorie e livello.',
  'Vedi prima le card da ripassare oggi.',
  'Scopri la risposta, poi scegli Again / Hard / Good / Easy.',
  'Il sistema salva i progressi su questo browser.',
];

function TrainerMeta({ trainer }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2">
        <span className="text-xs font-black uppercase tracking-[0.08em] text-ink/50">Card</span>
        <span className="text-sm font-black text-ink">{trainer.cardCount}</span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2">
        <span className="text-xs font-black uppercase tracking-[0.08em] text-ink/50">Categorie</span>
        <span className="text-sm font-black text-ink">{trainer.categories.length}</span>
      </div>
    </div>
  );
}

export default function TrainersLanding() {
  const totalCards = trainerConfig.reduce((sum, trainer) => sum + trainer.cardCount, 0);

  return (
    <>
      <SEO
        title="Sblocco Trainer | Sblocco Inglese"
        description="Trainer SRS per ricordare e usare frasi, parole ed espressioni inglesi quando parli sotto pressione."
      />

      <TrainerLayout>
        <div className="overflow-hidden rounded-lg bg-ink text-white shadow-soft">
          <div className="h-1 scanline" />
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_0.74fr] lg:items-center lg:p-10">
            <div>
              <span className="eyebrow border-white/15 bg-white/10 text-white">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                Supporto per studenti
              </span>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                Trainer Suite
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">
                Un ambiente di ripasso concreto per recuperare più velocemente parole, frasi e risposte quando devi
                parlare inglese davvero: colloqui, call, lavoro, viaggi, clienti e conversazioni reali.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <CTAButton href="/trainers/business-expression" variant="contrast">
                  Inizia dal Business Trainer
                </CTAButton>
                <CTAButton href="/prenota#booking-form" variant="secondary">
                  Prima fai la simulazione {primaryOffer.price}
                </CTAButton>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.07] p-5">
              <div className="rounded-lg border border-white/10 bg-white/[0.08] p-5">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-mint">Review engine</p>
                <h2 className="mt-3 text-3xl font-black leading-tight">Ripassi le frasi giuste prima di dimenticarle.</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/65">
                  Il trainer reagisce a come rispondi e mantiene separati deck, categorie e progressi. Non è una lista:
                  è un sistema di recupero.
                </p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  [totalCards, 'card'],
                  [trainerConfig.length, 'trainer'],
                  ['SRS', 'review'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/[0.08] p-3 text-center">
                    <p className="text-2xl font-black">{value}</p>
                    <p className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.08em] text-white/50">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <SectionHeader
            eyebrow="Perché esiste"
            icon={Brain}
            title="La lezione sblocca. Il trainer consolida."
            copy="Le lezioni e la simulazione ti aiutano a capire cosa correggere. Il trainer ti fa rivedere le frasi giuste abbastanza volte da renderle più disponibili quando parli."
          />
          <FeatureList items={useCases} className="sm:grid-cols-2" />
        </div>

        <div className="mt-12">
          <SectionHeader
            eyebrow="Scegli un trainer"
            icon={CheckCircle2}
            title="Quattro deck, un unico sistema."
            copy="Ogni trainer ha categorie e progressi separati. Puoi usarli in modo leggero, senza login, direttamente dal browser. 10 card per deck al giorno, così è realmente efficace."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {trainerConfig.map((trainer) => (
              <ProductCard
                key={trainer.id}
                label={trainer.status === 'available' ? 'Disponibile' : 'In arrivo'}
                title={trainer.title}
                text={trainer.description}
                to={trainer.route}
                action="Apri trainer"
                meta={
                  <div className="grid gap-4">
                    <div className="rounded-lg bg-paper p-4">
                      <img src={trainer.visual} alt="" className="mx-auto h-28 w-28 object-contain" />
                    </div>
                    <TrainerMeta trainer={trainer} />
                  </div>
                }
              />
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeader
            eyebrow="SRS semplice"
            icon={Clock3}
            title="Ripassi prima di dimenticare."
            copy="Non devi decidere cosa rivedere ogni volta. Il sistema usa le tue risposte per riportare avanti le card al momento giusto."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {srsSteps.map((step, index) => (
              <div key={step} className="rounded-lg border border-ink/10 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-black text-moss">0{index + 1}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-ink/75">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <CtaBand
            eyebrow="Accesso"
            title="Il Trainer fa parte dell’ecosistema Sblocco Inglese."
            copy="È una funzione pensata per supportare gli studenti fuori dalle lezioni. Se stai già facendo lezione con Rhema, l’accesso è incluso mentre sei attivo/a. Alcune funzioni premium verranno attivate progressivamente."
          >
            <CTAButton href="/prenota#booking-form" variant="contrast">
              Prenota la simulazione
            </CTAButton>
            <CTAButton href="/percorsi" variant="secondary">
              Vedi i percorsi
            </CTAButton>
          </CtaBand>
          <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-ink/55">
            <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
            Accesso incluso per studenti attivi. Alcune funzioni premium verranno attivate progressivamente.
          </p>
        </div>
      </TrainerLayout>
    </>
  );
}
