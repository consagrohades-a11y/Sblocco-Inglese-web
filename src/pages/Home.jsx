import React from 'react';
import {
  AlertCircle,
  ArrowDown,
  Check,
  CheckCircle2,
  FileText,
  MessageSquareWarning,
  Sparkles,
  Target,
  Video,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import AfterFormSteps from '../components/AfterFormSteps';
import AboutSection from '../components/AboutSection';
import CTAButton from '../components/CTAButton';
import FAQAccordion from '../components/FAQAccordion';
import HeroAnimation from '../components/HeroAnimation';
import PricingCard from '../components/PricingCard';
import ProcessSteps from '../components/ProcessSteps';
import SEO from '../components/SEO';
import SectionReveal from '../components/SectionReveal';
import SituationTabs from '../components/SituationTabs';
import SuitabilityQuiz from '../components/SuitabilityQuiz';
import TrustBadges from '../components/TrustBadges';
import { ctaLabels, externalLinks, primaryOffer } from '../config/site';
import {
  faqItems,
  fitCards,
  feedbackExamples,
  processSteps,
  receiveItems,
  bookingSteps,
} from '../data/content';

function FitCards() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {fitCards.map(({ title, text, icon: Icon }, index) => {
        const active = selected === index;
        return (
          <button
            key={title}
            type="button"
            onClick={() => setSelected(index)}
            className={`focus-ring min-h-48 rounded-lg border p-5 text-left transition hover:-translate-y-1 ${
              active
                ? 'border-moss/30 bg-white shadow-soft'
                : 'border-ink/10 bg-white/70 hover:border-moss/25 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-mint text-moss">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              {active ? (
                <span className="rounded-full bg-moss px-3 py-1 text-xs font-black text-white">Rilevante</span>
              ) : null}
            </div>
            <h3 className="mt-5 text-lg font-black text-ink">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-ink/70">{text}</p>
          </button>
        );
      })}
    </div>
  );
}

function ComparisonCards() {
  const generic = [
    'argomenti generici',
    'poca direzione',
    'correzioni non sempre chiare',
    'nessun feedback scritto',
    'poca applicazione immediata',
  ];
  const specific = [
    'situazione reale',
    'correzioni mirate',
    'feedback scritto',
    'frasi riutilizzabili',
    'prossimi step chiari',
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <XCircle aria-hidden="true" className="h-6 w-6 text-coral" />
          <h3 className="text-xl font-black text-ink">Lezione di inglese generica</h3>
        </div>
        <div className="mt-5 grid gap-3">
          {generic.map((item) => (
            <p key={item} className="flex items-center gap-3 text-sm font-semibold text-ink/60">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" />
              {item}
            </p>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-moss/25 bg-mint/70 p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-moss" />
          <h3 className="text-xl font-black text-ink">Simulazione Sblocco Inglese</h3>
        </div>
        <div className="mt-5 grid gap-3">
          {specific.map((item) => (
            <p key={item} className="flex items-center gap-3 text-sm font-bold text-ink/100">
              <Check aria-hidden="true" className="h-4 w-4 text-moss" />
              {item}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReceiveChecklist() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {receiveItems.map((item) => (
        <div key={item} className="flex min-h-16 items-center gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm">
          <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-moss" />
          <span className="text-sm font-bold text-ink/100">{item}</span>
        </div>
      ))}
    </div>
  );
}

function FeedbackExamples() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {feedbackExamples.map((example) => (
        <article key={example.label} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <span className="inline-flex rounded-full bg-mint px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-moss">
            {example.label}
          </span>
          <div className="mt-5 grid gap-4">
            <div className="rounded-lg bg-blush p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-coral">Prima</p>
              <p className="mt-2 text-sm font-bold leading-6 text-ink/70">“{example.before}”</p>
            </div>
            <div className="rounded-lg border border-moss/20 bg-mint/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-moss">Dopo</p>
              <p className="mt-2 text-sm font-bold leading-6 text-ink">“{example.after}”</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-ink/70">{example.note}</p>
        </article>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SEO
        title="Simulazione Inglese per Colloqui e Lavoro | Sblocco Inglese"
        description={`Simulazione online di 30 minuti per italiani che si bloccano quando devono parlare inglese in colloqui, lavoro o call. Feedback scritto e frasi migliorate. Prezzo beta ${primaryOffer.price}.`}
      />

      <section className="section-shell grid gap-10 pb-16 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-20 lg:pt-16">
        <div>
          <span className="eyebrow">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            Simulazione pratica + diagnosi + feedback scritto
          </span>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.04] tracking-normal text-ink sm:text-5xl lg:text-6xl">
            Ti blocchi quando devi parlare inglese in un colloquio o al lavoro?
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
            Fai una simulazione online di 30 minuti e ricevi feedback scritto, correzioni e frasi migliorate
            da riutilizzare.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-butter px-4 py-2 text-sm font-black text-ink">
              {primaryOffer.priceLabel}: {primaryOffer.price}
            </span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink/70">
              Il posto viene confermato solo dopo il pagamento.
            </span>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <CTAButton>{ctaLabels.primary}</CTAButton>
            <CTAButton href="#come-funziona" variant="secondary">
              {ctaLabels.secondary}
            </CTAButton>
          </div>
          <div className="mt-8">
            <TrustBadges />
          </div>
        </div>
        <HeroAnimation />
      </section>

      <SectionReveal className="bg-white/70 py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="eyebrow">
              <MessageSquareWarning aria-hidden="true" className="h-3.5 w-3.5" />
              Il blocco
            </span>
            <h2 className="section-title">Hai studiato inglese, ma quando devi parlare ti blocchi?</h2>
          </div>
          <div className="grid gap-4 text-base leading-7 text-ink/70">
            <p>
              Molti italiani non hanno solo un problema di grammatica. Il vero problema è usare l’inglese
              quando serve davvero: in un colloquio, in una call, con un cliente o in una situazione professionale.
            </p>
            <p>
              Puoi avere competenze, esperienza e obiettivi chiari, ma bloccarti quando devi spiegarli in inglese.
              Questa simulazione serve a capire dove nasce il blocco e quali frasi puoi rendere subito più chiare.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'ti blocchi quando devi rispondere',
                'traduci dall’italiano e perdi tempo',
                'hai paura di fare errori',
                'sembri meno sicuro/a di quanto sei davvero',
                'capisci meglio di quanto parli',
                'non trovi le parole giuste',
                'colloqui e call ti mettono pressione',
              ].map((item) => (
                <div key={item} className="rounded-lg bg-paper px-4 py-3 text-sm font-bold text-ink/70">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell">
          <span className="eyebrow">
            <Target aria-hidden="true" className="h-3.5 w-3.5" />
            Adatta a te
          </span>
          <h2 className="section-title">Questa simulazione è per te se...</h2>
          <p className="section-copy">
            Clicca le situazioni in cui ti riconosci: se ne ritrovi almeno una, il primo passo da {primaryOffer.price} può
            darti una diagnosi concreta del tuo speaking.
          </p>
          <div className="mt-8">
            <FitCards />
          </div>
          <div className="mt-8">
            <CTAButton>{ctaLabels.primary}</CTAButton>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-linen/50 py-16">
        <div className="section-shell">
          <SuitabilityQuiz />
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell">
          <div className="rounded-lg border border-moss/20 bg-white p-6 shadow-soft sm:p-8">
            <span className="eyebrow">
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
              Spazio pratico, non giudizio
            </span>
            <h2 className="section-title">Non devi parlare perfettamente</h2>
            <p className="mt-5 max-w-4xl text-base leading-7 text-ink/70 sm:text-lg">
              La simulazione non serve a giudicarti. Serve a capire cosa succede quando provi a parlare inglese in
              una situazione reale: dove ti blocchi, quali frasi non ti vengono, quali errori si ripetono e cosa puoi
              migliorare subito.
            </p>
            <p className="mt-4 max-w-4xl text-base font-semibold leading-7 text-ink/75">
              Non sempre il problema è non sapere inglese. A volte il problema è non riuscire a usarlo quando serve davvero.
            </p>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell">
          <span className="eyebrow">
            <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
            Differenza chiave
          </span>
          <h2 className="section-title">Non è una lezione di conversazione generica</h2>
          <p className="section-copy">
            È una sessione pratica per capire cosa ti blocca quando parli e quali frasi puoi usare in modo più
            chiaro, naturale e sicuro.
          </p>
          <div className="mt-8">
            <ComparisonCards />
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-white/70 py-16">
        <div className="section-shell">
          <span className="eyebrow">
            <Video aria-hidden="true" className="h-3.5 w-3.5" />
            Durante la sessione
          </span>
          <h2 className="section-title">Cosa succede durante i 30 minuti?</h2>
          <p className="section-copy">
            La call ha una struttura semplice: capiamo il contesto, lo simuliamo, correggiamo e trasformiamo gli
            errori in frasi più utilizzabili.
          </p>
          <div className="mt-8">
            <ProcessSteps steps={processSteps} title="Cosa succede durante i 30 minuti" />
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="eyebrow">
              <FileText aria-hidden="true" className="h-3.5 w-3.5" />
              Cosa ricevi
            </span>
            <h2 className="section-title">Non solo pratica: esci con qualcosa di concreto</h2>
            <p className="section-copy">
              Per {primaryOffer.price} non stai comprando una semplice mezz’ora di conversazione. Stai comprando una diagnosi
              pratica del tuo speaking in una situazione reale.
            </p>
            <div className="mt-7">
              <CTAButton>{ctaLabels.primary}</CTAButton>
            </div>
          </div>
          <ReceiveChecklist />
        </div>
      </SectionReveal>

      <SectionReveal className="bg-white/70 py-16">
        <div className="section-shell">
          <span className="eyebrow">
            <FileText aria-hidden="true" className="h-3.5 w-3.5" />
            Esempi di feedback
          </span>
          <h2 className="section-title">Che tipo di feedback ricevi?</h2>
          <p className="section-copy">
            Durante la simulazione lavoriamo su frasi reali, non su teoria astratta. L’obiettivo è rendere il tuo
            inglese più chiaro, naturale e utilizzabile.
          </p>
          <div className="mt-8">
            <FeedbackExamples />
          </div>
          <div className="mt-8">
            <CTAButton>{ctaLabels.primary}</CTAButton>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-linen/50 py-16">
        <div className="section-shell">
          <span className="eyebrow">
            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
            Esempi pratici
          </span>
          <h2 className="section-title">Esempi di situazioni che possiamo simulare</h2>
          <p className="section-copy">
            Porti un contesto reale. Io ti aiuto a renderlo più chiaro, più naturale e meno improvvisato.
          </p>
          <div className="mt-8">
            <SituationTabs />
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <span className="eyebrow">Offerta principale</span>
            <h2 className="section-title">Iniziare resta semplice e chiaro: {primaryOffer.price}</h2>
            <p className="section-copy">
              Prima di comprare percorsi più lunghi, puoi testarti in una situazione reale e capire cosa ti sta
              bloccando nello speaking.
            </p>
          </div>
          <PricingCard />
        </div>
      </SectionReveal>

      <SectionReveal className="bg-white/70 py-16">
        <div className="section-shell">
          <AboutSection showReviews />
        </div>
      </SectionReveal>

      <SectionReveal id="come-funziona" className="py-16">
        <div className="section-shell">
          <span className="eyebrow">
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
            Prenotazione
          </span>
          <h2 className="section-title">Come funziona la prenotazione?</h2>
          <p className="section-copy">
            Compili il modulo, scegli lo slot disponibile, completi il pagamento con PayPal e ricevi la conferma della
            sessione.
          </p>
          <div className="mt-8">
            <ProcessSteps steps={bookingSteps} title="Come funziona la prenotazione" />
          </div>
          <div className="mt-8">
            <AfterFormSteps />
          </div>
          <div className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row">
              <CTAButton>{ctaLabels.form}</CTAButton>
              <CTAButton href={externalLinks.bookingFlow} variant="secondary">
                {ctaLabels.calendly}
              </CTAButton>
            </div>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ink/60">
              Il posto viene confermato solo dopo il pagamento.
            </p>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal className="bg-linen/50 py-16">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <span className="eyebrow">FAQ</span>
            <h2 className="section-title">Dubbi prima di prenotare?</h2>
            <p className="section-copy">
              Le domande più comuni riguardano livello, pagamento, cosa ricevi dopo e come funziona la sessione.
            </p>
            <div className="mt-6">
              <CTAButton>{ctaLabels.primary}</CTAButton>
            </div>
          </div>
          <FAQAccordion items={faqItems.slice(0, 4)} />
        </div>
      </SectionReveal>

      <SectionReveal className="pb-20 pt-16">
        <div className="section-shell">
          <div className="rounded-lg bg-ink px-5 py-10 text-white shadow-soft sm:px-8 lg:px-12">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
                  Vuoi capire cosa ti blocca quando parli inglese?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                  Prenota la simulazione da {primaryOffer.price} e ricevi feedback scritto con frasi migliorate da riutilizzare.
                </p>
              </div>
              <CTAButton variant="contrast">{ctaLabels.primary}</CTAButton>
            </div>
          </div>
        </div>
      </SectionReveal>
    </>
  );
}
